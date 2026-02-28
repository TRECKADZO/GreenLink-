import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomTabBar from './BottomTabBar';

/**
 * Main Layout Component
 * Wraps screens with bottom tab navigation
 */
const MainLayout = ({ children, userType = 'farmer', showTabBar = true }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.container}>
      <View style={[styles.content, showTabBar && styles.contentWithTabBar]}>
        {children}
      </View>
      {showTabBar && <BottomTabBar userType={userType} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    flex: 1,
  },
  contentWithTabBar: {
    // Add bottom padding to prevent content from being hidden behind tab bar
    paddingBottom: 0,
  },
});

export default MainLayout;
