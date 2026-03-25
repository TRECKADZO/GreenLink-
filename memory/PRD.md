# GreenLink - Product Requirements Document

## Probleme Original
Plateforme agricole full-stack pour la gestion des cooperatives cacao en Cote d'Ivoire, avec suivi carbone, conformite EUDR, et protection des enfants (SSRTE).

## Architecture
- **Backend**: FastAPI + MongoDB (Atlas)
- **Frontend Web**: React + Shadcn UI
- **Mobile**: React Native (Expo/EAS)

## Fonctionnalites Implementees

### Phases 1-10 (DONE - voir historique)

### Phase 11 - Prime Carbone dans Verification Terrain (DONE - 22/03/2026)
### Phase 12 - Dashboard Score Carbone Visuel (DONE - 22/03/2026)
### Phase 13 - Corrections Web + Fonctionnalites Manquantes (DONE - 23/03/2026)
### Phase 14 - Distribution Proportionnelle + Notifications Temps Reel (DONE - 23/03/2026)
### Phase 15 - Formulaire Creation Lot avec Selection Agriculteurs + Builds v1.51.0 (DONE - 24/03/2026)
### Phase 16 - Calcul Prime Carbone avec Taille des Arbres (DONE - 24/03/2026)
### Phase 17 - Super Admin Gestion Primes Carbone (DONE - 24/03/2026)
### Phase 17b - Vue Planteur Demandes Prime (DONE - 24/03/2026)
### Phase 17c - Mise a jour page Cooperative (DONE - 24/03/2026)
### Phase 18 - Formule RSE Confidentielle (DONE - 24/03/2026)
### Phase 18b - Calculateur Prime Accueil mis a jour (DONE - 24/03/2026)
### Phase 19 - Refonte USSD + Inscription + Dashboards (DONE - 24/03/2026)
### Phase 19b - Simulateur USSD Interactif (DONE - 24/03/2026)
### Phase 19c - Corrections Logique Metier + Auto-Code Planteur (DONE - 24/03/2026)
### Phase 20 - Auto-Generation Code Cooperative (DONE - 24/03/2026)
### Phase 21 - Audit Global + Dashboard Onboarding + Harmonisation (DONE - 24/03/2026)
### Phase 22 - Fix Activation Membre + PIN USSD (DONE - 24/03/2026)
### Phase 23 - Export PDF/Excel + Nom Cooperative (DONE - 24/03/2026)
### Phase 24 - Verification Flux Activation + Libelles (DONE - 24/03/2026)
### Phase 25 - Build APK/AAB v1.52.0 (DONE - 24/03/2026)
### Phase 26 - Fix Cloudflare Mobile + Build v1.53.0 (DONE - 24/03/2026)

### Phase 27 - Fix Mobile Add Member Form + Build v1.55.0 (DONE - 24/03/2026)
**Bug P0 corrige : Formulaire mobile "Ajouter un Membre" desynchronise avec le backend**
- `AddCoopMemberScreen.js` mis a jour avec champs PIN (4 chiffres, obligatoire) et Hectares
- Validation PIN cote mobile : regex `^\d{4}$`, maxLength=4, secureTextEntry
- Modal de succes affiche code_planteur, nom, telephone, statut PIN
- Coherence verifiee avec `CoopMemberCreate` Pydantic model (pin_code: str, hectares: Optional[float])
- Backend POST /api/cooperative/members teste OK (retourne code_planteur + pin_configured=true)
- Version bumpee a v1.55.0 dans app.json
- Builds EAS soumis:
  - APK: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/1d69c9fa-bbf4-424d-a37c-3e8f2d4819e0
  - AAB: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/6dcfe825-6a67-4acb-8cbf-23a5fe97001c
- Mot de passe cooperative bielaghana@gmail.com reinitialise (474Treckadzo)
**Tests: 11/11 backend PASS, 100% frontend PASS (iteration 72)**

