# GreenLink CHANGELOG

## [March 1, 2026] - Carbon Auditor System & Web Improvements

### Added - Carbon Auditor System (Major Feature)
- **Nouveau rôle utilisateur**: `carbon_auditor` rattaché à GreenLink
- **Backend API**:
  - Routes CRUD pour auditeurs (`/api/carbon-auditor/admin/*`)
  - Système de missions d'audit
  - Soumission d'audit avec calcul automatique du score carbone
  - Statistiques et dashboard API

- **Frontend Web**:
  - Page Admin `/admin/carbon-auditors` - Gestion des auditeurs
  - Dashboard Auditeur `/auditor/dashboard` - Stats et missions
  - Page Mission `/auditor/mission/:id` - Liste parcelles
  - Formulaire Audit `/auditor/audit/:missionId/:parcelId`

- **Mobile App**:
  - `AuditorDashboardScreen` - Dashboard avec stats
  - `AuditorMissionScreen` - Liste des parcelles à auditer
  - `AuditFormScreen` - Formulaire terrain complet
  - Photos géolocalisées avec capture GPS

### Added - Web Activation Buttons
- **Boutons d'activation sur page Login Web**
  - Bouton "Activer mon compte Membre Coopérative" (vert)
  - Bouton "Activer mon compte Agent Terrain" (cyan)
  - Navigation vers `/activate-member` et `/activate-agent`

- **Pages d'activation Web**
  - `/activate-member` - Activation compte membre coopérative (flux 2 étapes)
  - `/activate-agent` - Activation compte agent terrain (thème cyan)

- **Page Gestion Agents Terrain** (`/cooperative/agents`)
  - Liste des agents avec recherche
  - Badge statut (Activé / En attente)
  - Modal ajout nouvel agent
  - Détails agent avec statistiques

- **Page Ajout Parcelle avec Sélection Membre** (`/cooperative/parcels/new`)
  - Dropdown sélection agriculteur/membre
  - Dropdown sélection département (80+ départements CI)
  - Capture GPS optionnelle
  - Tous les champs parcelle

- **Liste Départements Côte d'Ivoire**
  - 80+ départements officiels
  - Organisés par région
  - Disponible mobile et web

### Files Created
- `/app/frontend/src/pages/auth/ActivateMember.jsx`
- `/app/frontend/src/pages/auth/ActivateAgent.jsx`
- `/app/frontend/src/pages/cooperative/FieldAgentsPage.jsx`
- `/app/frontend/src/pages/cooperative/AddParcelPage.jsx`
- `/app/shared/constants/departments.js`

### Files Updated
- `/app/frontend/src/pages/Login.jsx` - Boutons d'activation ajoutés
- `/app/frontend/src/pages/cooperative/Dashboard.jsx` - Bouton "Agents Terrain" ajouté
- `/app/frontend/src/App.js` - Nouvelles routes
- `/app/mobile/greenlink-farmer/src/screens/parcels/AddParcelScreen.js` - Département au lieu de Région

---

## [Feb 28, 2026] - Export, Notifications & Offline Support

### Added
- **Export données ICI** (CSV/JSON)
  - Export alertes CSV
  - Export visites SSRTE CSV  
  - Export profils ICI CSV
  - Export rapport complet JSON
  
- **Tableau Comparatif Coopératives** (`/admin/cooperative-comparison`)
  - Moyennes nationales (membres, taux ICI, visites)
  - Rankings avec trophées (🏆🥈🥉)
  - Classement par taux complétion ICI
  - Métriques détaillées par coopérative

- **Mode Offline SSRTE** (`/cooperative/ssrte`)
  - Détection automatique connexion (online/offline)
  - Sauvegarde locale des visites hors-ligne
  - Synchronisation automatique à la reconnexion
  - Cache des membres pour mode offline
  - Bouton "Sync" pour synchronisation manuelle

### New API Endpoints
- `/api/ici-export/alerts/csv`
- `/api/ici-export/ssrte-visits/csv`
- `/api/ici-export/profiles/csv`
- `/api/ici-export/full-report/json`
- `/api/ici-export/cooperatives/compare`
- `/api/ici-export/offline/sync`
- `/api/ici-export/offline/pending`
- `/api/ici-export/notifications/preferences`
- `/api/ici-export/notifications/unread`

### Files Created
- `/app/backend/routes/ici_export.py`
- `/app/frontend/src/pages/admin/CooperativeComparison.jsx`

