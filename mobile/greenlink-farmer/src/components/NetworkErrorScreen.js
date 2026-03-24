import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';

export function NetworkErrorScreen({ error, retryCount, maxRetries, onRetry }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline" size={56} color={COLORS.gray} />
        <Text style={styles.errorTitle}>Probleme de connexion</Text>
        <Text style={styles.errorText}>{error}</Text>
        {retryCount < maxRetries && (
          <View style={styles.retryingRow}>
            <Ionicons name="reload" size={14} color={COLORS.primary} />
            <Text style={styles.retryingText}>
              Reconnexion automatique ({retryCount + 1}/{maxRetries})...
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.retryButtonText}>Reessayer maintenant</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  retryingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryingText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
