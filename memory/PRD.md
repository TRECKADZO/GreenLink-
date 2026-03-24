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

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Cooperative Gagnoa: bielaghana@gmail.com
- Agent terrain test: test_agent@greenlink.ci / agent2024
- Producteur test: +2250799999999

## APIs Mockees
- Orange SMS, Orange Money

## Backlog (P0-P3)
- P1: Soumettre AAB au Google Play Console
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoule, Dioula)
- P2: Stockage cloud AWS S3
- P3: Refactoring greenlink.py, ussd.py en fichiers dedies

## Key API Endpoints
- POST /api/auth/login | register
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
