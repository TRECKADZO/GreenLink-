/**
 * OfflineBanner — Indicateur visuel global online/offline/sync
 * S'affiche en haut de l'app quand offline ou sync en cours
 */
import React from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, Cloud, Check } from 'lucide-react';
import { useOffline } from '../context/OfflineContext';

export const OfflineBanner = () => {
  const { isOnline, syncing, pendingCount, lastSync, syncAll, syncError } = useOffline();

  // Online + nothing pending → no banner
  if (isOnline && !syncing && pendingCount === 0 && !syncError) return null;

  const formatLastSync = (iso) => {
    if (!iso) return 'Jamais';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return "A l'instant";
    if (diff < 60) return `Il y a ${diff} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (syncing) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-[9999] bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm shadow-lg"
        data-testid="offline-banner-syncing"
      >
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Synchronisation en cours...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600 text-white px-4 py-2 flex items-center justify-between text-sm shadow-lg"
        data-testid="offline-banner-offline"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>Mode hors-ligne</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente
            </span>
          )}
        </div>
        <span className="text-xs text-white/70">
          Dernière sync : {formatLastSync(lastSync)}
        </span>
      </div>
    );
  }

  // Online but has pending actions or sync error
  if (pendingCount > 0 || syncError) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600 text-white px-4 py-2 flex items-center justify-between text-sm shadow-lg cursor-pointer"
        onClick={syncAll}
        data-testid="offline-banner-pending"
      >
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          <span>
            {syncError
              ? `Erreur de sync : ${syncError}`
              : `${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente de synchronisation`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded">
          <RefreshCw className="w-3 h-3" />
          Synchroniser
        </div>
      </div>
    );
  }

  return null;
};
