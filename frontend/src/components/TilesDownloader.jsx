/**
 * TilesDownloader — Bouton + barre de progression pour le pre-telechargement des tuiles
 * Utilise dans le dashboard Agent Terrain et la carte Garmin du PDC
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Download, CheckCircle2, AlertTriangle, Trash2, HardDrive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateTileUrls,
  boundsFromPolygon,
  requestTilesPrecache,
  requestTilesCacheStats,
  requestClearTilesCache,
} from '../services/tilesCacheService';

const TilesDownloader = ({
  centerLat,
  centerLng,
  radiusKm,
  polygon,
  compact = false,
  showClear = true,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [complete, setComplete] = useState(false);
  const [cacheStats, setCacheStats] = useState({ count: 0, estimatedMB: '0' });
  const [loadingStats, setLoadingStats] = useState(false);

  const refreshStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const stats = await requestTilesCacheStats();
      setCacheStats(stats);
    } catch { /* ignore */ }
    setLoadingStats(false);
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Ecouter les messages du SW pour la progression
  useEffect(() => {
    const handler = (event) => {
      const { data } = event;
      if (data?.type === 'TILES_PRECACHE_PROGRESS') {
        setDone(data.done);
        setTotal(data.total);
        setProgress(data.percent);
      }
      if (data?.type === 'TILES_PRECACHE_COMPLETE') {
        setDownloading(false);
        setComplete(true);
        setProgress(100);
        refreshStats();
        toast.success(`Cartes telechargees — ${data.done - data.errors} tuiles en cache`);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [refreshStats]);

  const handleDownload = async () => {
    setDownloading(true);
    setComplete(false);
    setProgress(0);
    setDone(0);

    try {
      let lat = centerLat, lng = centerLng, radius = radiusKm || 1;

      // Si polygon fourni, calculer centre et rayon
      if (polygon && polygon.length > 0) {
        const bounds = boundsFromPolygon(polygon);
        lat = bounds.lat;
        lng = bounds.lng;
        radius = bounds.radiusKm;
      }

      if (!lat || !lng) {
        // Essayer la geolocalisation
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          toast.error('Position GPS non disponible');
          setDownloading(false);
          return;
        }
      }

      const urls = generateTileUrls(lat, lng, radius, 10, 17);
      setTotal(urls.length);

      await requestTilesPrecache(urls);
      // Le SW enverra des messages TILES_PRECACHE_PROGRESS
    } catch (e) {
      toast.error('Erreur: ' + (e.message || 'Service Worker non disponible'));
      setDownloading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Supprimer toutes les tuiles en cache ?')) return;
    await requestClearTilesCache();
    setCacheStats({ count: 0, estimatedMB: '0' });
    setComplete(false);
    setProgress(0);
    toast.success('Cache tuiles vide');
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="tiles-downloader-compact">
        <Button
          size="sm"
          variant={complete ? 'outline' : 'default'}
          onClick={handleDownload}
          disabled={downloading}
          className={complete ? 'border-emerald-600 text-emerald-700' : 'bg-[#1A3622] hover:bg-[#112417] text-white'}
          data-testid="tiles-download-btn"
        >
          {downloading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {progress}%</>
          ) : complete ? (
            <><CheckCircle2 className="w-4 h-4 mr-1" /> En cache</>
          ) : (
            <><Download className="w-4 h-4 mr-1" /> Cartes zone</>
          )}
        </Button>
        {downloading && (
          <div className="flex-1 max-w-[120px]">
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-xl p-4 space-y-3" data-testid="tiles-downloader">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#E8F0EA] flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-[#1A3622]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A3622]">Cartes hors-ligne</p>
            <p className="text-xs text-[#6B7280]">
              {loadingStats ? '...' : `${cacheStats.count} tuiles — ${cacheStats.estimatedMB} Mo`}
            </p>
          </div>
        </div>
        {showClear && cacheStats.count > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-500 hover:text-red-700 hover:bg-red-50" data-testid="tiles-clear-btn">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Barre de progression */}
      {downloading && (
        <div className="space-y-1" data-testid="tiles-progress">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-[#6B7280] text-center">
            Telechargement en cours... {done}/{total} tuiles ({progress}%)
          </p>
        </div>
      )}

      {/* Message de succes */}
      {complete && !downloading && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2" data-testid="tiles-complete">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-700">
            Cartes de la zone telechargees — Vous pouvez maintenant travailler hors-ligne
          </p>
        </div>
      )}

      {/* Bouton de telechargement */}
      <Button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full bg-[#1A3622] hover:bg-[#112417] text-white"
        data-testid="tiles-download-btn"
      >
        {downloading ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Telechargement... {progress}%</>
        ) : complete ? (
          <><CheckCircle2 className="w-4 h-4 mr-2" /> Mettre a jour les cartes</>
        ) : (
          <><Download className="w-4 h-4 mr-2" /> Telecharger cartes de la zone</>
        )}
      </Button>
    </div>
  );
};

export default TilesDownloader;
