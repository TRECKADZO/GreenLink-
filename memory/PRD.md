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
**Corrections:**
- Conversion unites correcte: tonnes->kg (x1000), sacs->kg (x65)
- Notifications affichent quantite originale + conversion: "2 tonne(s) (2000 kg)"
- Email Resend envoye a la cooperative lors de chaque declaration de recolte
- Template email mis a jour avec quantite originale et unite
- Champs original_quantity et quantity_display ajoutes aux reponses API
- Validation/rejet cooperative affiche aussi l'unite originale

## Builds
- v1.39.2-v1.39.9: Corrections diverses (images, connexion, parcelles, selection)
- v1.40.0: Declaration recolte corrigee (mapping champs backend)
- v1.40.1: Flux complet recoltes + validation cooperative + ecran CoopHarvests

## Credentials
- Cooperative: bielaghana@gmail.com / greenlink2024
- Fournisseur: testfournisseur@test.com / supplier2024
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
- `harvests`: {parcel_id, farmer_id, farmer_name, member_id, coop_id, coop_name, quantity_kg, original_quantity, unit, quantity_display, quality_grade, statut, ...}
- `delivery_settings`: {supplier_id, modeles_livraison, seuil_gratuit}
- `parcels`: {superficie, nom_producteur, localisation, farmer_id, member_id, coop_id}
- `coop_members`: {full_name, phone_number, user_id, coop_id, parcels_count}
