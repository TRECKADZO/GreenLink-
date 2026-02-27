import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, AppState } from 'react-native';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OfflineProvider, useOffline } from './src/context/OfflineContext';

// Services
import { notificationService } from './src/services/notifications';
import { syncService } from './src/services/sync';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import ParcelsScreen from './src/screens/parcels/ParcelsScreen';
import AddParcelScreen from './src/screens/parcels/AddParcelScreen';
import HarvestScreen from './src/screens/harvest/HarvestScreen';
import PaymentsScreen from './src/screens/payments/PaymentsScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';

import { Loader } from './src/components/UI';
import { COLORS } from './src/config';

const Stack = createNativeStackNavigator();

// Auth Navigator (Login/Register)
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main App Navigator
const AppNavigator = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Parcels" component={ParcelsScreen} />
    <Stack.Screen name="AddParcel" component={AddParcelScreen} />
    <Stack.Screen name="Harvest" component={HarvestScreen} />
    <Stack.Screen name="Payments" component={PaymentsScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

// Root Navigator with notification and sync handling
const RootNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigationRef = useRef(null);
  const notificationListener = useRef();
  const responseListener = useRef();
  const appState = useRef(AppState.currentState);

  // Setup push notifications when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const setupNotifications = async () => {
      try {
        // Register for push notifications
        await notificationService.registerForPushNotifications();

        // Listen for incoming notifications
        notificationListener.current = notificationService.addNotificationReceivedListener(
          (notification) => {
            console.log('[App] Notification received:', notification);
          }
        );

        // Listen for notification interactions
        responseListener.current = notificationService.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            console.log('[App] Notification clicked:', data);
            
            // Navigate based on notification type
            if (data?.screen && navigationRef.current) {
              navigationRef.current.navigate(data.screen, data.params || {});
            }
          }
        );
      } catch (error) {
        console.error('[App] Error setting up notifications:', error);
      }
    };

    setupNotifications();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, user]);

  // Setup background sync
  useEffect(() => {
    if (!isAuthenticated) return;

    const setupSync = async () => {
      try {
        await syncService.registerBackgroundSync();
        console.log('[App] Background sync registered');
      } catch (error) {
        console.error('[App] Error registering background sync:', error);
      }
    };

    setupSync();
  }, [isAuthenticated]);

  // Sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        console.log('[App] App came to foreground, syncing...');
        try {
          const result = await syncService.syncNow();
          if (result.synced > 0) {
            Alert.alert(
              'Synchronisation',
              `${result.synced} élément(s) synchronisé(s)`,
              [{ text: 'OK' }]
            );
          }
        } catch (error) {
          console.error('[App] Sync on foreground error:', error);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  if (loading) {
    return <Loader message="Chargement..." />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Main App Component
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OfflineProvider>
          <RootNavigator />
        </OfflineProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
