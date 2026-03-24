import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS } from '../../config';

const CERTIFICATIONS = [
  { value: 'rainforest', label: 'Rainforest Alliance' },
  { value: 'utz', label: 'UTZ Certified' },
  { value: 'fairtrade', label: 'Fairtrade' },
  { value: 'bio', label: 'Agriculture Bio' },
];

const CROP_TYPES = [
  { value: 'cacao', label: 'Cacao' },
  { value: 'cafe', label: 'Café' },
  { value: 'palmier', label: 'Palmier à huile' },
  { value: 'hevea', label: 'Hévéa' },
];

export default function AddMemberParcelScreen({ route, navigation }) {
  const paramMemberId = route.params?.memberId || null;
  const paramMemberName = route.params?.memberName || null;

  const [memberId, setMemberId] = useState(paramMemberId);
  const [memberName, setMemberName] = useState(paramMemberName);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(!paramMemberId);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    village: '',
    area_hectares: '',
    crop_type: 'cacao',
    certification: '',
    gps_lat: null,
    gps_lng: null,
  });

  // Load members list if no memberId was passed
  useEffect(() => {
    if (!paramMemberId) {
      const fetchMembers = async () => {
        try {
          const data = await cooperativeApi.getMembers({ limit: 200 });
          setMembers(data.members || []);
        } catch (error) {
          console.error('Error fetching members:', error);
          Alert.alert('Erreur', 'Impossible de charger la liste des membres');
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchMembers();
    }
  }, [paramMemberId]);

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.village?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.phone_number?.includes(memberSearch)
  );

  const handleSelectMember = (member) => {
    setMemberId(member.id);
    setMemberName(member.full_name);
    setShowMemberPicker(false);
    setMemberSearch('');
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGetLocation = async () => {
    try {
      setGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la localisation');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setFormData((prev) => ({
        ...prev,
        gps_lat: location.coords.latitude,
        gps_lng: location.coords.longitude,
      }));

      Alert.alert('Succès', 'Coordonnées GPS capturées');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir la localisation');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    // Validate member selection
    if (!memberId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un agriculteur');
      return;
    }
    // Validation
    if (!formData.location.trim()) {
      Alert.alert('Erreur', 'Le nom de la localité est requis');
      return;
    }
    if (!formData.village.trim()) {
      Alert.alert('Erreur', 'Le village est requis');
      return;
    }
    if (!formData.area_hectares || parseFloat(formData.area_hectares) <= 0) {
      Alert.alert('Erreur', 'La surface en hectares doit être supérieure à 0');
      return;
    }

    try {
      setLoading(true);
      const data = {
        ...formData,
        area_hectares: parseFloat(formData.area_hectares),
        certification: formData.certification || null,
      };

      const result = await cooperativeApi.addMemberParcel(memberId, data);
      
      Alert.alert(
        'Succès',
        `Parcelle ajoutée avec succès!\nScore carbone: ${result.carbon_score}/10\nCO₂ capturé: ${result.co2_captured_tonnes} tonnes`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating parcel:', error);
      const message = error.response?.data?.detail || 'Impossible de créer la parcelle';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nouvelle Parcelle</Text>
          {memberName ? (
            <Text style={styles.headerSubtitle}>{memberName}</Text>
          ) : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Member Selection - shown only if no memberId was passed via params */}
          {!paramMemberId && (
            <View style={styles.memberSelectSection}>
              <Text style={styles.label}>Agriculteur / Membre *</Text>
              {loadingMembers ? (
                <View style={styles.memberLoadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.memberLoadingText}>Chargement des membres...</Text>
                </View>
              ) : memberId ? (
                <TouchableOpacity
                  style={styles.selectedMemberCard}
                  onPress={() => setShowMemberPicker(true)}
                >
                  <View style={styles.selectedMemberInfo}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{memberName?.charAt(0) || '?'}</Text>
                    </View>
                    <View>
                      <Text style={styles.selectedMemberName}>{memberName}</Text>
                      <Text style={styles.selectedMemberHint}>Appuyez pour changer</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.memberSelectButton}
                  onPress={() => setShowMemberPicker(true)}
                >
                  <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.memberSelectButtonText}>Sélectionner un membre</Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Location Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom de la localité *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Parcelle Nord, Zone A..."
                value={formData.location}
                onChangeText={(value) => handleChange('location', value)}
              />
            </View>
          </View>

          {/* Village */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Village *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="home-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Issia, Gagnoa..."
                value={formData.village}
                onChangeText={(value) => handleChange('village', value)}
              />
            </View>
          </View>

          {/* Area */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Surface (hectares) *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="resize-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: 2.5"
                value={formData.area_hectares}
                onChangeText={(value) => handleChange('area_hectares', value)}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputSuffix}>ha</Text>
            </View>
          </View>

          {/* Crop Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type de culture *</Text>
            <View style={styles.optionsGrid}>
              {CROP_TYPES.map((crop) => (
                <TouchableOpacity
                  key={crop.value}
                  style={[
                    styles.optionButton,
                    formData.crop_type === crop.value && styles.optionButtonActive,
                  ]}
                  onPress={() => handleChange('crop_type', crop.value)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.crop_type === crop.value && styles.optionButtonTextActive,
                    ]}
                  >
                    {crop.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Certification */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Certification (optionnel)</Text>
            <View style={styles.optionsGrid}>
              {CERTIFICATIONS.map((cert) => (
                <TouchableOpacity
                  key={cert.value}
                  style={[
                    styles.optionButton,
                    formData.certification === cert.value && styles.optionButtonActive,
                  ]}
                  onPress={() =>
                    handleChange(
                      'certification',
                      formData.certification === cert.value ? '' : cert.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.certification === cert.value && styles.optionButtonTextActive,
                    ]}
                  >
                    {cert.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* GPS Location */}
          <View style={styles.gpsSection}>
            <View style={styles.gpsHeader}>
              <Ionicons name="navigate" size={20} color={COLORS.primary} />
              <Text style={styles.gpsTitle}>Coordonnées GPS</Text>
            </View>
            
            {formData.gps_lat && formData.gps_lng ? (
              <View style={styles.gpsCoords}>
                <Text style={styles.gpsCoordsText}>
                  Lat: {formData.gps_lat.toFixed(6)}
                </Text>
                <Text style={styles.gpsCoordsText}>
                  Lng: {formData.gps_lng.toFixed(6)}
                </Text>
                <TouchableOpacity
                  style={styles.gpsClearBtn}
                  onPress={() => handleChange('gps_lat', null) || handleChange('gps_lng', null)}
                >
                  <Ionicons name="close-circle" size={18} color="#F44336" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.gpsPlaceholder}>Aucune coordonnée GPS</Text>
            )}

            <TouchableOpacity
              style={[styles.gpsButton, gettingLocation && styles.gpsButtonDisabled]}
              onPress={handleGetLocation}
              disabled={gettingLocation}
            >
              <Ionicons
                name={gettingLocation ? 'hourglass' : 'locate'}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.gpsButtonText}>
                {gettingLocation ? 'Localisation...' : 'Capturer ma position'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="leaf" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>
              Le score carbone sera calculé automatiquement en fonction de la surface
              et des certifications.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>Création...</Text>
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Ajouter la parcelle</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Member Picker Modal */}
      <Modal visible={showMemberPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.memberPickerContainer}>
            <View style={styles.memberPickerHeader}>
              <Text style={styles.memberPickerTitle}>Sélectionner un membre</Text>
              <TouchableOpacity onPress={() => setShowMemberPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            <View style={styles.memberSearchContainer}>
              <Ionicons name="search" size={18} color={COLORS.gray} />
              <TextInput
                style={styles.memberSearchInput}
                placeholder="Rechercher par nom, village, téléphone..."
                value={memberSearch}
                onChangeText={setMemberSearch}
                autoFocus
              />
              {memberSearch ? (
                <TouchableOpacity onPress={() => setMemberSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              style={styles.memberList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.memberListItem,
                    item.id === memberId && styles.memberListItemSelected,
                  ]}
                  onPress={() => handleSelectMember(item)}
                >
                  <View style={[styles.memberAvatar, item.id === memberId && { backgroundColor: COLORS.primary }]}>
                    <Text style={[styles.memberAvatarText, item.id === memberId && { color: '#fff' }]}>
                      {item.full_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.memberListInfo}>
                    <Text style={styles.memberListName}>{item.full_name}</Text>
                    <Text style={styles.memberListDetail}>
                      {item.village} - {item.phone_number}
                    </Text>
                    {item.code_planteur ? (
                      <Text style={styles.memberListCode}>{item.code_planteur}</Text>
                    ) : null}
                  </View>
                  {item.id === memberId && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.memberListEmpty}>
                  <Ionicons name="people-outline" size={40} color="#ccc" />
                  <Text style={styles.memberListEmptyText}>
                    {memberSearch ? 'Aucun membre trouvé' : 'Aucun membre dans la coopérative'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#333',
  },
  inputSuffix: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    fontSize: 13,
    color: '#666',
  },
  optionButtonTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  gpsSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  gpsCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  gpsCoordsText: {
    fontSize: 13,
    color: '#2E7D32',
    marginRight: 12,
  },
  gpsClearBtn: {
    marginLeft: 'auto',
  },
  gpsPlaceholder: {
    fontSize: 13,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  gpsButtonDisabled: {
    opacity: 0.6,
  },
  gpsButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Member Selection styles
  memberSelectSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  memberLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  memberLoadingText: {
    marginLeft: 8,
    color: COLORS.gray,
    fontSize: 13,
  },
  selectedMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: 8,
  },
  selectedMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedMemberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  selectedMemberHint: {
    fontSize: 11,
    color: COLORS.gray,
  },
  memberSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
    marginTop: 8,
    gap: 8,
  },
  memberSelectButtonText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Member Picker Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  memberPickerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  memberPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  memberPickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.dark,
  },
  memberSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  memberSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    paddingVertical: 4,
  },
  memberList: {
    maxHeight: 400,
  },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberListItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  memberListInfo: {
    flex: 1,
  },
  memberListName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.dark,
  },
  memberListDetail: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  memberListCode: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  memberListEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  memberListEmptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
});