### Phase 28 - Fix Mobile "Ajouter Parcelle" Navigation + Build v1.56.0 (DONE - 24/03/2026)
**Bug corrige : Bouton "Ajouter Parcelle" redirige vers Marketplace au lieu du formulaire**
- `CoopDashboardScreen.js` : navigation corrigee de `'CoopMembers'` vers `'AddMemberParcel'`
- `AddMemberParcelScreen.js` : accepte maintenant l'acces sans `memberId` pre-selectionne
  - Ajout d'un selecteur de membre avec recherche (Modal, FlatList, filtre par nom/village/telephone)
  - Coherent avec la version web `AddParcelPage.jsx` qui a aussi un dropdown de selection de membre

### Phase 29 - Audit Complet Coherence + Securite + Harmonisation (DONE - 24/03/2026)
**Audit de securite - 6 failles corrigees:**
- CRITIQUE: Suppression mots de passe admin hardcodes dans auth.py (lignes 289-294, 689-692)
- CRITIQUE: Endpoints password-health et repair-password proteges par auth admin (Depends(get_current_user))
- HAUTE: CORS passe de wildcard * a origins explicites (harvest-validation.preview.emergentagent.com, localhost:3000)
- MOYENNE: Rate limiting ajoute sur creation de membre (20/min) dans cooperative_members.py
- Migration legacy: mecanisme de migration des mots de passe en clair vers hash bcrypt

**Harmonisation mobile/web - 5 ecrans ajoutes/corriges:**
- CoopLotsScreen.js (NOUVEAU) - Liste des lots de vente avec filtres par statut
- CoopDistributionsScreen.js (NOUVEAU) - Liste des distributions avec metriques
- CoopParcelsScreen.js (NOUVEAU) - Liste des parcelles avec navigation vers ajout
- CoopDashboardScreen.js - Actions rapides harmonisees avec le web (8 actions au lieu de 7)
- BottomTabBar.js - Menu cooperative mis a jour avec nouveaux ecrans
- AppContent.js - Fix mapping CoopLots (etait CoopReportsScreen, maintenant CoopLotsScreen)

**Resultats tests iteration 73: 21/22 backend PASS (95.5%), 100% frontend PASS**
- Securite: 6/6 tests PASS
- Fonctionnel: 15/15 endpoints PASS
- Frontend: Login, Dashboard, Members, Add Member modal tous PASS

**Version mobile: v1.58.0**
- APK: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/addaa17d-338f-42b1-8837-4dbf6706da84
- AAB: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/d5494378-0135-4f0c-b8b0-87363d3d0b73

### Phase 30 - Ecrans Mobile Manquants: Parite Complete Web/Mobile (DONE - 24/03/2026)
**4 ecrans crees pour parite complete web/mobile:**
1. ActivationStatsScreen.js - Taux d'activation, stats PIN/code, liste activees/en attente, envoi rappels SMS
2. CarbonPremiumsScreen.js - Stats primes (en_attente, approuvees, payees), liste demandes avec score/CO2/montant
3. AgentsProgressScreen.js - Resume global, progression par agent avec barre, details producteurs assignes (x/5)
4. USSDRegistrationsScreen.js - Recherche par nom/tel/village, badges source (USSD/Web/Mobile), code planteur

**API endpoints connectes:**
- GET /api/cooperative/members/activation-stats (22 membres, 22.7% actives)
- GET /api/cooperative/carbon-premiums/admin-requests (stats + liste demandes)
- GET /api/cooperative/agents-progress (2 agents, 87% moyenne)
- GET /api/ussd/registrations (33 inscriptions)

**Navigation mise a jour:**
- AppContent.js: 4 nouveaux Stack.Screen enregistres
- CoopDashboardScreen.js: 12 actions rapides (4 ajoutees)
- BottomTabBar.js: 14 items menu cooperative (4 ajoutes)
- cooperativeApi.js: 4 nouvelles fonctions API ajoutees

### Phase 31 - Fix Definitif 404 Login Mobile + Build v1.59.0 (DONE - 24/03/2026)
**Bug recurrent: "Request failed with status code 404" sur l'ecran de login mobile**
Cause probable: Le cache-buster `?_t=timestamp` ajoute aux requetes POST causait un mauvais routage par le proxy/CDN Kubernetes.

