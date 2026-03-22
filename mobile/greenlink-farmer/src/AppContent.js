import React, { useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, AppState, View, Text, TouchableOpacity } from 'react-native';

// ============= SAFE SCREEN LOADER =============
function safeRequire(requireFn, screenName) {
  try {
    const mod = requireFn();
    return mod.default || mod;
  } catch (e) {
    console.error(`[SafeLoad] Failed to load ${screenName}:`, e?.message);
    return function FallbackScreen({ navigation }) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginBottom: 8 }}>
            Ecran indisponible
          </Text>
          <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            {screenName} n'a pas pu etre charge.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#2d5a4d', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retour</Text>
          </TouchableOpacity>
        </View>
      );
    };
  }
}

// ============= CONTEXT PROVIDERS =============
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';

// ============= SERVICES (safe) =============
let notificationService = null;
let syncService = null;
try { notificationService = require('./services/notifications').notificationService; } catch (e) { console.error('[App] notifications import failed:', e?.message); }
try { syncService = require('./services/sync').syncService; } catch (e) { console.error('[App] sync import failed:', e?.message); }

// ============= SCREENS - SAFE LAZY LOADING =============
// Auth screens
const LoginScreen = safeRequire(() => require('./screens/auth/LoginScreen'), 'LoginScreen');
const RegisterScreen = safeRequire(() => require('./screens/auth/RegisterScreen'), 'RegisterScreen');
const ForgotPasswordScreen = safeRequire(() => require('./screens/auth/ForgotPasswordScreen'), 'ForgotPasswordScreen');
const MemberActivationScreen = safeRequire(() => require('./screens/auth/MemberActivationScreen'), 'MemberActivationScreen');
const AgentActivationScreen = safeRequire(() => require('./screens/auth/AgentActivationScreen'), 'AgentActivationScreen');

// Welcome
const WelcomeScreen = safeRequire(() => require('./screens/welcome/WelcomeScreen'), 'WelcomeScreen');

// Main screens
const HomeScreen = safeRequire(() => require('./screens/home/HomeScreen'), 'HomeScreen');
const ParcelsScreen = safeRequire(() => require('./screens/parcels/ParcelsScreen'), 'ParcelsScreen');
const AddParcelScreen = safeRequire(() => require('./screens/parcels/AddParcelScreen'), 'AddParcelScreen');
const HarvestScreen = safeRequire(() => require('./screens/harvest/HarvestScreen'), 'HarvestScreen');
const MyHarvestsScreen = safeRequire(() => require('./screens/harvest/MyHarvestsScreen'), 'MyHarvestsScreen');
const PaymentsScreen = safeRequire(() => require('./screens/payments/PaymentsScreen'), 'PaymentsScreen');
const CarbonPaymentsDashboard = safeRequire(() => require('./screens/payments/CarbonPaymentsDashboard'), 'CarbonPaymentsDashboard');
const NotificationsScreen = safeRequire(() => require('./screens/notifications/NotificationsScreen'), 'NotificationsScreen');
const ProfileScreen = safeRequire(() => require('./screens/profile/ProfileScreen'), 'ProfileScreen');

// Marketplace
const MarketplaceScreen = safeRequire(() => require('./screens/marketplace/MarketplaceScreen'), 'MarketplaceScreen');
const ProductDetailScreen = safeRequire(() => require('./screens/marketplace/ProductDetailScreen'), 'ProductDetailScreen');
const CartScreen = safeRequire(() => require('./screens/marketplace/CartScreen'), 'CartScreen');
const CheckoutScreen = safeRequire(() => require('./screens/marketplace/CheckoutScreen'), 'CheckoutScreen');
const OrdersScreen = safeRequire(() => require('./screens/marketplace/OrdersScreen'), 'OrdersScreen');
const WishlistScreen = safeRequire(() => require('./screens/marketplace/WishlistScreen'), 'WishlistScreen');

// Carbon
const CarbonMarketplaceScreen = safeRequire(() => require('./screens/carbon/CarbonMarketplaceScreen'), 'CarbonMarketplaceScreen');
const MyCarbonPurchasesScreen = safeRequire(() => require('./screens/carbon/MyCarbonPurchasesScreen'), 'MyCarbonPurchasesScreen');
const MyCarbonScoreScreen = safeRequire(() => require('./screens/carbon/MyCarbonScoreScreen'), 'MyCarbonScoreScreen');

