/**
 * MobileAppShell — Container mobile natif pour les vues Agent/Farmer
 * Fournit : safe areas, bottom tab bar, header, pull-to-refresh
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOffline } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';

export const MobileAppShell = ({
  children,
  tabs = [],
  activeTab,
  onTabChange,
  title,
  subtitle,
  headerRight,
  headerGradient = 'from-emerald-600 to-emerald-700',
  statusBarColor = 'bg-emerald-700',
  onRefresh,
  refreshing = false,
}) => {
  const { isOnline, syncing, pendingCount } = useOffline();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex justify-center min-h-screen bg-slate-100" data-testid="mobile-app-shell">
      {/* Mobile container — max 430px, full height */}
      <div className="w-full max-w-[430px] min-h-screen bg-white flex flex-col relative shadow-2xl">

        {/* Status Bar */}
        <div className={`${statusBarColor} px-4 py-1.5 flex items-center justify-between text-white text-[11px] font-medium`}>
          <span>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-2">
            {syncing && <RefreshCw className="w-3 h-3 animate-spin" />}
            {pendingCount > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{pendingCount}</span>
            )}
            {isOnline ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-300" />
            )}
            <span className="w-5 h-2.5 bg-white/80 rounded-sm" />
          </div>
        </div>

        {/* Header */}
        {title && (
          <div className={`bg-gradient-to-r ${headerGradient} px-5 pt-4 pb-5 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold leading-tight" data-testid="mobile-header-title">{title}</h1>
                {subtitle && <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>}
              </div>
              {headerRight && <div>{headerRight}</div>}
            </div>
          </div>
        )}

        {/* Offline banner inside mobile shell */}
        {!isOnline && (
          <div className="bg-amber-500 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs" data-testid="mobile-offline-banner">
            <WifiOff className="w-3 h-3" />
            <span>Mode hors-ligne — Les données affichées sont en cache</span>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-20" data-testid="mobile-content-area">
          {/* Pull to refresh indicator */}
          {refreshing && (
            <div className="flex justify-center py-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          )}
          {children}
        </div>

        {/* Bottom Tab Bar */}
        {tabs.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pt-1.5 pb-5 flex items-center justify-around" data-testid="mobile-bottom-tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.route) navigate(tab.route);
                    else if (onTabChange) onTabChange(tab.id);
                  }}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[56px] ${
                    isActive ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                  data-testid={`mobile-tab-${tab.id}`}
                >
                  <div className={`p-1 rounded-full transition-all ${isActive ? 'bg-emerald-50' : ''}`}>
                    <tab.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {tab.label}
                  </span>
                  {tab.badge > 0 && (
                    <span className="absolute -top-0.5 right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
