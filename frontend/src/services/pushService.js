/**
 * Web Push Notifications Service
 * Gère l'abonnement aux notifications push navigateur
 */
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/push`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushService = {
  /**
   * Vérifie si les notifications push sont supportées
   */
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  /**
   * Vérifie l'état actuel de la permission
   */
  getPermissionState() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission; // 'granted', 'denied', 'default'
  },

  /**
   * Initialise le Service Worker et s'abonne aux notifications
   */
  async init() {
    if (!this.isSupported()) return false;
    if (Notification.permission === 'denied') return false;

    try {
      // Enregistrer le Service Worker
      const registration = await navigator.serviceWorker.register('/sw-push.js');

      // Si déjà autorisé, s'abonner directement
      if (Notification.permission === 'granted') {
        await this.subscribe(registration);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[Push] Init error:', err);
      return false;
    }
  },

  /**
   * Demande la permission et s'abonne
   */
  async requestPermission() {
    if (!this.isSupported()) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      const registration = await navigator.serviceWorker.ready;
      await this.subscribe(registration);
      return true;
    } catch (err) {
      console.error('[Push] Permission error:', err);
      return false;
    }
  },

  /**
   * S'abonner aux notifications push
   */
  async subscribe(registration) {
    try {
      // Récupérer la clé VAPID du serveur
      const { data } = await axios.get(`${API}/vapid-key`);
      const applicationServerKey = urlBase64ToUint8Array(data.public_key);

      // Créer l'abonnement push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      const subJson = subscription.toJSON();

      // Envoyer l'abonnement au serveur
      await axios.post(`${API}/subscribe`, {
        endpoint: subJson.endpoint,
        keys: subJson.keys
      }, { headers: getAuthHeaders() });

      return true;
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      return false;
    }
  },

  /**
   * Se désabonner
   */
  async unsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      await axios.delete(`${API}/unsubscribe`, { headers: getAuthHeaders() });
      return true;
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
      return false;
    }
  }
};

export default pushService;
