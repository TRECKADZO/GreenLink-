import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import { TreePine, Route, Camera, Trash2, RotateCcw, Navigation, ZoomIn, ZoomOut, Radio, Square, MapPin, Wifi, WifiOff, Crosshair, X, Check, Loader2, CheckCircle2, Move } from 'lucide-react';
import TilesDownloader from '../../../components/TilesDownloader';
import { Input } from '../../../components/ui/input';

// Minimum distance (meters) between tracked points to filter GPS noise
const MIN_TRACK_DISTANCE_M = 3;

// Tree pin icon (yellow)
const treeIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:#FBBF24;border:2px solid #92400E;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);font-size:13px;">🌳</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Polygon vertex icon
const vertexIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#3B82F6;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Haversine distance in meters
function distanceM(a, b) {
  const R = 6371000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Zoom controls
const MapControls = ({ onZoomIn, onZoomOut, onLocate }) => (
  <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
    <button onClick={onZoomIn} className="w-11 h-11 bg-[#2D3B2D] border border-[#4A5C4A] rounded-md flex items-center justify-center text-[#C8E6C9] active:bg-[#3E4F3E] shadow-md" data-testid="map-zoom-in"><ZoomIn className="w-5 h-5" /></button>
    <button onClick={onZoomOut} className="w-11 h-11 bg-[#2D3B2D] border border-[#4A5C4A] rounded-md flex items-center justify-center text-[#C8E6C9] active:bg-[#3E4F3E] shadow-md" data-testid="map-zoom-out"><ZoomOut className="w-5 h-5" /></button>
    <button onClick={onLocate} className="w-11 h-11 bg-[#2D3B2D] border border-[#4A5C4A] rounded-md flex items-center justify-center text-[#C8E6C9] active:bg-[#3E4F3E] shadow-md" data-testid="map-locate"><Navigation className="w-5 h-5" /></button>
  </div>
);

// Map click handler
const MapClickHandler = ({ mode, onAddVertex, onAddTree }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (mode === 'polygon') onAddVertex([lat, lng]);
      else if (mode === 'tree') onAddTree({ lat, lng, nom: '', numero: 0 });
    },
  });
  return null;
};

// Auto-follow current position during tracking
const FollowPosition = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 17));
  }, [map, position]);
  return null;
};

// Auto-fit bounds
const FitBounds = ({ polygon, trees }) => {
  const map = useMap();
  useEffect(() => {
    const pts = [...(polygon || []), ...(trees || []).map(t => [t.lat, t.lng])];
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts).pad(0.15));
  }, [map, polygon, trees]);
  return null;
};

// Draggable polygon vertex for drag & drop
const DraggableVertex = ({ position, index, onDragEnd, isDraggable }) => {
  const markerRef = useRef(null);
  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd(index, [lat, lng]);
      }
    },
  }), [index, onDragEnd]);

  return (
    <Marker
      position={position}
      icon={vertexIcon}
      draggable={isDraggable}
      ref={markerRef}
      eventHandlers={isDraggable ? eventHandlers : undefined}
    >
      <Popup className="text-xs">
        WPT {index + 1}: {position[0].toFixed(5)}, {position[1].toFixed(5)}
        {isDraggable && <><br /><i>Glissez pour deplacer</i></>}
      </Popup>
    </Marker>
  );
};

// Snap 4 points to a perfect rectangle
function snapToRectangle(pts) {
  if (pts.length !== 4) return pts;
  // Centroid
  const cx = pts.reduce((s, p) => s + p[0], 0) / 4;
  const cy = pts.reduce((s, p) => s + p[1], 0) / 4;
  // Principal axis: direction from pt0 to pt1
  const dx = pts[1][0] - pts[0][0];
  const dy = pts[1][1] - pts[0][1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-10) return pts;
  const ux = dx / len, uy = dy / len; // unit along side 0->1
  const vx = -uy, vy = ux; // perpendicular

  // Project all points onto (u, v) axes relative to centroid
  const projs = pts.map(p => ({
    u: (p[0] - cx) * ux + (p[1] - cy) * uy,
    v: (p[0] - cx) * vx + (p[1] - cy) * vy,
  }));
  const uMin = Math.min(...projs.map(p => p.u));
  const uMax = Math.max(...projs.map(p => p.u));
  const vMin = Math.min(...projs.map(p => p.v));
  const vMax = Math.max(...projs.map(p => p.v));

  // Rectangle corners in (u,v) space -> back to lat/lng
  const corners = [
    [uMin, vMin], [uMax, vMin], [uMax, vMax], [uMin, vMax],
  ];
  return corners.map(([u, v]) => [
    cx + u * ux + v * vx,
    cy + u * uy + v * vy,
  ]);
}

