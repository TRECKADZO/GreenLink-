import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => {
        console.log('[PWA] Service Worker enregistré:', reg.scope);

        // Écouter les messages du SW pour Background Sync
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SYNC_AVAILABLE') {
            window.dispatchEvent(new CustomEvent('sw-sync-available'));
          }
        });
      })
      .catch((err) => console.log('[PWA] Erreur SW:', err));
  });
}
