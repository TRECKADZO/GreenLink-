import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useOffline } from '../../context/OfflineContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/UI';
import { farmerApi } from '../../services/api';
import { cooperativeApi } from '../../services/cooperativeApi';
import { cameraService } from '../../services/camera';
import { locationService } from '../../services/location';
import { COLORS, FONTS, SPACING } from '../../config';

// Liste des départements de Côte d'Ivoire (principaux)
const DEPARTMENTS = [
  'Abidjan', 'Abengourou', 'Aboisso', 'Adzopé', 'Agboville',
  'Agnibilékrou', 'Bangolo', 'Béoumi', 'Biankouma', 'Bloléquin',
  'Bocanda', 'Bondoukou', 'Bongouanou', 'Botro', 'Bouaflé',
  'Bouaké', 'Bouna', 'Boundiali', 'Buyo', 'Dabakala',
  'Dabou', 'Daloa', 'Danané', 'Daoukro', 'Didiévi',
  'Dimbokro', 'Divo', 'Doropo', 'Duékoué', 'Facobly',
  'Ferkessédougou', 'Fresco', 'Gagnoa', 'Grand-Bassam', 'Grand-Lahou',
  'Guéyo', 'Guiglo', 'Guitry', 'Issia', 'Jacqueville',
  'Kani', 'Katiola', 'Kong', 'Korhogo', 'Kouibly',
  'Kounahiri', 'Koun-Fao', 'Lakota', 'Man', 'Mankono',
  'Mbahiakro', 'Méagui', 'Minignan', 'Nassian', 'Niakaramadougou',
  'Odienné', 'Oumé', 'Ouangolodougou', 'Prikro', 'Sakassou',
  'San-Pédro', 'Sandégué', 'Sassandra', 'Séguéla', 'Sikensi',
  'Sinfra', 'Sipilou', 'Soubré', 'Tabou', 'Taabo',
  'Tanda', 'Tengrela', 'Tiassalé', 'Tiébissou', 'Touba',
  'Toulepleu', 'Toumodi', 'Transua', 'Vavoua', 'Yamoussoukro',
  'Zouan-Hounien', 'Zoukougbeu', 'Zuénoula', 'Autre'
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [photos, setPhotos] = useState([]);
  
  // Sélection du membre (propriétaire de la parcelle)
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [formData, setFormData] = useState({
    location: '',
    department: '',
    size: '',
    crop_type: '',
    planting_year: '',
    has_shade_trees: false,
    uses_organic_fertilizer: false,
    has_erosion_control: false,
    latitude: null,
    longitude: null,
  });
  
  // Vérifier si l'utilisateur est une coopérative
  const isCooperative = user?.user_type === 'cooperative';

  // Charger les membres si c'est une coopérative
  useEffect(() => {
    if (isCooperative) {
      fetchMembers();
    }
  }, [isCooperative]);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await cooperativeApi.getMembers();
      setMembers(response?.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredMembers = members.filter(member => 
    member.full_name?.toLowerCase().includes(searchMember.toLowerCase()) ||
    member.phone_number?.includes(searchMember)
  );

  // Obtenir la position automatiquement au chargement
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        // Obtenir l'adresse
        const address = await locationService.reverseGeocode(
          location.latitude,
          location.longitude
        );
        
        setFormData((prev) => ({
          ...prev,
          latitude: location.latitude,
          longitude: location.longitude,
          location: address?.formattedAddress || prev.location,
          department: address?.region || prev.department,
        }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 5 photos');
      return;
    }

    const image = await cameraService.showImagePicker({
      allowsEditing: true,
      quality: 0.6,
    });

    if (image) {
      setPhotos((prev) => [...prev, image]);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

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
      photos: photos.map((p) => p.uri), // URIs des photos
    };

    setLoading(true);

    if (!isOnline) {
      // Mode offline: sauvegarder localement
      // Sauvegarder les photos localement
      const localPhotos = [];
      for (const photo of photos) {
        const localUri = await cameraService.saveImageLocally(
          photo.uri,
          `parcel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
        );
        if (localUri) {
          localPhotos.push(localUri);
        }
      }
      parcelData.photos = localPhotos;

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
      // Upload des photos si en ligne
      const uploadedPhotos = [];
      for (const photo of photos) {
        try {
          const result = await cameraService.uploadImage(photo.uri, '/upload');
          if (result?.url) {
            uploadedPhotos.push(result.url);
          }
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
        }
      }
      parcelData.photos = uploadedPhotos;

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
        {/* GPS Location */}
        <View style={styles.gpsSection}>
          <View style={styles.gpsHeader}>
            <Text style={styles.gpsIcon}>📍</Text>
            <View style={styles.gpsInfo}>
              <Text style={styles.gpsTitle}>Position GPS</Text>
              {formData.latitude ? (
                <Text style={styles.gpsCoords}>
                  {locationService.formatCoordinates(formData.latitude, formData.longitude)}
                </Text>
              ) : (
                <Text style={styles.gpsNoData}>Non disponible</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.gpsButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={styles.gpsButtonText}>📡</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Department */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Département *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.chip,
                    formData.department === dept && styles.chipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, department: dept })}
                >
                  <Text style={[
                    styles.chipText,
                    formData.department === dept && styles.chipTextSelected,
                  ]}>
                    {dept}
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

        {/* Photos */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Photos de la parcelle</Text>
          <Text style={styles.photoHint}>Ajoutez jusqu'à 5 photos de votre exploitation</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
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
  gpsSection: {
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  gpsInfo: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  gpsCoords: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.success,
    marginTop: 2,
  },
  gpsNoData: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  gpsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsButtonText: {
    fontSize: 20,
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
  photoHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING.sm,
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photoContainer: {
    marginRight: SPACING.sm,
    position: 'relative',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
  },
  addPhotoIcon: {
    fontSize: 24,
  },
  addPhotoText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 2,
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
