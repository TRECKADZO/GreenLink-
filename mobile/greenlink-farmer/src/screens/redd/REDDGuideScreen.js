import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const COLORS = {
  primary: '#059669',
  primaryDark: '#064e3b',
  primaryLight: '#d1fae5',
  blue: '#2563eb',
  blueLight: '#dbeafe',
  amber: '#d97706',
  amberLight: '#fef3c7',
  teal: '#0d9488',
  tealLight: '#ccfbf1',
  violet: '#7c3aed',
  violetLight: '#ede9fe',
  bg: '#f8fafc',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
};

const CATEGORIES = [
  {
    id: 'agroforesterie',
    title: 'Agroforesterie',
    subtitle: 'Pratique prioritaire REDD+',
    color: COLORS.primary,
    bgColor: COLORS.primaryLight,
    impact: 'Augmente les stocks de carbone, biodiversite et resilience climatique',
    practices: [
      { name: 'Arbres d\'ombrage (30-50% couverture)', desc: 'Planter et maintenir des arbres d\'ombrage dans les parcelles cacao/cafe.' },
      { name: 'Systeme agroforestier multi-strates', desc: 'Association cacaoyers avec arbres forestiers (Acajou, Terminalia), fruitiers (avocat, safou) et legumineuses (Gliricidia).' },
      { name: 'Enrichissement parcelles', desc: 'Plantation d\'arbres supplementaires et maintien des arbres spontanes dans les parcelles existantes.' },
      { name: 'Transition plein soleil vers ombrage', desc: 'Conversion progressive des parcelles plein soleil vers systemes multi-strates (2-3 strates vegetales).' },
    ],
  },
  {
    id: 'zero-deforestation',
    title: 'Zero-Deforestation',
    subtitle: 'Reduction pression sur les forets',
    color: COLORS.blue,
    bgColor: COLORS.blueLight,
    impact: 'Decouplage agriculture-deforestation, protection forets classees',
    practices: [
      { name: 'Intensification durable', desc: 'Ameliorer les rendements sur les parcelles existantes sans extension sur les forets.' },
      { name: 'Engagement zero deforestation', desc: 'Interdiction de nouvelle plantation sur des terres forestieres.' },
      { name: 'Restauration parcelles degradees', desc: 'Reconversion des parcelles degradees via agroforesterie.' },
      { name: 'Protection forets classees', desc: 'Participation a l\'agroforesterie communautaire et systeme Taungya.' },
    ],
  },
  {
    id: 'gestion-sols',
    title: 'Gestion Sols Bas-Carbone',
    subtitle: 'Reduction des intrants chimiques',
    color: COLORS.amber,
    bgColor: COLORS.amberLight,
    impact: 'Amelioration fertilite sols, reduction emissions GES',
    practices: [
      { name: 'Paillage et compostage', desc: 'Production d\'intrants organiques pour reduire les engrais chimiques.' },
      { name: 'Biochar', desc: 'Charbon vegetal enterre dans le sol pour ameliorer la fertilite et stocker le carbone durablement.' },
      { name: 'Couverture vegetale', desc: 'Plantes rampantes legumineuses pour lutter contre l\'erosion et maintenir l\'humidite.' },
      { name: 'Gestion integree des ravageurs', desc: 'Methodes biologiques de lutte contre les parasites, reduction des pesticides.' },
      { name: 'Taille et elagage sanitaire', desc: 'Entretien regulier des cacaoyers pour ameliorer productivite et sante des plantes.' },
    ],
  },
  {
    id: 'restauration',
    title: 'Restauration et Conservation',
    subtitle: 'Reboisement et protection',
    color: COLORS.teal,
    bgColor: COLORS.tealLight,
    impact: 'Regeneration ecosystemes, reduction pression bois-energie',
    practices: [
      { name: 'Reboisement et regeneration assistee', desc: 'Regeneration naturelle assistee sur les terres degradees.' },
      { name: 'Plantations bois-energie', desc: 'Planter du bois-energie pour reduire la coupe dans les forets naturelles.' },
      { name: 'Protection zones ripariennes', desc: 'Protection des berges de cours d\'eau, pentes et zones ecologiquement fragiles.' },
      { name: 'Valorisation residus agricoles', desc: 'Compostage et mulching des residus au lieu du brulage.' },
    ],
  },
  {
    id: 'tracabilite',
    title: 'Tracabilite et Conformite',
    subtitle: 'MRV, EUDR, ARS 1000',
    color: COLORS.violet,
    bgColor: COLORS.violetLight,
    impact: 'Integrite REDD+, conformite marche carbone international',
    practices: [
      { name: 'Enregistrement GPS parcelles', desc: 'Geolocalisation precise des parcelles pour la tracabilite EUDR et les standards carbone.' },
      { name: 'Safeguards sociaux', desc: 'Equite genre, prevention du travail des enfants (SSRTE/ICI), clarification du foncier.' },
      { name: 'Monitoring MRV', desc: 'Collecte reguliere de donnees : couverture arboree, pratiques adoptees, reductions emissions.' },
      { name: 'Certification ARS 1000', desc: 'Norme Africaine pour le Cacao Durable avec niveaux Bronze, Argent et Or.' },
    ],
  },
];

