import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING } from '../config';

// Bouton simplifié haute visibilité
export const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.gray[300];
    switch (variant) {
      case 'secondary': return COLORS.secondary;
      case 'success': return COLORS.success;
      case 'danger': return COLORS.error;
      case 'outline': return 'transparent';
      case 'orange': return COLORS.orange;
      default: return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return COLORS.primary;
    return COLORS.white;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.buttonOutline,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
          <Text style={[styles.buttonText, { color: getTextColor() }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Menu item style USSD
export const MenuItem = ({ number, title, subtitle, onPress, icon }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuNumber}>
      <Text style={styles.menuNumberText}>{number}</Text>
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {icon && <Text style={styles.menuIcon}>{icon}</Text>}
  </TouchableOpacity>
);

// Carte d'information simple
export const InfoCard = ({ title, value, unit, icon, color = COLORS.primary }) => (
  <View style={[styles.infoCard, { borderLeftColor: color }]}>
    {icon && <Text style={styles.infoIcon}>{icon}</Text>}
    <View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={[styles.infoValue, { color }]}>
        {value} {unit && <Text style={styles.infoUnit}>{unit}</Text>}
      </Text>
    </View>
  </View>
);

// Indicateur de statut réseau
export const NetworkStatus = ({ isOnline }) => (
  <View style={[styles.networkStatus, { backgroundColor: isOnline ? COLORS.success : COLORS.error }]}>
    <Text style={styles.networkText}>
      {isOnline ? '● En ligne' : '○ Hors ligne'}
    </Text>
  </View>
);

// Séparateur
export const Divider = ({ text }) => (
  <View style={styles.divider}>
    {text && <Text style={styles.dividerText}>{text}</Text>}
  </View>
);

// Input simplifié
export const Input = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  error,
}) => (
  <View style={styles.inputContainer}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={[styles.input, error && styles.inputError]}>
      <Text style={styles.inputPlaceholder}>{placeholder}</Text>
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// Liste vide
export const EmptyState = ({ message, icon = '📭' }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
  </View>
);

// Loader
export const Loader = ({ message = 'Chargement...' }) => (
  <View style={styles.loader}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.loaderText}>{message}</Text>
  </View>
);

// Header simple
export const Header = ({ title, subtitle, showBack, onBack }) => (
  <View style={styles.header}>
    {showBack && (
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>
    )}
    <Text style={styles.headerTitle}>{title}</Text>
    {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  // Button
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: FONTS.sizes.lg,
    marginRight: SPACING.sm,
  },
  buttonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },

  // MenuItem
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  menuNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuNumberText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  menuSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  menuIcon: {
    fontSize: FONTS.sizes.xxl,
  },

  // InfoCard
  infoCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoIcon: {
    fontSize: FONTS.sizes.xxxl,
    marginRight: SPACING.md,
  },
  infoTitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  infoValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
  },
  infoUnit: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'normal',
  },

  // NetworkStatus
  networkStatus: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  networkText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    marginVertical: SPACING.md,
  },
  dividerText: {
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.sm,
    color: COLORS.gray[500],
    fontSize: FONTS.sizes.sm,
    position: 'absolute',
    top: -10,
    left: SPACING.md,
  },

  // Input
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputPlaceholder: {
    color: COLORS.gray[400],
    fontSize: FONTS.sizes.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
  },

  // EmptyState
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyMessage: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.gray[500],
    textAlign: 'center',
  },

  // Loader
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
  },

  // Header
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    marginBottom: SPACING.sm,
  },
  backText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: SPACING.xs,
  },
});
