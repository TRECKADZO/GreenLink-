# GREENLINK AGRITECH - Specification Fonctionnelle Mobile Native
## Document de reconstruction complete de l'application mobile

---

## 1. VUE D'ENSEMBLE

### 1.1 Description
Application mobile native (Expo React Native / SDK 53) pour la gestion complete de la filiere cacao et cultures de rente en Cote d'Ivoire. Trois roles utilisateurs principaux: **Agriculteur (Planteur)**, **Cooperative**, **Agent Terrain**. Supporte un quatrieme role **Auditeur Carbone** pour les missions de verification terrain.

### 1.2 Stack Technique
- **Framework**: Expo SDK 53, React Native 0.79.6, React 19
- **Navigation**: React Navigation 7 (Native Stack + Bottom Tabs)
- **Stockage local**: expo-sqlite (offline-first), AsyncStorage (auth/preferences)
- **Reseau**: fetch natif avec retry, pas d'Axios en runtime (installe mais non-utilise)
- **Authentification**: JWT Bearer token stocke dans expo-secure-store
- **Backend**: FastAPI (Python), MongoDB, base URL: `{API_BASE_URL}/api`
- **Notifications**: expo-notifications (push Expo)
- **GPS**: expo-location (foreground + background)
- **Camera**: expo-camera + expo-image-picker
- **Sync bidirectionnel**: SyncEngine (push queued offline ops -> pull latest server data)
- **USSD**: Simulation interface *144*99# (client-side engine + backend API)

### 1.3 Palette de Couleurs
```
primary: '#2d5a4d'     (Vert foret fonce)
primaryDark: '#1a4038'
secondary: '#d4a574'    (Beige/caramel)
success: '#22c55e'      (Vert vif)
warning: '#f59e0b'      (Ambre)
error: '#ef4444'        (Rouge)
background: '#f8fafc'   (Gris tres clair)
text: '#1f2937'
textSecondary: '#6b7280'
border: '#e5e7eb'
orange: '#f97316'       (Orange Money)
```

### 1.4 Configuration Reseau (Afrique)
- **Connection: close** sur chaque requete (evite stale OkHttp connections)
- **Warm-up** GET /health avant chaque retry POST
- **Timeouts progressifs**: 15s / 25s / 35s
- **Google connectivity check** (`connectivitycheck.gstatic.com/generate_204`) au lieu de ping IP
- **Delai 3s entre retries**

---

## 2. ARCHITECTURE OFFLINE-FIRST

### 2.1 Context Providers (Ordre d'imbrication)
```
SafeAreaProvider
  └─ ConnectivityProvider    (detecte online/offline avec NetInfo)
       └─ AuthProvider       (JWT, user session, login/logout)
            └─ DatabaseProvider  (SQLite init, full sync, clearLocal)
                 └─ SyncProvider    (SyncEngine bidirectionnel)
                      └─ OfflineProvider  (cache strategies)
                           └─ RootNavigator
```

### 2.2 SQLite Database (expo-sqlite)
Tables locales:
- `parcels` (cache des parcelles du user)
- `harvests` (recoltes)
- `sync_queue` (operations en attente de push)
- `cache_meta` (timestamps de derniere sync)

### 2.3 SyncEngine
- **Push**: envoie les operations hors-ligne en file (create/update) vers le serveur
- **Pull**: telecharge les derniers changements depuis le serveur
- **Triggers**: au retour online, au passage foreground, toutes les 5 minutes
- **Background Fetch**: expo-background-fetch + expo-task-manager pour sync en tache de fond

### 2.4 OfflineCache Strategy
- Cache les reponses API pendant 24h
- Sert les donnees locales si hors-ligne
- Merge automatique au retour en ligne

---

## 3. AUTHENTIFICATION

### 3.1 Ecrans Auth
| Ecran | Description |
|-------|-------------|
| **WelcomeScreen** | Page d'accueil avec logo, boutons "Se connecter" / "S'inscrire" |
| **LoginScreen** | Formulaire: identifiant (email ou telephone) + mot de passe |
| **RegisterScreen** | Inscription: nom, email, telephone, mot de passe, type d'utilisateur (planteur/cooperative) |
| **ForgotPasswordScreen** | Recuperation: email -> code OTP -> nouveau mot de passe |
| **MemberActivationScreen** | Activation compte membre (invite par cooperative via telephone) |
| **AgentActivationScreen** | Activation compte agent terrain (invite par cooperative) |

