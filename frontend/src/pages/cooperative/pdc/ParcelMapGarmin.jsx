import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import { MapPin, TreePine, Route, Camera, Trash2, RotateCcw, Navigation, ZoomIn, ZoomOut, Save } from 'lucide-react';

// Tree pin icon (yellow)
const treeIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:#FBBF24;border:2px solid #92400E;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);font-size:13px;">🌳</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Polygon vertex icon
const vertexIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#3B82F6;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Controls overlay for Garmin style
const MapControls = ({ onZoomIn, onZoomOut, onLocate }) => (
  <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
    <button onClick={onZoomIn} className="w-11 h-11 bg-[#2D3B2D] border border-[#4A5C4A] rounded-md flex items-center justify-center text-[#C8E6C9] active:bg-[#3E4F3E] shadow-md" data-testid="map-zoom-in">
      <ZoomIn className="w-5 h-5" />
    </button>
    <button onClick={onZoomOut} className="w-11 h-11 bg-[#2D3B2D] border border-[#4A5C4A] rounded-md flex items-center justify-center text-[#C8E6C9] active:bg-[#3E4F3E] shadow-md" data-testid="map-zoom-out">
      <ZoomOut className="w-5 h-5" />
    </button>
    <button onClick={onLocate} className="w-11 h-11 bg-[#2D3B2D] border border-[#4A5C4A] rounded-md flex items-center justify-center text-[#C8E6C9] active:bg-[#3E4F3E] shadow-md" data-testid="map-locate">
      <Navigation className="w-5 h-5" />
    </button>
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

// Auto-fit map to data
const FitBounds = ({ polygon, trees }) => {
  const map = useMap();
  useEffect(() => {
    const pts = [...(polygon || []), ...(trees || []).map(t => [t.lat, t.lng])];
    if (pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts).pad(0.15));
    }
  }, [map, polygon, trees]);
  return null;
};