### Files Updated
- `ICIAlertsDashboard.jsx` - Section export ajoutée
- `SSRTEDashboard.jsx` - Support offline ajouté

---

## [Feb 28, 2026] - ICI Profile Page & Mobile Update

### Added
- **Profile Page ICI Section** (`/profile`)
  - Section "Informations du ménage (ICI)" pour producteurs
  - Édition complète des données ICI (département, village, genre, naissance, éducation, ménage, enfants)
  - Affichage de la classification de risque ICI (avec score et catégorie)
  - Mise à jour automatique du profil ICI lors de la sauvegarde

- **Mobile App v1.3.0** (Build en cours)
  - Formulaire d'inscription avec champs ICI pour producteurs
  - Section vert styled pour données ménage
  - Pickers natifs pour sélections

### Updated
- `Profile.jsx` - Section ICI complète avec classification de risque
- `RegisterScreen.js` (Mobile) - Champs ICI ajoutés
- `app.json` - Version 1.3.0

---

## [Feb 28, 2026] - ICI Data Collection & Alerts System

### Added
- **ICI Data Collection Module** (`/api/ici-data/...`)
  - Profils ICI producteurs (démographie, ménage, main-d'œuvre)
  - Système SSRTE (visites terrain, remédiation)
  - Classification automatique zones à risque
  - Calcul score de risque (0-100)
  - Génération automatique d'alertes
  
- **ICI Alerts Dashboard** (`/admin/ici-alerts`)
  - Dashboard alertes avec filtres
  - Métriques temps réel
  - Gestion alertes (prise en charge, résolution)
  - Génération rapports hebdomadaires

### New API Endpoints
- `/api/ici-data/farmers/{id}/ici-profile` - Profils ICI
- `/api/ici-data/ssrte/visit` - Visites SSRTE
- `/api/ici-data/alerts` - Gestion alertes
- `/api/ici-data/metrics/calculate` - Métriques temps réel

### Files Created
- `/app/backend/routes/ici_data_collection.py`
- `/app/frontend/src/pages/admin/ICIAlertsDashboard.jsx`

### Models Updated
- `auth_models.py` - Champs ICI ajoutés (department, genre, date_naissance, etc.)

---

## [Feb 28, 2026] - ICI Analytics Module

### Added
- **ICI Analytics Dashboard** (`/admin/ici-analytics`)
  - Dashboard travail des enfants basé sur rapport ICI 2024
  - Catégorisation zones productrices (Gouvernement CI 2006)
  - Indicateurs impact social alignés ODD
  - Package due diligence acheteur EUDR
  
### New API Endpoints
- `/api/ici-analytics/child-labor-dashboard`
- `/api/ici-analytics/zone-categorization`
- `/api/ici-analytics/social-impact-indicators`
- `/api/ici-analytics/cash-transfer-program`
- `/api/ici-analytics/child-friendly-programs`
- `/api/ici-analytics/forced-labor-risk`
- `/api/ici-analytics/buyer-due-diligence-package`

### Files Created
- `/app/backend/routes/ici_analytics.py`
- `/app/frontend/src/pages/admin/ICIAnalyticsDashboard.jsx`

---

## [Feb 28, 2026] - Premium Analytics Module

### Added
- 10 analytics institutionnels monétisables
- Tendances volumétriques et prix
- Adoption pratiques durables vérifiées IA
- Distribution scores carbone
- Conformité EUDR détaillée
- Impact économique agrégé
- Résilience climatique
- Cartographie potentiel carbone
- Benchmarks sectoriels
- Prévisions macro 2030

---

## [Feb 28, 2026] - Billing Module

### Added
- Module facturation complet pour Super Admin
- Gestion factures crédits carbone
- Enregistrement paiements
- Distributions producteurs
- Dashboard financier

---

## [Feb 28, 2026] - Mobile App v1.2.3

### Added
- Écran d'accueil (Welcome Screen)
- Afficher/masquer mot de passe
- Liens légaux cliquables avec modales
- Dropdown départements (51 zones)

### Fixed
- Authentification mobile
- Navigation BottomTabBar

---

## [Feb 27, 2026] - Earlier Updates

### Features
- Carbon Marketplace
- Partners Section
- Admin Dashboard
- Legal Pages
- Mobile App base features
- Push Notifications
- Background Sync
- Cooperative Module
- Super Admin Strategic Dashboard