### 3.2 Endpoints Auth
| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/auth/login` | Login. Body: `{identifier, password}`. Retourne: `{access_token, user}` |
| POST | `/api/auth/register` | Inscription. Body: `{full_name, email, phone_number, password, user_type}` |
| GET | `/api/auth/me` | Profil utilisateur actuel |
| PUT | `/api/auth/profile` | Modifier profil |
| POST | `/api/auth/forgot-password` | Envoyer code reset |
| POST | `/api/auth/verify-reset-code` | Verifier code OTP |
| POST | `/api/auth/reset-password` | Nouveau mot de passe |
| POST | `/api/auth/change-password` | Changer mot de passe (authentifie) |
| POST | `/api/auth/logout` | Deconnexion |
| POST | `/api/auth/activate-member-account` | Activer un compte membre |
| POST | `/api/auth/activate-agent-account` | Activer un compte agent terrain |
| GET | `/api/auth/check-member-phone/{phone}` | Verifier si un telephone est un membre invite |
| GET | `/api/auth/check-agent-phone/{phone}` | Verifier si un telephone est un agent invite |
| GET | `/api/auth/cooperatives` | Liste des cooperatives (pour selection a l'inscription) |

---

## 4. ROLE: AGRICULTEUR (PLANTEUR)

### 4.1 Navigation
Apres login, si `user_type == "farmer"` -> **HomeScreen** (Espace Planteur).
Bottom Tab Bar avec: Accueil, Parcelles, Recolter, Marche, Profil.

### 4.2 Ecran d'accueil (HomeScreen)
- Header: nom utilisateur, indicateur connectivite (online/offline)
- Mini-jauge Score Carbone cliquable -> MyCarbonScore
- Bandeau "Pratiques Durables" (21 pratiques REDD+) -> REDDGuide
- Stats rapides: Parcelles (nb), Surface totale (ha), Prime estimee (XOF)
- Menu USSD-style (numerote 1-9, *, 0):
  1. Mes Parcelles
  2. Mes Recoltes
  3. Declarer une Recolte
  4. Marketplace Intrants
  5. Mon Score Carbone
  5b. Pratiques Durables
  6. Mes Commandes
  7. Mes Paiements
  8. Notifications
  9. *144*99# Prime Carbone (simulateur USSD)
  *. Mon Profil
  0. Deconnexion

### 4.3 Mes Parcelles (ParcelsScreen + AddParcelScreen)
**Liste des parcelles**: cartes avec localisation, culture, superficie, score carbone, statut verification.
**Formulaire d'ajout** (AddParcelScreen):
- Section GPS: Detection automatique (expo-location), affichage lat/long
- Localisation / Village (texte)
- Departement (liste horizontale scrollable des 51 departements CI)
- Superficie en hectares
- Type de culture (grille d'images: cacao, cafe, anacarde, hevea, palmier, riz, maraichage)
- Arbres ombrages par strate: S3 (>30m), S2 (5-30m), S1 (3-5m)
- Couverture ombragee (%) - auto-calcul: (grands*90 + moyens*30 + petits*10) / (area_ha*10000) * 100
- Certification: Rainforest Alliance, UTZ, Fairtrade, Bio, Aucune
- Photos (jusqu'a 5, camera ou galerie)
- Annee de plantation
- Pratiques durables (checkboxes: arbres d'ombrage, engrais organique, controle erosion)
- Notes / Observations

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/greenlink/parcels/my-parcels` | Mes parcelles |
| POST | `/api/greenlink/parcels` | Creer une parcelle. Body: `{location, village, department, crop_type, certification, area_hectares, arbres_grands, arbres_moyens, arbres_petits, couverture_ombragee, planting_year, notes, has_shade_trees, uses_organic_fertilizer, has_erosion_control, coordinates, photos}` |
| GET | `/api/carbon-score/estimate-couverture` | Auto-calcul couverture. Query: `?arbres_petits=X&arbres_moyens=Y&arbres_grands=Z&area_hectares=A` |

### 4.4 Recoltes (HarvestScreen + MyHarvestsScreen)
**Liste recoltes** (MyHarvestsScreen): historique avec statut (en_attente, valide, rejete).
**Declarer recolte** (HarvestScreen): formulaire avec parcelle, quantite (kg), qualite, date.

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/greenlink/harvests/my-harvests` | Mes recoltes |
| POST | `/api/greenlink/harvests` | Declarer une recolte. Body: `{parcel_id, quantity_kg, quality_grade, harvest_date, notes}` |
| GET | `/api/greenlink/farmer/dashboard` | Dashboard farmer (stats globales) |

### 4.5 Score Carbone (MyCarbonScoreScreen)
- Jauge circulaire du score moyen /10
- Decomposition du score (base, arbres, ombrage, pratiques, surface)
- Repartition arbres par strate
- Recommandations personnalisees
- Statut eligibilite primes

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/greenlink/carbon/my-score` | Score carbone detaille |
| GET | `/api/greenlink/carbon/my-credits` | Mes credits carbone |
| GET | `/api/greenlink/carbon/my-purchases` | Mes achats credits |
| POST | `/api/carbon-score/simulate` | Simuler un score. Body: `{area_hectares, nombre_arbres, couverture_ombragee, pratique_brulage, engrais_chimique, pratiques_ecologiques, redd_practices, age_cacaoyers, certification}` |
| GET | `/api/carbon-score/decomposition` | Decomposition score |

