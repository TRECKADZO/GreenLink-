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

### Base de donnees
- MongoDB Atlas (Cluster0): `greenlink_production`
- DB: 55 collections, 1072+ documents

### Securite (6-7 avr 2026)
- AUDIT SECURITE COMPLET: 25+ routes critiques protegees par JWT
- ISOLATION DONNEES PAR ROLE: agents/cooperatives/admin voient uniquement leurs donnees
- Rate limiting: login (5/min), register (5/5min), forgot-password (3/min), SMS (5/min)
- Token blacklist avec endpoint /logout et invalidation apres password change (iat vs password_changed_at)
- Protection path traversal, Headers HTTP securite (X-Frame-Options, X-Content-Type-Options, etc.)
- **Protection escalade de privileges**: FORBIDDEN_FIELDS dans profile update (user_type, is_active, hashed_password, roles, etc.) 
- **Endpoint changement mot de passe authentifie**: POST /api/auth/change-password (valide ancien mdp, rejette si identique, blackliste ancien token, emet nouveau token)
- **Indicateur stockage IndexedDB**: dans l'onglet Plus de l'agent terrain (taille utilisee/quota, bouton "Vider le cache")

### Messagerie Professionnelle (6 avr)
- Backend: conversations directes + marketplace, contacts filtres par role
- Frontend: MessagingPage avec Web Push Notifications VAPID
- Super Admin masque ("GreenLink Support"), polling 30s

### Mode Offline-First Web
- IndexedDB pour Agent Terrain + Cooperative
- Service Worker PWA, sync auto au login et retour en ligne

## Travail complete (6 avr)
- Voir historique complet dans PRD precedent
- (6 avr) Certifications ARS, Messagerie professionnelle, Push Notifications VAPID
- (6 avr) Cooperative name obligatoire dans /register
- (6 avr) Colonne Cooperative dans Admin Users
- (6 avr) Simulateur USSD dans agent terrain
- (7 avr) Protection escalade de privileges (FORBIDDEN_FIELDS dans update_profile)
- (7 avr) Endpoint POST /api/auth/change-password avec invalidation token
- (7 avr) Indicateur stockage IndexedDB dans onglet Plus agent terrain
- (7 avr) Section "Securite" dans la page Profil (modifier mot de passe)
- (7 avr) Tests de securite: 5 tests backend passes (test_security_privilege_escalation.py)
- (7 avr) Bug fix: Cooperatives invisibles dans messagerie admin — get_display_name verifie maintenant coop_name + 12 cooperatives corrigees en DB
- (7 avr) Ajout decompte arbres ombrages par strate (Strate 1/2/3) dans fiche parcelle (MemberParcelsPage + ParcelsVerificationPage + API backend)
- (7 avr) Saisie arbres par strate lors de la creation de parcelle (AddParcelPage + MemberParcelsPage modal + backend) avec bonus score carbone
- (7 avr) GESTION DES ECARTS : Moteur de calcul automatique (surface, arbres par strate, brulage, couverture) + Classification (faible/moyen/important) + Impact prime carbone (0.95/0.80/0.50) + Dashboard cooperative + Notifications farmer + Validation coop + Tests 16/16 passes
- (7 avr) Export PDF rapport ecarts par campagne (reportlab) + bouton Exporter PDF dans dashboard cooperative
- (7 avr) FORMULE CARBONE UNIFIEE v2.0 : 1 seul moteur (carbon_score_engine.py) utilise partout (creation, verification, USSD). 10 criteres: base, densite arbres ponderee, couverture ombragee, brulage (-1.5), engrais chimiques (-0.5), pratiques eco, REDD+, age cacaoyers, surface, certification. API: POST /api/carbon-score/simulate + GET /api/carbon-score/decomposition

## Travail complete (7 avr suite)
- (7 avr) BUG FIX USSD "Age cacaoyers": Variable arbres_par_ha non definie dans calculate_ussd_carbon_premium() causait une erreur pour la derniere question du flux USSD (toutes les 3 options 1/2/3). Corrige en ajoutant arbres_par_ha = total_trees / max(hectares, 0.01). Tests: 8/8 backend + frontend USSD simulator verifies (iteration_108)

## Backlog
### P0
- Mettre a jour MONGO_URL dans les Secrets Emergent Dashboard (action utilisateur)
- Configuration DNS domaine greenlink-agritech.com (action utilisateur GoDaddy) — emails Resend en spam

### P1
- ~~Tests de securite: escalade de privileges, invalidation de session~~ DONE
- ~~Indicateur taille stockage offline (IndexedDB) dans le profil agent~~ DONE

### P2
- Passerelle SMS reelle Orange CI / MTN (MOCK)
- Langues locales (Baoule/Dioula) mobile

### P3
- Refactoriser ussd.py (~2700 lignes)
- Nettoyage code mort (subscription files)
- Nettoyer la gestion id vs _id dans MongoDB pour tous les anciens comptes

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Cooperative: `bielaghana@gmail.com` / `test123456`
- Agent: `testagent@test.ci` / `test123456`
- Farmer: `testplanteur@test.ci` / `test123456`