3 corrections appliquees:
1. api.js: cache-buster `_t=` retire des POST (garde uniquement pour GET)
2. api.js: retry automatique sur 404 (2 tentatives, comme pour les 5xx)
3. AuthContext.js: fallback login avec URL directe sans intercepteurs si 404 persiste
4. AuthContext.js: message 404 = "Service temporairement indisponible" (plus de message Axios brut)

Builds v1.59.0:
- APK: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/73caa5ff-1567-4609-ae5f-4cec0d3c1de0
- AAB: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/33f4cb56-6286-4c06-8738-11000400a22b

### Phase 32 - Fix Definitif Cloudflare/Login Mobile v1.61.0 (DONE - 25/03/2026)
**Bug recurrent: Erreur "Probleme de connexion" persistante sur mobile en Cote d'Ivoire**
Causes racines identifiees et corrigees:
1. CRITIQUE: Le retry Cloudflare ajoutait `?_t=timestamp` aux POST, causant 404 proxy → Supprime
2. CRITIQUE: Health check pre-login = requete supplementaire declenchant rate-limit Cloudflare → Supprime
3. HAUTE: Faux User-Agent navigateur declenchait la detection bot Cloudflare → Remplace par User-Agent honnete
4. MOYENNE: 6 retries rapides = rate-limit garanti → Reduit a 3 avec delais plus longs
5. Fallback login ameliore: retry automatique avec axios direct (sans intercepteurs) sur 404/5xx/reseau
6. Version dynamique via Constants.expoConfig dans WelcomeScreen

Build v1.61.0:
- APK (build final avec optimisations reseau lent): https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/6edf80b4-87c3-4e4c-a747-ab896cb3f075

Parametres reseau adaptes CI (2G/3G):
- Timeout: 60s (au lieu de 45s) — reseaux tres lents en zone rurale
- Retries: 4 avec delais progressifs 3s/6s/9s/12s (plus de jitter aleatoire)
- Timeout retry: ECONNABORTED detecte et retente automatiquement
- Fallback login: 60s timeout + 3s pause avant retry
- LoginScreen: 3 niveaux de retry avec messages adaptes ("reseau lent", "deplacez-vous en zone WiFi")

### Phase 33 - Nouveaux Ecrans Mobile + Securite Formules (DONE - 25/03/2026)

5 nouveaux ecrans mobiles crees:
1. AddAgentScreen — Formulaire creation agent terrain (nom, telephone, zone, email, villages)
2. CreateLotScreen — Wizard 2 etapes (infos lot + selection agriculteurs contributeurs)
3. CarbonSubmissionsScreen — Liste soumissions credits carbone avec stats
4. CreateCarbonListingScreen — Wizard 3 etapes (type/standard, details projet, impact/soumission)
5. Navigation corrigee: AgentListScreen pointe vers AddAgent au lieu de AgentActivation

Securite formules de repartition (CONFIDENTIEL — Super Admin uniquement):
- Mobile: texte de repartition supprime de CreateCarbonListingScreen
- Web: pourcentages supprimes de FAQPage, rse/Dashboard, CarbonPremiumsPage
- Backend API: distribution_model supprime de /stats, /dashboard; simulate-premium protege admin-only

Builds v1.61.0 (finaux):
- APK: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/4d00346f-8072-4c6f-9b86-21451110e9c1
- AAB: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/c5011a8f-cc1f-4577-9382-b677c5cdb6c5

### Phase 34 - ARS 1000 Conformite (DONE - 25/03/2026)

Implementation complete de la norme ARS 1000 (Norme Africaine Cacao Durable):

**USSD (backend - actif immediatement):**
- Nouveau menu principal "ARS 1000 Ready" avec 6 options
- Option 1: Prime carbone + conformite ARS (estimation avec niveau ARS)
- Option 2: Mes donnees ARS 1000 (voir/mettre a jour/generer rapport coop)
- Option 3: Conseils pratiques ARS (agroforesterie, brulage, engrais, tracabilite, recommandations perso)
- Moteur: Bronze (30-54%) / Argent (55-79%) / Or (80%+)
- Collections MongoDB: ars_farmer_data, ars_reports, admin_notifications

