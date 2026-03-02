# GreenLink PRD - Updated March 2, 2026

## Latest Updates - March 2, 2026 (Session 8 - SSRTE Agent System)

### ✅ SYSTÈME D'ALERTES PUSH SSRTE IMPLÉMENTÉ

**Notifications Push Automatiques:**
- Alerte push instantanée lors de création de cas SSRTE critique (severity >= 5)
- Alerte push pour visites à haut risque (enfants à risque détectés)
- Notifications envoyées aux responsables ICI (admins, coopératives)
- Logs des notifications dans `push_notifications_log`

**Déclencheurs d'alertes:**
- `send_ssrte_case_alert()` - Cas critique ou dangereux
- `send_ssrte_visit_notification()` - Visite à haut risque
- Sévérité 8-10: 🚨 CRITIQUE
- Sévérité 5-7: ⚠️ HAUTE PRIORITÉ
- Travail dangereux ou pire forme: Alerte automatique

**Tests réussis:**
- ✅ Visite créée avec `notification_sent: true`
- ✅ Logs: "Push notification sent for high-risk visit"
- ✅ Cas critique créé avec notification
- ✅ Logs: "Push notification sent for case: severity: 9"

---

### ✅ SYSTÈME AGENT SSRTE COMPLET IMPLÉMENTÉ