### 4.6 Pratiques Durables REDD+ (REDDGuideScreen + REDDTrackingFormScreen)
- Guide des 21 pratiques eligibles (programme Tai / BMC)
- Formulaire de suivi par visite

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/redd/tracking/practices-list` | Liste des 21 pratiques |
| POST | `/api/redd/tracking/visit` | Enregistrer une visite de suivi |
| GET | `/api/redd/tracking/visits` | Historique des visites |
| GET | `/api/redd/tracking/stats` | Statistiques adoption |

### 4.7 Paiements (PaymentsScreen + CarbonPaymentsDashboard)
- Historique des paiements recus
- Dashboard primes carbone avec projections
- Demande de paiement prime via USSD

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/carbon-payments/dashboard` | Dashboard primes |
| GET | `/api/carbon-payments/history` | Historique paiements |
| POST | `/api/carbon-payments/request-payment` | Demander paiement |
| GET | `/api/carbon-payments/projections` | Projections primes |
| POST | `/api/carbon-payments/ma-prime` | Calcul prime personnalisee |
| GET | `/api/farmer/carbon-premiums/my-requests` | Mes demandes de prime |

### 4.8 Marketplace Intrants (MarketplaceScreen, ProductDetailScreen, CartScreen, CheckoutScreen)
- Catalogue produits (intrants, equipements, semences)
- Detail produit avec photos, prix, avis
- Panier d'achat
- Checkout (simulation Orange Money)
- Suivi commandes
- Liste de souhaits

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/marketplace/products` | Catalogue produits |
| GET | `/api/marketplace/products/{id}` | Detail produit |
| GET | `/api/marketplace/cart` | Mon panier |
| POST | `/api/marketplace/cart/add` | Ajouter au panier |
| PUT | `/api/marketplace/cart/update` | Modifier quantite |
| DELETE | `/api/marketplace/cart/remove/{product_id}` | Retirer du panier |
| POST | `/api/marketplace/cart/checkout` | Passer commande |
| GET | `/api/marketplace/orders/my-orders` | Mes commandes |
| GET | `/api/marketplace/orders/{order_id}` | Detail commande |
| GET | `/api/marketplace/wishlist` | Ma liste de souhaits |
| POST | `/api/marketplace/wishlist/add` | Ajouter aux souhaits |
| DELETE | `/api/marketplace/wishlist/remove/{product_id}` | Retirer des souhaits |
| GET | `/api/marketplace/products/{id}/reviews` | Avis produit |
| POST | `/api/marketplace/products/{id}/reviews` | Poster un avis |

### 4.9 Marketplace Carbone (CarbonMarketplaceScreen + MyCarbonPurchasesScreen)
- Achat de credits carbone (pour acheteurs RSE)

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/greenlink/carbon-credits` | Credits disponibles |
| POST | `/api/greenlink/carbon-credits/purchase` | Acheter des credits |
| GET | `/api/greenlink/carbon/my-purchases` | Mes achats |

### 4.10 Simulateur USSD (USSDSimulatorScreen, USSDCarbonScreen, USSDFullSimulatorScreen)
- Simulation du code USSD *144*99# dans l'app
- Interface type telephone (clavier, ecran monocrome)
- Menus: 1-Declarer recolte, 2-Prime carbone, 3-Score carbone, 4-Meteo, 5-Prix marche

| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/ussd/callback` | Traiter une requete USSD. Body: `{sessionId, phoneNumber, text, serviceCode}` |

### 4.11 Notifications (NotificationsScreen)
| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/greenlink/notifications` | Mes notifications |
| PUT | `/api/greenlink/notifications/{id}/read` | Marquer lue |
| POST | `/api/greenlink/notifications/register-device` | Enregistrer push token |
| DELETE | `/api/greenlink/notifications/unregister-device` | Desenregistrer |

### 4.12 Profil (ProfileScreen)
| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/auth/me` | Mon profil |
| PUT | `/api/auth/profile` | Modifier profil |
| POST | `/api/auth/change-password` | Changer mot de passe |
| DELETE | `/api/auth/account` | Supprimer compte |

### 4.13 Messagerie (MessagingScreen + ChatScreen)
- Liste des conversations
- Chat en temps reel (polling)
- Envoi fichiers/photos
- Contacts: cooperatives, agents, agriculteurs

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/messaging/contacts` | Liste contacts |
| POST | `/api/messaging/conversations/direct` | Creer conversation directe |
| GET | `/api/messaging/conversations` | Mes conversations |
| GET | `/api/messaging/conversations/{id}` | Detail conversation |
| GET | `/api/messaging/conversations/{id}/messages` | Messages de la conversation |
| POST | `/api/messaging/conversations` | Envoyer message. Body: `{conversation_id, content, type}` |
| POST | `/api/messaging/upload` | Upload fichier/photo |
| POST | `/api/messaging/block` | Bloquer utilisateur |
| GET | `/api/messaging/stats` | Statistiques messagerie |