**Certifications ARS ajoutees:** CreateLotScreen, CreateCarbonListingScreen, LotsPage (ARS 1000-1/2/3)

### Phase 35 - Mise a jour Homepage ARS 1000 + Fix Sections Vides (DONE - 25/03/2026)

**Page d'accueil mise a jour:**
- Hero: Badge "ARS 1000 Ready" ajoute (style dore, distinct des badges EUDR et Carbone)
- Hero: Sous-titre mentionne "EUDR, SSRTE/ICI & ARS 1000"
- Features: Nouvelle carte "Conformite ARS 1000" avec badge jaune et description complete
- 8 cartes fonctionnalites au total (vs 7 precedemment)

**Bug corrige: Sections Features et HowItWorks vides**
- Cause: API /api/features et /api/steps retournent [] (tableau vide, truthy en JS), ecrasant les mockFeatures
- Fix: Verification `data && data.length > 0` avant de remplacer les donnees mock
- Impact: Les 8 cartes Features et 3 etapes HowItWorks s'affichent maintenant correctement

**Simulateur USSD verifie fonctionnel:**
- /farmer/prime-carbone fonctionne correctement
- Clic "Composer *144*88#" → Question 1/9 s'affiche
- Backend /api/ussd/calculate-premium retourne score, eligible, ars_level, ars_pct

**Tests iteration 74: 100% backend (9/9), 100% frontend**


## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Cooperative Gagnoa: bielaghana@gmail.com / 474Treckadzo
- Agent terrain test: test_agent@greenlink.ci / agent2024
- Producteur test: +2250799999999

## APIs Mockees
- Orange SMS, Orange Money

### Phase 36 - Failover CDN Bunny Mobile v1.63.0 (DONE - 25/03/2026)
**Bug P0 corrige: Erreur connexion mobile Cloudflare en Cote d'Ivoire**

Mecanisme de failover automatique implemente dans l'app mobile:
1. `config.js`: Ajout `FALLBACK_API_URL: 'https://greenlink-cdn.b-cdn.net'`, retries reduits a 3 (avant failover)
2. `api.js`: Intercepteur Axios avec failover intelligent:
   - 3 retries sur URL primaire avec delais progressifs (3s/6s/9s + jitter)
   - Si tous echouent (reseau/Cloudflare/5xx/403) → bascule auto vers CDN Bunny
   - Tracking d'etat: apres 2 echecs primaires consecutifs, prefere CDN
   - Re-test periodique du primaire apres 10 requetes CDN reussies
   - Detection Cloudflare: HTML/403/cf- headers
3. `AuthContext.js`: Login fallback ameliore:
   - Essaie d'abord CDN Bunny puis URL primaire en cascade
   - Messages d'erreur adaptes reseau lent CI

**Flux de failover:**
Requete → URL primaire (3 retries) → ECHEC → CDN Bunny (3 retries) → Reponse
Si CDN OK: les requetes suivantes utilisent CDN directement
Re-test primaire toutes les 10 requetes pour recovery automatique

**Version mobile: v1.63.0** (build EAS a generer par l'utilisateur)

## Backlog
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoule, Dioula)
- P2: Stockage cloud AWS S3
- P3: Refactoring greenlink.py, ussd.py en fichiers dedies
- P3: Optimisation N+1 query dans get_coop_members

## Key API Endpoints
- POST /api/auth/login | register
- POST /api/auth/activate-member-account
- POST /api/auth/check-member-phone/{phone}
- POST /api/cooperative/members (pin_code + hectares obligatoires)
- GET /api/cooperative/members/activation-stats
- GET /api/cooperative/members/export?format=xlsx|pdf
- POST /api/ussd/callback
- POST /api/ussd/carbon-calculator
- POST /api/ussd/calculate-premium
- POST /api/ussd/register-web
- GET /api/ussd/registrations
- GET /api/admin/carbon-premiums/config | stats | requests
- PUT /api/admin/carbon-premiums/requests/{id}/validate
- PUT /api/admin/carbon-premiums/requests/{id}/pay
- GET /api/farmer/carbon-premiums/my-requests
- GET /api/cooperative/carbon-premiums/admin-requests