// Cooperative
const CoopDashboardScreen = safeRequire(() => require('./screens/cooperative/CoopDashboardScreen'), 'CoopDashboardScreen');
const CoopMembersScreen = safeRequire(() => require('./screens/cooperative/CoopMembersScreen'), 'CoopMembersScreen');
const CoopMemberDetailScreen = safeRequire(() => require('./screens/cooperative/CoopMemberDetailScreen'), 'CoopMemberDetailScreen');
const AddCoopMemberScreen = safeRequire(() => require('./screens/cooperative/AddCoopMemberScreen'), 'AddCoopMemberScreen');
const AddMemberParcelScreen = safeRequire(() => require('./screens/cooperative/AddMemberParcelScreen'), 'AddMemberParcelScreen');
const CoopReportsScreen = safeRequire(() => require('./screens/cooperative/CoopReportsScreen'), 'CoopReportsScreen');
const CoopHarvestsScreen = safeRequire(() => require('./screens/cooperative/CoopHarvestsScreen'), 'CoopHarvestsScreen');
const AgentListScreen = safeRequire(() => require('./screens/cooperative/AgentListScreen'), 'AgentListScreen');
const AssignFarmersScreen = safeRequire(() => require('./screens/cooperative/AssignFarmersScreen'), 'AssignFarmersScreen');

// Field Agent
const FieldAgentDashboard = safeRequire(() => require('./screens/field-agent/FieldAgentDashboard'), 'FieldAgentDashboard');
const FarmerSearchScreen = safeRequire(() => require('./screens/field-agent/FarmerSearchScreen'), 'FarmerSearchScreen');
const ParcelVerificationScreen = safeRequire(() => require('./screens/field-agent/ParcelVerificationScreen'), 'ParcelVerificationScreen');
const GeoPhotoScreen = safeRequire(() => require('./screens/field-agent/GeoPhotoScreen'), 'GeoPhotoScreen');
const SSRTEVisitFormScreen = safeRequire(() => require('./screens/field-agent/SSRTEVisitFormScreen'), 'SSRTEVisitFormScreen');
const SSRTEAgentDashboardScreen = safeRequire(() => require('./screens/field-agent/SSRTEAgentDashboard'), 'SSRTEAgentDashboard');
const FarmerICIFormScreen = safeRequire(() => require('./screens/field-agent/FarmerICIFormScreen'), 'FarmerICIFormScreen');
const FarmerProfileScreen = safeRequire(() => require('./screens/field-agent/FarmerProfileScreen'), 'FarmerProfileScreen');
const ParcelVerifyListScreen = safeRequire(() => require('./screens/field-agent/ParcelVerifyListScreen'), 'ParcelVerifyListScreen');
const ParcelVerifyFormScreen = safeRequire(() => require('./screens/field-agent/ParcelVerifyFormScreen'), 'ParcelVerifyFormScreen');

// Auditor
const AuditorDashboardScreen = safeRequire(() => require('./screens/auditor/AuditorDashboardScreen'), 'AuditorDashboardScreen');
const AuditorMissionScreen = safeRequire(() => require('./screens/auditor/AuditorMissionScreen'), 'AuditorMissionScreen');
const AuditFormScreen = safeRequire(() => require('./screens/auditor/AuditFormScreen'), 'AuditFormScreen');

// USSD
const USSDSimulatorScreen = safeRequire(() => require('./screens/ussd/USSDSimulatorScreen'), 'USSDSimulatorScreen');
const USSDCarbonScreen = safeRequire(() => require('./screens/ussd/USSDCarbonScreen'), 'USSDCarbonScreen');

// Messaging
const MessagingScreen = safeRequire(() => require('./screens/messaging/MessagingScreen'), 'MessagingScreen');
const ChatScreen = safeRequire(() => require('./screens/messaging/ChatScreen'), 'ChatScreen');

// Settings
const NotificationPreferencesScreen = safeRequire(() => require('./screens/settings/NotificationPreferencesScreen'), 'NotificationPreferencesScreen');

// Config
let COLORS = { primary: '#2d5a4d' };
try { COLORS = require('./config').COLORS; } catch (e) { console.error('[App] config import failed:', e?.message); }

// ============= UI COMPONENTS =============
let Loader = function DefaultLoader() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d5a4d' }}>
      <Text style={{ color: '#fff', fontSize: 16 }}>Chargement...</Text>
    </View>
  );
};
try { Loader = require('./components/UI').Loader; } catch (e) { console.error('[App] UI Loader import failed:', e?.message); }

const Stack = createNativeStackNavigator();

// ============= AUTH NAVIGATOR =============
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="MemberActivation" component={MemberActivationScreen} />
      <Stack.Screen name="AgentActivation" component={AgentActivationScreen} />
    </Stack.Navigator>
  );
}