---

## 5. ROLE: COOPERATIVE

### 5.1 Navigation
Apres login, si `user_type == "cooperative"` -> **CoopDashboardScreen** (redirection auto).
Bottom Tab Bar avec: Dashboard, Membres, Parcelles, Carbone, Plus.

### 5.2 Dashboard Cooperative (CoopDashboardScreen)
- KPIs: membres actifs, parcelles, superficie totale, score moyen, recoltes
- Graphiques resumant l'activite
- Acces rapide aux fonctionnalites

### 5.3 Gestion Membres
| Ecran | Description |
|-------|-------------|
| **CoopMembersScreen** | Liste membres avec recherche, filtre par statut |
| **CoopMemberDetailScreen** | Profil membre: info, parcelles, recoltes, score carbone |
| **AddCoopMemberScreen** | Ajouter un membre: nom, telephone, email, village |
| **ActivationStatsScreen** | Stats d'activation des comptes membres |

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/cooperative/members` | Liste des membres |
| POST | `/api/cooperative/members` | Ajouter un membre. Body: `{full_name, phone_number, email, village}` |
| POST | `/api/cooperative/members/import-csv` | Import CSV |
| GET | `/api/cooperative/members/{id}` | Detail membre |
| PUT | `/api/cooperative/members/{id}/validate` | Valider un membre |
| POST | `/api/cooperative/members/{id}/send-reminder` | Envoyer rappel activation |
| GET | `/api/cooperative/members/activation-stats` | Stats activation |
| GET | `/api/cooperative/members/export` | Export CSV membres |

### 5.4 Gestion Parcelles
| Ecran | Description |
|-------|-------------|
| **CoopParcelsScreen** | Toutes les parcelles de la cooperative |
| **AddMemberParcelScreen** | Ajouter une parcelle pour un membre |

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/cooperative/parcels/all` | Toutes les parcelles |
| POST | `/api/cooperative/members/{member_id}/parcels` | Ajouter parcelle pour un membre |
| GET | `/api/cooperative/members/{member_id}/parcels` | Parcelles d'un membre |
| DELETE | `/api/cooperative/members/{member_id}/parcels/{parcel_id}` | Supprimer parcelle |
| GET | `/api/cooperative/parcels/pending-verification` | Parcelles en attente |
| PUT | `/api/cooperative/parcels/{parcel_id}/verify` | Verifier une parcelle |
| GET | `/api/cooperative/parcels/{parcel_id}/details` | Detail parcelle |
| GET | `/api/cooperative/carbon-analytics` | Analytiques score carbone |

### 5.5 Gestion Agents Terrain
| Ecran | Description |
|-------|-------------|
| **AgentListScreen** | Liste des agents, stats par agent |
| **AddAgentScreen** | Ajouter un agent: nom, tel, email, zone |
| **AssignFarmersScreen** | Assigner des planteurs a un agent |
| **AgentsProgressScreen** | Progression des agents |

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/cooperative/agents` | Liste agents |
| POST | `/api/cooperative/agents` | Creer un agent. Body: `{full_name, phone_number, email, zone}` |
| PUT | `/api/cooperative/agents/{id}/activate` | Activer agent |
| GET | `/api/cooperative/agents/{id}/assigned-farmers` | Planteurs assignes |
| POST | `/api/cooperative/agents/{id}/assign-farmers` | Assigner planteurs |
| POST | `/api/cooperative/agents/{id}/unassign-farmers` | Desassigner |
| GET | `/api/cooperative/agents-progress` | Stats progression |

### 5.6 Recoltes Cooperative
| Ecran | Description |
|-------|-------------|
| **CoopHarvestsScreen** | Toutes les recoltes avec filtres |

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/cooperative/harvests` | Liste recoltes |
| PUT | `/api/cooperative/harvests/{id}/validate` | Valider recolte |
| PUT | `/api/cooperative/harvests/{id}/reject` | Rejeter recolte |
| GET | `/api/cooperative/harvests/summary` | Resume recoltes |
| GET | `/api/cooperative/harvests/validated` | Recoltes validees |
| POST | `/api/cooperative/harvests/create-lot` | Creer un lot |

