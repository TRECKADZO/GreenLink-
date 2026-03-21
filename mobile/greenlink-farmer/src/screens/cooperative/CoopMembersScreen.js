import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS } from '../../config';
import { Loader } from '../../components/UI';

const MemberCard = ({ member, onPress }) => (
  <TouchableOpacity style={styles.memberCard} onPress={() => onPress(member)}>
    <View style={styles.memberAvatar}>
      <Text style={styles.avatarText}>
        {member.full_name?.charAt(0)?.toUpperCase() || '?'}
      </Text>
    </View>
    <View style={styles.memberInfo}>
      <Text style={styles.memberName}>{member.full_name}</Text>
      <Text style={styles.memberVillage}>{member.village}</Text>
      <View style={styles.memberStats}>
        <View style={styles.statItem}>
          <Ionicons name="map-outline" size={12} color={COLORS.gray} />
          <Text style={styles.statText}>{member.nombre_parcelles || member.parcels_count || 0} parcelles</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="leaf-outline" size={12} color={COLORS.gray} />
          <Text style={styles.statText}>{member.superficie_totale || member.total_hectares || 0} ha</Text>
        </View>
      </View>
    </View>
    <View style={styles.memberRight}>
      {member.status === 'pending_validation' ? (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>En attente</Text>
        </View>
      ) : (
        <View style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </View>
  </TouchableOpacity>
);

export default function CoopMembersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, pending

  const fetchMembers = useCallback(async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (filter === 'pending') params.status = 'pending_validation';
      if (filter === 'active') params.status = 'active';
      
      const data = await cooperativeApi.getMembers(params);
      setMembers(data.members || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching members:', error);
      Alert.alert('Erreur', 'Impossible de charger les membres');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
  }, [fetchMembers]);

  const handleMemberPress = (member) => {
    navigation.navigate('CoopMemberDetail', { memberId: member.id, memberName: member.full_name });
  };

  const handleAddMember = () => {
    navigation.navigate('AddCoopMember');
  };

  const FilterButton = ({ value, label }) => (
    <TouchableOpacity
      style={[styles.filterBtn, filter === value && styles.filterBtnActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterBtnText, filter === value && styles.filterBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loader message="Chargement des membres..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Membres</Text>
        <TouchableOpacity onPress={handleAddMember} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un membre..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchMembers}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FilterButton value="all" label={`Tous (${total})`} />
        <FilterButton value="active" label="Actifs" />
        <FilterButton value="pending" label="En attente" />
      </View>

      {/* Members List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MemberCard member={item} onPress={handleMemberPress} />
        )}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>Aucun membre trouvé</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddMember}>
              <Ionicons name="add-circle" size={20} color={COLORS.white} />
              <Text style={styles.addFirstButtonText}>Ajouter un membre</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  filterBtnTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  memberVillage: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  memberStats: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 11,
    color: COLORS.gray,
    marginLeft: 4,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  pendingText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '500',
  },
  activeBadge: {
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addFirstButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
  },
});