const REDDGuideScreen = ({ navigation }) => {
  const [expanded, setExpanded] = useState('agroforesterie');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pratiques REDD+</Text>
          <Text style={styles.subtitle}>
            Guide des pratiques eligibles aux credits carbone REDD+ en Cote d'Ivoire
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>5</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.blue }]}>21</Text>
            <Text style={styles.statLabel}>Pratiques</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.violet }]}>10/10</Text>
            <Text style={styles.statLabel}>Score max</Text>
          </View>
        </View>

        {/* Sources */}
        <View style={styles.sourceCard}>
          <Text style={styles.sourceText}>
            Sources : Strategie Nationale REDD+ (2017), Programme FCPF Parc National de Tai, PROMIRE, Guides IDH/CIRAD/reNature, Bureau du Marche Carbone (BMC)
          </Text>
        </View>

        {/* Categories */}
        {CATEGORIES.map((cat) => {
          const isOpen = expanded === cat.id;
          return (
            <View key={cat.id} style={[styles.catCard, isOpen && { borderColor: cat.color, borderWidth: 1.5 }]}>
              <TouchableOpacity
                onPress={() => setExpanded(isOpen ? null : cat.id)}
                style={styles.catHeader}
                activeOpacity={0.7}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.bgColor }]}>
                  <Text style={{ color: cat.color, fontWeight: '800', fontSize: 16 }}>
                    {cat.title.charAt(0)}
                  </Text>
                </View>
                <View style={styles.catInfo}>
                  <Text style={styles.catTitle}>{cat.title}</Text>
                  <Text style={styles.catSub}>{cat.subtitle}</Text>
                </View>
                <View style={[styles.catBadge, { backgroundColor: cat.bgColor }]}>
                  <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.practices.length}</Text>
                </View>
              </TouchableOpacity>

              <Text style={[styles.catImpact, { color: cat.color }]}>{cat.impact}</Text>

              {isOpen && (
                <View style={styles.practicesList}>
                  {cat.practices.map((p, idx) => (
                    <View key={idx} style={[styles.practiceItem, { backgroundColor: cat.bgColor + '40' }]}>
                      <Text style={styles.practiceName}>{p.name}</Text>
                      <Text style={styles.practiceDesc}>{p.desc}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16 },
  header: { marginBottom: 16 },
  backBtn: { marginBottom: 10 },
  backText: { color: COLORS.textLight, fontSize: 14 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textLight, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  sourceCard: { backgroundColor: COLORS.white, borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  sourceText: { fontSize: 10, color: COLORS.textLight, lineHeight: 14 },
  catCard: { backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  catHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catInfo: { flex: 1 },
  catTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  catSub: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catBadgeText: { fontSize: 12, fontWeight: '700' },
  catImpact: { fontSize: 11, paddingHorizontal: 14, paddingBottom: 8, fontWeight: '500' },
  practicesList: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  practiceItem: { borderRadius: 10, padding: 10 },
  practiceName: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  practiceDesc: { fontSize: 11, color: COLORS.textLight, lineHeight: 16 },
});

export default REDDGuideScreen;
