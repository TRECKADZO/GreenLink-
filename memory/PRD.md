# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.
**Message principal** : Prime carbone accessible via USSD pour les petits planteurs.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.76.0 (SDK 53) + **expo-sqlite** (stockage local)

## Modele Economique
**Cooperatives : 100% GRATUIT** — acces complet, sans abonnement.
**Formule Prime Carbone** :
```
Prix vente RSE = 30% frais + 70% (25% GreenLink + 70% agriculteurs + 5% cooperatives)
```
**Devise** : Toutes les donnees monetaires en **XOF**.

## Terminologie Officielle (31 mars 2026)
- ~~REDD+~~ → "Pratiques Durables" / "Impact Environnemental" / "Suivi & Verification"
- ~~ARS 1000~~ → "Score Pratiques Durables" / "Certification Qualite" / supprime
- ~~Bronze/Argent/Or~~ → **Bon / Tres Bon / Excellent** (niveaux planteur)
- ~~Conformite ARS~~ → "Prime bonifiee grace a vos bonnes pratiques"
- Code interne: variables/routes/collections MongoDB gardent les noms originaux (ars_, redd_)

## Ce qui est implemente

### Core
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Marketplace, FAQ, Notifications, Conformite EUDR & certification

### Pratiques Durables
- Guide des 21 pratiques (5 categories)
- Dashboard MRV & Suivi + Export PDF
- SSRTE/ICI alertes + dashboard
- KPIs complets sans restriction
- Onglet "Impact Environnemental" Super Admin

### Score Carbone (0-10)
- USSD : 14 questions (9 base + 3 bonus) — textes reformules centres planteur
- Agent terrain : 5 pratiques eco + 21 pratiques durables (5 categories)
- Verification parcelle : integre les visites de suivi

### Menus USSD reformules
- "Estimation de ma prime" (ex: "Prime carbone + conformite ARS")
- "Mes pratiques durables" (ex: "Mes donnees ARS 1000")
- "Conseils pour ma prime" (ex: "Conseils pratiques ARS")
- Niveaux: Excellent/Tres Bon/Bon (ex: Or/Argent/Bronze)

### Build APK Mobile
- AAB v1.76.0 (versionCode 71, nouvelle icone): https://expo.dev/artifacts/eas/p9urNq29d8SkXcF1uta7ZJ.aab
- APK v1.76.0: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/9959655a-5fba-4bea-809d-ae2eaad44c58

### Base de donnees
- MongoDB Atlas (Cluster0): `mongodb+srv://klenakaneric_db_user:474Treckadzo@cluster0.ieoimmt.mongodb.net/?appName=Cluster0`
- DB: `greenlink_production` — 55 collections, 1072 documents

### Stockage Local SQLite (3 avril 2026)
- **expo-sqlite@15.2.14** integre dans l'app mobile (SDK 53)
- Schema SQLite avec 10 tables miroir des collections MongoDB cles :
  `users`, `parcels`, `harvests`, `products`, `orders`, `notifications`, `messages`, `carbon_scores`, `payments`, `pending_sync`
- `DatabaseContext` avec DAOs complets (upsert, upsertMany, getBy*, search, delete)
- File `pending_sync` pour queue d'actions offline avec retry automatique
- Sync bidirectionnel : push pending actions -> pull from server
- Auto-sync au login, au retour foreground, et nettoyage au logout
- Fichiers : `src/services/database.js`, `src/context/DatabaseContext.js`

### ConnectivityContext (3 avril 2026)
- Context React unifie pour l'etat reseau, utilisant `@react-native-community/netinfo`
- Detection evenementielle (pas de polling) + verification reelle par HEAD ping
- Expose : `isOnline`, `isOffline`, `isServerReachable`, `connectionType`, `connectionDetails`, `checkNow()`, `resetAndRecheck()`
- Refactore `OfflineContext` (supprime polling expo-network), `AuthContext` (supprime useRealConnectionStatus hook), `LoginScreen`, `REDDTrackingFormScreen`
- Provider au sommet de la hierarchie (avant AuthProvider)
- Fichier : `src/context/ConnectivityContext.js`

### Offline-First Data Layer (3 avril 2026)
- Service centralise `offlineData.js` — couche d'acces donnees offline-first
- LECTURES : online → API + cache SQLite ; offline → lecture SQLite
- ECRITURES : online → API + upsert SQLite ; offline → sauvegarde SQLite + file pending_sync
- 8 domaines : `offlineParcels`, `offlineHarvests`, `offlineProducts`, `offlineOrders`, `offlineNotifications`, `offlineCarbonScore`, `offlinePayments`, `offlineCarbonPayments`, + `offlineCache` generique
- 14 ecrans mis a jour pour utiliser la couche offline-first :
  ParcelsScreen, AddParcelScreen, HarvestScreen, MyHarvestsScreen,
  MarketplaceScreen, OrdersScreen, NotificationsScreen, PaymentsScreen,
  CarbonPaymentsDashboard, MyCarbonScoreScreen, HomeScreen,
  FieldAgentDashboard, FarmerSearchScreen, ProfileScreen