### 5.7 Lots et Distributions
| Ecran | Description |
|-------|-------------|
| **CoopLotsScreen** | Gestion des lots de recolte |
| **CreateLotScreen** | Creer un lot de vente |
| **CoopDistributionsScreen** | Distributions de paiements aux membres |

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/cooperative/lots` | Liste lots |
| POST | `/api/cooperative/lots` | Creer lot |
| GET | `/api/cooperative/lots/{id}/contributors` | Contributeurs du lot |
| PUT | `/api/cooperative/lots/{id}/finalize` | Finaliser lot |
| GET | `/api/cooperative/distributions` | Liste distributions |
| GET | `/api/cooperative/distributions/{id}` | Detail distribution |
| PUT | `/api/cooperative/distributions/{id}/execute` | Executer distribution |

### 5.8 Primes Carbone Cooperative
| Ecran | Description |
|-------|-------------|
| **CarbonPremiumsScreen** | Gestion des primes carbone membres |
| **CarbonSubmissionsScreen** | Soumissions de credits carbone |
| **CreateCarbonListingScreen** | Creer une offre de vente credits |

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/cooperative/carbon-premiums/members` | Membres et leurs primes |
| GET | `/api/cooperative/carbon-premiums/summary` | Resume primes |
| POST | `/api/cooperative/carbon-premiums/pay` | Payer prime a un membre |
| GET | `/api/cooperative/carbon-premiums/history` | Historique paiements |
| GET | `/api/cooperative/carbon-premiums/report-pdf` | Rapport PDF |
| POST | `/api/cooperative/carbon-premiums/initiate-payment` | Initier paiement |

### 5.9 Rapports et Export
| Ecran | Description |
|-------|-------------|
| **CoopReportsScreen** | Rapports EUDR, carbone, distributions |

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/cooperative/reports/eudr` | Rapport EUDR |
| GET | `/api/cooperative/reports/eudr/pdf` | PDF EUDR |
| GET | `/api/cooperative/reports/carbon/pdf` | PDF Carbone |
| GET | `/api/cooperative/distributions/{id}/pdf` | PDF Distribution |
| GET | `/api/cooperative/members/{id}/receipt/pdf` | Recu membre PDF |
| GET | `/api/cooperative/stats/villages` | Stats par village |
| GET | `/api/cooperative/dashboard` | Dashboard stats |
| GET | `/api/cooperative/dashboard-kpis` | KPIs detailles |
| GET | `/api/cooperative/dashboard-charts` | Donnees graphiques |

### 5.10 USSD & Inscriptions
| Ecran | Description |
|-------|-------------|
| **USSDRegistrationsScreen** | Suivi des inscriptions USSD |

---

## 6. ROLE: AGENT TERRAIN

### 6.1 Navigation
Apres login, si `user_type == "field_agent" || "agent_terrain"` -> **FieldAgentDashboard** (redirection auto).

### 6.2 Dashboard Agent (FieldAgentDashboard)
- KPIs: planteurs assignes, parcelles declarees, parcelles verifiees, visites
- Actions rapides: Rechercher planteur, Verifier parcelles, Declarer parcelle, Visites SSRTE
- Classement agents (leaderboard)
- Historique des activites recentes

### 6.3 Ecrans Agent Terrain
| Ecran | Description |
|-------|-------------|
| **FarmerSearchScreen** | Recherche de planteur par nom/telephone/zone |
| **FarmerProfileScreen** | Profil complet d'un planteur (parcelles, recoltes, score) |
| **ParcelVerifyListScreen** | Liste des parcelles a verifier pour l'agent |
| **ParcelVerifyFormScreen** | Formulaire de verification de parcelle (mesures terrain) |
| **ParcelDeclareFormScreen** | Formulaire de declaration d'une nouvelle parcelle pour un planteur |
| **GeoPhotoScreen** | Prise de photo geolocalise (preuve terrain) |
| **SSRTEVisitFormScreen** | Formulaire de visite SSRTE (travail des enfants) |
| **SSRTEAgentDashboardScreen** | Dashboard SSRTE de l'agent |
| **FarmerICIFormScreen** | Formulaire ICI (travail des enfants, profil socio-economique) |
| **ParcelVerificationScreen** | Ecran de verification geolocalise |

### 6.4 Verification de Parcelle (ParcelVerifyFormScreen)
Formulaire de terrain:
- Superficie corrigee (mesuree)
- Nombre d'arbres par strate (S3 grands >30m, S2 moyens 5-30m, S1 petits 3-5m)
- Total arbres automatique
- Couverture ombragee auto-calculee: (grands*90 + moyens*30 + petits*10) / (area*10000) * 100
- Override possible par l'agent (couverture mesuree)
- Coordonnees GPS (auto ou manuelles)
- Culture constatee
- Etat general (bon / moyen / mauvais)
- Pratiques ecologiques observees
- Decision: approuver / rejeter / corriger avec commentaires
- Photos de preuve

### 6.5 Declaration de Parcelle (ParcelDeclareFormScreen)
Formulaire identique a la verification mais pour creer une nouvelle parcelle:
- Nom parcelle + Village
- Departement (picker modal avec 51 departements)
- Superficie + Culture (boutons: Cacao, Cafe, Anacarde, Hevea, Palmier)
- Certification (picker: Aucune, RA, UTZ, Fairtrade, Bio)
- Arbres par strate (S3, S2, S1) + Total
- Couverture ombragee auto-calculee
- Coordonnees GPS
- Notes / Observations
- Selection du farmer_id du planteur concerne

### 6.6 Endpoints Agent Terrain
| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/field-agent/dashboard` | Dashboard agent (stats) |
| GET | `/api/field-agent/leaderboard` | Classement agents |
| GET | `/api/field-agent/my-visits` | Mes visites |
| GET | `/api/field-agent/my-farmers` | Mes planteurs assignes |
| GET | `/api/field-agent/assigned-farmers` | Planteurs assignes (autre format) |
| GET | `/api/field-agent/farmer-parcels/{farmer_id}` | Parcelles d'un planteur |
| POST | `/api/field-agent/farmer-parcels/{farmer_id}` | Declarer parcelle pour un planteur |
| GET | `/api/field-agent/parcels-to-verify` | Parcelles a verifier |
| PUT | `/api/field-agent/parcels/{parcel_id}/verify` | Verifier parcelle. Body: `{status, corrected_area, arbres_grands, arbres_moyens, arbres_petits, couverture_mesuree, measured_coordinates, crop_type_verified, general_condition, ecological_practices, decision, comments, photos}` |
| POST | `/api/field-agent/log-activity` | Logger une activite |
| POST | `/api/field-agent/geotagged-photos` | Photo geotagee |

