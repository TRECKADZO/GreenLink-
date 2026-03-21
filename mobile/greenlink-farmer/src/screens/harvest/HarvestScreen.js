import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useOffline } from '../../context/OfflineContext';
import { Button, Loader } from '../../components/UI';
import { farmerApi } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

// Image des cabosses de cacao pour l'illustration
const HARVEST_IMAGE = 'https://images.unsplash.com/photo-1573710661345-610f790e1218?w=400&q=80';

const HarvestScreen = ({ navigation }) => {
  const { isOnline, addPendingAction, getCachedData, cacheData } = useOffline();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    parcel_id: '',
    quantity: '',
    unit: 'kg',
    quality: 'good',
    notes: '',
  });

  const UNITS = ['kg', 'tonnes', 'sacs'];
  const QUALITIES = [
    { id: 'excellent', label: 'Excellent', icon: '⭐' },
    { id: 'good', label: 'Bon', icon: '👍' },
    { id: 'average', label: 'Moyen', icon: '👌' },
    { id: 'poor', label: 'Faible', icon: '👎' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadParcels();
    }, [])
  );

  const loadParcels = async () => {
    try {
      const cached = await getCachedData('parcels');
      if (cached) {
        setParcels(cached);
      }
      
      if (isOnline) {
        const response = await farmerApi.getParcels();
        setParcels(response.data);
        await cacheData('parcels', response.data);
      }
    } catch (error) {
      console.error('Error loading parcels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.parcel_id || !formData.quantity) {
      Alert.alert('Erreur', 'Veuillez sélectionner une parcelle et entrer la quantité');
      return;
    }

    const harvestData = {
      parcel_id: formData.parcel_id,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      quality: formData.quality,
      notes: formData.notes,
      harvest_date: new Date().toISOString(),
    };

    setSubmitting(true);

    if (!isOnline) {
      await addPendingAction({
        type: 'CREATE_HARVEST',
        data: harvestData,
      });
      Alert.alert(
        'Enregistré localement',
        'Votre récolte sera synchronisée dès que vous serez connecté.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setSubmitting(false);
      return;
    }

    try {
      await farmerApi.createHarvest(harvestData);
      Alert.alert(
        'Succès',
        'Votre récolte a été déclarée avec succès !',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de déclarer la récolte'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Chargement..." />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Image */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Déclarer une Récolte</Text>
        <Text style={styles.subtitle}>Enregistrez votre production</Text>
        
        {/* Harvest Illustration */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: HARVEST_IMAGE }}
            style={styles.harvestImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageText}>🌳 Cabosses de Cacao</Text>
          </View>
        </View>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Parcel Selection */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Parcelle *</Text>
          {parcels.length === 0 ? (
            <View style={styles.noParcels}>
              <Text style={styles.noParcelsText}>
                Aucune parcelle déclarée. Ajoutez d'abord une parcelle.
              </Text>
              <Button
                title="Ajouter une parcelle"
                variant="outline"
                onPress={() => navigation.navigate('AddParcel')}
                style={{ marginTop: SPACING.md }}
              />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {parcels.map((parcel) => {
                const parcelId = parcel.id || parcel._id;
                const isSelected = formData.parcel_id === parcelId;
                return (
                <TouchableOpacity
                  key={parcelId}
                  style={[
                    styles.parcelChip,
                    isSelected && styles.parcelChipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, parcel_id: parcelId })}
                >
                  <Text style={styles.parcelIcon}>🌳</Text>
                  <Text style={[
                    styles.parcelName,
                    isSelected && styles.parcelNameSelected,
                  ]}>
                    {parcel.localisation || parcel.village || parcel.nom || parcel.location || 'Parcelle'}
                  </Text>
                  <Text style={[
                    styles.parcelSize,
                    isSelected && styles.parcelSizeSelected,
                  ]}>
                    {parcel.superficie || parcel.area_hectares || parcel.size || 0} ha
                  </Text>
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Quantity */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Quantité récoltée *</Text>
          <View style={styles.quantityRow}>
            <TextInput
              style={[styles.input, styles.quantityInput]}
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
              placeholder="0"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitSelector}>
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitChip,
                    formData.unit === unit && styles.unitChipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, unit })}
                >
                  <Text style={[
                    styles.unitText,
                    formData.unit === unit && styles.unitTextSelected,
                  ]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Quality */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Qualité</Text>
          <View style={styles.qualityGrid}>
            {QUALITIES.map((quality) => (
              <TouchableOpacity
                key={quality.id}
                style={[
                  styles.qualityItem,
                  formData.quality === quality.id && styles.qualityItemSelected,
                ]}
                onPress={() => setFormData({ ...formData, quality: quality.id })}
              >
                <Text style={styles.qualityIcon}>{quality.icon}</Text>
                <Text style={[
                  styles.qualityLabel,
                  formData.quality === quality.id && styles.qualityLabelSelected,
                ]}>
                  {quality.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Observations sur la récolte..."
            placeholderTextColor={COLORS.gray[400]}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit */}
        <Button
          title="Déclarer ma récolte"
          onPress={handleSubmit}
          loading={submitting}
          disabled={parcels.length === 0}
          style={styles.submitButton}
        />

        {!isOnline && (
          <Text style={styles.offlineNote}>
            ⚠️ Mode hors-ligne : la récolte sera synchronisée plus tard
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: 60,
  },
  backButton: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  imageContainer: {
    marginTop: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    height: 140,
    backgroundColor: COLORS.gray[200],
  },
  harvestImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  imageText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  form: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    minHeight: 500,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONTS.sizes.lg,
    backgroundColor: COLORS.gray[50],
  },
  noParcels: {
    backgroundColor: COLORS.gray[100],
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  noParcelsText: {
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  parcelChip: {
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: 12,
    marginRight: SPACING.sm,
    alignItems: 'center',
    minWidth: 100,
  },
  parcelChipSelected: {
    backgroundColor: COLORS.primary,
  },
  parcelIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  parcelName: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  parcelNameSelected: {
    color: COLORS.white,
  },
  parcelSize: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  parcelSizeSelected: {
    color: COLORS.white,
    opacity: 0.8,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quantityInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.sizes.xxl,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  unitChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
  },
  unitChipSelected: {
    backgroundColor: COLORS.primary,
  },
  unitText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[700],
  },
  unitTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  qualityItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
  },
  qualityItemSelected: {
    backgroundColor: COLORS.primary,
  },
  qualityIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  qualityLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[700],
  },
  qualityLabelSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  offlineNote: {
    textAlign: 'center',
    color: COLORS.warning,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.md,
  },
});

export default HarvestScreen;