const ParcelMapGarmin = ({ data, onChange, readOnly = false, producerInfo = {} }) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [mode, setMode] = useState(null); // null, 'polygon', 'tree'
  const [capturing, setCapturing] = useState(false);

  const polygon = data?.polygon || [];
  const trees = data?.arbres_ombrage || [];

  const updateData = useCallback((updates) => {
    onChange({ ...data, ...updates });
  }, [data, onChange]);

  const handleAddVertex = useCallback((pt) => {
    updateData({ polygon: [...polygon, pt] });
  }, [polygon, updateData]);

  const handleAddTree = useCallback((tree) => {
    const num = trees.length + 1;
    updateData({ arbres_ombrage: [...trees, { ...tree, numero: num }] });
  }, [trees, updateData]);

  const removeLastVertex = () => {
    if (polygon.length > 0) updateData({ polygon: polygon.slice(0, -1) });
  };

  const removeTree = (idx) => {
    const updated = trees.filter((_, i) => i !== idx).map((t, i) => ({ ...t, numero: i + 1 }));
    updateData({ arbres_ombrage: updated });
  };

  const clearPolygon = () => {
    if (window.confirm('Effacer tout le trace ?')) updateData({ polygon: [] });
  };

  const clearTrees = () => {
    if (window.confirm('Supprimer tous les arbres ?')) updateData({ arbres_ombrage: [] });
  };

  const locate = () => {
    if (!navigator.geolocation) { toast.error('Geolocalisation non disponible'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current;
        if (map) map.setView([pos.coords.latitude, pos.coords.longitude], 17);
      },
      () => toast.error('Impossible d\'obtenir la position'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const captureMap = async () => {
    if (!containerRef.current) return null;
    setCapturing(true);
    try {
      // Wait for tiles to render
      await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#2D3B2D',
        logging: false,
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
      const base64 = canvas.toDataURL('image/png', 0.85);
      updateData({ map_snapshot: base64 });
      toast.success('Carte capturee pour le PDF');
      return base64;
    } catch (e) {
      toast.error('Erreur lors de la capture');
      return null;
    } finally {
      setCapturing(false);
    }
  };

  // Compute area in hectares
  const computeArea = () => {
    if (polygon.length < 3) return 0;
    const latlngs = polygon.map(p => L.latLng(p[0], p[1]));
    let area = 0;
    for (let i = 0; i < latlngs.length; i++) {
      const j = (i + 1) % latlngs.length;
      area += latlngs[i].lng * latlngs[j].lat;
      area -= latlngs[j].lng * latlngs[i].lat;
    }
    area = Math.abs(area) / 2;
    // Rough degree to meter conversion at Côte d'Ivoire latitude (~7°N)
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * Math.cos(7 * Math.PI / 180);
    const areaM2 = area * mPerDegLat * mPerDegLng;
    return (areaM2 / 10000).toFixed(2);
  };

  const surfaceHa = computeArea();
  const defaultCenter = polygon.length > 0 ? polygon[0] : [6.8, -5.3]; // Default CI

  return (
    <div className="space-y-3" data-testid="parcel-map-garmin">
      {/* Info box - Garmin style */}
      <div className="bg-[#2D3B2D] rounded-md p-3 border border-[#4A5C4A]">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="text-[#C8E6C9] font-mono">
            <span className="text-[#81C784]">Prod: </span>{producerInfo.nom || '-'}
          </span>
          <span className="text-[#C8E6C9] font-mono">
            <span className="text-[#81C784]">Vill: </span>{producerInfo.village || '-'}
          </span>
          <span className="text-[#C8E6C9] font-mono">
            <span className="text-[#81C784]">Sup: </span>{surfaceHa} ha
          </span>
          <span className="text-[#C8E6C9] font-mono">
            <span className="text-[#81C784]">Pts: </span>{polygon.length}
          </span>
          <span className="text-[#C8E6C9] font-mono">
            <span className="text-[#81C784]">Arbres: </span>{trees.length}
          </span>
        </div>
      </div>

      {/* Map container */}
      <div className="relative rounded-md overflow-hidden border-2 border-[#4A5C4A]" ref={containerRef} style={{ height: 420 }}>
        <MapContainer
          center={defaultCenter}
          zoom={15}
          style={{ height: '100%', width: '100%', background: '#2D3B2D' }}
          ref={mapRef}
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Polygon */}
          {polygon.length >= 3 && (
            <Polygon
              positions={polygon}
              pathOptions={{ color: '#3B82F6', weight: 3, fillColor: '#3B82F6', fillOpacity: 0.15 }}
            />
          )}

          {/* Polygon vertices */}
          {polygon.map((pt, i) => (
            <Marker key={`v-${i}-${pt[0]}`} position={pt} icon={vertexIcon}>
              <Popup className="text-xs">WPT {i + 1}: {pt[0].toFixed(5)}, {pt[1].toFixed(5)}</Popup>
            </Marker>
          ))}

          {/* Tree markers */}
          {trees.map((t, i) => (
            <Marker key={`t-${i}-${t.lat}`} position={[t.lat, t.lng]} icon={treeIcon}>
              <Popup>
                <div className="text-xs">
                  <b>Arbre #{t.numero}</b><br />
                  {t.lat.toFixed(5)}, {t.lng.toFixed(5)}
                  {t.nom && <><br />{t.nom}</>}
                </div>
              </Popup>
            </Marker>
          ))}

          {!readOnly && <MapClickHandler mode={mode} onAddVertex={handleAddVertex} onAddTree={handleAddTree} />}
          {(polygon.length > 0 || trees.length > 0) && <FitBounds polygon={polygon} trees={trees} />}
        </MapContainer>

        <MapControls
          onZoomIn={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 15) + 1)}
          onZoomOut={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 15) - 1)}
          onLocate={locate}
        />

        {/* Mode indicator */}
        {mode && (
          <div className="absolute top-3 left-3 z-[1000]">
            <Badge className={`text-xs px-2 py-1 ${mode === 'polygon' ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-black'}`}>
              {mode === 'polygon' ? 'Mode: Trace parcelle' : 'Mode: Marquer arbre'}
              <span className="ml-1 opacity-70">( cliquez sur la carte )</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Action buttons - Garmin big tactile style */}
      {!readOnly && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="map-actions">
          <Button
            variant={mode === 'polygon' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode(mode === 'polygon' ? null : 'polygon')}
            className={`h-12 text-xs font-semibold ${mode === 'polygon' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-[#4A5C4A] text-[#1A3622] hover:bg-[#E8F0EA]'}`}
            data-testid="map-btn-polygon"
          >
            <Route className="w-5 h-5 mr-1.5" /> Tracer parcelle
          </Button>
          <Button
            variant={mode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode(mode === 'tree' ? null : 'tree')}
            className={`h-12 text-xs font-semibold ${mode === 'tree' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'border-[#4A5C4A] text-[#1A3622] hover:bg-[#E8F0EA]'}`}
            data-testid="map-btn-tree"
          >
            <TreePine className="w-5 h-5 mr-1.5" /> Marquer arbre
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={removeLastVertex}
            disabled={polygon.length === 0}
            className="h-12 text-xs border-[#4A5C4A] text-[#6B7280] hover:bg-gray-50"
            data-testid="map-btn-undo"
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Annuler point
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={captureMap}
            disabled={capturing}
            className="h-12 text-xs border-[#1A3622] text-[#1A3622] hover:bg-[#E8F0EA]"
            data-testid="map-btn-capture"
          >
            <Camera className="w-4 h-4 mr-1" /> {capturing ? 'Capture...' : 'Capturer pour PDF'}
          </Button>
        </div>
      )}

      {/* Waypoints list */}
      {(polygon.length > 0 || trees.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Polygon waypoints */}
          {polygon.length > 0 && (
            <div className="bg-[#2D3B2D] rounded-md p-3 border border-[#4A5C4A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#81C784] font-mono flex items-center gap-1">
                  <Route className="w-3.5 h-3.5" /> Parcelle ({polygon.length} pts, {surfaceHa} ha)
                </span>
                {!readOnly && (
                  <button onClick={clearPolygon} className="text-red-400 hover:text-red-300 text-xs" data-testid="map-clear-polygon">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {polygon.map((pt, i) => (
                  <div key={`wp-${i}-${pt[0]}`} className="text-[10px] font-mono text-[#A5D6A7]">
                    WPT{String(i + 1).padStart(2, '0')} {pt[0].toFixed(5)}N {pt[1].toFixed(5)}W
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tree list */}
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
                    <span>#{t.numero} {t.lat.toFixed(5)}N {t.lng.toFixed(5)}W {t.nom && `(${t.nom})`}</span>
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
          <p className="text-[10px] text-[#6B7280] mb-1 flex items-center gap-1">
            <Camera className="w-3 h-3" /> Apercu de la carte pour le PDF
          </p>
          <img src={data.map_snapshot} alt="Carte parcelle" className="w-full max-h-48 object-contain rounded" data-testid="map-snapshot-preview" />
        </div>
      )}
    </div>
  );
};

export default ParcelMapGarmin;
