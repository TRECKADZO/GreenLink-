# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Tableaux conformes au document officiel (12 avril 2026)
- **Fiche 1**: Membres menage avec tous les selects (Statut Famille, Plantation, Scolaire, Instruction, Ethnique)
- **Fiche 2 Cultures**: 8 lignes predefinies (CACAO/Champs 1-2, AUTRES CULTURES, TERRES NON EXPLOITEES/Jacheres/Forets)
- **Fiche 2 Materiels**: 16 equipements predefinis avec Type/Designation/Qte/Annee/Cout/Etat
- **Fiche 2 Arbres**: Titre exact "Diagnostic des arbres forestiers et fruitiers", colonnes conformes (N arbre, Circonference a hauteur de poitrine, GPS Lat/Long, Origine, Usage, Decision, Raisons)
- **Fiche 3 Etat cacaoyere**: Options conformes (Ombrage Faible/Moyen/Dense, Canopee 4 niveaux, Position 4 niveaux avec Plateau, Etendue select Grande/Petite)
- **Fiche 3 Grille Carres**: 16 cacaoyers x 4 carres avec entetes "(10m x 10m) - Nombre de tiges"
- **Fiche 3 Maladies**: 6 maladies + 6 parametres predefinis (double tableau)
- **Fiche 3 Sol**: Tableau 3 elements + Position parcelle avec Plateau
- **Fiche 3 Recolte/post-recolte**: Tableau "Elements d'observation / Reponses" avec options numerotees
- **Fiche 3 Engrais/Phytosanitaires**: Tableaux conformes avec select Applicateur
- **Fiche 4 Epargne**: 4 types predefinis
- **Fiche 4 Production**: 3 annees pre-remplies
- **Fiche 4 Depenses**: 7 types predefinis
- **Fiche 4 Main d'oeuvre**: Conforme avec 3 statuts MO

### PDC v2 Etapes 2-3 (12 avril 2026)
- Fiche 5: 10 themes analyse predefinis (Agronome)
- Fiche 6: 6 axes strategiques ARS 1000
- Fiche 7: Sous-activites, Execution, Appui
- Fiche 8: Categories predefinies (Investissement/Intrants/MO)
- Auto-remplissage Etape 1 -> Etape 3

### Score Ombrage ARS 1000 + Carbon (11 avril 2026)
### ARS 1000 Dashboard migre (11 avril 2026)
### Auto-remplissage PDC -> ICI/SSRTE (11 avril 2026)
### Compteur 7/7 fiches (11 avril 2026)

### Core Platform
- Auth JWT, Dashboard multi-roles, USSD, Score carbone, Marketplace, Offline-First

## Backlog
- P1: Integration SMS reel (Orange CI / MTN) - MOCKE
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P3: Refactoring composants volumineux