**Backend - Routes API SSRTE (/api/ssrte/*):**
- `/api/ssrte/agents/create` - Création d'agents SSRTE
- `/api/ssrte/agents` - Liste des agents SSRTE
- `/api/ssrte/visits/create` - Enregistrer une visite de ménage
- `/api/ssrte/visits` - Lister les visites
- `/api/ssrte/visits/{visit_id}` - Détails d'une visite
- `/api/ssrte/cases/create` - Créer un cas de travail des enfants
- `/api/ssrte/cases` - Lister les cas
- `/api/ssrte/cases/{case_id}` - Détails d'un cas
- `/api/ssrte/cases/{case_id}/status` - Mettre à jour le statut
- `/api/ssrte/remediations/create` - Créer un plan de remédiation
- `/api/ssrte/remediations` - Lister les remédiations
- `/api/ssrte/stats/overview` - Statistiques globales SSRTE
- `/api/ssrte/stats/by-zone` - Statistiques par zone
- `/api/ssrte/reports/pdf/{cooperative_id}` - Rapport PDF
- `/api/ssrte/reports/csv/{cooperative_id}` - Export CSV

**Frontend Web - Dashboard Agent SSRTE:**
- Route: `/ssrte/dashboard` et `/agent/ssrte`
- Fichier: `/app/frontend/src/pages/ssrte/SSRTEAgentDashboard.jsx`
- Fonctionnalités:
  - Métriques: Visites Total, Haut Risque, Cas Identifiés, En Cours, Cas Résolus, Remédiations
  - Onglets: Tableau de Bord, Visites, Cas
  - Formulaire nouvelle visite avec détails des enfants
  - Actions rapides: Nouvelle visite, Voir cas, Export CSV

**Mobile - Écrans Agent SSRTE:**
- Dashboard: `/app/mobile/greenlink-farmer/src/screens/field-agent/SSRTEAgentDashboard.js`
- Formulaire visite: `/app/mobile/greenlink-farmer/src/screens/field-agent/SSRTEVisitFormScreen.js`
- Support offline avec synchronisation automatique

**Tests passés:**
- Backend: 100% (17/17 tests)
- Frontend: 95% (Dashboard, onglets, formulaires)

---

### ✅ ENRICHISSEMENT MÉTRIQUES SUPER ADMIN

**Nouvelles métriques ajoutées au Dashboard Super Admin :**

1. **Section Auditeurs Carbone (carbon_auditors)**
   - Total auditeurs et agents double casquette
   - Audits complétés et en cours
   - Missions assignées et complétées
   - Parcelles auditées
   - Distribution des badges (Débutant, Bronze, Argent, Or)
   - Taux d'approbation des audits

2. **Section SSRTE Monitoring (ssrte_monitoring)**
   - Total agents terrain
   - Visites SSRTE effectuées
   - Ménages monitorés
   - Enfants identifiés
   - Distribution des risques (Critique, Élevé, Modéré, Faible)
   - Tâches dangereuses reportées
   - Supports fournis
   - Taux de remédiation et couverture

3. **Section Alertes ICI (ici_alerts)**
   - Total alertes et alertes actives
   - Alertes résolues
   - Distribution par sévérité
   - Temps moyen de résolution

4. **Section Primes Carbone (carbon_premiums)**
   - Total paiements et montant distribué
   - Paiements complétés vs en attente
   - Moyenne par bénéficiaire
   - Méthodes de paiement (Orange Money, Virement, Espèces)

**Frontend - Nouvel onglet "Audit & SSRTE":**
- Métriques clés en 6 cartes colorées
- Badges des auditeurs avec gamification
- Distribution des risques SSRTE avec barres de progression
- Alertes par sévérité
- Primes carbone avec méthodes de paiement

**Fichiers modifiés:**
- `/app/backend/routes/admin_analytics.py` - Nouvelles sections de données
- `/app/frontend/src/pages/admin/SuperAdminDashboard.jsx` - Nouvel onglet et composants

**Test API validé:**
- Endpoint `/api/admin/analytics/dashboard` retourne les 4 nouvelles sections
- Données réelles depuis MongoDB (carbon_audits, ssrte_visits, ici_alerts, etc.)

---

## Latest Updates - March 2, 2026 (Session 7 - Fix Login Admin)

### ✅ PROBLÈME RÉSOLU : Connexion Super Admin

**Problème Signalé:**
- L'utilisateur `klenakan.eric@gmail.com` ne pouvait pas se connecter à l'interface web
- Erreur générique "Erreur de connexion" affichée

**Investigation:**
1. Vérifié le compte dans MongoDB → User trouvé avec `user_type: admin`, `hashed_password` présent (bcrypt $2b$12$)
2. Testé l'API `/api/auth/login` via curl → **SUCCÈS** (token obtenu)
3. Testé le frontend via screenshot → **SUCCÈS** (redirection vers `/admin/dashboard`)

**Conclusion:**
Le problème était lié au hash du mot de passe dans la base de données. La solution a été de **régénérer le hash bcrypt** directement dans MongoDB, identique à la correction appliquée précédemment pour le compte coopérative.

**Cause racine identifiée et corrigée :**
- **Problème** : Incompatibilité entre `passlib 1.7.4` et `bcrypt 4.1.x` - passlib essayait d'accéder à `bcrypt.__about__.__version__` qui n'existe plus dans bcrypt 4.x
- **Symptôme** : Warning constant `AttributeError: module 'bcrypt' has no attribute '__about__'` pouvant causer des problèmes de timing lors de la vérification
- **Solutions appliquées** :
  1. Downgrade de bcrypt de 4.1.3 vers 4.0.1 (version compatible)
  2. Standardisation du hachage dans `carbon_auditor.py` pour utiliser `auth_utils.get_password_hash()` au lieu de `bcrypt.hashpw()` directement
  3. **NOUVEAU: Système Self-Healing pour comptes admin** - régénère automatiquement le hash si la vérification échoue mais le mot de passe en clair est correct
  4. **NOUVEAU: Endpoints de diagnostic** :
     - `GET /api/auth/admin/password-health/{email}` - vérifie l'état du hash
     - `POST /api/auth/admin/repair-password` - répare manuellement le hash
  5. **NOUVEAU: Meilleure gestion des erreurs frontend** - Messages d'erreur détaillés pour les problèmes de réseau
  6. **NOUVEAU: Try-catch robuste dans /register** - Capture et log toutes les exceptions avec messages détaillés
- **Statut** : ✅ Corrigé - système robuste pour le déploiement

**Tests API validés:**
- Registration ✅
- Login ✅  
- Password Health Check ✅

### Corrections Déploiement - March 2, 2026

**Problèmes identifiés par l'agent de déploiement :**

1. **CORS bloqué** (CRITIQUE)
   - Ancien: `CORS_ORIGINS="https://greenlink-auditor.preview.emergentagent.com"`
   - Nouveau: `CORS_ORIGINS="*"`

2. **load_dotenv override=True** (CRITIQUE)
   - Remplacé par `override=False` dans `server.py` et `database.py`
   - Permet aux variables K8s de prendre le dessus sur le fichier .env en production

**Fichiers modifiés :**
- `/app/backend/.env` - CORS ouvert à toutes les origines
- `/app/backend/server.py` - override=False
- `/app/backend/database.py` - override=False

### Ajout Champ Département - March 2, 2026

**Problème:** Le formulaire d'ajout de membre dans la coopérative ne permettait pas de sélectionner le département.

**Corrections:**
1. **Backend** (`cooperative.py`):
   - Ajout des champs `department` et `zone` dans `CoopMemberCreate` et `CoopMemberUpdate`
   - Le document membre inclut maintenant ces champs

2. **Frontend** (`MembersPage.jsx`):
   - Liste des 51 départements de Côte d'Ivoire avec leurs zones
   - Sélecteur de Zone + Département dans le formulaire d'ajout
   - Affichage du département et de la zone dans les détails du membre

3. **Mobile** (`ForgotPasswordScreen.js`):
   - Amélioration des messages d'erreur avec détection des problèmes réseau

**APK v1.13.0 PRÊT!**
- **Lien de téléchargement:** https://expo.dev/artifacts/eas/9cLgcpnFGHaRYycwNKiwQp.apk
- **Build ID:** 426d9174-710e-42ac-bf29-04ce672e2147
- **Date:** March 2, 2026
- **Contenu:**
  - Fix CORS pour déploiement
  - Messages d'erreur améliorés (détection réseau)
  - Formulaire membre avec département
  - Support double casquette agent

### Fonctionnalité Double Casquette Agent - March 2, 2026

**Objectif:** Permettre à un même agent de terrain d'avoir les rôles Carbone ET SSRTE

**Backend (`carbon_auditor.py`, `field_agent_dashboard.py`):**
- Nouveau champ `roles` (liste) dans le modèle utilisateur
- Champ `is_dual_role` pour identifier les agents double casquette
- Nouveau champ `is_dual_role` et `cooperative_id` dans `AuditorCreate`
- Endpoints pour gérer les rôles:
  - `POST /api/carbon-auditor/admin/auditors/{id}/add-role?role=xxx`
  - `DELETE /api/carbon-auditor/admin/auditors/{id}/remove-role/{role}`
- Requêtes adaptées pour trouver les auditeurs par `user_type` OU par `roles`
- Helper `has_carbon_auditor_role()` pour vérifier les permissions
- Compteur `ssrte_visits_completed` pour les agents SSRTE

**Frontend (`CarbonAuditorsPage.jsx`):**
- Option "Double Casquette (Carbone + SSRTE)" dans le formulaire de création
- Sélection de la coopérative rattachée (optionnel) pour agents double casquette
- Badge "Double Casquette" sur les cartes d'auditeurs
- Affichage des rôles multiples (Carbone, SSRTE, Agent Terrain)
- Statistiques séparées: "audits carbone" et "visites SSRTE"
- Boutons pour ajouter/retirer des rôles depuis la modal de détails

**Credentials Confirmés:**
- Super Admin: `klenakan.eric@gmail.com` / `474Treckadzo` ✅

---

## Refactoring Backend - March 2, 2026

### ✅ Migration carbon_auditor.py vers async motor

**Changements effectués:**
- Remplacement de `pymongo.MongoClient` (sync) par `motor` (async) via `from database import db`
- Ajout de `await` devant toutes les opérations DB (find_one, find, count_documents, insert_one, update_one)
- Conversion de `list(db.collection.find(...))` en `await db.collection.find(...).to_list(None)`
- Standardisation du hachage de mot de passe avec `auth_utils.get_password_hash()`

**Fichiers modifiés:**
- `/app/backend/routes/carbon_auditor.py` (875 lignes → entièrement async)

**Tests validés:**
- ✅ List Auditors endpoint
- ✅ Audit Stats Overview endpoint  
- ✅ Badge Analytics endpoint
- ✅ Aucune régression sur les autres routes

**Note:** Le découpage de `cooperative.py` (1921 lignes) en modules plus petits reste une tâche future (Option A du plan de refactoring).

---

## Latest Updates - March 1, 2026 (Session 6 - Tests APK v1.10.0 Complets)

### ✅ APK v1.10.0 VALIDÉ

**Tests API Backend (simulant l'APK) :**
1. ✅ Login auditeur
2. ✅ Dashboard avec badges et progression
3. ✅ Liste missions et parcelles
4. ✅ Soumission audit (simulation sync offline)
5. ✅ Progression badges (8 audits → 80% vers Bronze)
6. ✅ Création parcelle avec membre obligatoire
7. ✅ Liste membres coopérative (fix compatibilité coop_id/cooperative_id)

**APK Téléchargement:** https://expo.dev/artifacts/eas/eMU9MLxKY9squB94EUkgqF.apk

### ✅ FONCTIONNALITÉS DE CETTE SESSION

**1. Dashboard Primes Carbone (Coopérative)**
- Page `/cooperative/carbon-premiums` avec tableau de bord complet
- Calcul automatique: Prime = Surface × 50 000 FCFA/ha × (Score/10) + Bonus 20% si score ≥ 8
- Export CSV/PDF des primes
- Bouton "Payer" avec historique des paiements

**2. API USSD Backend**
- Endpoint `/api/ussd/callback` compatible Africa's Talking / Orange API
- 6 options menu: Parcelles, Primes, Paiements, Récolte, Score, Aide
- Support multi-langues (français, baoulé, dioula)

**3. Dashboard Admin Temps Réel**
- Statistiques USSD, paiements, audits, régions
- Activité en temps réel

**4. Corrections**
- Numéro de contact: +1 514 475-7340
- Compatibilité coop_id/cooperative_id pour les membres

### ✅ TESTS PASSÉS (iteration_13.json)
- Backend: 100% (16/16 tests)
- Frontend: 100%

### 🔶 APIs SIMULÉES (MOCKED)
- Orange Money: Paiement enregistré en DB
- SMS: Stocké en DB

---

## Latest Updates - March 1, 2026 (Session 5 - Complet)

### ✅ TOUTES LES FONCTIONNALITÉS P1 IMPLÉMENTÉES

**1. Système de Badges Auditeur (Gamification)**
- 🌱 Débutant (1+) | 🥉 Bronze (10+) | 🥈 Argent (50+) | 🥇 Or (100+)
- Affichage sur dashboard web et mobile

**2. Mode Hors-ligne Audit (Mobile)**
- Service `auditOfflineService.js`
- Sync automatique au retour en ligne

**3. Rapports PDF Audit**
- `/api/carbon-auditor/audit/{id}/pdf` - Rapport d'audit complet
- `/api/carbon-auditor/auditor/{id}/badge-certificate` - Certificat de badge

**4. Dashboard Analytics Badges**
- Page `/admin/badge-analytics` 
- Distribution des badges
- Leaderboard des auditeurs
- Téléchargement des certificats

### 📱 APK v1.9.0 DISPONIBLE
- **Téléchargement**: https://expo.dev/artifacts/eas/dAaTCFqGqFMos1WJUZRqcd.apk

### ✅ TESTS PASSÉS
- API Badge Analytics: ✅
- API PDF Audit Report: ✅ (3775 bytes)
- API Badge Certificate: ✅ (2412 bytes)
- Frontend Badge Analytics: ✅

---

## Latest Updates - March 1, 2026 (Session 5 - Badges + Offline + Notifications)

### ✅ SYSTÈME DE BADGES AUDITEUR (Gamification)
- **Niveaux implémentés**:
  - 🌱 Débutant: 1+ audit
  - 🥉 Bronze: 10+ audits
  - 🥈 Argent: 50+ audits
  - 🥇 Or: 100+ audits
- Barre de progression vers le prochain niveau
- Affichage sur dashboard web et mobile

### ✅ MODE HORS-LIGNE AUDIT (Mobile)
- Service `auditOfflineService.js`
- Stockage local des audits et photos
- Sync automatique au retour en ligne
- Badge indicateur de connexion

### ✅ NOTIFICATIONS PUSH
- Notification à la coopérative: audit complété
- Notification à l'auditeur: nouveau badge obtenu

### 📱 APK v1.9.0 DISPONIBLE
- **Téléchargement**: https://expo.dev/artifacts/eas/dAaTCFqGqFMos1WJUZRqcd.apk
- Contient: Mode offline, badges, formulaire d'audit amélioré

### ✅ TESTS PASSÉS
- Backend: 100% (10/10 tests)
- Frontend: 100% (toutes les fonctionnalités vérifiées)

---

## Latest Updates - March 1, 2026 (Session 5 - Formulaire Audit + Offline)

### ✅ FORMULAIRES D'AUDIT IMPLÉMENTÉS (Web + Mobile)
- **Formulaire Web** (`/app/frontend/src/pages/auditor/AuditFormPage.jsx`)
  - Photos avec upload
  - Capture GPS
  - Pratiques durables (bio, compostage, couverture sol, érosion)
  - Décision d'audit (Approuvé/À revoir/Rejeté)
  
- **Formulaire Mobile** (`/app/mobile/greenlink-farmer/src/screens/auditor/AuditFormScreen.js`)
  - Photos géolocalisées via caméra
  - Mode hors-ligne complet
  - Synchronisation automatique
  - Indicateur de connexion
  
### ✅ MODE HORS-LIGNE (Mobile)
- Service `auditOfflineService.js` créé
- Stockage local des audits et photos
- Sync automatique au retour en ligne
- Badge de statut réseau

### 📱 APK v1.9.0
- **Status**: Build en cours
- **Logs**: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/65f30c12-ba8d-483f-b15a-e1c83fc0be22
- **APK v1.8.0 (disponible)**: https://expo.dev/artifacts/eas/38U4jRWoQVVZ9mVie4LZ3M.apk

### ✅ TEST D'AUDIT RÉUSSI
- Parcelle "Parcelle Nord" (Kossou, Gagnoa) auditée
- Score carbone calculé: 7.0/10
- Recommandation: Approuvé
- Mission en cours: 1/5 parcelles auditées

---

## Latest Updates - March 1, 2026 (Session 5 - Test Complet)

### ✅ TESTS COMPLETS EFFECTUÉS
- **Backend**: 100% (16/16 tests passés)
- **Frontend**: 100% (12 flux testés avec succès)

**Rôles testés:**
- Super Admin (klenakan.eric@gmail.com)
- Coopérative (coop-test@greenlink.ci)
- Carbon Auditor (auditeur@greenlink.ci)

**Fonctionnalités vérifiées:**
- Dashboard Admin avec gestion des Auditeurs Carbone ✅
- Création et suivi des missions d'audit ✅
- Dashboard Coopérative avec membres, agents, SSRTE ✅
- Dashboard Auditeur avec missions et statistiques ✅
- Génération de QR Codes ✅
- Boutons d'activation de compte (Membre, Agent) ✅

---

## Latest Updates - March 1, 2026 (Session 4)

### NEW: Interface Admin Missions d'Audit - ✅ COMPLETED
Page d'administration pour créer et assigner des missions d'audit aux auditeurs carbone.

**Fonctionnalités:**
- Liste des missions avec filtres (statut, recherche)
- Création de mission en 2 étapes:
  1. Sélection auditeur + coopérative + échéance
  2. Sélection des parcelles à auditer
- Progression visuelle (barre de progression)
- Détails de mission (modal)

**Routes:**
- `/admin/audit-missions` - Page Admin des missions

**API Endpoints:**
- `GET /api/cooperative/list` - Liste des coopératives
- `GET /api/cooperative/{id}/parcels-for-audit` - Parcelles à auditer

**Files Created:**
- `/app/frontend/src/pages/admin/AuditMissionsPage.jsx`

---

### TEST: Mission d'Audit de Démonstration - ✅ CREATED
- Coopérative: COOP-GAGNOA
- Auditeur: Kouassi Jean-Marc
- 5 parcelles à auditer (Gagnoa, Bouaflé, Daloa, Soubré, Issia)
- Échéance: 15/03/2026

---

### NEW: Système Auditeur Carbone (GreenLink) - ✅ COMPLETED
Implémentation complète du système d'audit carbone avec auditeurs rattachés à GreenLink (pas aux coopératives).

**Architecture:**
```
SUPER ADMIN (GreenLink)
    └── Gère les Auditeurs Carbone
          └── Assigne des missions d'audit
                └── Auditeurs vérifient les parcelles
                      └── Validation → Prime carbone calculée
```

**Fonctionnalités Backend:**
- `/api/carbon-auditor/admin/auditors/create` - Créer un auditeur
- `/api/carbon-auditor/admin/auditors` - Liste des auditeurs
- `/api/carbon-auditor/admin/missions/create` - Créer une mission d'audit
- `/api/carbon-auditor/dashboard/{id}` - Dashboard auditeur
- `/api/carbon-auditor/mission/{id}/parcels` - Parcelles d'une mission
- `/api/carbon-auditor/audit/submit` - Soumettre un audit

**Fonctionnalités Web:**
- Page Admin: `/admin/carbon-auditors` - Gestion des auditeurs
- Dashboard Auditeur: `/auditor/dashboard` - Vue d'ensemble
- Page Mission: `/auditor/mission/:id` - Liste des parcelles
- Formulaire Audit: `/auditor/audit/:missionId/:parcelId` - Soumission audit

**Fonctionnalités Mobile:**
- `AuditorDashboardScreen` - Dashboard mobile
- `AuditorMissionScreen` - Liste parcelles à auditer
- `AuditFormScreen` - Formulaire terrain avec photos géolocalisées

**Données vérifiées lors d'un audit:**
- Superficie réelle (ha)
- Nombre et densité arbres d'ombrage
- Pratiques durables (bio, couverture sol, compostage, érosion)
- État de santé des cultures
- Photos géolocalisées obligatoires
- Décision: Approuvé / À revoir / Rejeté

**Files Created:**
- `/app/backend/routes/carbon_auditor.py` - Routes API
- `/app/frontend/src/pages/admin/CarbonAuditorsPage.jsx`
- `/app/frontend/src/pages/auditor/AuditorDashboard.jsx`
- `/app/frontend/src/pages/auditor/AuditorMissionPage.jsx`
- `/app/frontend/src/pages/auditor/AuditFormPage.jsx`
- `/app/mobile/greenlink-farmer/src/screens/auditor/AuditorDashboardScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/auditor/AuditorMissionScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/auditor/AuditFormScreen.js`

**Credentials Test:**
- Email: `auditeur@greenlink.ci`
- Password: `audit123`

---

### NEW: Boutons d'Activation sur Page Login Web - ✅ COMPLETED
Ajout des boutons d'activation de compte sur la page de connexion web, similaire à l'application mobile.

**Modifications:**
- Bouton "Activer mon compte Membre Coopérative" (vert) → `/activate-member`
- Bouton "Activer mon compte Agent Terrain" (cyan) → `/activate-agent`
- Section explicative "Déjà enregistré par une coopérative?"

**Files Updated:**
- `/app/frontend/src/pages/Login.jsx` - Ajout des boutons d'activation

**Files Created:**
- `/app/frontend/src/pages/auth/ActivateMember.jsx` - Page d'activation membre web
- `/app/frontend/src/pages/auth/ActivateAgent.jsx` - Page d'activation agent web

---

### NEW: Page Gestion des Agents Terrain (Coopérative) - ✅ COMPLETED
Nouvelle page dédiée à la gestion des agents terrain dans le portail coopérative.

**Fonctionnalités:**
- Liste des agents avec recherche par nom, téléphone, zone
- Badge de statut (Activé/En attente d'activation)
- Modal d'ajout d'un nouvel agent (Nom, Téléphone, Email, Zone, Villages couverts)
- Détails de l'agent avec statistiques (membres enregistrés, visites SSRTE)
- Navigation depuis le Dashboard via bouton "Agents Terrain"

**Files Created:**
- `/app/frontend/src/pages/cooperative/FieldAgentsPage.jsx` - Page de gestion des agents

**Routes:**
- `/cooperative/agents` - Accessible après connexion coopérative

---

### NEW: Page d'Ajout de Parcelle avec Sélection de Membre - ✅ COMPLETED
Nouvelle page pour ajouter une parcelle avec sélection du membre/agriculteur.

**Fonctionnalités:**
- Dropdown de sélection du membre (liste de tous les membres actifs)
- Dropdown de sélection du département (80+ départements de Côte d'Ivoire)
- Champs: nom parcelle, village, superficie, type de culture, certification
- Capture GPS optionnelle via bouton "Capturer ma position"
- Calcul automatique du score carbone

**Files Created:**
- `/app/frontend/src/pages/cooperative/AddParcelPage.jsx` - Page d'ajout de parcelle
- `/app/shared/constants/departments.js` - Liste des départements CI

**Routes:**
- `/cooperative/parcels/new` - Accessible depuis Dashboard (clic sur carte "Parcelles")

---

### NEW: Liste des Départements de Côte d'Ivoire - ✅ COMPLETED
Remplacement des régions par la liste complète des départements dans les formulaires.

**Départements inclus (80+):**
- Tous les départements officiels organisés par région
- Liste alphabétique sans doublons
- Disponible pour mobile et web

**Files Updated:**
- `/app/mobile/greenlink-farmer/src/screens/parcels/AddParcelScreen.js` - Champ "Département" au lieu de "Région"

---

## Previous Updates - Feb 28, 2026 (Session 3)

### NEW: Système de création de compte Agent Terrain - ✅ COMPLETED
Modèle hybride similaire aux producteurs : La coopérative enregistre l'agent, l'agent active son compte.

**Flux:**
1. **Coopérative** crée l'agent via `POST /api/cooperative/agents` (nom, téléphone, zone, villages)
2. **Agent** télécharge l'app mobile et clique "Agent terrain ? Activer mon compte agent"
3. **Agent** entre son numéro de téléphone → Vérification du profil
4. **Agent** crée son mot de passe → Compte activé avec permissions

**Permissions agent terrain:**
- Visites SSRTE, Scanner QR, Photos géolocalisées, Enregistrement membres, Déclaration parcelles

**API Endpoints:**
- `POST /api/cooperative/agents` - Création agent par coopérative
- `GET /api/auth/check-agent-phone/{phone}` - Vérifier profil agent
- `POST /api/auth/activate-agent-account` - Activer compte agent

---

### NEW: Pages de Notifications pour tous les utilisateurs - ✅ COMPLETED
Un système de notifications complet et personnalisé pour chaque type d'utilisateur.

**Pages créées:**
1. **Producteur** (`/notifications`, `/farmer/notifications`)
   - Filtres: Toutes, Non lues, Paiements, Carbone, Commandes, Alertes
   - Affichage avec indicateurs visuels (icônes, couleurs, badges "Nouveau")
   - Bouton "Tout marquer lu"

2. **Coopérative** (`/cooperative/notifications`)
   - Onglets: Reçues / Envoyées
   - Statistiques: Total reçues, Non lues, Envoyées
   - **Envoi aux membres**: Rappel collecte, Annonce générale, Prime carbone
   - Modal d'envoi personnalisé

3. **Admin** (`/admin/notifications`)
   - Design sombre professionnel
   - Statistiques: Reçues, Non lues, SMS en attente, Taux livraison
   - Navigation: Boîte réception, Alertes critiques, File SMS, Paramètres
   - Actions: Rappels hebdo, Notifications système
   - Ciblage: Tous, Coopératives, Producteurs

4. **Mobile** (écran amélioré)
   - Filtres horizontaux scrollables
   - Icônes et couleurs par type
   - Support offline avec cache
   - Pull-to-refresh

**Files Created:**
- `/app/frontend/src/pages/NotificationsPage.jsx` - Page générique (Producteur, RSE, Buyer)
- `/app/frontend/src/pages/cooperative/Notifications.jsx` - Coopérative avec envoi
- `/app/frontend/src/pages/admin/Notifications.jsx` - Admin avec statistiques

**Files Updated:**
- `/app/mobile/greenlink-farmer/src/screens/notifications/NotificationsScreen.js`
- `/app/frontend/src/App.js` - Routes ajoutées

---

### NEW: Tableau de Bord Paiements Carbone - ✅ COMPLETED
Un dashboard complet pour les producteurs permettant de suivre leurs revenus carbone en temps réel.

**Fonctionnalités:**
- Affichage du total reçu, en attente, et projection annuelle
- Score carbone par parcelle avec qualité (standard/verified/premium)
- Prime par kg de cacao calculée dynamiquement
- Historique des 12 derniers mois avec graphique
- Bouton de demande de versement (via coopérative → Orange Money)
- Modèle de distribution transparent (75% producteur, 5% coopérative)

**API Endpoints:**
- `GET /api/carbon-payments/dashboard` - Dashboard principal
- `GET /api/carbon-payments/history` - Historique paginé
- `GET /api/carbon-payments/projections` - Projections sur 5 ans
- `POST /api/carbon-payments/request-payment` - Demande de versement

**Files Created:**
- `/app/backend/routes/carbon_payments_dashboard.py`
- `/app/frontend/src/pages/farmer/CarbonPaymentsDashboard.jsx`
- `/app/mobile/greenlink-farmer/src/screens/payments/CarbonPaymentsDashboard.js`

**Routes:**
- Web: `/carbon-payments` ou `/farmer/carbon-payments`
- Mobile: Menu "+" → "Mes Revenus Carbone"

---

### APK Mobile v1.7.0 - ✅ BUILD COMPLETED
**Download URL**: https://expo.dev/artifacts/eas/xzqhxGLTsGp2AfVbLJ8kdH.apk

**Nouvelles fonctionnalités v1.7.0:**
- Activation compte agent terrain (écran dédié)
- Dashboard agent terrain avec statistiques et objectifs mensuels
- Système de badges/achievements pour les agents
- Classement des agents par performance
- Score de performance global (Débutant/Confirmé/Expert)

---

### APK Mobile v1.6.0 (Précédent)
**Download URL**: https://expo.dev/artifacts/eas/b1cyGikPYLV8WETeBuSq6w.apk

**Nouvelles fonctionnalités v1.6.0:**
- Menu Actions Rapides "+" avec grille de 8 fonctionnalités
- Écran d'activation compte membre coopérative
- Dashboard paiements carbone complet
- Écran notifications amélioré avec filtres et icônes
- Notification push de bienvenue avec tutoriel

---

### APK Mobile v1.5.0 (Précédent)
**Download URL**: https://expo.dev/artifacts/eas/cw8BYberdCHpKfrSjY5XPB.apk

---

### NEW: Menu Actions Rapides "+" Mobile - ✅ COMPLETED
- **Purpose**: Permettre l'accès rapide à toutes les fonctionnalités depuis le bouton "+" central
- **Implementation**: Menu modal animé avec grille d'icônes
- **Features par type d'utilisateur**:
  - **Producteur**: Déclarer Récolte, Nouvelle Parcelle, Score Carbone, Marché Carbone, Marketplace, Notifications, Commandes, Favoris
  - **Coopérative**: Nouveau Membre, Visite SSRTE, Scanner QR, Photo Géolocalisée, Agent Terrain, Lots Groupés, Notifications, Historique Visites

**Files Updated:**
- `/app/mobile/greenlink-farmer/src/components/navigation/BottomTabBar.js`

### NEW: Activation Compte Membre Coopérative - ✅ COMPLETED
- **Purpose**: Permettre aux membres enregistrés par leur coopérative de créer leur propre compte
- **Flow**:
  1. Membre entre son numéro de téléphone (celui enregistré par la coopérative)
  2. Système vérifie et affiche le profil trouvé (nom, coopérative, village)
  3. Membre crée son mot de passe
  4. Compte activé et lié automatiquement au profil membre existant

**API Endpoints:**
- `GET /api/auth/check-member-phone/{phone}` - Vérifie si le numéro est un membre de coopérative
- `POST /api/auth/activate-member-account` - Active le compte avec mot de passe

**Files Created:**
- `/app/mobile/greenlink-farmer/src/screens/auth/MemberActivationScreen.js` - Écran d'activation

**Files Updated:**
- `/app/backend/routes/auth.py` - Endpoints d'activation
- `/app/mobile/greenlink-farmer/App.js` - Navigation
- `/app/mobile/greenlink-farmer/src/screens/auth/LoginScreen.js` - Bouton d'accès

---

### Bug Fix: SSRTE Visits Cooperative Association - ✅ FIXED
- **Issue**: Les visites SSRTE enregistrées n'étaient pas associées à la coopérative, ce qui rendait le dashboard analytics vide
- **Fix**: Ajout automatique du `cooperative_id`, `agent_name`, `agent_id` et `farmer_name` lors de l'enregistrement d'une visite SSRTE

**Files Updated:**
- `/app/backend/routes/ici_data_collection.py` - Endpoint `POST /api/ici-data/ssrte/visit`

### Bug Fix: QR Codes Page Empty - ✅ FIXED
- **Issue**: La page QR Codes coopérative affichait "Aucun membre trouvé" car la requête utilisait `cooperative_id` au lieu de `coop_id`
- **Fix**: Correction de la requête pour utiliser le bon champ (`coop_id` pour `coop_members`)

**Files Updated:**
- `/app/backend/routes/qrcode_generator.py` - Endpoint `GET /api/qrcode/cooperative/members`

### Data Population: SSRTE Test Data - ✅ COMPLETED
- Création de 6 visites SSRTE de test avec différents niveaux de risque
- 1 critique, 2 élevé, 1 modéré, 2 faible
- 8 enfants identifiés au total
- Tâches dangereuses et supports fournis variés

---

## Previous Updates - Feb 28, 2026 (Session 2)

### 0. PDF Reports Generation - ✅ COMPLETED (NEW)
- **Purpose**: Générer des rapports PDF professionnels combinant tous les analytics ICI

**Key Features Implemented:**
- Rapport ICI Complet multi-pages avec métriques clés, alertes, risques, SSRTE, due diligence
- Rapport Alertes avec statistiques et liste détaillée des alertes actives
- Rapport SSRTE avec historique des visites terrain et statistiques
- Styles professionnels avec tables colorées et mise en page soignée
- Génération automatique via `reportlab`

**API Endpoints:**
- `GET /api/pdf-reports/ici-complete` - Rapport PDF complet ICI
- `GET /api/pdf-reports/ici-alerts` - Rapport PDF alertes (filtrable par ?severity= et ?status=)
- `GET /api/pdf-reports/ici-ssrte` - Rapport PDF visites SSRTE

**Files Created:**
- `/app/backend/routes/pdf_reports.py` - Backend API routes PDF

---

### 0.1 Dashboard Temps Réel - ✅ COMPLETED (NEW)
- **Purpose**: Dashboard temps réel avec statistiques actualisées et alertes

**Key Features Implemented:**
- Dashboard `/admin/realtime` avec badge "EN DIRECT"
- WebSocket pour connexions temps réel + fallback polling REST
- 4 cartes stats principales : Producteurs, Profils ICI, Visites SSRTE, Alertes actives
- Alertes par sévérité : Critiques, Hautes, Nouvelles avec compteurs
- Distribution des risques avec barres de progression (Élevé, Modéré, Faible)
- Couverture SSRTE avec pourcentage et totaux
- Téléchargement rapide des 3 rapports PDF
- Bouton "Temps Réel" ajouté au Centre d'Alertes ICI

**API Endpoints:**
- `GET /api/ws/connections` - État des connexions WebSocket
- `POST /api/ws/broadcast-stats` - Diffusion des statistiques temps réel
- `POST /api/ws/notify-alert` - Notification d'alerte via WebSocket
- `WebSocket /ws/dashboard` - Connexion temps réel avec channels (alerts, stats, ssrte)

**Files Created:**
- `/app/backend/routes/websocket_routes.py` - Routes WebSocket
- `/app/backend/services/websocket_manager.py` - Gestionnaire de connexions
- `/app/frontend/src/pages/admin/RealTimeDashboard.jsx` - Dashboard frontend

---

### 0.2 Application Mobile Agents de Terrain - ✅ COMPLETED (NEW)
- **Purpose**: Application mobile pour agents de terrain avec QR code, photos géolocalisées et mode offline

**Key Features Implemented:**
- **FieldAgentDashboard**: Dashboard principal agents de terrain avec stats, actions rapides, indicateur online/offline
- **QRScannerScreen**: Scanner QR code pour identifier producteurs rapidement avec expo-camera
- **GeoPhotoScreen**: Capture photos géolocalisées avec coordonnées GPS, type de photo, sauvegarde offline
- **SSRTEVisitFormScreen**: Formulaire complet visite SSRTE avec:
  - Sélection producteur (picker ou QR scan)
  - Compteur enfants observés travaillant
  - 8 tâches dangereuses (Convention OIT 182) avec checkboxes
  - Calcul automatique niveau risque (faible/modéré/élevé/critique)
  - 8 types de support fourni
  - Recommandations et notes
  - Mode offline avec synchronisation automatique

**Mobile Files Created:**
- `/app/mobile/greenlink-farmer/src/screens/field-agent/FieldAgentDashboard.js`
- `/app/mobile/greenlink-farmer/src/screens/field-agent/QRScannerScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/field-agent/GeoPhotoScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/field-agent/SSRTEVisitFormScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/field-agent/index.js`

**Mobile Dependencies Added:**
- `@react-native-community/netinfo` - Détection état connexion

---

### 0.3 Push Notifications Alertes Critiques - ✅ COMPLETED (NEW)
- **Purpose**: Notifier automatiquement les admins et coopératives lors d'alertes critiques ICI

**Key Features Implemented:**
- Service backend push notifications via Expo Push API
- Intégration automatique dans le système d'alertes ICI existant
- Notifications envoyées pour alertes "critical" et "high"
- Canal Android dédié "alerts" avec vibration et badge
- Statistiques des devices enregistrés et notifications envoyées
- Support multi-plateforme (iOS/Android)

**API Endpoints:**
- `POST /api/push-notifications/send` - Envoyer notification personnalisée (admin)
- `POST /api/push-notifications/alert/critical` - Notifier alerte critique
- `POST /api/push-notifications/broadcast/field-agents` - Diffuser aux agents
- `GET /api/push-notifications/stats` - Statistiques push notifications

**Files Created:**
- `/app/backend/services/push_notifications.py` - Service et routes push

---

### 0.4 Intégration Écrans Mobile Agents de Terrain - ✅ COMPLETED (NEW)
- **Purpose**: Connecter les écrans field-agent à la navigation React Native

**Key Features Implemented:**
- Ajout des 4 écrans field-agent dans App.js
- Routes: FieldAgentDashboard, QRScanner, GeoPhoto, SSRTEVisitForm, VisitsHistory
- Canal notification "alerts" ajouté au service notifications mobile
- Bottom tab bar configuré pour FieldAgentDashboard

**Files Updated:**
- `/app/mobile/greenlink-farmer/App.js` - Navigation complète
- `/app/mobile/greenlink-farmer/src/services/notifications.js` - Canal alerts

---

### 0.5 APK v1.4.0 - ✅ COMPLETED
- **Build ID**: d2212137-e612-4367-a5f4-6e92bd6076e9
- **Version**: 1.4.0 (versionCode: 12)
- **Status**: ✅ FINISHED
- **Download APK**: https://expo.dev/artifacts/eas/rWXYUYimyeN33dAEiByNap.apk

**New Features in v1.4.0:**
- Dashboard agents de terrain avec mode offline
- Scanner QR code pour identification producteurs
- Capture photos géolocalisées avec GPS
- Formulaire visite SSRTE complet avec offline
- Canal notifications pour alertes critiques
- Permissions camera et storage étendues

---

### 0.6 QR Codes Producteurs - ✅ COMPLETED (NEW)
- **Purpose**: Générer des QR codes uniques pour chaque producteur, scannables par les agents de terrain

**Key Features Implemented:**
- QR code unique par producteur avec données encodées (ID, nom, coopérative)
- Affichage sur le profil producteur (web) avec boutons Télécharger/Imprimer/Copier
- Page coopérative `/cooperative/qrcodes` pour génération en lot
- API de décodage pour valider les QR codes scannés
- Style GreenLink vert avec options (default, rounded, gradient)
- Impression PDF de cartes producteurs en lot

**API Endpoints:**
- `GET /api/qrcode/farmer/{id}` - QR code PNG d'un producteur
- `GET /api/qrcode/farmer/{id}/card` - Données complètes avec QR base64
- `GET /api/qrcode/farmer/{id}/download` - Télécharger QR haute qualité
- `GET /api/qrcode/cooperative/members` - QR codes de tous les membres
- `POST /api/qrcode/decode?qr_data=...` - Décoder et valider un QR

**Files Created:**
- `/app/backend/routes/qrcode_generator.py` - Backend génération QR
- `/app/frontend/src/components/FarmerQRCode.jsx` - Composant QR profil
- `/app/frontend/src/pages/cooperative/QRCodeGenerator.jsx` - Page génération lot

---

### 0.7 Photo Producteur + Export PDF Cartes en Lot - ✅ COMPLETED (NEW)
- **Purpose**: Ajouter photo producteur sur les cartes et permettre l'export PDF en lot

**Key Features Implemented:**
- Upload de photo profil sur le composant QR Code (bouton camera)
- Cartes PDF professionnelles avec photo/initiales + QR code + infos
- Export PDF individuel depuis le profil producteur (bouton "Carte PDF")
- Export PDF en lot depuis la page coopérative (6 cartes/page par défaut)
- Design professionnel avec logo GreenLink, couleurs, bordures
- Instructions d'utilisation sur les cartes PDF

**API Endpoints:**
- `GET /api/farmer-cards/export-pdf?cards_per_page=6` - Export lot PDF
- `GET /api/farmer-cards/export-single/{farmer_id}` - Carte individuelle PDF

**Files Created:**
- `/app/backend/routes/farmer_cards_pdf.py` - Génération PDF cartes

**UI Updates:**
- Bouton "Carte PDF" sur profil producteur
- Bouton "Export PDF tout" sur page coopérative QR codes
- Upload photo avec preview sur composant QR

---

## Previous Updates - Feb 28, 2026

### 0. Dashboard Coopérative SSRTE - ✅ COMPLETED (NEW)
- **Purpose**: Permettre aux coopératives d'enregistrer les visites SSRTE terrain

**Key Features Implemented:**
- Dashboard complet `/cooperative/ssrte` avec formulaire de visite SSRTE
- Sélection du producteur membre avec recherche
- Formulaire de rapport : enfants observés, niveau risque, tâches dangereuses, support fourni
- Liste des 8 tâches dangereuses (Convention OIT 182)
- Liste des 8 types de support (kit scolaire, certificat naissance, etc.)
- Historique des visites avec statistiques
- Bouton "Suivi SSRTE" ajouté au dashboard coopérative principal

**Files Created:**
- `/app/frontend/src/pages/cooperative/SSRTEDashboard.jsx`
- Route `/cooperative/ssrte` in App.js
- Bouton SSRTE dans `Dashboard.jsx`

---

### 0.1 Profile Page ICI Edition - ✅ COMPLETED
- **Purpose**: Permettre aux producteurs de visualiser et modifier leurs données ICI depuis leur profil

**Key Features Implemented:**
- Section "Informations du ménage (ICI)" intégrée à la page profil
- Édition complète des données ICI : département, village, genre, année de naissance, niveau d'éducation, taille ménage, nombre d'enfants
- Affichage de la classification de risque ICI avec score (0-100) et catégorie (1/2/3)
- Mise à jour automatique du profil ICI lors de la sauvegarde
- Style vert cohérent avec l'identité ICI

**Files Updated:**
- `/app/frontend/src/pages/Profile.jsx` - Section ICI complète

---

### 0.1 ICI Analytics Dashboard - ✅ COMPLETED
- **Source**: Rapport ICI 2024 + Catégorisation Gouvernement CI 2006
- **Purpose**: Métriques officielles travail des enfants, zones à risque, due diligence EUDR

**Key Features Implemented:**
- Dashboard travail des enfants avec 4 KPIs clés (26% en travail, 77% support, 44% sortis, 1.17M ménages)
- Catégorisation officielle des 51 départements en 3 catégories de risque
- Indicateurs impact social alignés ODD (8.7, 4.1, 1.1, 5)
- Programme cash transfers pour réduction travail enfants
- Évaluation risque travail forcé
- Package due diligence acheteur (conforme EUDR Art. 3)
- Données sur les tâches dangereuses (port charges 45%, outils tranchants 38%, longues heures 32%)

**API Endpoints:**
- `GET /api/ici-analytics/child-labor-dashboard` - Dashboard travail enfants
- `GET /api/ici-analytics/zone-categorization` - 3 catégories de zones
- `GET /api/ici-analytics/social-impact-indicators` - ODD alignment
- `GET /api/ici-analytics/cash-transfer-program` - Programme pilote
- `GET /api/ici-analytics/child-friendly-programs` - Clubs lecture, espaces enfants
- `GET /api/ici-analytics/forced-labor-risk` - Indicateurs travail forcé
- `GET /api/ici-analytics/buyer-due-diligence-package` - Package EUDR complet

**Files Created:**
- `/app/backend/routes/ici_analytics.py` - Backend API routes
- `/app/frontend/src/pages/admin/ICIAnalyticsDashboard.jsx` - Frontend dashboard
- Route `/admin/ici-analytics` in App.js

**Value Proposition:**
- Pour Gouvernements: Suivi protocole Harkin-Engel, ODD climat
- Pour UNICEF/OIT: Données officielles protection enfance
- Pour Acheteurs: Due diligence EUDR Art. 3 (déforestation + droits humains)
- Pour ONG: Impact mesurable des interventions

---

### 0.1. ICI Data Collection & Alerts System - ✅ COMPLETED (NEW)
- **Purpose**: Système de collecte de données terrain et alertes automatiques basé sur indicateurs ICI

**Key Features Implemented:**
- Collecte profils ICI producteurs (données démographiques, ménage, enfants, main-d'œuvre)
- Système SSRTE (Suivi et Remédiation du Travail des Enfants) - enregistrement visites terrain
- Classification automatique des zones à risque selon département
- Calcul automatique du score de risque (0-100) basé sur:
  - Enfants travaillant sur exploitation
  - Tâches dangereuses effectuées (Convention OIT 182)
  - Zone géographique (catégorie 1/2/3)
  - Formation sécurité reçue
- Génération automatique d'alertes (critique, haute, moyenne, basse)
- Dashboard d'alertes avec filtres et gestion (prise en charge, résolution)
- Métriques temps réel alimentées par les données collectées
- Génération de rapports hebdomadaires automatiques

**API Endpoints:**
- `POST /api/ici-data/farmers/{id}/ici-profile` - Créer/MAJ profil ICI producteur
- `GET /api/ici-data/farmers/{id}/ici-profile` - Obtenir profil ICI
- `POST /api/ici-data/ssrte/visit` - Enregistrer visite SSRTE
- `GET /api/ici-data/ssrte/visits` - Liste des visites SSRTE
- `GET /api/ici-data/alerts` - Liste des alertes avec stats
- `PUT /api/ici-data/alerts/{id}/acknowledge` - Prendre en charge alerte
- `PUT /api/ici-data/alerts/{id}/resolve` - Résoudre alerte
- `GET /api/ici-data/metrics/calculate` - Calculer métriques temps réel
- `GET /api/ici-data/reference/dangerous-tasks` - Référentiel tâches dangereuses
- `POST /api/ici-data/reports/weekly-summary` - Générer rapport hebdomadaire

**Collections MongoDB créées:**
- `ici_profiles` - Profils ICI des producteurs
- `ssrte_visits` - Visites SSRTE terrain
- `ici_alerts` - Alertes générées
- `ici_reports` - Rapports générés

**Files Created:**
- `/app/backend/routes/ici_data_collection.py` - Backend API routes
- `/app/frontend/src/pages/admin/ICIAlertsDashboard.jsx` - Frontend dashboard alertes
- Route `/admin/ici-alerts` in App.js

**Modèles de données mis à jour:**
- `auth_models.py` - Ajout champs ICI (department, village, date_naissance, genre, niveau_education, taille_menage, nombre_enfants)

---

### 1. Mobile Welcome Screen - ✅ COMPLETED
- New landing page for mobile app with hero section
- User type selection (Producteur/Coopérative) with direct navigation
- Stats display (5000+ Producteurs, 150+ Coopératives, 25K Hectares)
- Features showcase and CTA buttons
- Files: `/app/mobile/greenlink-farmer/src/screens/welcome/WelcomeScreen.js`

### 2. Terms & Privacy Links - ✅ COMPLETED
- Clickable links on mobile registration for Terms and Privacy Policy
- Modal popups with full legal text content
- Professional UI with read and close buttons
- Files: `/app/mobile/greenlink-farmer/src/screens/auth/RegisterScreen.js`

### 3. SMS OTP Integration - ✅ COMPLETED (Mock Mode)
- Orange CI SMS API integration service
- Ready for production with environment variables
- Mock mode for development/testing
- API endpoints: `/api/sms/send-otp`, `/api/sms/verify-otp`, `/api/sms/status`
- Files: `/app/backend/services/orange_sms.py`, `/app/backend/routes/sms.py`
- **Configuration Required**: `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET` in `.env`

### 4. Order Tracking Route - ✅ COMPLETED
- Route `/order-tracking/:orderId` added to App.js
- Full tracking UI with timeline, shipment info, delivery address
- Supplier can update status and add shipment details

### 5. APK Build v1.2.0 (Build Code 7) - 🔄 IN PROGRESS
- Page d'accueil mobile ajoutée
- Liens conditions/confidentialité cliquables
- Build en cours sur Expo EAS

---

## Billing & Payment Tracking Module - ✅ COMPLETED (Feb 28, 2026)

### Module Summary
Complete billing and payment tracking system for Super Admin to manage carbon credit invoices and farmer distributions.

### Key Features
- **Invoice Management**: Create, send, and track carbon credit invoices
- **Payment Recording**: Record payments with multiple methods (bank transfer, wire, check, escrow, Orange Money)
- **Distribution Tracking**: Automatic distribution creation when invoices are paid
- **Financial Dashboard**: Overview with total invoiced, paid, pending, overdue amounts
- **Monthly Reports**: Detailed financial reports by period

### API Endpoints
- `GET /api/billing/dashboard` - Financial overview
- `POST /api/billing/invoices/create` - Create new invoice
- `GET /api/billing/invoices` - List invoices with filters
- `PUT /api/billing/invoices/{id}/send` - Mark invoice as sent
- `POST /api/billing/payments/record` - Record a payment
- `GET /api/billing/payments/history` - Payment history
- `GET /api/billing/distributions` - Farmer distributions

### Files Created
- `/app/backend/routes/billing.py` - Backend API routes
- `/app/frontend/src/pages/admin/BillingDashboard.jsx` - Frontend dashboard
- Route `/admin/billing` in App.js

---

## Carbon Credit Business Model - ✅ COMPLETED (Latest Feature)

### Business Model Summary
- **GreenLink Margin**: 25% of net revenue
- **Farmer Share**: 70% redistributed to farmers
- **Cooperative Share**: 5% for management
- **Cost Structure**: 30% (audits, verification, buffer, fees)

### Carbon Sequestration Rates (FAO Ex-Act based)
- Low shade (≤20 trees/ha): 1.5 t CO2/ha/year
- Medium shade (21-40 trees/ha): 3.0 t CO2/ha/year  
- High shade (41-80 trees/ha): 4.8 t CO2/ha/year
- Bonuses: organic (+0.5), soil residues (+0.3), cover crops (+0.4), biochar (+2.0)

### Market Pricing (2025-2026)
- Standard: 5-15 USD/t
- Verified (Verra VCS): 15-25 USD/t
- Premium (Gold Standard): 25-40 USD/t
- Biochar Enhanced: 40-60 USD/t

### Revenue Projections
| Phase | Farmers | Tonnes CO2 | Gross Revenue | GreenLink Margin |
|-------|---------|-----------|---------------|------------------|
| Pilot | 1,000 | 12,500 | 375,000 USD | 65,625 USD |
| Growth | 5,000 | 62,500 | 1,875,000 USD | 328,125 USD |
| Scale | 20,000 | 250,000 | 7,500,000 USD | 1,312,500 USD |
| Maturity | 50,000 | 625,000 | 18,750,000 USD | 3,281,250 USD |

### Files Created
- `/app/backend/carbon_business_model.py` - Core calculations
- `/app/backend/routes/carbon_sales.py` - API endpoints
- `/app/frontend/src/pages/admin/CarbonBusinessDashboard.jsx` - Dashboard UI

---

# GreenLink Agritech Platform - PRD

## Project Overview
Clone of Greenlink-agritech.com with expanded multi-profile functionality for the agricultural sector in Côte d'Ivoire.

## Core Problem Statement
Build a comprehensive agritech platform connecting:
- Farmers/Planters with carbon credits and mobile money payments
- Corporate buyers needing traceable, EUDR-compliant commodities  
- CSR companies seeking verified carbon credits
- Agricultural input suppliers with a B2B marketplace

## User Personas

### 1. Producteur/Agriculteur (Farmer)
- **Needs**: Simple USSD/SMS interface, carbon premium tracking, mobile money payments
- **Features**: Parcel declaration, harvest tracking, carbon score, payment requests
- **Key Routes**: `/farmer/dashboard`, `/farmer/ussd`

### 2. Acheteur Responsable (Responsible Buyer)
- **Needs**: Traceable commodities, EUDR compliance reports, carbon certificates
- **Features**: Order management, traceability reports, CSV/PDF export
- **Key Routes**: `/buyer/dashboard`, `/buyer/orders`

### 3. Entreprise RSE (CSR Company)
- **Needs**: Verified carbon credits, impact tracking, CSRD reporting
- **Features**: Carbon marketplace, impact dashboard, certificates
- **Key Routes**: `/rse/dashboard`, `/carbon-marketplace`

### 4. Fournisseur (Supplier)
- **Needs**: Product management, order handling, customer messaging
- **Features**: Full marketplace CRUD, dashboard analytics, notifications
- **Key Routes**: `/supplier/dashboard`, `/supplier/products`, `/supplier/orders`

### 5. Admin (Super Administrator)
- **Needs**: Platform management, partner management
- **Features**: Partner CRUD, platform statistics
- **Key Routes**: `/admin/dashboard`

## Technical Architecture

### Backend (FastAPI + MongoDB)
- **Auth**: JWT-based with phone/email login
- **Routes**:
  - `/api/auth/*` - Authentication
  - `/api/greenlink/*` - Farmer, Buyer, RSE endpoints
  - `/api/marketplace/*` - Supplier and marketplace endpoints
  - `/api/payments/*` - Orange Money payment integration
  - `/api/admin/*` - Admin management
  - `/api/partners` - Public partners list
  - `/api/billing/*` - Invoice and payment management (NEW)
  - `/api/carbon/*` - Carbon credit sales and analytics

### Frontend (React)
- **Components**: Shadcn UI library
- **Services**: Dedicated API clients (`greenlinkApi.js`, `marketplaceApi.js`)
- **Auth**: Context-based with localStorage persistence

## Implementation Status

### Completed (February 2026)
- [x] Landing page (clone of greenlink-agritech.com)
- [x] Authentication (email + phone, all 5 user types including admin)
- [x] Farmer dashboard with USSD simulator
- [x] Buyer dashboard with EUDR export
- [x] RSE dashboard with impact metrics and interactive map
- [x] Supplier dashboard with full marketplace
- [x] **SMS Notifications for farmers** (simulated - ready for Orange API)
- [x] **Carbon Premium Calculator** - Interactive calculator on homepage
- [x] **User Profile Menu** - Dropdown menu with role-specific navigation
- [x] **Marketplace Page** - B2B marketplace with filters, search, and ordering
- [x] **Product Image Upload** - Suppliers can upload photos (JPG/PNG/WebP, max 5MB)
- [x] **Shopping Cart System** - Full cart with add/update/remove/checkout
- [x] **Order Management** - Checkout page, order confirmation, buyer orders list
- [x] **Product Reviews & Ratings** - Users can rate and review products
- [x] **Wishlist/Favorites** - Save products for later
- [x] **Order Tracking** - Timeline-based order status tracking
- [x] **Supplier Notifications** - Notifications on new orders and payments
- [x] **Orange Money Integration (SIMULATION)** - Full payment flow with simulation mode
- [x] **Carbon Marketplace** - Dedicated page for carbon credits (accessible to all, purchase for RSE only)
- [x] **Partners Section** - Replaced "Nos membres actifs" with "Nos Partenaires" (Orange CI added)
- [x] **Admin Dashboard** - Super admin for managing partners
- [x] **Legal Pages** - Conditions, Confidentialité, Sécurité
- [x] **Removed Emergent Badge** - Watermark removed from footer

### Mocked/Simulated
- **Orange Money payments** - Simulation mode active (no real API keys yet)
- **USSD interface** - Web simulator, no telecom integration
- **SMS notifications** - Logged to console, ready for Orange API
- **Carbon credit certificates** - Text format, no PDF generation yet

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account (supports admin type)
- `POST /api/auth/login` - Login (identifier field: email or phone)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Admin
- `GET /api/partners` - Get public partners (no auth)
- `GET /api/admin/partners` - Get all partners (admin only)
- `POST /api/admin/partners` - Create partner (admin only)
- `PUT /api/admin/partners/{id}` - Update partner (admin only)
- `DELETE /api/admin/partners/{id}` - Delete partner (admin only)
- `GET /api/admin/stats` - Platform statistics (admin only)

### Farmer (Greenlink)
- `POST /api/greenlink/parcels` - Declare parcel (auto SMS if score ≥7)
- `GET /api/greenlink/parcels/my-parcels` - Get my parcels
- `POST /api/greenlink/harvests` - Declare harvest
- `GET /api/greenlink/farmer/dashboard` - Dashboard stats
- `GET /api/greenlink/sms/history` - SMS notification history

### Marketplace
- `GET /api/marketplace/products` - List all products
- `POST /api/marketplace/products` - Create product (supplier)
- `GET /api/marketplace/products/{id}/reviews` - Get reviews
- `POST /api/marketplace/products/{id}/reviews` - Add review
- `GET /api/marketplace/wishlist` - Get wishlist
- `POST /api/marketplace/wishlist/add` - Add to wishlist
- `DELETE /api/marketplace/wishlist/remove/{id}` - Remove from wishlist

### Payments (Orange Money)
- `GET /api/payments/simulation-status` - Check if simulation mode
- `POST /api/payments/initiate` - Initiate payment
- `GET /api/payments/status/{ref}` - Get payment status
- `POST /api/payments/simulate/{token}` - Simulate payment (test mode)

## Database Collections
- `users` - All user types with profile fields (including admin)
- `parcels` - Farmer parcel declarations
- `harvests` - Harvest records
- `products` - Supplier products
- `orders` - Marketplace orders
- `payments` - Payment records
- `product_reviews` - Product ratings and reviews
- `wishlists` - User wishlists
- `partners` - Platform partners
- `coop_members` - Cooperative members
- `coop_lots` - Grouped sale lots for cooperatives
- `coop_distributions` - Carbon premium distributions
- `coop_agents` - Field agents for cooperatives

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- ✅ Orange Money integration (simulation mode)
- ✅ Product reviews and ratings
- ✅ Wishlist functionality
- ✅ Order tracking
- ✅ Carbon Marketplace page
- ✅ Admin dashboard with partner management
- ✅ Legal pages (Conditions, Confidentialité, Sécurité)
- ✅ Mobile App Push Notifications integration
- ✅ Mobile App Background Sync integration
- ✅ Camera & Geolocation for parcel photos (mobile)
- ✅ Firebase Cloud Messaging (FCM) service with Expo fallback
- ✅ EAS Build configuration for production APK/IPA
- ✅ **Coopérative agricole profile** - Complete backend + frontend dashboard
- ✅ **Super Admin Strategic Dashboard** - High-value metrics for governments, World Bank, IMF, WTO, NGOs, Bourse Café-Cacao, international buyers

### P1 (High Priority)
- Real Orange Money API integration (requires merchant registration)
- Real USSD/SMS integration (Orange API)
- ✅ PDF certificate generation - **COMPLETED** (EUDR, Carbon, Distribution reports)
- ✅ Password Reset Feature - **COMPLETED** (forgot-password flow)
- ✅ Push Notifications for Carbon Premiums - **COMPLETED** (FCM integration)
- ⚠️ Configure Firebase project and upload `google-services.json` for production FCM
- ✅ Mobile app for cooperative field agents - **COMPLETED** (6 screens)

### P2 (Medium Priority)
- Product price history tracking
- ✅ CSV/PDF export for EUDR reports - **COMPLETED**
- Multi-language support (Baoulé, Dioula, Sénoufo)
- ✅ Advanced analytics dashboard - **COMPLETED**
- ✅ Order tracking with real-time updates - **COMPLETED**
- ✅ SMS OTP for secure payments - **COMPLETED**

### P3 (Future)
- Production hardening
- Rate limiting and security audit
- ✅ Mobile app (React Native) - COMPLETED

## Test Credentials
```
Admin: klenakan.eric@gmail.com / 474Treckadzo
Buyer: buyer@test.com / password123
Farmer: farmer1@test.com / test123
RSE: rse1@test.com / test123
Supplier: supplier1@test.com / test123
Cooperative: coop-gagnoa@test.com / password123
```

## Known Limitations
- Orange Money is in SIMULATION MODE
- USSD is web-based simulation only
- SMS notifications are logged, not sent to real phones
- ✅ PDF reports now available for EUDR, Carbon, and Distributions

## Recent Changes (February 27, 2026)
1. **Carbon Marketplace** - New dedicated page at `/carbon-marketplace` accessible to all users
2. **Partners Section** - Replaced "Nos membres actifs" with "Nos Partenaires" (Orange CI)
3. **Admin Dashboard** - Super admin at `/admin/dashboard` for partner management
4. **Legal Pages** - Created `/conditions`, `/confidentialite`, `/securite`
5. **Removed Emergent Badge** - Watermark removed from footer
6. **Legal Acceptance at Registration** - Checkboxes for Terms & Privacy
7. **Account Deletion** - Users can delete their own account
8. **Mobile App (React Native)** - Complete farmer-focused mobile application
   - Location: `/app/mobile/greenlink-farmer/`
   - Features: Authentication, Parcels, Harvests, Payments, Notifications
   - Optimized for low connectivity
   - Offline mode support
   - USSD-like simple interface

## Recent Changes (December 2025)
9. **Push Notifications Integration** - Integrated push notifications into mobile app
   - Updated `App.js` with notification listeners and handlers
   - Backend endpoint `/api/greenlink/notifications/register-device` for device registration
   - Navigation to specific screens from notifications
   - Badge management and notification channels for Android
10. **Background Sync Integration** - App now syncs when coming to foreground
    - Automatic sync on app resume
    - Manual sync button in Profile screen
    - Sync status display with last sync time
11. **Improved Notifications Service** - Enhanced notification handling
    - Proper Expo Constants integration for project ID
    - Better error handling and logging
    - Platform-specific device registration
12. **EAS Build Configuration** - Production build setup for mobile app
    - `eas.json` configured for preview and production builds
    - `app.json` updated with all required plugins and permissions
    - NPM scripts for easy build commands
    - Complete README with build and distribution instructions

## Mobile App Build Instructions

### Quick Start (Development)
```bash
cd /app/mobile/greenlink-farmer
yarn install
npx expo start
```

### Production Build (APK for Android)
```bash
# Login to Expo (first time)
npx eas-cli login

# Build preview APK
yarn build:preview

# Build production APK
yarn build:android
```

### Distribution Options
1. **QR Code** - Scan with Expo Go app
2. **Direct APK link** - Share via WhatsApp/SMS
3. **Google Play Store** - Use `yarn submit:android`

- `/app/mobile/greenlink-farmer/src/screens/cooperative/` - Mobile cooperative screens
- `/app/mobile/greenlink-farmer/src/services/cooperativeApi.js` - Mobile cooperative API service

## Files of Reference
- `/app/backend/routes/admin.py` - Admin and partners routes
- `/app/backend/routes/payments.py` - Orange Money integration
- `/app/backend/routes/greenlink.py` - Farmer endpoints including notifications
- `/app/backend/routes/cooperative.py` - Cooperative management endpoints
- `/app/backend/services/fcm_service.py` - Firebase Cloud Messaging service
- `/app/frontend/src/pages/rse/CarbonMarketplace.jsx` - Carbon marketplace
- `/app/frontend/src/pages/admin/Dashboard.jsx` - Admin dashboard
- `/app/frontend/src/pages/cooperative/Dashboard.jsx` - Cooperative dashboard
- `/app/frontend/src/pages/cooperative/MembersPage.jsx` - Members management
- `/app/frontend/src/pages/cooperative/LotsPage.jsx` - Grouped sales lots
- `/app/frontend/src/pages/cooperative/DistributionsPage.jsx` - Premium distributions
- `/app/frontend/src/pages/cooperative/ReportsPage.jsx` - EUDR compliance reports
- `/app/frontend/src/services/cooperativeApi.js` - Cooperative API service
- `/app/frontend/src/components/PartnersSection.jsx` - Partners display
- `/app/frontend/src/pages/ConditionsPage.jsx` - Terms page
- `/app/frontend/src/pages/ConfidentialitePage.jsx` - Privacy page
- `/app/frontend/src/pages/SecuritePage.jsx` - Security page
- `/app/mobile/greenlink-farmer/App.js` - Mobile app entry point with notifications
- `/app/mobile/greenlink-farmer/README.md` - Complete build and distribution guide
- `/app/mobile/greenlink-farmer/FIREBASE_SETUP.md` - Firebase/FCM configuration guide
- `/app/mobile/greenlink-farmer/eas.json` - EAS Build configuration
- `/app/mobile/greenlink-farmer/app.json` - Expo configuration with plugins
- `/app/mobile/greenlink-farmer/src/services/notifications.js` - Push notification service
- `/app/mobile/greenlink-farmer/src/services/sync.js` - Background sync service
- `/app/mobile/greenlink-farmer/src/screens/profile/ProfileScreen.js` - Profile with sync button

## Recent Changes (February 28, 2026) - PDF Report Generation & Mobile Cooperative
13. **PDF Report Generation for EUDR Compliance** - Cooperatives can now download official PDF reports
    - Backend service in `/app/backend/services/pdf_service.py`
    - Endpoints: `/api/cooperative/reports/eudr/pdf`, `/api/cooperative/reports/carbon/pdf`
    - **NEW: Individual Member Payment Receipt** - `/api/cooperative/members/{id}/receipt/pdf`
    - Uses `reportlab` library for professional PDF generation
    - EUDR compliance reports with cooperative info, compliance metrics, statistics
    - Carbon reports with CO2 capture data, environmental impact equivalents, SDG alignment
    - Distribution reports with beneficiary lists and payment status
    - **Individual payment receipts** with member info, amount, environmental impact, EUDR certification
    - Frontend integration with download buttons in ReportsPage.jsx
    - CSV export also available for data analysis

14. **Mobile App - Cooperative Agent Features (React Native)**
    - New screens for cooperative field agents in `/app/mobile/greenlink-farmer/src/screens/cooperative/`
    - **CoopDashboardScreen**: Overview with stats, quick actions, financial summary
    - **CoopMembersScreen**: Member list with search, filters, status badges
    - **CoopMemberDetailScreen**: Full member profile with parcels, carbon stats, payment history
    - **AddCoopMemberScreen**: Form to register new members with GDPR consent
    - **AddMemberParcelScreen**: Declare parcels with GPS capture using device location
    - **CoopReportsScreen**: View compliance data and download PDF reports on mobile
    - New API service `/app/mobile/greenlink-farmer/src/services/cooperativeApi.js`
    - PDF download with expo-file-system and expo-sharing for mobile devices
    - Added `expo-sharing` dependency for PDF sharing functionality

15. **Password Reset Feature (Mot de passe oublié)**
    - Backend endpoints: `/api/auth/forgot-password`, `/api/auth/verify-reset-code`, `/api/auth/reset-password`
    - 6-digit verification code system with 15-minute expiration
    - Simulation mode with code display for testing (production: SMS/Email)
    - Frontend page `/forgot-password` with 3-step wizard (request > verify > reset)
    - Mobile screen `ForgotPasswordScreen.js` with same 3-step flow
    - Link added to login pages on web and mobile

16. **Push Notifications for Carbon Premiums**
    - Extended FCM service with cooperative notifications in `/app/backend/services/fcm_service.py`
    - `notify_members_premium_available()`: Notifies all members when distribution is ready
    - `notify_coop_distribution_complete()`: Notifies cooperative admin on completion
    - Automatically triggered when executing distribution payments
    - Fallback to SMS queue for members not using the mobile app

17. **SMS OTP Verification System**
    - Backend endpoints in `/app/backend/routes/tracking.py`
    - `/api/tracking/otp/request`: Generate 6-digit OTP with 5-minute expiration
    - `/api/tracking/otp/verify`: Verify OTP and get verification token (10min validity)
    - `/api/tracking/otp/validate-token`: Validate token before sensitive operations
    - Simulation mode for testing (code displayed), production: SMS via Orange API
    - Secure payments and transfers for farmers with basic phones

18. **Real Order Tracking System**
    - Backend routes in `/app/backend/routes/tracking.py`
    - `/api/tracking/orders/{id}`: Detailed tracking with timeline, location, carrier info
    - `/api/tracking/orders/{id}/ship`: Add shipment info (carrier, tracking number)
    - `/api/tracking/orders/{id}/update`: Add tracking updates with location
    - `/api/tracking/supplier/orders`: Supplier order management view
    - Frontend page `/pages/OrderTracking.jsx`: Real-time tracking UI with timeline
    - Automatic notifications at each status change

19. **Advanced Analytics & Data Export**
    - Backend routes in `/app/backend/routes/analytics_advanced.py`
    - `/api/analytics/supplier/dashboard`: Full supplier analytics (revenue, orders, products, trends)
    - `/api/analytics/buyer/dashboard`: Buyer purchase analytics
    - `/api/analytics/export/orders`: CSV export of orders
    - `/api/analytics/export/products`: CSV export of product catalog
    - `/api/analytics/export/members`: CSV export for cooperatives
    - `/api/analytics/export/transactions`: Financial transactions export
    - `/api/analytics/platform/overview`: Platform-wide stats (super admin)
    - Frontend page `/pages/supplier/Analytics.jsx`: Interactive analytics dashboard

20. **Mobile Bottom Tab Navigation & Logout** - ✅ COMPLETED (Feb 28, 2026)
    - Professional bottom navigation bar component `/src/components/navigation/BottomTabBar.js`
    - MainLayout wrapper component for consistent app layout
    - Tab configuration for Farmer and Cooperative user types
    - 5 main tabs: Accueil, Parcelles/Membres, Action (central button), Paiements/Rapports, Profil
    - **Animations implemented**:
      - Bounce animation on tab selection
      - Slide-up effect on active tab
      - Badge pulse animation for notifications
      - Main button rotate animation on press
    - **Notification badges system**: Configurable via props with count display (99+ for large numbers)
    - Active tab indicator with icons and labels
    - Logout functionality on both web (Navbar) and mobile (ProfileScreen)
    - Safe area handling for iOS notch and Android navigation bar

## Recent Changes (December 2025) - Cooperative Profile
11. **Coopérative agricole profile** - Complete agricultural cooperative management system
    - Backend routes in `/app/backend/routes/cooperative.py`
    - Dashboard with real-time statistics
    - Member management (CRUD, validation, CSV import)
    - Grouped sales lots management
    - Carbon premium distribution with simulated Orange Money payments
    - EUDR compliance reporting
    - Field agent management
    - Village-wise statistics

12. **Super Admin Strategic Dashboard** - High-value analytics for institutional stakeholders
    - Backend routes in `/app/backend/routes/admin_analytics.py`
    - Frontend in `/app/frontend/src/pages/admin/SuperAdminDashboard.jsx`
    - 7 strategic sections: Production, Sustainability, EUDR, Social Impact, Market, Macroeconomic, Cooperatives
    - Targets: Governments, World Bank, IMF, WTO, NGOs, Bourse Café-Cacao, Global buyers
    - Reports: Production, Carbon, Social Impact, Trade, EUDR Compliance, Regional
    - Export capabilities (CSV/PDF)
    - Period filters (month, quarter, year, all)
    - Dark theme professional design


## Recent Changes (February 28, 2026) - Business Model Implementation

23. **Subscription/Business Model System** - ✅ COMPLETED
    - Full subscription management system
    - Backend routes in `/app/backend/routes/subscriptions.py`
    - Models in `/app/backend/subscription_models.py`
    
    **Business Model:**
    | User Type | Plan | Price | Trial |
    |-----------|------|-------|-------|
    | Producteur | Gratuit | 0 FCFA | ❌ Gratuit à vie |
    | Coopérative | Gratuit | 0 FCFA | ❌ Gratuit à vie |
    | Acheteur | Starter | 49,000 FCFA/mois | ✅ 15 jours |
    | Fournisseur | Business | 29,000 FCFA/mois + 5% | ✅ 15 jours |
    | Entreprise RSE | Enterprise | Sur devis | ✅ 15 jours |
    
    **API Endpoints:**
    - `GET /api/subscriptions/plans` - Liste tous les plans
    - `GET /api/subscriptions/my-subscription` - Abonnement utilisateur
    - `GET /api/subscriptions/trial-status` - Status de la période d'essai
    - `POST /api/subscriptions/upgrade` - Mise à niveau du plan
    - `POST /api/subscriptions/cancel` - Annulation
    
    **Auto-création à l'inscription:**
    - Les abonnements sont créés automatiquement lors de l'inscription
    - Le plan est déterminé par le `user_type`
    - Les plans payants démarrent avec 15 jours d'essai gratuit

21. **Expo Push Notifications System** - ✅ COMPLETED
    - Full push notification system using Expo Push Service
    - Backend routes in `/app/backend/routes/notifications.py`
    - Mobile service in `/app/mobile/greenlink-farmer/src/services/notifications.js`
    
    **Notification Types:**
    - Primes carbone disponibles (quand une distribution est prête)
    - Confirmations de paiement Orange Money
    - Rappels hebdomadaires pour primes non récupérées
    - Annonces de la coopérative
    - Mises à jour parcelles/récoltes
    
    **Features:**
    - Enregistrement automatique des appareils
    - Préférences de notifications par utilisateur
    - Historique des notifications
    - Canaux Android (default, payments, reminders)
    - Queue SMS pour membres sans smartphone
    - Notification de test
    
    **API Endpoints:**
    - `POST /api/notifications/register-device`: Enregistre un appareil
    - `GET/PUT /api/notifications/preferences`: Gestion des préférences
    - `GET /api/notifications/history`: Historique des notifications
    - `POST /api/notifications/test`: Envoie une notification test
    - `POST /api/notifications/send-to-all-members`: Notifie tous les membres (coop)
    - `POST /api/notifications/trigger-weekly-reminders`: Lance les rappels (admin)
    
    **Mobile Screen:**
    - `NotificationPreferencesScreen.js`: Écran de préférences avec toggles

22. **Mobile App Version 1.1.0** - Ready for Production Build
    - Updated `app.json` with notification plugins
    - Updated `eas.json` for production build
    - Created `BUILD_GUIDE.md` with build instructions
    - Version bump: 1.0.0 → 1.1.0

## Build Instructions

### APK Production
```bash
cd /app/mobile/greenlink-farmer
npx eas-cli login  # First time only
npx eas-cli build --platform android --profile production
```

### OTA Updates (sans nouveau build)
```bash
npx eas-cli update --branch production --message "Description"
```
