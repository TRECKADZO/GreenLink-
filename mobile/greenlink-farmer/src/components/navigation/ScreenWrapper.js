import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import BottomTabBar from './BottomTabBar';

// Screens that should show the bottom tab bar
const SCREENS_WITH_TAB_BAR = [
  'Home', 'MyParcels', 'DeclareHarvest', 'Payments', 'Profile',
  'CoopDashboard', 'CoopMembers', 'CoopReports', 'CoopLots',
  'Parcels', 'Harvest', 'Marketplace', 'Notifications',
  'CarbonMarketplace', 'MyCarbonScore', 'MyCarbonPurchases',
  'Orders', 'Wishlist',
];

const ScreenWrapper = ({ children }) => {
  const route = useRoute();
  const { user } = useAuth();
  
  const showTabBar = SCREENS_WITH_TAB_BAR.includes(route?.name);
  const userType = user?.user_type === 'cooperative' ? 'cooperative' : 'farmer';
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      {showTabBar && <BottomTabBar userType={userType} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default ScreenWrapper;
