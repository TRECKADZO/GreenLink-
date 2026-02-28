import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../config';

const TAB_CONFIG = {
  farmer: [
    { name: 'Home', icon: 'home', iconOutline: 'home-outline', label: 'Accueil' },
    { name: 'MyParcels', icon: 'map', iconOutline: 'map-outline', label: 'Parcelles' },
    { name: 'DeclareHarvest', icon: 'add-circle', iconOutline: 'add-circle-outline', label: 'Récolte', isMain: true },
    { name: 'Payments', icon: 'wallet', iconOutline: 'wallet-outline', label: 'Paiements' },
    { name: 'Profile', icon: 'person', iconOutline: 'person-outline', label: 'Profil' },
  ],
  cooperative: [
    { name: 'CoopDashboard', icon: 'home', iconOutline: 'home-outline', label: 'Accueil' },
    { name: 'CoopMembers', icon: 'people', iconOutline: 'people-outline', label: 'Membres' },
    { name: 'AddCoopMember', icon: 'add-circle', iconOutline: 'add-circle-outline', label: 'Nouveau', isMain: true },
    { name: 'CoopReports', icon: 'document-text', iconOutline: 'document-text-outline', label: 'Rapports' },
    { name: 'Profile', icon: 'person', iconOutline: 'person-outline', label: 'Profil' },
  ],
};

const BottomTabBar = ({ userType = 'farmer' }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  const tabs = TAB_CONFIG[userType] || TAB_CONFIG.farmer;
  const currentRoute = route.name;

  const isTabActive = (tabName) => {
    // Check if current route matches or is a child of the tab
    if (currentRoute === tabName) return true;
    
    // Check for related screens
    const relatedScreens = {
      Home: ['Home', 'Notifications', 'CarbonMarketplace', 'MyCarbonScore'],
      MyParcels: ['MyParcels', 'ParcelDetails'],
      DeclareHarvest: ['DeclareHarvest', 'HarvestHistory'],
      Payments: ['Payments', 'PaymentDetails', 'OrangeMoney'],
      Profile: ['Profile', 'EditProfile', 'Settings'],
      CoopDashboard: ['CoopDashboard', 'CoopLots'],
      CoopMembers: ['CoopMembers', 'CoopMemberDetail', 'AddMemberParcel'],
      AddCoopMember: ['AddCoopMember'],
      CoopReports: ['CoopReports'],
    };
    
    return relatedScreens[tabName]?.includes(currentRoute) || false;
  };

  const handleTabPress = (tabName) => {
    navigation.navigate(tabName);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab, index) => {
        const isActive = isTabActive(tab.name);
        
        if (tab.isMain) {
          // Main action button (center)
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.mainButton}
              onPress={() => handleTabPress(tab.name)}
              activeOpacity={0.8}
            >
              <View style={styles.mainButtonInner}>
                <Ionicons name={tab.icon} size={28} color={COLORS.white} />
              </View>
              <Text style={styles.mainButtonLabel}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <Ionicons
                name={isActive ? tab.icon : tab.iconOutline}
                size={24}
                color={isActive ? COLORS.primary : COLORS.gray[400]}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: COLORS.primary + '15',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    color: COLORS.gray[400],
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  mainButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -20,
  },
  mainButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  mainButtonLabel: {
    fontSize: 11,
    marginTop: 4,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default BottomTabBar;