// ============= APP NAVIGATOR =============
function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Parcels" component={ParcelsScreen} />
      <Stack.Screen name="AddParcel" component={AddParcelScreen} />
      <Stack.Screen name="Harvest" component={HarvestScreen} />
      <Stack.Screen name="MyHarvests" component={MyHarvestsScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="CarbonPayments" component={CarbonPaymentsDashboard} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      
      <Stack.Screen name="CarbonMarketplace" component={CarbonMarketplaceScreen} />
      <Stack.Screen name="MyCarbonPurchases" component={MyCarbonPurchasesScreen} />
      <Stack.Screen name="MyCarbonScore" component={MyCarbonScoreScreen} />
      
      <Stack.Screen name="CoopDashboard" component={CoopDashboardScreen} />
      <Stack.Screen name="CoopMembers" component={CoopMembersScreen} />
      <Stack.Screen name="CoopMemberDetail" component={CoopMemberDetailScreen} />
      <Stack.Screen name="AddCoopMember" component={AddCoopMemberScreen} />
      <Stack.Screen name="AddMemberParcel" component={AddMemberParcelScreen} />
      <Stack.Screen name="CoopReports" component={CoopReportsScreen} />
      <Stack.Screen name="CoopHarvests" component={CoopHarvestsScreen} />
      <Stack.Screen name="AgentList" component={AgentListScreen} />
      <Stack.Screen name="AssignFarmers" component={AssignFarmersScreen} />
      <Stack.Screen name="CoopLots" component={CoopReportsScreen} />
      
      <Stack.Screen name="FieldAgentDashboard" component={FieldAgentDashboard} />
      <Stack.Screen name="FarmerSearch" component={FarmerSearchScreen} />
      <Stack.Screen name="ParcelVerification" component={ParcelVerificationScreen} />
      <Stack.Screen name="GeoPhoto" component={GeoPhotoScreen} />
      <Stack.Screen name="SSRTEVisitForm" component={SSRTEVisitFormScreen} />
      <Stack.Screen name="SSRTEAgentDashboard" component={SSRTEAgentDashboardScreen} />
      <Stack.Screen name="FarmerICIForm" component={FarmerICIFormScreen} />
      <Stack.Screen name="FarmerProfile" component={FarmerProfileScreen} />
      <Stack.Screen name="ParcelVerifyList" component={ParcelVerifyListScreen} />
      <Stack.Screen name="ParcelVerifyForm" component={ParcelVerifyFormScreen} />
      <Stack.Screen name="VisitsHistory" component={CoopReportsScreen} />
      
      <Stack.Screen name="AuditorDashboard" component={AuditorDashboardScreen} />
      <Stack.Screen name="AuditorMission" component={AuditorMissionScreen} />
      <Stack.Screen name="AuditForm" component={AuditFormScreen} />
      <Stack.Screen name="AuditorMissions" component={AuditorDashboardScreen} />
      
      <Stack.Screen name="USSDSimulator" component={USSDSimulatorScreen} />
      <Stack.Screen name="USSDCarbon" component={USSDCarbonScreen} />
      <Stack.Screen name="AuditHistory" component={AuditorDashboardScreen} />
      
      <Stack.Screen name="Messaging" component={MessagingScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
    </Stack.Navigator>
  );
}

// ============= ROOT NAVIGATOR =============
function RootNavigator() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigationRef = useRef(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated || !user || !notificationService) return;
    let isMounted = true;

    const setupNotifications = async () => {
      try {
        await notificationService.registerForPushNotifications();
        if (!isMounted) return;

        notificationListener.current = notificationService.addNotificationReceivedListener(
          (notification) => console.log('[App] Notif:', notification.request.content.title)
        );
        responseListener.current = notificationService.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            if (data?.screen && navigationRef.current) {
              navigationRef.current.navigate(data.screen, data.params || {});
            }
          }
        );
      } catch (error) {
        console.error('[App] Notification setup error:', error?.message);
      }
    };

    setupNotifications();
    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !syncService) return;
    syncService.registerBackgroundSync().catch((e) => console.error('[App] Sync register error:', e?.message));
  }, [isAuthenticated]);

  const handleAppStateChange = useCallback(async (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active' && isAuthenticated && syncService) {
      try {
        const result = await syncService.syncNow();
        if (result.synced > 0) {
          Alert.alert('Synchronisation', `${result.synced} element(s) synchronise(s)`, [{ text: 'OK' }]);
        }
      } catch (error) {
        console.error('[App] Foreground sync error:', error?.message);
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
      <StatusBar style="light" backgroundColor="#2d5a4d" />
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// ============= MAIN EXPORT =============
export default function AppContent() {
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
