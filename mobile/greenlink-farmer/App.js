import React, { useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, AppState } from 'react-native';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';

// Services
import { notificationService } from './src/services/notifications';
import { syncService } from './src/services/sync';

// Screens - Auth
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Screens - Main
import HomeScreen from './src/screens/home/HomeScreen';
import ParcelsScreen from './src/screens/parcels/ParcelsScreen';
import AddParcelScreen from './src/screens/parcels/AddParcelScreen';
import HarvestScreen from './src/screens/harvest/HarvestScreen';
import PaymentsScreen from './src/screens/payments/PaymentsScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';

// Screens - Marketplace
import {
  MarketplaceScreen,
  ProductDetailScreen,
  CartScreen,
  CheckoutScreen,
  OrdersScreen,
  WishlistScreen,
} from './src/screens/marketplace';

// Screens - Carbon/RSE
import {
  CarbonMarketplaceScreen,
  MyCarbonPurchasesScreen,
  MyCarbonScoreScreen,
} from './src/screens/carbon';

// Screens - Cooperative (Agent de terrain)
import {
  CoopDashboardScreen,
  CoopMembersScreen,
  CoopMemberDetailScreen,
  AddCoopMemberScreen,
  AddMemberParcelScreen,
  CoopReportsScreen,
} from './src/screens/cooperative';

import { Loader } from './src/components/UI';
import { COLORS } from './src/config';

const Stack = createNativeStackNavigator();

// Auth Navigator (Login/Register)
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Main Screens */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Parcels" component={ParcelsScreen} />
      <Stack.Screen name="AddParcel" component={AddParcelScreen} />
      <Stack.Screen name="Harvest" component={HarvestScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      
      {/* Marketplace Screens */}
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      
      {/* Carbon/RSE Screens */}
      <Stack.Screen name="CarbonMarketplace" component={CarbonMarketplaceScreen} />
      <Stack.Screen name="MyCarbonPurchases" component={MyCarbonPurchasesScreen} />
      <Stack.Screen name="MyCarbonScore" component={MyCarbonScoreScreen} />
    </Stack.Navigator>
  );
}

// Root Navigator with notification and sync handling
function RootNavigator() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigationRef = useRef(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const appState = useRef(AppState.currentState);

  // Setup push notifications when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let isMounted = true;

    const setupNotifications = async () => {
      try {
        await notificationService.registerForPushNotifications();

        if (!isMounted) return;

        notificationListener.current = notificationService.addNotificationReceivedListener(
          (notification) => {
            console.log('[App] Notification received:', notification.request.content.title);
          }
        );

        responseListener.current = notificationService.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            console.log('[App] Notification clicked:', data);
            
            if (data?.screen && navigationRef.current) {
              navigationRef.current.navigate(data.screen, data.params || {});
            }
          }
        );
      } catch (error) {
        console.error('[App] Error setting up notifications:', error.message);
      }
    };

    setupNotifications();

    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, user]);

  // Setup background sync
  useEffect(() => {
    if (!isAuthenticated) return;

    syncService.registerBackgroundSync().catch((error) => {
      console.error('[App] Error registering background sync:', error.message);
    });
  }, [isAuthenticated]);

  // Sync when app comes to foreground
  const handleAppStateChange = useCallback(async (nextAppState) => {
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
        console.error('[App] Sync on foreground error:', error.message);
      }
    }
    appState.current = nextAppState;
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  if (loading) {
    return <Loader message="Chargement..." />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// Main App Component - SDK 53 compatible
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
