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
- PUT /api/field-agent/parcels/{id}/verify enrichi: nombre_arbres, couverture_ombragee (auto-calculee), pratiques_ecologiques
- Calcul score carbone: base 3.0 + arbres (0-2) + ombrage (0-2) + pratiques (0-2.5) + surface (0.5), max 10
- Lexiques explicatifs pour chaque pratique ecologique
- GET /api/greenlink/parcels/my-parcels retourne champs carbone enrichis

### Phase 12 - Dashboard Score Carbone Visuel (DONE - 22/03/2026)
- GET /api/greenlink/carbon/my-score enrichi: decomposition, recommandations, stats, parcelles
- Mobile: MyCarbonScoreScreen revampe + HomeScreen carte carbone interactive
- Web: CarbonScorePage creee avec jauge, barres progression, recommandations, scores parcelles

### Phase 13 - Corrections Web + Fonctionnalites Manquantes (DONE - 23/03/2026)
- Fix page blanche farmer, Fix redirection login producteur, 8 boutons d'action farmer
- Nouvelles pages: /farmer/my-harvests, /farmer/carbon-score
- Cooperative: boutons Marketplace, Primes Carbone auto-refresh, Lots contributeurs
- Backend: contributors, checkout fixes, Mobile v1.50.0

### Phase 14 - Distribution Proportionnelle + Notifications Temps Reel (DONE - 23/03/2026)
- POST /api/cooperative/lots/{lot_id}/distribute: redistribution proportionnelle
- SSE Notifications temps reel

### Phase 15 - Formulaire Creation Lot avec Selection Agriculteurs + Builds v1.51.0 (DONE - 24/03/2026)
- Wizard 2 etapes, Build APK/AAB v1.51.0

### Phase 16 - Calcul Prime Carbone avec Taille des Arbres (DONE - 24/03/2026)
- Categorisation: Petits (<8m) x0.3, Moyens (8-12m) x0.7, Grands (>12m) x1.0

### Phase 17 - Super Admin Gestion Primes Carbone (DONE - 24/03/2026)
- Flux complet: Verification -> Admissibilite -> USSD -> Admin validation -> Paiement Orange Money

### Phase 17b - Vue Planteur Demandes Prime (DONE - 24/03/2026)
### Phase 17c - Mise a jour page Cooperative (DONE - 24/03/2026)

### Phase 18 - Formule RSE Confidentielle (DONE - 24/03/2026)
- RSE = Score x Taux x Ha | 30% Frais, 70% Distribue (25% GreenLink, 5% Coop, 70% Paysan)
- Taux configurable par Super Admin, CONFIDENTIEL

### Phase 18b - Calculateur Prime Accueil mis a jour (DONE - 24/03/2026)
- CarbonCalculator.jsx avec 3 categories arbres

### Phase 19 - Refonte USSD + Inscription + Dashboards (DONE - 24/03/2026)
**Flux USSD reecrit completement (`/app/backend/routes/ussd.py`):**
- Menu accueil: 1. Deja inscrit, 2. Nouvelle inscription, 3. Aide/Infos, 0. Quitter
- Reconnaissance profil: detection automatique par telephone, menu principal 6 options
- Inscription USSD: 4 etapes (Nom, Code Coop, Village, PIN 4 chiffres) + confirmation
- Estimation Simple (5 questions): hectares, arbres >8m, engrais, brulage, age cacaoyers
- Estimation Detaillee (9 questions): hectares, 3 categories arbres, engrais, brulage, compost, agroforesterie, couverture sol
- Resultat avec options: Demander versement, Refaire estimation, Retour menu, Quitter
- Demande versement: confirmation avant envoi au Super Admin
- Sous-menus: Parcelles, Conseils agroforestiers, Profil, Aide/Contact
- Collection MongoDB `ussd_registrations` pour les inscriptions USSD/Web

**Formulaire Web inscription planteur (`/farmer/inscription`):**
- Page RegisterFarmerPage.jsx: Nom, Telephone, Code planteur, Village (dropdown 18 villes), Hectares, PIN, Email
- Endpoint POST /api/ussd/register-web avec validations (doublon tel, PIN 4 chiffres)
- Page de succes avec boutons accueil / estimation
- Bouton "Inscription Planteur" sur la page d'accueil

