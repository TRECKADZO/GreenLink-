# GreenLink - Product Requirements Document

## Probleme Original
Plateforme agricole full-stack pour la gestion des cooperatives cacao en Cote d'Ivoire, avec suivi carbone, conformite EUDR, et protection des enfants (SSRTE).

## Architecture
- **Backend**: FastAPI + MongoDB (Atlas)
- **Frontend Web**: React + Shadcn UI
- **Mobile**: React Native (Expo/EAS)

## Fonctionnalites Implementees

### Phases 1-5 (DONE)
- Core Platform, Mobile, Backend Refactoring, Cles Francaises, Notifications Push

### Phase 6 - Systeme de Livraison Marketplace (DONE)
- 3 modeles cumulables: frais_fixe, par_distance, par_poids + seuil_gratuit

### Phase 7 - Corrections Connexion & Parcelles (DONE - 21/03/2026)
- Rate limiter JSON, messages d'erreur specifiques, normalisation telephone
- Mapping cles francaises (nombre_parcelles, superficie_totale) dans mobile
- Liaison auto parcelles lors inscription/activation membre
- Reset mot de passe fonctionne avec telephone (tous formats)

### Phase 8 - Recoltes & Validation Cooperative (DONE - 21/03/2026)
**Flux complet:**
1. Agriculteur declare une recolte -> auto-liee a sa cooperative via coop_member
2. Cooperative recoit une notification "Nouvelle recolte a valider"
3. Cooperative valide ou rejette -> notification envoyee a l'agriculteur
4. Statuts: en_attente -> validee / rejetee

### Phase 9 - Conversion Unites & Emails Recoltes (DONE - 22/03/2026)
- Conversion unites correcte: tonnes->kg (x1000), sacs->kg (x65)
- Notifications affichent quantite originale + conversion: "2 tonne(s) (2000 kg)"
- Email Resend envoye a la cooperative lors de chaque declaration de recolte

### Phase 10 - Ecran Suivi Recoltes & Dashboard Coop (DONE - 22/03/2026)
**Backend:**
- GET /api/greenlink/harvests/my-harvests (filtres par statut, stats globales)

**Mobile Agriculteur:**
- MyHarvestsScreen: liste recoltes avec filtres, stats, quantity_display
- Menu HomeScreen mis a jour avec "Mes Recoltes" en position 2

**Mobile Cooperative:**
- Redirection automatique des utilisateurs cooperative vers CoopDashboard
- Section "Recoltes en attente" avec bandeau d'alerte + compteur
- Apercu des 3 dernieres declarations dans le dashboard
- Lien direct vers CoopHarvests pour valider/rejeter

### Phase 11 - Prime Carbone dans Verification Terrain (DONE - 22/03/2026)
**Backend:**
- PUT /api/field-agent/parcels/{parcel_id}/verify enrichi avec: nombre_arbres, couverture_ombragee, pratiques_ecologiques
- Recalcul du score carbone base sur donnees terrain: base 3.0, densite arbres (0-2pts), couverture ombragee (0-2pts), pratiques ecologiques (0-2.5pts, 0.5 chacune), bonus surface (0.5pt), max 10.0
- GET /api/greenlink/parcels/my-parcels retourne nombre_arbres, couverture_ombragee, pratiques_ecologiques

**Mobile Agent Terrain:**
- ParcelVerifyFormScreen enrichi avec section "Indicateurs prime carbone":
  - Decomptage des arbres (input numerique)
  - Couverture ombragee (% avec barre visuelle)
  - Checklist pratiques ecologiques: compostage, absence pesticides chimiques, gestion dechets, protection cours d'eau, agroforesterie
- Pas de mention "Nouveau" (demande explicite utilisateur)

## Builds
- v1.39.2-v1.39.9: Corrections diverses
- v1.40.0: Declaration recolte corrigee
- v1.40.1: Flux recoltes + validation cooperative
- v1.40.2: Fix conversion unites
- v1.40.3: Ecran Mes Recoltes + Dashboard coop ameliore
- v1.41.0: Corrections crash React hooks + API retry Cloudflare + renommage GreenLink Agritech

## Credentials
- Cooperative: coop-gagnoa@greenlink.ci
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Agent terrain test: test_agent@greenlink.ci / agent2024
- Producteur test: +2250709090909 / koffi2024

## APIs Mockees
- Orange SMS, Orange Money

## Backlog
- P1: Soumettre AAB au Google Play Console
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoule, Dioula)
- P2: Stockage cloud AWS S3
- P3: Refactoring greenlink.py en fichiers dedies (parcels.py, harvests.py)

## Key API Endpoints
- POST /api/auth/login | register | forgot-password | verify-reset-code | reset-password
- GET /api/greenlink/harvests/my-harvests
- POST /api/greenlink/harvests
- GET /api/greenlink/parcels/my-parcels
- GET /api/greenlink/farmer/dashboard
- GET /api/cooperative/dashboard
- GET /api/cooperative/harvests
- PUT /api/cooperative/harvests/{id}/validate | reject
- GET /api/cooperative/members
- PUT /api/field-agent/parcels/{parcel_id}/verify (enrichi prime carbone)
- GET/PUT /api/marketplace/supplier/delivery-settings
- POST /api/marketplace/cart/checkout
