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
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    try {
      // Pour Expo, on utilise le token Expo
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'greenlink-farmer', // Remplacer par votre project ID
      })).data;

      this.expoPushToken = token;
      await AsyncStorage.setItem('expoPushToken', token);
      
      // Enregistrer le token sur le serveur
      await this.registerTokenOnServer(token);
      
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }

    return token;
  }

  // Enregistrer le token sur le serveur backend
  async registerTokenOnServer(token) {
    try {
      await api.post('/notifications/register-device', {
        push_token: token,
        platform: Platform.OS,
        device_name: Device.modelName,
      });
    } catch (error) {
      console.error('Error registering token on server:', error);
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
