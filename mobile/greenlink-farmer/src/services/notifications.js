import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import Constants from 'expo-constants';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
  }

  // Demander les permissions et obtenir le token
  async registerForPushNotifications() {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GreenLink',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2d5a4d',
      });
    }

    if (!Device.isDevice) {
      console.log('[NotificationService] Push notifications require a physical device');
      // In development/emulator, we can still test with a mock token
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
      // Get the project ID from Constants or use fallback
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.easConfig?.projectId ||
                       'greenlink-farmer';
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;

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
      await api.post('/greenlink/notifications/register-device', {
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
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
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
}

export const notificationService = new NotificationService();