### 6.7 Endpoints Recherche Agent
| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/agent/search` | Recherche planteur. Query: `?q=terme&zone=region` |
| GET | `/api/agent/farmer/{farmer_id}/details` | Detail planteur |
| GET | `/api/agent/dashboard/stats` | Stats dashboard agent |
| GET | `/api/agent/sync/download` | Telecharger donnees offline |
| POST | `/api/agent/sync/upload` | Upload donnees offline |
| GET | `/api/agent/sync/status` | Statut synchronisation |
| POST | `/api/agent/photos` | Upload photos terrain |

### 6.8 Endpoints Geolocalisation Agent
| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/agents/geo/update` | Mettre a jour position GPS |
| POST | `/api/agents/geo/batch` | Batch de positions |
| POST | `/api/agents/geo/offline` | Positions hors-ligne |
| GET | `/api/agents/geo/agents` | Positions tous les agents |
| GET | `/api/agents/geo/agent/{id}` | Position d'un agent |
| GET | `/api/agents/geo/agent/{id}/history` | Historique positions |
| GET | `/api/agents/geo/stats` | Stats geolocalisation |
| GET | `/api/agents/geo/trajectories` | Trajectoires |
| POST | `/api/agents/geo/proximity/check` | Verification proximite |

### 6.9 SSRTE (Suivi du Systeme de Remediation du Travail des Enfants)
| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/ssrte/visits/create` | Creer visite SSRTE |
| GET | `/api/ssrte/visits` | Lister visites |
| GET | `/api/ssrte/visits/{id}` | Detail visite |
| POST | `/api/ssrte/cases/create` | Creer un cas |
| GET | `/api/ssrte/cases` | Lister cas |
| PUT | `/api/ssrte/cases/{id}/status` | Modifier statut cas |
| POST | `/api/ssrte/remediations/create` | Creer remediation |
| GET | `/api/ssrte/remediations` | Lister remediations |
| GET | `/api/ssrte/dashboard` | Dashboard SSRTE |
| GET | `/api/ssrte/leaderboard` | Classement SSRTE |

### 6.10 ICI (Initiative Cacao Ivoirien - Travail des Enfants)
| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/ici/farmers/{farmer_id}/ici-profile` | Creer profil ICI |
| GET | `/api/ici/farmers/{farmer_id}/ici-profile` | Voir profil ICI |
| GET | `/api/ici/farmers/{farmer_id}/history` | Historique ICI |
| GET | `/api/ici/farmers/{farmer_id}/family-data` | Donnees familiales |
| POST | `/api/ici/ssrte/visit` | Visite ICI/SSRTE |
| GET | `/api/ici/ssrte/visits` | Lister visites ICI |
| GET | `/api/ici/alerts` | Alertes ICI |
| PUT | `/api/ici/alerts/{id}/acknowledge` | Accuser reception alerte |
| PUT | `/api/ici/alerts/{id}/resolve` | Resoudre alerte |

---

## 7. ROLE: AUDITEUR CARBONE

### 7.1 Ecrans
| Ecran | Description |
|-------|-------------|
| **AuditorDashboardScreen** | Dashboard: missions, stats, certifications |
| **AuditorMissionScreen** | Detail mission: parcelles a auditer, carte |
| **AuditFormScreen** | Formulaire d'audit de parcelle (mesures, notes, photos) |

