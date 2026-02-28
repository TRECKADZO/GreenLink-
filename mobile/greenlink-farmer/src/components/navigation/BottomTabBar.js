import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../config';

const TAB_CONFIG = {
  farmer: [
    { name: 'Home', icon: 'home', iconOutline: 'home-outline', label: 'Accueil', hasBadge: true },
    { name: 'MyParcels', icon: 'map', iconOutline: 'map-outline', label: 'Parcelles' },
    { name: 'DeclareHarvest', icon: 'add-circle', iconOutline: 'add-circle-outline', label: 'Récolte', isMain: true },
    { name: 'Payments', icon: 'wallet', iconOutline: 'wallet-outline', label: 'Paiements', hasBadge: true },
    { name: 'Profile', icon: 'person', iconOutline: 'person-outline', label: 'Profil' },
  ],
  cooperative: [
    { name: 'CoopDashboard', icon: 'home', iconOutline: 'home-outline', label: 'Accueil', hasBadge: true },
    { name: 'CoopMembers', icon: 'people', iconOutline: 'people-outline', label: 'Membres', hasBadge: true },
    { name: 'AddCoopMember', icon: 'add-circle', iconOutline: 'add-circle-outline', label: 'Nouveau', isMain: true },
    { name: 'CoopReports', icon: 'document-text', iconOutline: 'document-text-outline', label: 'Rapports' },
    { name: 'Profile', icon: 'person', iconOutline: 'person-outline', label: 'Profil' },
  ],
};

// Animated Tab Component
const AnimatedTab = ({ tab, isActive, onPress, badgeCount }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      // Bounce animation when tab becomes active
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Slide up animation
      Animated.timing(translateY, {
        toValue: -4,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);

  // Badge pulse animation
  useEffect(() => {
    if (badgeCount > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(badgeScale, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(badgeScale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [badgeCount]);

  const handlePress = () => {
    // Quick tap animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={handlePress}
      activeOpacity={1}
    >
      <Animated.View 
        style={[
          styles.iconContainer, 
          isActive && styles.iconContainerActive,
          { 
            transform: [
              { scale: scaleAnim },
              { translateY: translateY }
            ] 
          }
        ]}
      >
        <Ionicons
          name={isActive ? tab.icon : tab.iconOutline}
          size={24}
          color={isActive ? COLORS.primary : COLORS.gray[400]}
        />
        
        {/* Badge */}
        {tab.hasBadge && badgeCount > 0 && (
          <Animated.View 
            style={[
              styles.badge,
              { transform: [{ scale: badgeScale }] }
            ]}
          >
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
      
      <Text style={[styles.label, isActive && styles.labelActive]}>
        {tab.label}
      </Text>
      
      {/* Active indicator with animation */}
      {isActive && (
        <Animated.View 
          style={[
            styles.activeIndicator,
            { opacity: isActive ? 1 : 0 }
          ]} 
        />
      )}
    </TouchableOpacity>
  );
};

// Animated Main Button Component
const AnimatedMainButton = ({ tab, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    // Scale and rotate animation
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    onPress();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <TouchableOpacity
      style={styles.mainButton}
      onPress={handlePress}
      activeOpacity={1}
    >
      <Animated.View 
        style={[
          styles.mainButtonInner,
          { 
            transform: [
              { scale: scaleAnim },
              { rotate: rotate }
            ] 
          }
        ]}
      >
        <Ionicons name={tab.icon} size={28} color={COLORS.white} />
      </Animated.View>
      <Text style={styles.mainButtonLabel}>{tab.label}</Text>
    </TouchableOpacity>
  );
};

const BottomTabBar = ({ userType = 'farmer', notifications = {} }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  const tabs = TAB_CONFIG[userType] || TAB_CONFIG.farmer;
  const currentRoute = route.name;

  // Default notification counts (can be passed as props)
  const defaultNotifications = {
    Home: notifications.home || 0,
    CoopDashboard: notifications.home || 0,
    Payments: notifications.payments || 0,
    CoopMembers: notifications.members || 0,
  };

  const isTabActive = (tabName) => {
    if (currentRoute === tabName) return true;
    
    const relatedScreens = {
      Home: ['Home', 'Notifications', 'CarbonMarketplace', 'MyCarbonScore'],
      MyParcels: ['MyParcels', 'ParcelDetails'],
      DeclareHarvest: ['DeclareHarvest', 'HarvestHistory'],
      Payments: ['Payments', 'PaymentDetails', 'OrangeMoney'],
      Profile: ['Profile', 'EditProfile', 'Settings', 'ForgotPassword'],
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
      {tabs.map((tab) => {
        const isActive = isTabActive(tab.name);
        const badgeCount = defaultNotifications[tab.name] || 0;
        
        if (tab.isMain) {
          return (
            <AnimatedMainButton
              key={tab.name}
              tab={tab}
              onPress={() => handleTabPress(tab.name)}
            />
          );
        }
        
        return (
          <AnimatedTab
            key={tab.name}
            tab={tab}
            isActive={isActive}
            onPress={() => handleTabPress(tab.name)}
            badgeCount={badgeCount}
          />
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
    borderRadius: 16,
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: COLORS.primary + '15',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
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
    width: 24,
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
