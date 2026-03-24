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
**Farmer Dashboard Web:**
- Fix page blanche: mapping cles francaises (total_parcelles, superficie_totale, score_carbone_moyen...)
- Fix redirection login producteur -> /farmer/dashboard (ajout 'producteur' dans switch)
- 8 boutons d'action: Declarer Parcelle, Declarer Recolte, Score Carbone, Mes Recoltes, Primes Carbone, Marketplace Intrants, Mes Commandes, Bourse Recoltes

**Nouvelles pages web farmer:**
- /farmer/my-harvests: Suivi recoltes avec filtres, stats par statut
- /farmer/carbon-score: Score carbone detaille (jauge, decomposition, recommandations, scores parcelles)

**Cooperative Dashboard Web:**
- Boutons Marketplace Intrants + Suivi Commandes ajoutes aux actions rapides
- Primes Carbone: auto-refresh 30s
- Soumissions Carbone: auto-refresh 30s + suivi detaille post-approbation (date, ventes, revenus)
- Page Lots: bouton "Contributeurs" expandable avec tableau tonnages par agriculteur

**Super Admin:**
- Bouton retour ajoute dans Centre de Donnees Strategiques

**Backend:**
- GET /api/cooperative/lots/{id}/contributors: liste contributeurs avec tonnages/ha/arbres/score par agriculteur
- Fix /api/marketplace/orders/my-orders: recherche buyer_id ET customer_id (compatibilite checkout)
- Fix checkout: buyer_id stocke en string

**Mobile:**
- v1.50.0: Retry Cloudflare ameliore (5 tentatives, delais progressifs 2-10s), messages erreur clairs
- OrderDetailScreen cree (articles, prix, livraison, fournisseur)
- CoopDashboard: boutons Marketplace + Mes Commandes
- Filtres marketplace redimensionnes

### Phase 14 - Distribution Proportionnelle + Notifications Temps Reel (DONE - 23/03/2026)
**Distribution Proportionnelle des Primes Carbone:**
- POST /api/cooperative/lots/{lot_id}/distribute: redistribution proportionnelle au tonnage de chaque agriculteur
  - Calcul: share_pct = tonnage_farmer / total_tonnage, amount = distributable * share_pct
  - 7 agriculteurs avec contributions 12.0% a 16.5% verifiees
- GET /api/cooperative/distributions/{dist_id}: detail complet par agriculteur
- GET /api/cooperative/distributions: enrichi avec distributions array et total_tonnage_kg
- Frontend LotsPage: Modale de previsualisation avant distribution (Prime Totale, Commission 10%, Montant Distribuable, tableau par agriculteur avec nom/tonnage/%/montant)
- Frontend DistributionsPage: Section expandable "Detail par Agriculteur" avec tableau complet (nom, parcelles, surface, tonnage, % contribution, montant, statut paiement)
- Fix bug: cle `phone_number` remplacee par `telephone` dans execute_distribution_payments

**Notifications Temps Reel Web (SSE):**
- GET /api/notifications/web: lecture depuis collection `notifications` (ou les evenements ecrivent)
- GET /api/notifications/web/unread-count: compteur non-lues
- PUT /api/notifications/web/{id}/read: marquer comme lu
- PUT /api/notifications/web/read-all: marquer toutes comme lues
- GET /api/notifications/stream: endpoint SSE avec auth, push temps reel via in-memory queues
- NotificationCenter component: SSE fetch-based (auth headers), icones par type (recolte, commande, parcelle), timeAgo français
- SSE notify_sse_clients() integre dans: declaration recolte (notifie coop), validation/rejet recolte (notifie farmer), commandes marketplace (notifie fournisseur/client)
- NotificationCenter ajoute au dashboard Farmer (en plus de Cooperative, Agent Terrain, SSRTE)

## Builds
- v1.42.0-v1.50.0: Prime carbone, score visuel, corrections web, commandes, filtres

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Cooperative Gagnoa: +2250505000001 / coop2024
- Agent terrain test: test_agent@greenlink.ci / agent2024
- Producteur test: +2250705551234 / koffi2024

## APIs Mockees
- Orange SMS, Orange Money

### Phase 15 - Formulaire Création Lot avec Sélection Agriculteurs + Builds v1.51.0 (DONE - 24/03/2026)
- Formulaire création lot revu en wizard 2 étapes:
  - Étape 1: Infos lot (nom, tonnage cible, type produit, certification, score carbone min, description)
  - Étape 2: Sélection agriculteurs avec checkbox + saisie tonnage individuel (kg), barre résumé temps réel
- Backend: CoopLotCreate accepte `contributors[]` avec farmer_id, farmer_name, tonnage_kg
- Backend: get_lot_contributors et distribute_lot_premiums utilisent les contributeurs stockés
- Vérification mobile: tous les endpoints testés, aucune erreur de connexion
- Build APK v1.51.0: https://expo.dev/artifacts/eas/58ndnox8s58XwDDk2aJcFT.apk
- Build AAB v1.51.0 (versionCode 42): https://expo.dev/artifacts/eas/4b9kgy4hp8HahFNYD6osSv.aab
- P1: Soumettre AAB au Google Play Console
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoule, Dioula)
- P2: Stockage cloud AWS S3
- P3: Refactoring greenlink.py en fichiers dedies (parcels.py, harvests.py)

## Key API Endpoints
- POST /api/auth/login | register | forgot-password | verify-reset-code | reset-password
- GET /api/greenlink/carbon/my-score (enrichi breakdown + recommandations)
- GET /api/greenlink/harvests/my-harvests
- GET /api/greenlink/parcels/my-parcels
- GET /api/greenlink/farmer/dashboard
- PUT /api/field-agent/parcels/{id}/verify (enrichi prime carbone)
- GET /api/cooperative/dashboard | harvests | members
- GET /api/cooperative/lots/{id}/contributors
- POST /api/cooperative/lots/{lot_id}/distribute
- GET /api/cooperative/distributions/{dist_id}
- GET /api/marketplace/orders/my-orders
- PUT /api/marketplace/orders/{id}/status
- GET /api/notifications/web | web/unread-count
- PUT /api/notifications/web/{id}/read | web/read-all
- GET /api/notifications/stream (SSE)
