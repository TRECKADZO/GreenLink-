import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const FORMS = [
  { id: 'ici', label: 'Fiche ICI', desc: 'Evaluation initiale: famille, enfants, education, pratiques', icon: 'document-text', color: '#8b5cf6', bg: '#8b5cf620', screen: 'FarmerICIForm' },
  { id: 'ssrte', label: 'Visite SSRTE', desc: 'Visite terrain: observation travail enfants, risques, remediation', icon: 'clipboard', color: '#06b6d4', bg: '#06b6d420', screen: 'SSRTEVisitForm' },
  { id: 'redd', label: 'Fiche REDD+', desc: 'Verification des 21 pratiques REDD+ (agroforesterie, sols, tracabilite)', icon: 'leaf', color: '#059669', bg: '#05966920', screen: 'REDDTrackingForm' },
  { id: 'parcels', label: 'Declaration parcelles', desc: 'GPS, superficie, type de culture', icon: 'map', color: '#f59e0b', bg: '#f59e0b20', screen: 'ParcelVerification' },
  { id: 'photos', label: 'Photos geolocalisees', desc: 'Photos terrain avec position GPS', icon: 'camera', color: '#ec4899', bg: '#ec489920', screen: 'GeoPhoto' },
  { id: 'register', label: 'Enregistrement membre', desc: 'Inscrire comme membre cooperative', icon: 'person-add', color: '#10b981', bg: '#10b98120', screen: 'AddCoopMember' },
];

