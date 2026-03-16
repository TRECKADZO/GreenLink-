import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '../components/ui/button';

const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Ne montrer que si l'utilisateur n'a pas déjà refusé
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Vérifier si déjà installé en mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div
      data-testid="pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-emerald-900 border border-emerald-700 rounded-xl p-4 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="bg-emerald-700 rounded-lg p-2 shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Installer GreenLink</p>
          <p className="text-emerald-200 text-xs mt-0.5">
            Accédez à l'app hors-ligne depuis votre écran d'accueil
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              data-testid="pwa-install-button"
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs"
              onClick={handleInstall}
            >
              Installer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-300 hover:text-white h-8 text-xs"
              onClick={handleDismiss}
            >
              Plus tard
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-emerald-500 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
