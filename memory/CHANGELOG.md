# GreenLink CHANGELOG

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
