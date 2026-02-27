import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useOffline } from '../../context/OfflineContext';
import { Button } from '../../components/UI';
import { farmerApi } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

const REGIONS = [
  'Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro',
  'Man', 'Korhogo', 'Gagnoa', 'Soubré', 'Autre'
];

const CROP_TYPES = [
  { id: 'cacao', label: 'Cacao', icon: '🍫' },
  { id: 'cafe', label: 'Café', icon: '☕' },
  { id: 'anacarde', label: 'Anacarde', icon: '🥜' },
  { id: 'palmier', label: 'Palmier à huile', icon: '🌴' },
  { id: 'hevea', label: 'Hévéa', icon: '🌳' },
  { id: 'autre', label: 'Autre', icon: '🌿' },
];

const AddParcelScreen = ({ navigation }) => {
  const { isOnline, addPendingAction } = useOffline();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    region: '',
    size: '',
    crop_type: '',
    planting_year: '',
    has_shade_trees: false,
    uses_organic_fertilizer: false,
    has_erosion_control: false,
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.location || !formData.size || !formData.crop_type) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const parcelData = {
      ...formData,
      size: parseFloat(formData.size),
      planting_year: formData.planting_year ? parseInt(formData.planting_year) : null,
    };

    setLoading(true);

    if (!isOnline) {
      // Mode offline: sauvegarder pour synchronisation ultérieure
      await addPendingAction({
        type: 'CREATE_PARCEL',
        data: parcelData,
      });
      Alert.alert(
        'Enregistré localement',
        'Votre parcelle sera synchronisée dès que vous serez connecté.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setLoading(false);
      return;
    }

    try {
      await farmerApi.createParcel(parcelData);
      Alert.alert(
        'Succès',
        'Votre parcelle a été déclarée avec succès !',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de déclarer la parcelle'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nouvelle Parcelle</Text>
        <Text style={styles.subtitle}>Déclarez votre exploitation</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Location */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Localisation / Village *</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="Ex: Village de Kossou"
            placeholderTextColor={COLORS.gray[400]}
          />
        </View>

        {/* Region */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Région *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {REGIONS.map((region) => (
                <TouchableOpacity
                  key={region}
                  style={[
                    styles.chip,
                    formData.region === region && styles.chipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, region })}
                >
                  <Text style={[
                    styles.chipText,
                    formData.region === region && styles.chipTextSelected,
                  ]}>
                    {region}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Size */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Superficie (hectares) *</Text>
          <TextInput
            style={styles.input}
            value={formData.size}
            onChangeText={(text) => setFormData({ ...formData, size: text })}
            placeholder="Ex: 5.5"
            placeholderTextColor={COLORS.gray[400]}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Crop Type */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Type de culture *</Text>
          <View style={styles.cropGrid}>
            {CROP_TYPES.map((crop) => (
              <TouchableOpacity
                key={crop.id}
                style={[
                  styles.cropItem,
                  formData.crop_type === crop.id && styles.cropItemSelected,
                ]}
                onPress={() => setFormData({ ...formData, crop_type: crop.id })}
              >
                <Text style={styles.cropIcon}>{crop.icon}</Text>
                <Text style={[
                  styles.cropLabel,
                  formData.crop_type === crop.id && styles.cropLabelSelected,
                ]}>
                  {crop.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Planting Year */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Année de plantation</Text>
          <TextInput
            style={styles.input}
            value={formData.planting_year}
            onChangeText={(text) => setFormData({ ...formData, planting_year: text })}
            placeholder="Ex: 2018"
            placeholderTextColor={COLORS.gray[400]}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        {/* Sustainable Practices */}
        <Text style={styles.sectionTitle}>Pratiques durables</Text>
        <Text style={styles.sectionHint}>Ces pratiques améliorent votre score carbone</Text>

        <TouchableOpacity
          style={styles.checkItem}
          onPress={() => setFormData({ ...formData, has_shade_trees: !formData.has_shade_trees })}
        >
          <View style={[styles.checkbox, formData.has_shade_trees && styles.checkboxChecked]}>
            {formData.has_shade_trees && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View>
            <Text style={styles.checkLabel}>Arbres d'ombrage</Text>
            <Text style={styles.checkHint}>Agroforesterie avec arbres</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkItem}
          onPress={() => setFormData({ ...formData, uses_organic_fertilizer: !formData.uses_organic_fertilizer })}
        >
          <View style={[styles.checkbox, formData.uses_organic_fertilizer && styles.checkboxChecked]}>
            {formData.uses_organic_fertilizer && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View>
            <Text style={styles.checkLabel}>Engrais organiques</Text>
            <Text style={styles.checkHint}>Compost, fumier, etc.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkItem}
          onPress={() => setFormData({ ...formData, has_erosion_control: !formData.has_erosion_control })}
        >
          <View style={[styles.checkbox, formData.has_erosion_control && styles.checkboxChecked]}>
            {formData.has_erosion_control && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View>
            <Text style={styles.checkLabel}>Contrôle de l'érosion</Text>
            <Text style={styles.checkHint}>Terrasses, haies, etc.</Text>
          </View>
        </TouchableOpacity>

        {/* Submit */}
        <Button
          title="Déclarer ma parcelle"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />

        {!isOnline && (
          <Text style={styles.offlineNote}>
            ⚠️ Mode hors-ligne : la parcelle sera synchronisée plus tard
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
  form: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
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
  chipContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.sm,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[700],
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  cropItem: {
    width: '30%',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    marginBottom: SPACING.sm,
  },
  cropItemSelected: {
    backgroundColor: COLORS.primary,
  },
  cropIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  cropLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
    textAlign: 'center',
  },
  cropLabelSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: COLORS.gray[400],
    borderRadius: 6,
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONTS.sizes.md,
  },
  checkLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  checkHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  submitButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  offlineNote: {
    textAlign: 'center',
    color: COLORS.warning,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
  },
});

export default AddParcelScreen;