const FarmerProfileScreen = ({ navigation, route }) => {
  const { farmer } = route.params || {};
  const { token } = useAuth();
  const [farmerData, setFarmerData] = useState(farmer);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyTab, setHistoryTab] = useState('ssrte');
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [reddVisits, setReddVisits] = useState([]);

  // Refresh farmer data on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (farmer?.id) {
        refreshFarmerData();
        loadHistory();
        loadReddHistory();
      }
    });
    return unsubscribe;
  }, [navigation, farmer]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/ici-data/farmers/${farmer?.id}/history`);
      setHistory(res.data);
    } catch {}
  };

  const loadReddHistory = async () => {
    try {
      const res = await api.get(`/redd/tracking/visits`, { params: { farmer_id: farmer?.id } });
      setReddVisits(res.data.visits || []);
    } catch {}
  };

  const refreshFarmerData = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/field-agent/my-farmers');
      const updated = (res.data.farmers || []).find(f => f.id === farmer.id);
      if (updated) setFarmerData(updated);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  if (!farmer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Aucun agriculteur selectionne</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const f = farmerData || farmer;
  const formsStatus = f.forms_status || {};
  const completion = f.completion || { completed: 0, total: 5, percentage: 0 };
  const isComplete = completion.percentage === 100;
  const pctColor = isComplete ? '#059669' : completion.percentage >= 40 ? '#f59e0b' : '#94a3b8';

  const handleOpenForm = (form) => {
    navigation.navigate(form.screen, { farmerId: f.id, farmerName: f.full_name, farmerData: f });
  };

  const completedCount = FORMS.filter(form => formsStatus[form.id]?.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isComplete && { backgroundColor: '#047857' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{f.full_name}</Text>
          <Text style={styles.headerSubtitle}>
            {f.village || ''} {f.phone_number ? `| ${f.phone_number}` : ''}
          </Text>
        </View>
        {isComplete && (
          <View style={styles.headerCompleteBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.headerCompleteText}>Valide</Text>
          </View>
        )}
        {refreshing && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{f.parcels_count || 0}</Text>
          <Text style={styles.infoLabel}>Parcelles</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{f.zone || '-'}</Text>
          <Text style={styles.infoLabel}>Zone</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Ionicons name={f.is_active !== false ? 'checkmark-circle' : 'close-circle'} size={20} color={f.is_active !== false ? '#10b981' : '#ef4444'} />
          <Text style={styles.infoLabel}>{f.is_active !== false ? 'Actif' : 'Inactif'}</Text>
        </View>
      </View>

      {/* Progression Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressTitle}>Progression des fiches</Text>
            <Text style={styles.progressSubtext}>{completedCount} sur {FORMS.length} fiches completees</Text>
          </View>
          <View style={[styles.percentCircle, { borderColor: pctColor }]}>
            <Text style={[styles.percentText, { color: pctColor }]}>{completion.percentage}%</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${completion.percentage}%`, backgroundColor: pctColor }]} />
        </View>

        {/* Mini form status icons row */}
        <View style={styles.formStatusRow}>
          {FORMS.map(form => {
            const isDone = formsStatus[form.id]?.completed;
            return (
              <View key={form.id} style={styles.formStatusItem}>
                <View style={[styles.formStatusDot, isDone ? { backgroundColor: '#059669' } : { backgroundColor: '#e2e8f0' }]}>
                  <Ionicons name={isDone ? 'checkmark' : form.icon} size={12} color={isDone ? '#fff' : '#94a3b8'} />
                </View>
                <Text style={[styles.formStatusLabel, isDone && { color: '#059669' }]} numberOfLines={1}>
                  {form.id.toUpperCase()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Validation Banner */}
      {isComplete && (
        <View style={styles.validationBanner}>
          <Ionicons name="ribbon" size={24} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={styles.validationTitle}>Toutes les fiches sont completes !</Text>
            <Text style={styles.validationDesc}>
              Cet agriculteur est entierement documente. Les donnees sont pretes pour verification.
            </Text>
          </View>
        </View>
      )}

      {/* Forms List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Fiches a remplir</Text>
        {FORMS.map((form, index) => {
          const status = formsStatus[form.id];
          const isDone = status?.completed;
          return (
            <TouchableOpacity
              key={form.id}
              style={[styles.formCard, isDone && styles.formCardDone]}
              onPress={() => handleOpenForm(form)}
              activeOpacity={0.7}
            >
              {/* Step number */}
              <View style={[styles.stepNumber, isDone ? { backgroundColor: '#059669' } : { backgroundColor: '#e2e8f0' }]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumberText, !isDone && { color: '#94a3b8' }]}>{index + 1}</Text>
                )}
              </View>

              {/* Icon */}
              <View style={[styles.formIcon, { backgroundColor: isDone ? '#d1fae5' : form.bg }]}>
                <Ionicons name={isDone ? 'checkmark-circle' : form.icon} size={24} color={isDone ? '#059669' : form.color} />
              </View>

              {/* Info */}
              <View style={styles.formInfo}>
                <View style={styles.formLabelRow}>
                  <Text style={[styles.formLabel, isDone && { color: '#059669' }]}>{form.label}</Text>
                  {isDone && (
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneBadgeText}>Complete</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.formDesc}>{form.desc}</Text>
                {status?.count > 0 && (
                  <Text style={styles.formCount}>{status.count} enregistrement(s)</Text>
                )}
              </View>

              {/* Arrow */}
              {isDone ? (
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Parcels info */}
        {f.parcels?.length > 0 && (
          <View style={styles.parcelsCard}>
            <Text style={styles.sectionTitle}>Parcelles ({f.parcels.length})</Text>
            {f.parcels.map((p, i) => (
              <View key={i} style={styles.parcelRow}>
                <Ionicons name="leaf" size={16} color="#059669" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.parcelName}>{p.village || p.location || 'Parcelle ' + (i + 1)}</Text>
                  <Text style={styles.parcelInfo}>{p.superficie || p.area_hectares} ha - {p.type_culture || p.crop_type || 'cacao'}</Text>
                </View>
                {(p.score_carbone || p.carbon_score) > 0 && (
                  <View style={styles.carbonBadge}>
                    <Text style={styles.carbonText}>C:{p.score_carbone || p.carbon_score}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ===== HISTORIQUE ICI + SSRTE ===== */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Ionicons name="time" size={18} color="#64748b" />
            <Text style={styles.historyTitle}>Historique</Text>
            {history?.ssrte_total > 0 && (
              <View style={styles.historyBadge}>
                <Ionicons
                  name={history.risk_evolution === 'amelioration' ? 'trending-down' : history.risk_evolution === 'degradation' ? 'trending-up' : 'remove'}
                  size={14}
                  color={history.risk_evolution === 'amelioration' ? '#059669' : history.risk_evolution === 'degradation' ? '#ef4444' : '#94a3b8'}
                />
                <Text style={[styles.historyBadgeText, {
                  color: history.risk_evolution === 'amelioration' ? '#059669' : history.risk_evolution === 'degradation' ? '#ef4444' : '#94a3b8'
                }]}>
                  {history.ssrte_total} visite(s)
                </Text>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.historyTabs}>
            <TouchableOpacity
              style={[styles.historyTab, historyTab === 'ssrte' && styles.historyTabActive]}
              onPress={() => setHistoryTab('ssrte')}
            >
              <Ionicons name="clipboard" size={14} color={historyTab === 'ssrte' ? '#0891b2' : '#94a3b8'} />
              <Text style={[styles.historyTabText, historyTab === 'ssrte' && { color: '#0891b2' }]}>SSRTE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.historyTab, historyTab === 'ici' && styles.historyTabActive]}
              onPress={() => setHistoryTab('ici')}
            >
              <Ionicons name="document-text" size={14} color={historyTab === 'ici' ? '#7c3aed' : '#94a3b8'} />
              <Text style={[styles.historyTabText, historyTab === 'ici' && { color: '#7c3aed' }]}>ICI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.historyTab, historyTab === 'redd' && styles.historyTabActive]}
              onPress={() => setHistoryTab('redd')}
            >
              <Ionicons name="leaf" size={14} color={historyTab === 'redd' ? '#059669' : '#94a3b8'} />
              <Text style={[styles.historyTabText, historyTab === 'redd' && { color: '#059669' }]}>REDD+</Text>
            </TouchableOpacity>
          </View>

          {/* SSRTE Tab */}
          {historyTab === 'ssrte' && (
            <View>
              {history?.ssrte_visits?.length > 0 ? history.ssrte_visits.map(v => {
                const riskColors = { faible: '#059669', modere: '#f59e0b', eleve: '#f97316', critique: '#ef4444' };
                const riskLabels = { faible: 'Faible', modere: 'Modere', eleve: 'Eleve', critique: 'Critique' };
                const isExpanded = expandedVisit === v.id;
                const taskNames = { TD1: 'Charges lourdes', TD2: 'Outils tranchants', TD3: 'Pesticides', TD4: 'Longues heures', TD5: 'Nuit', TD6: 'Brulage', TD7: 'Grimpee', TD8: 'Transport' };
                return (
                  <TouchableOpacity key={v.id} style={styles.visitCard} onPress={() => setExpandedVisit(isExpanded ? null : v.id)} activeOpacity={0.7}>
                    <View style={styles.visitHeader}>
                      <View style={[styles.riskDot, { backgroundColor: riskColors[v.niveau_risque] || '#94a3b8' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitDate}>{v.date_visite ? new Date(v.date_visite).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</Text>
                        <Text style={styles.visitAgent}>{v.agent_name || 'Agent'}</Text>
                      </View>
                      {v.enfants_observes_travaillant > 0 && (
                        <View style={styles.childBadge}>
                          <Ionicons name="people" size={12} color="#ef4444" />
                          <Text style={styles.childBadgeText}>{v.enfants_observes_travaillant}</Text>
                        </View>
                      )}
                      <View style={[styles.riskBadge, { backgroundColor: (riskColors[v.niveau_risque] || '#94a3b8') + '20', borderColor: (riskColors[v.niveau_risque] || '#94a3b8') + '40' }]}>
                        <Text style={[styles.riskBadgeText, { color: riskColors[v.niveau_risque] || '#94a3b8' }]}>{riskLabels[v.niveau_risque] || v.niveau_risque}</Text>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
                    </View>
                    {isExpanded && (
                      <View style={styles.visitDetails}>
                        {v.taches_dangereuses_observees?.length > 0 && (
                          <View style={styles.detailBlock}>
                            <Text style={styles.detailLabel}>Taches dangereuses</Text>
                            <View style={styles.tagRow}>
                              {v.taches_dangereuses_observees.map(t => (
                                <View key={t} style={styles.tagOrange}><Text style={styles.tagOrangeText}>{taskNames[t] || t}</Text></View>
                              ))}
                            </View>
                          </View>
                        )}
                        {v.support_fourni?.length > 0 && (
                          <View style={styles.detailBlock}>
                            <Text style={styles.detailLabel}>Support fourni</Text>
                            <View style={styles.tagRow}>
                              {v.support_fourni.map(s => (
                                <View key={s} style={styles.tagGreen}><Text style={styles.tagGreenText}>{s}</Text></View>
                              ))}
                            </View>
                          </View>
                        )}
                        {v.recommandations?.length > 0 && (
                          <View style={styles.detailBlock}>
                            <Text style={styles.detailLabel}>Recommandations</Text>
                            {v.recommandations.map((r, i) => (
                              <Text key={i} style={styles.recoText}>• {r}</Text>
                            ))}
                          </View>
                        )}
                        {v.visite_suivi_requise && (
                          <View style={styles.followUpBadge}>
                            <Ionicons name="alert-circle" size={14} color="#f59e0b" />
                            <Text style={styles.followUpText}>Suivi requis</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }) : (
                <Text style={styles.emptyText}>Aucune visite SSRTE enregistree</Text>
              )}
            </View>
          )}

          {/* ICI Tab */}
          {historyTab === 'ici' && (
            <View>
              {history?.ici_profile ? (
                <View style={styles.iciCard}>
                  <View style={styles.iciGrid}>
                    <View style={[styles.iciStat, { backgroundColor: '#ede9fe' }]}>
                      <Text style={[styles.iciStatVal, { color: '#7c3aed' }]}>{history.ici_profile.taille_menage || '-'}</Text>
                      <Text style={styles.iciStatLabel}>Menage</Text>
                    </View>
                    <View style={[styles.iciStat, { backgroundColor: '#dbeafe' }]}>
                      <Text style={[styles.iciStatVal, { color: '#2563eb' }]}>{history.ici_profile.household_children?.total_enfants || 0}</Text>
                      <Text style={styles.iciStatLabel}>Enfants</Text>
                    </View>
                    <View style={[styles.iciStat, { backgroundColor: '#dcfce7' }]}>
                      <Text style={[styles.iciStatVal, { color: '#16a34a' }]}>{history.ici_profile.household_children?.enfants_scolarises || 0}</Text>
                      <Text style={styles.iciStatLabel}>Scolarises</Text>
                    </View>
                    <View style={[styles.iciStat, {
                      backgroundColor: (history.ici_profile.household_children?.enfants_travaillant_exploitation || 0) > 0 ? '#fef2f2' : '#ecfdf5'
                    }]}>
                      <Text style={[styles.iciStatVal, {
                        color: (history.ici_profile.household_children?.enfants_travaillant_exploitation || 0) > 0 ? '#ef4444' : '#059669'
                      }]}>{history.ici_profile.household_children?.enfants_travaillant_exploitation || 0}</Text>
                      <Text style={styles.iciStatLabel}>Travaillant</Text>
                    </View>
                  </View>
                  {history.ici_profile.household_children?.liste_enfants?.length > 0 && (
                    <View style={styles.childrenList}>
                      <Text style={styles.detailLabel}>Enfants enregistres</Text>
                      {history.ici_profile.household_children.liste_enfants.map((e, i) => (
                        <View key={i} style={styles.childRow}>
                          <Text style={styles.childName}>{e.prenom}</Text>
                          <Text style={styles.childInfo}>{e.sexe} • {e.age} ans</Text>
                          {e.scolarise && <View style={styles.tagGreenSmall}><Text style={styles.tagGreenSmallText}>Scolarise</Text></View>}
                          {e.travaille_exploitation && <View style={styles.tagRedSmall}><Text style={styles.tagRedSmallText}>Travaille</Text></View>}
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.iciInfoRow}>
                    <Ionicons name={history.ici_profile.formation_securite_recue ? 'shield-checkmark' : 'shield'} size={14} color={history.ici_profile.formation_securite_recue ? '#059669' : '#94a3b8'} />
                    <Text style={styles.iciInfoText}>Formation securite: {history.ici_profile.formation_securite_recue ? 'Oui' : 'Non'}</Text>
                  </View>
                  <View style={styles.iciInfoRow}>
                    <Ionicons name={history.ici_profile.peut_lire_ecrire ? 'book' : 'book-outline'} size={14} color={history.ici_profile.peut_lire_ecrire ? '#059669' : '#94a3b8'} />
                    <Text style={styles.iciInfoText}>Alphabetise: {history.ici_profile.peut_lire_ecrire ? 'Oui' : 'Non'}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>Aucun profil ICI enregistre</Text>
              )}
            </View>
          )}

          {/* Environnemental Tab */}
          {historyTab === 'redd' && (
            <View>
              {reddVisits.length > 0 ? reddVisits.map((v, i) => {
                const levelColors = { Excellence: '#059669', Avance: '#2563eb', Intermediaire: '#f59e0b', Debutant: '#f97316', 'Non conforme': '#ef4444' };
                const lColor = levelColors[v.redd_level] || '#94a3b8';
                return (
                  <View key={i} style={[styles.visitCard, { borderLeftWidth: 3, borderLeftColor: lColor }]}>
                    <View style={styles.visitHeader}>
                      <View style={[styles.riskDot, { backgroundColor: lColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitDate}>
                          {v.date_visite ? new Date(v.date_visite).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </Text>
                        <Text style={styles.visitAgent}>{v.agent_name || 'Agent'}</Text>
                      </View>
                      <View style={{ alignItems: 'center', marginRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: lColor }}>{v.redd_score || 0}</Text>
                        <Text style={{ fontSize: 9, color: '#94a3b8' }}>/10</Text>
                      </View>
                      <View style={[styles.riskBadge, { backgroundColor: lColor + '20', borderColor: lColor + '40' }]}>
                        <Text style={[styles.riskBadgeText, { color: lColor }]}>{v.redd_level}</Text>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{v.total_conforme || v.total_verified || 0}/{v.total_checked || 0} conformes</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{v.conformity_pct || 0}% conformite</Text>
                      </View>
                      {v.suivi_requis && (
                        <View style={[styles.followUpBadge, { marginTop: 6 }]}>
                          <Ionicons name="alert-circle" size={14} color="#f59e0b" />
                          <Text style={styles.followUpText}>Suivi requis</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              }) : (
                <Text style={styles.emptyText}>Aucune fiche environnementale enregistree</Text>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  headerBack: { marginRight: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  headerCompleteBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, gap: 4,
  },
  headerCompleteText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  infoBar: {
    flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', justifyContent: 'space-around', alignItems: 'center',
  },
  infoItem: { alignItems: 'center', gap: 2 },
  infoValue: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  infoLabel: { fontSize: 11, color: '#64748b' },
  infoDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },

  progressSection: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  progressSubtext: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  percentCircle: {
    width: 50, height: 50, borderRadius: 25, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  percentText: { fontSize: 14, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4 },

  formStatusRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  formStatusItem: { alignItems: 'center', gap: 3 },
  formStatusDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  formStatusLabel: { fontSize: 8, fontWeight: '700', color: '#94a3b8' },

  validationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ecfdf5', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#a7f3d0',
  },
  validationTitle: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  validationDesc: { fontSize: 12, color: '#047857', marginTop: 2, lineHeight: 17 },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 },

  formCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 10,
  },
  formCardDone: { borderWidth: 1.5, borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' },

  stepNumber: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  formIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formInfo: { flex: 1 },
  formLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  formDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
  formCount: { fontSize: 10, color: '#059669', fontWeight: '500', marginTop: 2 },
  doneBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  doneBadgeText: { fontSize: 9, fontWeight: '700', color: '#059669' },

  parcelsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  parcelRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  parcelName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  parcelInfo: { fontSize: 11, color: '#64748b', marginTop: 1 },
  carbonBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  carbonText: { fontSize: 10, fontWeight: '600', color: '#059669' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 16, color: '#64748b', marginTop: 12 },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#059669', borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },

  // History Section
  historySection: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  historyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyBadgeText: { fontSize: 11, fontWeight: '600' },
  historyTabs: {
    flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 12,
  },
  historyTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 8,
  },
  historyTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  historyTabText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },

  // SSRTE Visit Cards
  visitCard: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginBottom: 8, overflow: 'hidden',
  },
  visitHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  visitDate: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  visitAgent: { fontSize: 11, color: '#94a3b8' },
  childBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  childBadgeText: { fontSize: 10, color: '#ef4444', fontWeight: '600' },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  riskBadgeText: { fontSize: 10, fontWeight: '600' },
  visitDetails: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fafafa' },
  detailBlock: { marginTop: 8 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagOrange: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagOrangeText: { fontSize: 10, color: '#ea580c' },
  tagGreen: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagGreenText: { fontSize: 10, color: '#059669' },
  recoText: { fontSize: 12, color: '#475569', marginBottom: 2 },
  followUpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  followUpText: { fontSize: 11, color: '#f59e0b', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, paddingVertical: 20, fontStyle: 'italic' },

  // ICI Card
  iciCard: { gap: 10 },
  iciGrid: { flexDirection: 'row', gap: 8 },
  iciStat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  iciStatVal: { fontSize: 20, fontWeight: '800' },
  iciStatLabel: { fontSize: 9, color: '#64748b', marginTop: 2 },
  childrenList: { marginTop: 4 },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 4 },
  childName: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  childInfo: { fontSize: 11, color: '#64748b' },
  tagGreenSmall: { backgroundColor: '#ecfdf5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tagGreenSmallText: { fontSize: 9, color: '#059669', fontWeight: '600' },
  tagRedSmall: { backgroundColor: '#fef2f2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tagRedSmallText: { fontSize: 9, color: '#ef4444', fontWeight: '600' },
  iciInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iciInfoText: { fontSize: 12, color: '#475569' },
});

export default FarmerProfileScreen;