### 7.2 Endpoints
| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/carbon-auditor/dashboard/{auditor_id}` | Dashboard auditeur |
| GET | `/api/carbon-auditor/missions/{auditor_id}` | Mes missions |
| GET | `/api/carbon-auditor/mission/{mission_id}/parcels` | Parcelles de la mission |
| POST | `/api/carbon-auditor/audit/submit` | Soumettre audit |
| GET | `/api/carbon-auditor/audit/{audit_id}` | Detail audit |
| GET | `/api/carbon-auditor/audit/{audit_id}/pdf` | PDF audit |
| GET | `/api/carbon-auditor/auditor/{auditor_id}/badge-certificate` | Certificat badge |

---

## 8. SERVICES TRANSVERSAUX

### 8.1 Notifications Push
- Enregistrement Expo Push Token via `/api/greenlink/notifications/register-device`
- Reception des notifications en foreground et background
- Deep linking: `data.screen` dans la notification -> navigation automatique
- Preferences de notification configurables

| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/notifications/register-device` | Enregistrer push token |
| DELETE | `/api/notifications/unregister-device/{push_token}` | Desenregistrer |
| GET | `/api/notifications/history` | Historique |
| GET | `/api/notifications/unread-count` | Nb non-lues |
| PUT | `/api/notifications/history/{id}/read` | Marquer lue |
| PUT | `/api/notifications/history/read-all` | Tout marquer lu |
| GET | `/api/notifications/preferences` | Preferences |
| PUT | `/api/notifications/preferences` | Modifier preferences |

### 8.2 Photos et Fichiers
| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/photos/upload` | Upload photo (multipart) |
| POST | `/api/photos/upload-file` | Upload fichier |
| GET | `/api/photos/view/{filename}` | Voir photo |
| GET | `/api/photos/thumbnail/{filename}` | Miniature |
| DELETE | `/api/photos/{filename}` | Supprimer |
| PUT | `/api/photos/profile` | Photo de profil |
| GET | `/api/photos/user/{user_id}` | Photos d'un utilisateur |

### 8.3 SMS (MOCK - Orange CI)
| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/sms/send-otp` | Envoyer OTP |
| POST | `/api/sms/verify-otp` | Verifier OTP |
| POST | `/api/sms/send` | Envoyer SMS |
| GET | `/api/sms/status` | Statut integration |

### 8.4 Paiements (MOCK - Orange Money)
| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/payments/initiate` | Initier paiement |
| GET | `/api/payments/status/{ref}` | Statut paiement |
| POST | `/api/payments/webhook` | Webhook Orange Money |
| POST | `/api/payments/simulate/{token}` | Simuler paiement |

### 8.5 Ecarts (Discrepancy Management)
| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/ecarts/cooperative` | Ecarts de la cooperative |
| GET | `/api/ecarts/farmer/{farmer_id}` | Ecarts d'un planteur |
| GET | `/api/ecarts/parcel/{parcel_id}` | Ecarts d'une parcelle |
| PUT | `/api/ecarts/{id}/validate` | Valider/resoudre ecart |
| GET | `/api/ecarts/export/pdf` | Export PDF |

---

## 9. MODELES DE DONNEES CLES

### 9.1 User (MongoDB: `users`)
```json
{
  "full_name": "string",
  "email": "string",
  "phone_number": "string (+225...)",
  "user_type": "farmer | cooperative | field_agent | agent_terrain | carbon_auditor | admin | buyer",
  "password_hash": "bcrypt",
  "coop_id": "ObjectId (si membre d'une coop)",
  "is_active": true,
  "created_at": "datetime"
}
```

### 9.2 Parcel (MongoDB: `parcels`)
```json
{
  "farmer_id": "string",
  "coop_id": "string",
  "location": "string (nom parcelle)",
  "village": "string",
  "department": "string (departement CI)",
  "region": "string",
  "crop_type": "cacao | cafe | anacarde | hevea | palmier",
  "certification": "Rainforest Alliance | UTZ | Fairtrade | Bio | null",
  "area_hectares": 3.5,
  "nombre_arbres": 35,
  "arbres_petits": 10,
  "arbres_moyens": 20,
  "arbres_grands": 5,
  "couverture_ombragee": 5.8,
  "carbon_score": 4.2,
  "carbon_credits_earned": 12.5,
  "verification_status": "pending | verified | rejected",
  "verified_by": "agent_id",
  "verified_at": "datetime",
  "corrected_area": null,
  "measured_coordinates": {"lat": 6.82, "lon": -5.27},
  "farming_practices": ["agroforesterie", "compost"],
  "planting_year": 2015,
  "photos": ["url1", "url2"],
  "notes": "string",
  "created_at": "datetime"
}
```

### 9.3 Harvest (MongoDB: `harvests`)
```json
{
  "farmer_id": "string",
  "parcel_id": "string",
  "quantity_kg": 500,
  "quality_grade": "A | B | C",
  "harvest_date": "2025-10-15",
  "status": "pending | validated | rejected",
  "validated_by": "coop_id",
  "lot_id": "string (si regroupe)",
  "notes": "string",
  "created_at": "datetime"
}
```

