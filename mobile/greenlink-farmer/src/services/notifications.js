import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification types for the app
export const NOTIFICATION_TYPES = {
  PREMIUM_AVAILABLE: 'carbon_premium_available',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PAYMENT_PENDING: 'payment_pending',
  PREMIUM_REMINDER: 'premium_reminder',
  PARCEL_VERIFIED: 'parcel_verified',
  HARVEST_CONFIRMED: 'harvest_confirmed',
  DISTRIBUTION_COMPLETE: 'distribution_complete',
  TEST: 'test',
};

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationPreferences = null;
  }

  // Demander les permissions et obtenir le token
  async registerForPushNotifications() {
    let token = null;

    if (Platform.OS === 'android') {
      // Create notification channels for different notification types
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GreenLink',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2d5a4d',
      });
      
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Paiements',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#22c55e',
        description: 'Notifications de paiements et primes carbone',
      });
      
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Rappels',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Rappels hebdomadaires et notifications',
      });
      
      // Channel for critical ICI alerts
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Alertes ICI',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#ef4444',
        description: 'Alertes critiques du système SSRTE et ICI',
        enableVibrate: true,
        showBadge: true,
      });
    }

    if (!Device.isDevice) {
      console.log('[NotificationService] Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NotificationService] Push notification permission denied');
      return null;
    }

    try {
      // Get the Expo push token - SDK 53 compatible
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '69cdf51e-6916-433e-99ed-bfdc2e852057',
      });
      token = tokenData.data;

      this.expoPushToken = token;
      await AsyncStorage.setItem('expoPushToken', token);
      
      // Register token on server
      await this.registerTokenOnServer(token);
      
      console.log('[NotificationService] Push token registered:', token);
    } catch (error) {
      console.error('[NotificationService] Error getting push token:', error);
    }

    return token;
  }

  // Register token on backend server
  async registerTokenOnServer(token) {
    try {
      await api.post('/notifications/register-device', {
        push_token: token,
        platform: Platform.OS,
        device_name: Device.modelName || 'Unknown Device',
      });
      console.log('[NotificationService] Token registered on server');
    } catch (error) {
      // Don't throw - this is non-critical
      console.error('[NotificationService] Error registering token on server:', error.message);
    }
  }

  // Unregister device on logout
  async unregisterDevice() {
    try {
      const token = await AsyncStorage.getItem('expoPushToken');
      if (token) {
        await api.delete(`/notifications/unregister-device/${encodeURIComponent(token)}`);
        await AsyncStorage.removeItem('expoPushToken');
        console.log('[NotificationService] Device unregistered');
      }
    } catch (error) {
      console.error('[NotificationService] Error unregistering device:', error.message);
    }
  }

  // Get notification preferences
  async getPreferences() {
    try {
      const response = await api.get('/notifications/preferences');
      this.notificationPreferences = response.data;
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Error getting preferences:', error.message);
      return {
        premium_available: true,
        payment_confirmed: true,
        weekly_reminders: true,
        coop_announcements: true,
        harvest_updates: true,
        marketing: false
      };
    }
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      const response = await api.put('/notifications/preferences', preferences);
      this.notificationPreferences = response.data.preferences;
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Error updating preferences:', error.message);
      throw error;
    }
  }

  // Get notification history
  async getHistory(limit = 50) {
    try {
      const response = await api.get(`/notifications/history?limit=${limit}`);
      return response.data.notifications || [];
    } catch (error) {
      console.error('[NotificationService] Error getting history:', error.message);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await api.put(`/notifications/history/${notificationId}/read`);
    } catch (error) {
      console.error('[NotificationService] Error marking as read:', error.message);
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      await api.put('/notifications/history/read-all');
    } catch (error) {
      console.error('[NotificationService] Error marking all as read:', error.message);
    }
  }

  // Send test notification
  async sendTestNotification() {
    try {
      const response = await api.post('/notifications/test');
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Error sending test:', error.message);
      throw error;
    }
  }

  // Écouter les notifications reçues
  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Écouter les interactions avec les notifications
  addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Envoyer une notification locale
  async sendLocalNotification(title, body, data = {}) {
    // Determine channel based on notification type
    let channelId = 'default';
    if (data.type === NOTIFICATION_TYPES.PAYMENT_CONFIRMED || 
        data.type === NOTIFICATION_TYPES.PREMIUM_AVAILABLE ||
        data.type === NOTIFICATION_TYPES.PAYMENT_PENDING) {
      channelId = 'payments';
    } else if (data.type === NOTIFICATION_TYPES.PREMIUM_REMINDER) {
      channelId = 'reminders';
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        channelId,
      },
      trigger: null, // Immédiat
    });
  }

  // Planifier une notification
  async scheduleNotification(title, body, triggerDate, data = {}) {
    const trigger = new Date(triggerDate);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger,
    });
  }

  // Annuler toutes les notifications planifiées
  async cancelAllScheduledNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Obtenir le badge actuel
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  // Définir le badge
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Réinitialiser le badge
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }
  
  // Get unread count from server
  async getUnreadCount() {
    try {
      const history = await this.getHistory(100);
      return history.filter(n => !n.read).length;
    } catch (error) {
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
