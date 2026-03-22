# GreenLink - Product Requirements Document

## Problème Original
Plateforme agricole full-stack pour la gestion des coopératives cacao en Côte d'Ivoire, avec suivi carbone, conformité EUDR, et protection des enfants (SSRTE).

## Architecture
- **Backend**: FastAPI + MongoDB (Atlas)
- **Frontend Web**: React + Shadcn UI
- **Mobile**: React Native (Expo/EAS)

## Fonctionnalités Implémentées

### Phases 1-5 (DONE)
- Core Platform, Mobile, Backend Refactoring, Clés Françaises, Notifications Push

### Phase 6 - Système de Livraison Marketplace (DONE)
- 3 modèles cumulables: frais_fixe, par_distance, par_poids + seuil_gratuit

### Phase 7 - Corrections Connexion & Parcelles (DONE - 21/03/2026)
- Rate limiter JSON, messages d'erreur spécifiques, normalisation téléphone
- Mapping clés françaises (nombre_parcelles, superficie_totale) dans mobile
- Liaison auto parcelles lors inscription/activation membre
- Reset mot de passe fonctionne avec téléphone (tous formats)

### Phase 8 - Récoltes & Validation Coopérative (DONE - 21/03/2026)
**Flux complet:**
1. Agriculteur déclare une récolte → auto-liée à sa coopérative via coop_member
2. Coopérative reçoit une notification "Nouvelle récolte à valider"
3. Coopérative valide ou rejette → notification envoyée à l'agriculteur
4. Statuts: en_attente → validee / rejetee

**Backend:**
- POST /api/greenlink/harvests (accepte format mobile: quantity, quality, unit, notes)
- GET /api/cooperative/harvests (filtres par statut, pagination)
- PUT /api/cooperative/harvests/{id}/validate
- PUT /api/cooperative/harvests/{id}/reject
- GET /api/cooperative/harvests/summary (résumé par membre)
- Conversion auto: sacs→kg (×65), tonnes→kg (×1000), "Grade A"→"A"

**Mobile:**
- CoopHarvestsScreen: liste des récoltes avec filtres, validation/rejet
- Bouton "Récoltes" dans le dashboard coopérative
- Sélection individuelle de parcelle corrigée (parcel.id au lieu de parcel._id)

## Builds
- v1.39.2-v1.39.9: Corrections diverses (images, connexion, parcelles, sélection)
- v1.40.0: Déclaration récolte corrigée (mapping champs backend)
- v1.40.1: Flux complet récoltes + validation coopérative + écran CoopHarvests

## Credentials
- Cooperative: bielaghana@gmail.com / greenlink2024
- Fournisseur: testfournisseur@test.com / supplier2024
- Producteur test: +2250709090909 / koffi2024

## APIs Mockées
- Orange SMS, Orange Money

## Backlog
- P1: Soumettre AAB au Google Play Console
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoulé, Dioula)
- P2: Stockage cloud AWS S3

## Key API Endpoints
- POST /api/auth/login | register | forgot-password | verify-reset-code | reset-password
- GET /api/health
- GET/PUT /api/marketplace/supplier/delivery-settings
- GET /api/marketplace/delivery-fees | cart | products
- POST /api/marketplace/cart/checkout
- POST /api/greenlink/harvests
- GET /api/greenlink/parcels/my-parcels
- GET /api/greenlink/farmer/dashboard
- GET /api/cooperative/harvests | harvests/summary
- PUT /api/cooperative/harvests/{id}/validate | reject
- GET /api/cooperative/members

## DB Collections
- `harvests`: {parcel_id, farmer_id, farmer_name, member_id, coop_id, coop_name, quantity_kg, quality_grade, statut, ...}
- `delivery_settings`: {supplier_id, modeles_livraison, seuil_gratuit}
- `parcels`: {superficie, nom_producteur, localisation, farmer_id, member_id, coop_id}
- `coop_members`: {full_name, phone_number, user_id, coop_id, parcels_count}