- Suppression complete de getCachedData/cacheData (AsyncStorage) dans tous les ecrans

### SyncEngine + Batch Sync API (3 avril 2026)
- Backend: POST /api/sync/batch — push changements en lots, last-write-wins par timestamps
- Backend: POST /api/sync/pull — pull changements serveur depuis last_sync_at (par collection, paginé, ownership filtré)
- Backend: GET /api/sync/status — nombre de changements par table depuis un timestamp
- Suivi des suppressions via collection `sync_deletions`
- Logs d'audit via collection `sync_log`
- Mobile: SyncEngine (syncEngine.js) — fullSync bidirectionnel (push + pull)
  - processQueue(): push offline changes en lots (BATCH_SIZE=20)
  - pullChanges(): pull serveur, upsert dans SQLite, supprimer entités supprimées
  - checkForChanges(): vérification rapide si le serveur a des changements
  - Tracking last_sync_at par table dans db_meta SQLite
- SyncContext: auto-déclenchement offline→online, expose triggerFullSync, pullChanges, checkForChanges

## Travail complete
- (2 avr) Migration auto MongoDB, UI mot de passe oublie, suppression REDD+/ARS 1000
- (3 avr) Expo SQLite integre avec 10 tables, DAOs, sync bidirectionnel, DatabaseContext
- (3 avr) ConnectivityContext: context unifie NetInfo + ping reel, refactoring OfflineContext/AuthContext/LoginScreen/REDDTrackingForm
- (3 avr) Offline-First Data Layer: offlineData.js + 14 ecrans migres SQLite, suppression complete AsyncStorage cache
- (3 avr) SyncEngine batch + /api/sync/batch endpoint: last-write-wins conflict resolution, auto-sync on reconnect
- (3 avr) Sync Pull API: POST /api/sync/pull + GET /api/sync/status + deletion tracking + SyncEngine fullSync bidirectionnel
- (7 avr) Fix bug 403 Forbidden sur /api/cooperative-referral/my-code
- (7 avr) Fix coop_name affichant "N/A" pour les nouvelles cooperatives
- (7 avr) Fix AuthContext.jsx: forwarding sponsor_referral_code vers le backend
- (7 avr) Fix id field non defini dans MongoDB apres inscription
- (7 avr) Ajout lien application dans le message de partage du code de parrainage
- (7 avr) Onglet "Réseau Coopératives" dans Super Admin: arbre de parrainage, top parrains, répartition régionale, croissance, affiliations récentes, liste complète avec recherche/filtres, actions admin (générer code, retirer affiliation)
- (7 avr) Nettoyage base de données: 90 comptes test supprimés, 467 docs liés nettoyés. 34 utilisateurs réels conservés
- (7 avr) Mode offline-first web (Agent Terrain + Coopérative): OfflineContext, OfflineBanner, IndexedDB (coop_members, coop_lots, coop_dashboard), offlineCooperativeApi avec fallback cache, sync auto au login et retour en ligne, Service Worker PWA
- (7 avr) Vues mobile 100% natives (Agent Terrain + Agriculteur): MobileAppShell (container 430px, status bar, bottom tab nav)
- (5 avr) Onglet "+" (Plus) ajoute aux dashboards Agent Terrain et Agriculteur pour parite fonctionnelle avec l'app mobile Expo
- (5 avr) Fix bug "Erreur reseau" inscription Agent Terrain: endpoint corrige register-by-agent → register-web + support offline (IndexedDB queue + sync auto)
- (5 avr) Backend sync/upload: handler register_farmer + redd_visit pour synchroniser les actions hors-ligne
- (5 avr) Audit complet des fiches: ajout support offline SSRTE + REDD + fix offlineCooperativeApi (methodes manquantes getICIProfile, updateICIProfile, getAgents, etc.)
- (5 avr) Compteur de progression "Ma Progression" dans l'onglet Plus du farmer (6 etapes: Profil, Parcelles, Recoltes, Score Carbone, Commande, Pratiques REDD)
- (5 avr) Simplification menu Agent Terrain: 3 items seulement (Mes Planteurs, Inscrire, Pratiques Durables) — suppression items redondants (SSRTE, Parcelles, Rechercher) accessibles via profil planteur
- (5 avr) Suppression interference cooperative: retrait de tous les liens vers /cooperative/* du dashboard Agent Terrain
- (5 avr) Bouton sync compact: integre dans la carte profil agent (ne masque plus le menu sur mobile)
- (5 avr) Photos Geolocalisees: panel photo avec capture camera, GPS auto, sauvegarde + mode offline. Endpoint POST /api/agent/photos
- (5 avr) Fiches pre-associees: quand l'agent selectionne un planteur, toutes les fiches sont automatiquement liees a ce planteur
- (5 avr) FIX CRITIQUE: inscription agent → l'agriculteur est maintenant cree dans coop_members ET ajoute a assigned_farmers de l'agent (online + offline sync). Avant: cree uniquement dans ussd_registrations → invisible dans "Mes Planteurs"
- (5 avr) Cooperative auto: suppression du champ "Code cooperative" du formulaire agent. L'agriculteur est automatiquement inscrit dans la cooperative de l'agent
- (5 avr) FIX Photos validees: le backend verifie maintenant geotagged_photos + agent_photos pour le statut de completion
- (5 avr) Ajout suivi REDD dans forms_status (6 fiches trackees: ICI, SSRTE, REDD, Parcelles, Photos, Enregistrement)
- (5 avr) Fiches auto-associees au planteur: AddParcelPage et REDDTrackingPage lisent farmer_id/farmer_name de l'URL, affichent carte info verte (pas de dropdown/saisie manuelle quand venant du profil planteur)
- (5 avr) Pre-remplissage donnees familiales cross-fiches: endpoint GET /api/ici-data/farmers/{id}/family-data fusionne ICI + SSRTE. SSRTE modal charge auto taille_menage, enfants, conditions de vie depuis fiches precedentes. ICI modal fait pareil depuis SSRTE si pas encore de profil ICI
- (5 avr) FIX Sync offline SSRTE: le handler stocke maintenant TOUTES les donnees (taille_menage, enfants, conditions_vie, eau, electricite, etc.) — avant seuls status/risk_level/notes etaient sauvegardes
- (5 avr) FIX Sync offline REDD: utilise la bonne collection redd_tracking_visits (au lieu de redd_visits) avec calcul du score REDD
- (5 avr) FIX Dedup sync: offline_id vide ne bloque plus les synchronisations
- (5 avr) FIX CRITIQUE Auto-sync REDD offline: OfflineContext reecrit — ajout pendingCount aux deps du useEffect auto-sync, utilisation de refs pour eviter les closures obsoletes, retry exponentiel (5s-60s) en cas d'echec, listener visibilitychange pour sync au retour sur l'onglet. Cause racine: le useEffect ne dependait que de [isOnline], donc si le reseau tombait sans declencher l'evenement offline du navigateur, les actions restaient bloquees dans IndexedDB
- (5 avr) FIX REDD stats endpoint: correction comparaison datetime vs string dans le tri des visites recentes (redd_tracking.py)
- (5 avr) Calcul automatique du Niveau de Risque SSRTE: le niveau (Faible/Modere/Eleve/Critique) est maintenant calcule automatiquement cote frontend en fonction des taches dangereuses, enfants observes et conditions de vie. Fonctionne hors-ligne. Plus besoin de selection manuelle.
- (5 avr) FIX Donnees visites SSRTE non affichees: les endpoints GET /api/ici-data/ssrte/visits, /farmers/{id}/history et /agent/search retournent maintenant TOUS les champs (taille_menage, conditions_vie, liste_enfants, taches_dangereuses, observations, etc.). Le composant SSRTEVisitCard dans FarmerHistorySection affiche desormais toutes les donnees collectees lors de la visite.
- (5 avr) FIX Historique inscriptions agent: l'endpoint GET /api/ussd/registrations accepte maintenant un filtre agent_id. L'onglet Inscrire de l'agent terrain ne montre plus que les agriculteurs inscrits par cet agent specifique. Donnees de test nettoyees de la base.
- (5 avr) AUDIT SECURITE COMPLET: Ajout authentification (Depends) sur 25+ routes critiques non protegees. Routes corrigees: carbon_auditor (admin/auditors CRUD, missions CRUD, audit submit), ici_data_collection (family-data, ssrte/visits), sms (send), features (POST/PUT/DELETE), cooperative (parcels-for-audit), carbon_payments (ma-prime), coop_subscriptions (check-trial), marketplace (seed-demo), websocket (notify-alert, broadcast-stats, connections), ussd (stats, registrations, ssrte/alerts). Toutes les routes write et sensibles sont desormais protegees par JWT.
- (6 avr) ISOLATION DONNEES PAR ROLE: Chaque utilisateur ne voit que ses propres donnees. Agents terrain: SSRTE visits filtrees par assigned_farmers, registrations auto-filtrees par agent_id, family-data et history bloquent l'acces aux farmers hors perimetre. Admin voit tout. Cooperative voit sa cooperative. Les alertes ICI sont aussi filtrees par role.
- (6 avr) SECURITE AVANCEE: (1) Rate limiting sur login/register/OTP/SMS — 5 tentatives/min, blocage 5min. (2) Token blacklist avec endpoint /logout et invalidation automatique apres password reset via champ iat/password_changed_at. Index TTL pour nettoyage auto. (3) Protection path traversal sur /photos/view et /messaging/files via os.path.basename. (4) Headers HTTP securite: X-Frame-Options DENY, X-Content-Type-Options nosniff, X-XSS-Protection, Referrer-Policy.
  - Agent Terrain: 5 tabs (Accueil USSD + Tableau de bord KPIs + Planteurs + Inscrire + Plus), profil planteur avec 6 fiches fonctionnelles (ICI modal, SSRTE modal, REDD tracking, Parcelles, Photos, Inscription). Onglet Plus: Outils Terrain (SSRTE, Verification Parcelles, Photos, Pratiques Durables, Recherche), Mon Compte (Profil, Notifications), Deconnexion
  - Farmer: 5 tabs (Accueil USSD avec Score Carbone gauge/Stats/Menu + Tableau de bord + Parcelles + Carbone + Plus). Onglet Plus: Mes Activites (Parcelles, Recoltes, Declarer, Commandes), Marketplace & Primes (Boutique, Primes Carbone, Pratiques Durables), Mon Compte (Profil, Notifications), Deconnexion
  - Accueil = menu numerote style mobile, Tableau = KPIs detailles avec objectifs/progression

## Travail complete (6 avr suite)
- (6 avr) FIX SECURITE P0: Code de reinitialisation mot de passe n'est plus affiche dans l'UI pour les utilisateurs email. Backend renvoie delivery_method=email sans simulation_code. Frontend affiche uniquement "Verifiez votre boite de reception et vos spams". Code visible uniquement en mode simulation SMS (utilisateurs sans email, SMS pas encore configure).
- (6 avr) FIX Tableau SSRTE Agent: Les stats etaient a 0 car le filtre backend utilisait uniquement `recorded_by` au lieu de `agent_id OR recorded_by`. Corrige dans `/api/ssrte/stats/overview`. Les visites mensuelles checkent maintenant `recorded_at`, `created_at`, `visit_date`, et `date_visite`.
- (6 avr) Dashboard Super Admin: toutes les metriques remplacees par des donnees reelles (36 users, 12 coops, 54 planteurs, 7 agents, 18 parcelles/69.4ha, 25 REDD+, 16 SSRTE, 18 recoltes, 14 inscriptions USSD, 9 listings marketplace, 2 demandes paiement). Plus aucune donnee demo.
  - Agriculteur membre cooperative: declare -> en_attente -> cooperative valide -> cooperative cree lot de vente -> marketplace
  - Agriculteur independant: declare -> auto-validee -> auto-publiee directement sur marketplace
  - Endpoint POST /api/cooperative/harvests/create-lot pour creer des lots de vente a partir de recoltes validees
  - Endpoint GET /api/cooperative/harvests/validated pour lister les recoltes disponibles pour lots
  - CoopHarvestsPage mise a jour avec mode selection lot de vente + modal creation lot
  - Marketplace: donnees demo supprimees, utilise uniquement donnees reelles
- (6 avr) Bouton "Declarer" ajoute sur la page Mes Recoltes du planteur (manquait).
- (6 avr) Ajout du Simulateur USSD (calcul prime carbone *144*99#) dans le menu Accueil de l'agent terrain. Le simulateur affiche la liste des planteurs de l'agent et permet de composer le code USSD.
- (6 avr) Nettoyage menu Plus agent terrain: supprime Photos Geolocalisees, Pratiques Durables, Rechercher Planteur (redondants avec fiches planteur et onglets existants).

## Backlog
### P0
- Mettre a jour MONGO_URL dans les Secrets Emergent Dashboard (action utilisateur)
- Configuration DNS domaine greenlink-agritech.com (action utilisateur GoDaddy)
### P1
- Indicateur taille stockage offline (IndexedDB) dans le profil agent
### P2
- Passerelle SMS reelle Orange CI / MTN (MOCK)
- Langues locales (Baoule/Dioula) mobile
### P3
- Refactoriser ussd.py
- Nettoyage code mort (subscription files)
- Nettoyer la gestion id vs _id dans MongoDB pour tous les anciens comptes

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Test farmer: `+2250707070707`