// Precise geodesic area (Shoelace + local metric conversion)
function geodesicAreaHa(polygon) {
  if (polygon.length < 3) return 0;
  const toRad = Math.PI / 180;
  const centerLat = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(centerLat * toRad);

  // Convert to meters relative to first point
  const pts = polygon.map(p => [
    (p[0] - polygon[0][0]) * mPerDegLat,
    (p[1] - polygon[0][1]) * mPerDegLng,
  ]);

  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area) / 2 / 10000; // m2 -> ha
}

// Perimeter using Haversine
function perimeterM(polygon) {
  if (polygon.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    total += distanceM(polygon[i], polygon[j]);
  }
  return Math.round(total);
}

const ParcelMapGarmin = ({ data, onChange, readOnly = false, producerInfo = {} }) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const watchIdRef = useRef(null);
  const trackingStartRef = useRef(null);

  const [mode, setMode] = useState(null); // null, 'polygon', 'tree'
  const [capturing, setCapturing] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const [trackElapsed, setTrackElapsed] = useState(0);
  const [trackAccuracy, setTrackAccuracy] = useState(null);

  // GPS tree: permanent button state
  const [gpsTreeLoading, setGpsTreeLoading] = useState(false);
  const [treeForm, setTreeForm] = useState(null);

  // Rectangle detection prompt
  const [rectPrompt, setRectPrompt] = useState(false); // { lat, lng, numero, nom_botanique, nom_local, circonference, origine, decision }

  const polygon = data?.polygon || [];
  const trees = data?.arbres_ombrage || [];

  const updateData = useCallback((updates) => {
    onChange({ ...data, ...updates });
  }, [data, onChange]);

  // ---- Manual vertex / tree ----
  const handleAddVertex = useCallback((pt) => {
    if (tracking) return;
    const next = [...polygon, pt];
    updateData({ polygon: next });

    // Rectangle detection: 4th point close to 1st → propose snap
    if (next.length === 4) {
      const d = distanceM(next[3], next[0]);
      if (d < 30) { // within 30 meters
        setRectPrompt(true);
      }
    }
  }, [polygon, updateData, tracking]);

  // Drag & drop: move a vertex
  const handleVertexDrag = useCallback((index, newPos) => {
    const updated = polygon.map((p, i) => i === index ? newPos : p);
    updateData({ polygon: updated });
  }, [polygon, updateData]);

  // Accept rectangle snap
  const acceptRectangle = useCallback(() => {
    if (polygon.length === 4) {
      const snapped = snapToRectangle(polygon);
      updateData({ polygon: snapped });
      toast.success('Rectangle parfait applique');
    }
    setRectPrompt(false);
    setMode(null);
  }, [polygon, updateData]);

  // Finish manual trace
  const finishTrace = useCallback(() => {
    setMode(null);
    if (polygon.length >= 3) {
      toast.success(`Polygone ferme — ${polygon.length} points, ${geodesicAreaHa(polygon).toFixed(2)} ha`);
    }
  }, [polygon]);

  const handleAddTree = useCallback((tree) => {
    const num = trees.length + 1;
    // Open form for manual trees placed on map
    setTreeForm({ lat: tree.lat, lng: tree.lng, numero: num, nom_botanique: '', nom_local: '', circonference: '', origine: '', decision: '' });
  }, [trees.length]);

  // GPS tree: capture current position and open form
  const handleAddTreeGPS = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocalisation non disponible'); return; }
    setGpsTreeLoading(true);

    // If tracking, use currentPos for instant response
    if (tracking && currentPos) {
      const num = trees.length + 1;
      setTreeForm({ lat: currentPos[0], lng: currentPos[1], numero: num, nom_botanique: '', nom_local: '', circonference: '', origine: '', decision: '' });
      setGpsTreeLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const num = trees.length + 1;
        setTreeForm({
          lat: pos.coords.latitude, lng: pos.coords.longitude, numero: num,
          nom_botanique: '', nom_local: '', circonference: '', origine: '', decision: '',
        });
        setGpsTreeLoading(false);
      },
      (err) => {
        toast.error(`Erreur GPS: ${err.message}`);
        setGpsTreeLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [tracking, currentPos, trees.length]);

  // Save tree from form
  const saveTreeForm = useCallback(() => {
    if (!treeForm) return;
    const tree = {
      lat: treeForm.lat, lng: treeForm.lng, numero: treeForm.numero,
      nom: treeForm.nom_botanique || treeForm.nom_local || '',
      nom_botanique: treeForm.nom_botanique, nom_local: treeForm.nom_local,
      circonference: treeForm.circonference, origine: treeForm.origine, decision: treeForm.decision,
    };
    updateData({ arbres_ombrage: [...trees, tree] });
    toast.success(`Arbre #${tree.numero} ajoute`);
    setTreeForm(null);
  }, [treeForm, trees, updateData]);

  const removeLastVertex = () => { if (polygon.length > 0) updateData({ polygon: polygon.slice(0, -1) }); };
  const removeTree = (idx) => {
    const updated = trees.filter((_, i) => i !== idx).map((t, i) => ({ ...t, numero: i + 1 }));
    updateData({ arbres_ombrage: updated });
  };
  const clearPolygon = () => { if (window.confirm('Effacer tout le trace ?')) updateData({ polygon: [] }); };
  const clearTrees = () => { if (window.confirm('Supprimer tous les arbres ?')) updateData({ arbres_ombrage: [] }); };

  const locate = () => {
    if (!navigator.geolocation) { toast.error('Geolocalisation non disponible'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 17); },
      () => toast.error('Impossible d\'obtenir la position'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // ---- GPS TRACKING ----
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocalisation non disponible sur cet appareil'); return; }

    // Clear existing polygon
    updateData({ polygon: [] });
    setMode(null);
    setTracking(true);
    setTrackElapsed(0);
    setTrackAccuracy(null);
    trackingStartRef.current = Date.now();

    toast.success('GPS Tracking demarre - Marchez le long des limites de la parcelle');

    const polygonRef = { current: [] };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt = [pos.coords.latitude, pos.coords.longitude];
        setCurrentPos(pt);
        setTrackAccuracy(Math.round(pos.coords.accuracy));

        const prev = polygonRef.current;
        // Only add point if far enough from last one
        if (prev.length === 0 || distanceM(prev[prev.length - 1], pt) >= MIN_TRACK_DISTANCE_M) {
          const next = [...prev, pt];
          polygonRef.current = next;
          updateData({ polygon: next });
        }
      },
      (err) => {
        toast.error(`Erreur GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 }
    );
  }, [updateData]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setCurrentPos(null);
    setTrackAccuracy(null);

    const pts = polygon.length;
    if (pts >= 3) {
      toast.success(`Trace termine ! ${pts} points enregistres. Le polygone est ferme.`);
    } else {
      toast.info(`Seulement ${pts} point(s) enregistre(s). Continuez ou ajoutez des points manuellement.`);
    }
  }, [polygon.length]);

  // Timer for tracking duration
  useEffect(() => {
    if (!tracking) return;
    const interval = setInterval(() => {
      if (trackingStartRef.current) setTrackElapsed(Math.floor((Date.now() - trackingStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [tracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ---- Capture ----
  const captureMap = async () => {
    if (!containerRef.current) return null;
    setCapturing(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#2D3B2D', logging: false,
        width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight,
      });
      const base64 = canvas.toDataURL('image/png', 0.85);
      updateData({ map_snapshot: base64 });
      toast.success('Carte capturee pour le PDF');
      return base64;
    } catch (_) {
      toast.error('Erreur lors de la capture');
      return null;
    } finally {
      setCapturing(false);
    }
  };

  // ---- Area & perimeter (real-time) ----
  const surfaceHa = geodesicAreaHa(polygon).toFixed(2);
  const perimeter = perimeterM(polygon);
  const defaultCenter = polygon.length > 0 ? polygon[0] : [6.8, -5.3];

  // Whether vertices should be draggable (not tracking, not drawing polygon, not readOnly)
  const verticesDraggable = !readOnly && !tracking && mode !== 'polygon';

  return (
    <div className="space-y-3" data-testid="parcel-map-garmin">
      {/* Info box */}
      <div className="bg-[#2D3B2D] rounded-md p-3 border border-[#4A5C4A]">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="text-[#C8E6C9] font-mono"><span className="text-[#81C784]">Prod: </span>{producerInfo.nom || '-'}</span>
          <span className="text-[#C8E6C9] font-mono"><span className="text-[#81C784]">Vill: </span>{producerInfo.village || '-'}</span>
          <span className="text-[#C8E6C9] font-mono"><span className="text-[#81C784]">Sup: </span>{surfaceHa} ha</span>
          <span className="text-[#C8E6C9] font-mono"><span className="text-[#81C784]">Per: </span>{perimeter}m</span>
          <span className="text-[#C8E6C9] font-mono"><span className="text-[#81C784]">Pts: </span>{polygon.length}</span>
          <span className="text-[#C8E6C9] font-mono"><span className="text-[#81C784]">Arbres: </span>{trees.length}</span>
        </div>
      </div>

      {/* Tracking banner */}
      {tracking && (
        <div className="bg-red-900/90 border border-red-500 rounded-md p-3 flex items-center justify-between animate-pulse" data-testid="tracking-banner">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <div>
              <p className="text-sm font-bold text-white font-mono">GPS TRACKING EN COURS</p>
              <p className="text-xs text-red-200 font-mono">
                Temps: {formatDuration(trackElapsed)} | Points: {polygon.length} | Dist: {perimeter}m
                {trackAccuracy !== null && ` | Precision: ±${trackAccuracy}m`}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={stopTracking} className="bg-red-600 hover:bg-red-700 text-white h-10" data-testid="tracking-stop-btn">
            <Square className="w-4 h-4 mr-1 fill-current" /> Arreter
          </Button>
        </div>
      )}

      {/* Rectangle snap prompt */}
      {rectPrompt && (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3 flex items-center justify-between shadow-md" data-testid="rect-prompt">
          <div className="flex items-center gap-2">
            <Move className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-bold text-blue-900">Fermer en rectangle ?</p>
              <p className="text-xs text-blue-600">Le 4e point est proche du 1er. Ajuster en rectangle parfait ?</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={acceptRectangle} className="bg-blue-600 hover:bg-blue-700 text-white h-9" data-testid="rect-accept">
              <Check className="w-4 h-4 mr-1" /> Oui
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setRectPrompt(false); setMode(null); }} className="h-9 border-blue-300" data-testid="rect-decline">
              Non
            </Button>
          </div>
        </div>
      )}

      {/* Polygon closed banner */}
      {polygon.length >= 3 && !tracking && mode !== 'polygon' && !rectPrompt && (
        <div className="bg-[#E8F0EA] border border-[#1A3622]/20 rounded-md p-2.5 flex items-center gap-2" data-testid="polygon-closed-banner">
          <CheckCircle2 className="w-4 h-4 text-[#1A3622] flex-shrink-0" />
          <p className="text-xs text-[#1A3622] font-semibold">
            Polygone ferme — {polygon.length} points, {surfaceHa} ha, perimetre {perimeter}m
          </p>
          {verticesDraggable && (
            <span className="text-[10px] text-[#6B7280] ml-auto flex items-center gap-1">
              <Move className="w-3 h-3" /> Glissez les points pour ajuster
            </span>
          )}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-md overflow-hidden border-2 border-[#4A5C4A]" ref={containerRef} style={{ height: 420 }}>
        <MapContainer center={defaultCenter} zoom={15} style={{ height: '100%', width: '100%', background: '#2D3B2D' }} ref={mapRef} attributionControl={false} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />

          {/* Closed polygon (3+ points, not tracking) */}
          {polygon.length >= 3 && !tracking && (
            <Polygon positions={polygon} pathOptions={{ color: '#3B82F6', weight: 3, fillColor: '#3B82F6', fillOpacity: 0.15 }} />
          )}

          {/* Open polyline during tracking */}
          {polygon.length >= 2 && tracking && (
            <Polyline positions={polygon} pathOptions={{ color: '#3B82F6', weight: 3, dashArray: '8 4' }} />
          )}

          {/* Polygon vertices (draggable when not tracking/drawing) */}
          {polygon.map((pt, i) => (
            <DraggableVertex
              key={`v-${i}-${pt[0]}-${pt[1]}`}
              position={pt}
              index={i}
              onDragEnd={handleVertexDrag}
              isDraggable={verticesDraggable}
            />
          ))}

          {/* Current position (blue pulsing dot) */}
          {currentPos && tracking && (
            <CircleMarker center={currentPos} radius={10} pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.6, weight: 3 }}>
              <Popup className="text-xs">Position actuelle<br />{currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}</Popup>
            </CircleMarker>
          )}

          {/* Tree markers */}
          {trees.map((t, i) => (
            <Marker key={`t-${i}-${t.lat}`} position={[t.lat, t.lng]} icon={treeIcon}>
              <Popup>
                <div className="text-xs">
                  <b>Arbre #{t.numero}</b><br />
                  {t.lat.toFixed(5)}, {t.lng.toFixed(5)}
                  {t.nom_botanique && <><br /><b>Bot:</b> {t.nom_botanique}</>}
                  {t.nom_local && <><br /><b>Local:</b> {t.nom_local}</>}
                  {t.circonference && <><br /><b>Circ:</b> {t.circonference} cm</>}
                  {t.decision && <><br /><b>Dec:</b> {t.decision}</>}
                </div>
              </Popup>
            </Marker>
          ))}

          {!readOnly && !tracking && <MapClickHandler mode={mode} onAddVertex={handleAddVertex} onAddTree={handleAddTree} />}
          {tracking && currentPos && <FollowPosition position={currentPos} />}
          {!tracking && (polygon.length > 0 || trees.length > 0) && <FitBounds polygon={polygon} trees={trees} />}
        </MapContainer>

        <MapControls
          onZoomIn={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 15) + 1)}
          onZoomOut={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 15) - 1)}
          onLocate={locate}
        />

        {/* Mode indicator */}
        {mode && !tracking && (
          <div className="absolute top-3 left-3 z-[1000]">
            <Badge className={`text-xs px-2 py-1 ${mode === 'polygon' ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-black'}`}>
              {mode === 'polygon' ? 'Mode: Trace parcelle' : 'Mode: Marquer arbre'}
              <span className="ml-1 opacity-70">( cliquez sur la carte )</span>
            </Badge>
          </div>
        )}

        {/* Offline cache indicator */}
        <div className="absolute top-3 right-3 z-[1000]" data-testid="map-cache-indicator">
          {navigator.onLine ? (
            <Badge className="bg-emerald-600/90 text-white text-[10px] px-2 py-1 flex items-center gap-1">
              <Wifi className="w-3 h-3" /> En ligne
            </Badge>
          ) : (
            <Badge className="bg-amber-600/90 text-white text-[10px] px-2 py-1 flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Cache hors-ligne
            </Badge>
          )}
        </div>
      </div>

      {/* Tiles download for this parcel zone */}
      {!readOnly && (
        <TilesDownloader
          polygon={polygon}
          centerLat={defaultCenter[0]}
          centerLng={defaultCenter[1]}
          radiusKm={1}
          compact
        />
      )}

      {/* Action buttons */}
      {!readOnly && (
        <div className="space-y-2">
          {/* PERMANENT GPS TREE BUTTON — always visible */}
          <Button
            size="lg"
            onClick={handleAddTreeGPS}
            disabled={gpsTreeLoading || !!treeForm}
            className="w-full h-16 text-base font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black border-2 border-amber-600 shadow-lg active:scale-[0.98] transition-transform"
            data-testid="map-btn-add-tree-gps"
          >
            {gpsTreeLoading ? (
              <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Localisation GPS...</>
            ) : (
              <><Crosshair className="w-6 h-6 mr-2" /> Ajouter arbre ici</>
            )}
          </Button>

          {/* Tree quick form */}
          {treeForm && (
            <div className="bg-[#FFFDE7] border-2 border-amber-400 rounded-lg p-4 space-y-3 shadow-md" data-testid="tree-quick-form">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TreePine className="w-5 h-5 text-amber-700" />
                  <span className="text-sm font-bold text-amber-900">Arbre #{treeForm.numero}</span>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{treeForm.lat.toFixed(5)}, {treeForm.lng.toFixed(5)}</span>
                </div>
                <button onClick={() => setTreeForm(null)} className="text-amber-600 hover:text-amber-900" data-testid="tree-form-cancel">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-amber-800 uppercase">Nom botanique</label>
                  <Input
                    value={treeForm.nom_botanique}
                    onChange={(e) => setTreeForm(f => ({ ...f, nom_botanique: e.target.value }))}
                    placeholder="Ex: Terminalia superba"
                    className="h-9 text-sm bg-white border-amber-300 focus:border-amber-500"
                    data-testid="tree-form-nom-botanique"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-amber-800 uppercase">Nom local</label>
                  <Input
                    value={treeForm.nom_local}
                    onChange={(e) => setTreeForm(f => ({ ...f, nom_local: e.target.value }))}
                    placeholder="Ex: Fraké"
                    className="h-9 text-sm bg-white border-amber-300 focus:border-amber-500"
                    data-testid="tree-form-nom-local"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-amber-800 uppercase">Circonference (cm)</label>
                  <Input
                    value={treeForm.circonference}
                    onChange={(e) => setTreeForm(f => ({ ...f, circonference: e.target.value }))}
                    placeholder="Ex: 120"
                    className="h-9 text-sm bg-white border-amber-300 focus:border-amber-500"
                    data-testid="tree-form-circonference"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-amber-800 uppercase">Origine</label>
                  <select
                    value={treeForm.origine}
                    onChange={(e) => setTreeForm(f => ({ ...f, origine: e.target.value }))}
                    className="w-full h-9 text-sm bg-white border border-amber-300 rounded-md px-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    data-testid="tree-form-origine"
                  >
                    <option value="">Choisir...</option>
                    <option value="naturelle">Naturelle</option>
                    <option value="plantee">Plantee</option>
                    <option value="spontanee">Spontanee</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-amber-800 uppercase">Decision</label>
                <select
                  value={treeForm.decision}
                  onChange={(e) => setTreeForm(f => ({ ...f, decision: e.target.value }))}
                  className="w-full h-9 text-sm bg-white border border-amber-300 rounded-md px-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  data-testid="tree-form-decision"
                >
                  <option value="">Choisir...</option>
                  <option value="conserver">Conserver</option>
                  <option value="abattre">Abattre</option>
                  <option value="elaguer">Elaguer</option>
                  <option value="remplacer">Remplacer</option>
                </select>
              </div>
              <Button
                onClick={saveTreeForm}
                className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                data-testid="tree-form-save"
              >
                <Check className="w-5 h-5 mr-2" /> Enregistrer arbre #{treeForm.numero}
              </Button>
            </div>
          )}

          {/* GPS Tracking row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {!tracking ? (
              <Button
                size="sm"
                onClick={startTracking}
                className="h-14 text-sm font-bold bg-[#2D3B2D] hover:bg-[#3E4F3E] text-[#4ADE80] border-2 border-[#4ADE80]"
                data-testid="map-btn-start-tracking"
              >
                <Radio className="w-6 h-6 mr-2" /> Enregistrer le parcours GPS
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={stopTracking}
                className="h-14 text-sm font-bold bg-red-700 hover:bg-red-800 text-white border-2 border-red-500"
                data-testid="map-btn-stop-tracking"
              >
                <Square className="w-5 h-5 mr-2 fill-current" /> Arreter le parcours
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={captureMap}
              disabled={capturing || tracking}
              className="h-14 text-sm font-semibold border-[#1A3622] text-[#1A3622] hover:bg-[#E8F0EA]"
              data-testid="map-btn-capture"
            >
              <Camera className="w-5 h-5 mr-2" /> {capturing ? 'Capture...' : 'Capturer pour PDF'}
            </Button>
          </div>

          {/* Manual mode row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="map-actions">
            <Button
              variant={mode === 'polygon' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode(mode === 'polygon' ? null : 'polygon')}
              disabled={tracking}
              className={`h-11 text-xs font-semibold ${mode === 'polygon' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-[#4A5C4A] text-[#1A3622] hover:bg-[#E8F0EA]'}`}
              data-testid="map-btn-polygon"
            >
              <Route className="w-4 h-4 mr-1" /> Trace manuel
            </Button>
            {mode === 'polygon' && polygon.length >= 3 && (
              <Button
                size="sm"
                onClick={finishTrace}
                className="h-11 text-xs font-bold bg-[#1A3622] hover:bg-[#112417] text-white"
                data-testid="map-btn-finish-trace"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Terminer le trace
              </Button>
            )}
            <Button
              variant={mode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode(mode === 'tree' ? null : 'tree')}
              disabled={tracking}
              className={`h-11 text-xs font-semibold ${mode === 'tree' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'border-[#4A5C4A] text-[#1A3622] hover:bg-[#E8F0EA]'}`}
              data-testid="map-btn-tree"
            >
              <TreePine className="w-4 h-4 mr-1" /> Marquer arbre
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={removeLastVertex}
              disabled={polygon.length === 0 || tracking}
              className="h-11 text-xs border-[#4A5C4A] text-[#6B7280] hover:bg-gray-50"
              data-testid="map-btn-undo"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Annuler point
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearPolygon}
              disabled={polygon.length === 0 || tracking}
              className="h-11 text-xs border-red-200 text-red-500 hover:bg-red-50"
              data-testid="map-btn-clear"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Effacer trace
            </Button>
          </div>
        </div>
      )}

      {/* Waypoints list */}
      {(polygon.length > 0 || trees.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {polygon.length > 0 && (
            <div className="bg-[#2D3B2D] rounded-md p-3 border border-[#4A5C4A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#81C784] font-mono flex items-center gap-1">
                  <Route className="w-3.5 h-3.5" /> Parcelle ({polygon.length} pts, {surfaceHa} ha, {perimeter}m)
                </span>
              </div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {polygon.map((pt, i) => (
                  <div key={`wp-${i}-${pt[0]}-${pt[1]}`} className="text-[10px] font-mono text-[#A5D6A7]">
                    WPT{String(i + 1).padStart(2, '0')} {pt[0].toFixed(5)}N {pt[1].toFixed(5)}W
                  </div>
                ))}
              </div>
            </div>
          )}
          {trees.length > 0 && (
            <div className="bg-[#2D3B2D] rounded-md p-3 border border-[#4A5C4A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#FDD835] font-mono flex items-center gap-1">
                  <TreePine className="w-3.5 h-3.5" /> Arbres d'ombrage ({trees.length})
                </span>
                {!readOnly && (
                  <button onClick={clearTrees} className="text-red-400 hover:text-red-300 text-xs" data-testid="map-clear-trees">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {trees.map((t, i) => (
                  <div key={`tree-${i}-${t.lat}`} className="flex items-center justify-between text-[10px] font-mono text-[#FFF9C4]">
                    <span>
                      #{t.numero} {t.lat.toFixed(5)}N {t.lng.toFixed(5)}W
                      {t.nom_botanique && ` ${t.nom_botanique}`}
                      {t.nom_local && ` (${t.nom_local})`}
                      {t.circonference && ` ${t.circonference}cm`}
                      {t.decision && <span className={`ml-1 px-1 rounded ${t.decision === 'conserver' ? 'bg-green-800' : t.decision === 'abattre' ? 'bg-red-800' : 'bg-yellow-800'}`}>{t.decision}</span>}
                    </span>
                    {!readOnly && (
                      <button onClick={() => removeTree(i)} className="text-red-400 hover:text-red-300 ml-2">x</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Snapshot preview */}
      {data?.map_snapshot && (
        <div className="border border-[#E5E5E0] rounded-md p-2">
          <p className="text-[10px] text-[#6B7280] mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Apercu de la carte pour le PDF</p>
          <img src={data.map_snapshot} alt="Carte parcelle" className="w-full max-h-48 object-contain rounded" data-testid="map-snapshot-preview" />
        </div>
      )}
    </div>
  );
};

export default ParcelMapGarmin;
