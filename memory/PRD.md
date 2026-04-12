# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Conformite document officiel (12 avril 2026)
- **Fiche 2 Materiels**: 16 equipements predefinis (Pulverisateur→Tronconneuse) avec Type/Designation/Qte/Annee/Cout/Etat
- **Fiche 3 Grille Carres**: tableau comptage 16 cacaoyers x 4 carres (10m x 10m)
- **Fiche 3 Maladies/Ravageurs**: 6 maladies predefinies (Mirides, Pourriture Brune, Punaises, CSSVD, Foreurs) + 6 parametres (gourmands, cabosses, epiphytes, enherbement, loranthus) avec severite et observations
- **Fiche 3 Sol**: tableau 3 elements (zones erodees, risque erosion, hydromorphie)
- **Fiche 3 Options corrigees**: Ombrage=Faible/Moyen/Dense, Canopee=Normal/Dense/Peu degrade/Degrade, Position=Plateau/Haut/Mi/Bas
- **Fiche 4 Epargne**: 4 types predefinis (Mobile Money, Microfinance, Banque, Autres)
- **Fiche 4 Production**: 3 annees pre-remplies (N-1, N-2, N-3)
- **Fiche 4 Depenses**: 7 types predefinis (Scolarite, Nourriture, Sante, Electricite, Eau, Funerailles, Mariage)

### PDC v2 - Harmonisation Fiches 5-8 (12 avril 2026)
- Fiche 5: 10 themes analyse predefinis
- Fiche 6: 6 axes strategiques ARS 1000 predefinis
- Fiche 7: colonnes Sous-activites, Execution, Appui
- Fiche 8: categories predefinies (Investissement/Intrants/Main d'oeuvre)
- Auto-remplissage Etape 1 → Etape 3

### Score Ombrage ARS 1000 (11 avril 2026)
- Calcul auto: densite 40pts + diversite 30pts + strates 30pts
- Integration score carbone coefficient 0.30

### ARS 1000 Dashboard (11 avril 2026)
- Backend migre vers pdc_v2, score ombrage integre

### Auto-remplissage PDC → ICI/SSRTE (11 avril 2026)
- Pre-remplissage depuis PDC fiche1

### Core Platform
- Auth JWT, Dashboard multi-roles, USSD, Score carbone, Marketplace, Offline-First

## Backlog
- P1: Integration SMS reel (Orange CI / MTN) - MOCKE
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend (attente config DNS)
- P3: Refactoring composants volumineux