### 9.4 Discrepancy (MongoDB: `discrepancies`)
```json
{
  "parcel_id": "string",
  "farmer_id": "string",
  "agent_id": "string",
  "classification": "mineur | modere | critique",
  "ecarts_details": [{"champ": "superficie", "declare": 5.0, "mesure": 3.2}],
  "statut": "en_cours | resolu | prime_ajustee",
  "prime_ajustee": 45000,
  "created_at": "datetime"
}
```

### 9.5 CarbonPremiumRequest (MongoDB: `carbon_premium_requests`)
```json
{
  "farmer_id": "string",
  "coop_id": "string",
  "parcels_count": 3,
  "average_carbon_score": 7.2,
  "farmer_amount": 125000,
  "status": "pending | approved | paid | rejected",
  "requested_at": "datetime"
}
```

---

## 10. FORMULE SCORE CARBONE

### Calcul complet (carbon_score_engine.py)
```
Score = base (3.0)
  + densite_arbres (0 a 2.0)        : f(arbres/ha pondere par strate)
  + couverture_ombragee (0 a 1.5)   : f(% couverture)
  + brulage (0 ou -0.5)             : malus si pratique_brulage=true
  + engrais_chimique (0 ou -0.3)    : malus si engrais_chimique=true
  + pratiques_ecologiques (0 a 1.2) : +0.3 par pratique (compostage, zero_pesticides, etc.)
  + redd_practices (0 a 2.5)        : +0.5 par pratique REDD+
  + age_cacaoyers (0 a 0.5)         : bonus si age > 25 ans
  + surface (0 a 0.3)               : bonus si > 5ha
  + certification (0 a 0.2)         : bonus si certifie
= Max 10.0
```

### Couverture ombragee automatique
```
Canopee S3 (grands >30m) = 90 m²/arbre
Canopee S2 (moyens 5-30m) = 30 m²/arbre
Canopee S1 (petits 3-5m) = 10 m²/arbre

Couverture (%) = (grands*90 + moyens*30 + petits*10) / (hectares*10000) * 100
Plafonne a 100%
```

### Estimation CO2 et Prime
```
CO2/ha/an = 2 + (score/10) * 6
CO2 total = CO2/ha/an * hectares
Prix marche = 15 000 XOF/tonne CO2 (configurable)
Brut = CO2_total * prix_tonne
Net = Brut * 0.70 (apres 30% frais plateforme)
Part agriculteur = Net * 0.70
Part cooperative = Net * 0.05
Part GreenLink = Net * 0.25
```

---

## 11. DEPARTEMENTS ET CULTURES (Reference)

### 51 Departements producteurs CI
Voir `config.js > DEPARTEMENTS` pour la liste complete avec codes et zones geographiques.

### Cultures supportees
| ID | Nom | Zone principale |
|----|-----|-----------------|
| cacao | Cacao | Centre-Ouest, Sud-Ouest |
| cafe | Cafe | Ouest, Centre |
| anacarde | Anacarde | Nord, Centre |
| hevea | Hevea | Sud, Sud-Est |
| palmier | Palmier | Sud |
| riz | Riz | Nord |
| maraichage | Maraichage | Toutes zones |

---

## 12. INTEGRATIONS EXTERNES (Statut)

| Service | Statut | Description |
|---------|--------|-------------|
| **Orange CI SMS** | MOCK | OTP, notifications. A integrer avec API Orange CI reelle |
| **Orange Money** | MOCK | Paiements primes, checkout. A integrer avec API Orange Money reelle |
| **Resend** | ACTIF | Emails transactionnels (DNS SPF/DKIM a configurer) |
| **Expo Push** | ACTIF | Notifications push via Expo Notifications |
| **Expo Updates (OTA)** | ACTIF | Mises a jour sans nouveau APK |
| **EAS Build** | ACTIF | Build APK Android via Expo EAS |

---

## 13. NOTES TECHNIQUES IMPORTANTES

1. **Rate Limiting**: POST /api/auth/login = 5 tentatives/min. Le backend retourne 429 avec `retry_after`.
2. **CORS**: Le middleware RateLimit doit etre strictement en-dessous de CORSMiddleware dans server.py.
3. **MongoDB _id**: Ne jamais retourner `_id` (ObjectId) dans les reponses JSON. Utiliser `str(doc["_id"])` ou projection `{"_id": 0}`.
4. **Token**: Le champ retourne par login est `access_token` (pas `token`). Le frontend le stocke dans `localStorage.setItem('token', access_token)` (web) ou `SecureStore` (mobile).
5. **OTA Updates**: Pusher avec `eas update --branch preview --message "..." --skip-bundler`. Exporter manuellement via `npx expo export --output-dir dist --no-bytecode` pour contourner les limitations Hermes ARM64.
6. **Offline-first**: Toutes les operations critiques (declaration parcelle, recolte) doivent fonctionner hors-ligne et se synchroniser au retour en ligne.
7. **Langues**: Actuellement en francais uniquement. Support Baoule/Dioula prevu (P1).