**Page Inscriptions Cooperative (`/cooperative/inscriptions`):**
- USSDRegistrationsPage.jsx: tableau des inscriptions avec stats (Total, USSD, Web)
- Filtrage/recherche par nom, telephone, village, code coop
- Badges canal (USSD bleu, Web violet)
- Bouton "Inscriptions USSD/Web" dans les actions rapides cooperative

**Dashboard Agent Terrain mis a jour:**
- Nouvel onglet "Inscriptions" dans le menu
- Formulaire d'inscription rapide pour les agents de terrain
- Liste des dernieres inscriptions

**Dashboard Super Admin mis a jour:**
- Bouton "Inscriptions USSD/Web" dans les raccourcis strategiques

**Tests: 15/15 backend PASS, 100% frontend PASS (iteration 64)**

### Phase 19b - Simulateur USSD Interactif (DONE - 24/03/2026)
**Composant reutilisable `USSDSimulator.jsx` :**
- Interface visuelle simulant un ecran de telephone (barre d'etat Orange CI, chat-like UI)
- Boutons rapides extraits automatiquement des menus USSD
- Gestion de session complete : demarrage, navigation, fin, nouvelle session
- Pas d'exposition de la formule RSE (reponses USSD deja farmer-facing)

**Integration Super Admin (onglet USSD dans /admin/analytics) :**
- Simulateur a gauche + Guide des flux a droite (5 cards: Inscription, Estimation Simple, Detaillee, Versement, Profil)

**Integration Cooperative (toggle dans /cooperative/dashboard) :**
- Bouton "Simulateur USSD" dans les actions rapides
- Panneau avec simulateur + instructions d'utilisation en 4 etapes
- Formation des agents de cooperative a distance

**Tests: 100% frontend PASS (iteration 65)**

### Phase 19c - Corrections Logique Metier + Auto-Code Planteur (DONE - 24/03/2026)
**Corrections appliquees :**
- Bouton "Inscription Planteur" retire de la page d'accueil → Restaure "S'inscrire gratuitement" vers /register
- Logique metier : les planteurs s'inscrivent uniquement via cooperative/agent terrain/USSD, jamais en auto-inscription web publique
- Fix auth/register endpoint (erreur 500 Pydantic) : validateur email deplace de UserBase vers UserCreate uniquement
- Inscription /register fonctionne maintenant pour tous les types : acheteur, cooperative, fournisseur, producteur, entreprise_rse

**Auto-generation Code Planteur :**
- Format: `GL-{PREFIX}-{SEQUENCE}` (ex: GL-DAL-00001, GL-COO-00003)
- PREFIX = 3 premieres lettres du code cooperative ou du village, sinon "IND"
- Collection MongoDB `farmer_code_counters` pour la sequence
- Genere automatiquement a l'inscription USSD et Web
- Affiche dans le message de confirmation USSD et la page de succes Web
- Champ "Code planteur" supprime du formulaire → remplace par "Code cooperative (optionnel)"

**Tests: 14/14 backend PASS, 100% frontend PASS (iteration 66)**

### Phase 20 - Auto-Generation Code Cooperative (DONE - 24/03/2026)
**Logique metier :**
- Le code cooperative est auto-genere a l'inscription : `COOP-{DEPT}-{SEQ}` (ex: COOP-DAL-001)
- PREFIX = 3 premieres lettres du departement ou du nom de la cooperative
- Collection MongoDB `coop_code_counters` pour la sequence (comme `farmer_code_counters`)
- Le code n'est JAMAIS saisi manuellement

**Backend :**
- `generate_coop_code()` dans auth.py
- `POST /api/auth/register` pour cooperative: auto-genere coop_code, stocke coop_name et headquarters_region
- `GET /api/auth/cooperatives` (public): liste des cooperatives actives avec code, nom, region
- response_model=Token retire du register pour eviter les erreurs de serialisation Pydantic

**Frontend Register.jsx :**
- Champ "Nom de la cooperative" affiche quand user_type=cooperative
- Page de succes cooperative affiche le code auto-genere en grand avec message de conservation
- Boutons "Mon tableau de bord" et "Completer mon profil"

**Frontend RegisterFarmerPage.jsx (inscription planteur) :**
- Champ "Code cooperative" remplace par dropdown Select des cooperatives existantes
- Charge les coops via GET /api/auth/cooperatives au montage
- Option "Aucune / Independant" disponible
- Affiche "nom (code)" pour chaque cooperative

**Flux complet valide :**
```
Super Admin / Inscription → Cooperative creee → Code auto: COOP-DAL-001
    ↓
Cooperative crée ses agents terrain
    ↓
Agent terrain inscrit un planteur → Selectionne COOP-DAL-001 → Code planteur auto: GL-DAL-00001
    ↓
Planteur compose *144*88# → Reconnu par telephone → Menu complet
```

**Tests: 13/13 backend PASS, 100% frontend PASS (iteration 67)**

### Phase 21 - Audit Global + Dashboard Onboarding + Harmonisation (DONE - 24/03/2026)
**Audit et corrections globales :**
- Fix champ password: migration de `password` vers `hashed_password` dans toute la DB (greenlink_production, 92 users)
- Fix login coop-test@greenlink.ci: reinitialisation mot de passe
- Auto-generation codes coop pour les 6 cooperatives existantes sans code
- Fix auth/register: suppression response_model=Token, passage `coop_name` dans payload
- Verification que les 3 comptes de test se connectent: admin, bielaghana, coop-test ✅

**Dashboard Onboarding Super Admin :**
- Nouvel onglet "Onboarding" dans Centre de Donnees Strategiques (/admin/analytics)
- Endpoint `GET /api/admin/analytics/onboarding` (admin only)
- 4 cartes resumees: Cooperatives (21), Agents terrain (12), Producteurs (36), Total (92)
- Entonnoir de conversion 6 etapes: Cooperatives → Agents → Membres → Parcelles → Verifiees → Demandes prime
- Barres colorees avec pourcentages
- Statistiques inscriptions USSD/Web
- Tableau detail par cooperative: code, region, agents, membres, parcelles, verifiees, statut

**Harmonisation :**
- user_type coherent dans toute la DB: producteur, cooperative, field_agent, admin, acheteur, etc.
- Champ `hashed_password` standardise pour tous les comptes
- Tous les codes coop au format COOP-XXX-NNN
- Endpoint public `GET /api/auth/cooperatives` pour les formulaires d'inscription

**Tests: 12/12 backend PASS, 100% frontend PASS (iteration 68)**

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Cooperative Gagnoa: bielaghana@gmail.com
- Agent terrain test: test_agent@greenlink.ci / agent2024
- Producteur test: +2250799999999

## APIs Mockees
- Orange SMS, Orange Money

### Phase 22 - Fix Activation Membre + PIN USSD (DONE - 24/03/2026)
**Bug P0 corrige : Activation impossible pour les membres crees par cooperative**
- PIN USSD rendu OBLIGATOIRE (4 chiffres) lors de la creation d'un membre par la cooperative
- Champ hectares (superficie approximative) ajoute au formulaire de creation
- Auto-generation `code_planteur` (GL-XXX-NNNNN) lors de la creation manuelle
- Hashage SHA256 du PIN et stockage dans `coop_members.pin_hash`
- Creation automatique d'une entree `ussd_registrations` pour reconnaissance USSD
- `activate_member_account` copie le `code_planteur` du `coop_members` vers le nouveau user
- Import CSV mis a jour avec meme logique (code_planteur + PIN + ussd_registrations)
- Widget de suivi d'activations dans le Dashboard cooperative (stats, barre de progression, liste en attente)
- Bandeau stats d'activation dans la page Membres (5 cartes + barre de progression)
- Bouton "Rappel SMS" (MOCKED) pour relancer les membres en attente d'activation
- Endpoint `GET /api/cooperative/members/activation-stats`
- Endpoint `POST /api/cooperative/members/{id}/send-reminder` (MOCKED SMS)

**Flux metier valide (tel que defini par l'utilisateur) :**
```
Etape 1 - Creation par humain de confiance (Coop/Agent/Admin)
  → Collecte: nom, telephone, village, code coop, PIN 4 chiffres, hectares
  → Systeme genere: Code Planteur unique (GL-DAL-00001)
  → Stockage: coop_members + ussd_registrations

Etape 2 - Planteur compose *144*88#
  → Choisit "1. Je suis deja inscrit"
  → Systeme reconnait son numero automatiquement
  → Acces menu: estimer prime, demander versement, parcelles, etc.
  (USSD = utilisation, pas creation de compte)
```

**Tests: 12/12 backend PASS, 100% frontend PASS (iteration 70)**

### Phase 23 - Export PDF/Excel + Nom Cooperative (DONE - 24/03/2026)
- Export Excel (.xlsx) et PDF des membres depuis la page Gestion des Membres
- Tableau avec: Nom, Telephone, Village, Departement, Code Planteur, Statut, Compte active, PIN USSD, Hectares, CNI, Date creation
- Excel: en-tete avec nom cooperative et code, colonnes stylisees (vert #2D5A4D)
- PDF: format paysage A4, tableau colore avec alternance de lignes
- Les filtres actifs (statut, recherche) sont appliques a l'export
- Navbar: affiche le nom de la cooperative (coop_name) au lieu du nom personnel (full_name) quand une cooperative est connectee (desktop, dropdown, mobile)
- Endpoint: `GET /api/cooperative/members/export?format=xlsx|pdf&status=xxx&search=xxx`
**Tests: 11/11 backend PASS, 100% frontend PASS (iteration 71)**

### Phase 24 - Verification Flux Activation + Libelles (DONE - 24/03/2026)
- Verifie et valide les 2 flux d'activation bout-en-bout:
  - Membre: Coop cree planteur → check-member-phone → activate-member-account → login OK
  - Agent: Coop cree agent → check-agent-phone → activate-agent-account → login OK
- Amelioration des libelles sur la page Login:
  - "Inscrit par votre cooperative ? Activez votre acces web"
  - "Je suis planteur — Activer mon acces web"
  - "Je suis agent terrain — Activer mon acces web"
- Pages ActivateMember.jsx et ActivateAgent.jsx: titres mis a jour
**Tests: Flux testes manuellement via curl (creation, check, activation, login) - tous OK**

### Phase 25 - Build APK/AAB v1.52.0 (DONE - 24/03/2026)
- Build AAB v1.52.0 TERMINE: https://expo.dev/artifacts/eas/xsJmADLAugHnLwvRHoy3B2.aab
- Build APK v1.52.0 TERMINE: e8e985c2-703f-4560-a0e8-e12fb44ec312

### Phase 26 - Fix Cloudflare Mobile + Build v1.53.0 (DONE - 24/03/2026)
- Rewrite api.js: User-Agent realiste, headers anti-cache, detection Cloudflare, retry avec jitter
- Health check auto avant login, retry avec headers alternatifs
- AuthContext.js: messages d'erreur specifiques, dialogue "Reessayer" pour erreurs serveur
- Labels d'activation harmonises avec le web
- Build AAB v1.53.0 EN COURS: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/889246bc-df07-4663-b25c-027e1c19f8d4

## Backlog
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoule, Dioula)
- P2: Stockage cloud AWS S3
- P3: Refactoring greenlink.py, ussd.py en fichiers dedies

## Key API Endpoints
- POST /api/auth/login | register
- POST /api/auth/activate-member-account (Activation compte membre coop)
- POST /api/auth/check-member-phone/{phone} (Verification telephone membre)
- POST /api/cooperative/members (Creation membre avec code_planteur + PIN)
- POST /api/ussd/callback (Main USSD webhook - session-based state machine)
- POST /api/ussd/carbon-calculator (Stateless USSD calculator)
- POST /api/ussd/calculate-premium (Homepage public calculator)
- POST /api/ussd/register-web (Web registration form)
- GET /api/ussd/registrations (List USSD/Web registrations)
- GET /api/admin/carbon-premiums/config | stats | requests
- PUT /api/admin/carbon-premiums/requests/{id}/validate
- PUT /api/admin/carbon-premiums/requests/{id}/pay
- GET /api/farmer/carbon-premiums/my-requests
- GET /api/cooperative/carbon-premiums/admin-requests
