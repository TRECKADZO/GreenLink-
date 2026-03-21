# GreenLink - Product Requirements Document

## Problème Original
Plateforme agricole full-stack pour la gestion des coopératives cacao en Côte d'Ivoire, avec suivi carbone, conformité EUDR, et protection des enfants (SSRTE).

## Architecture
- **Backend**: FastAPI + MongoDB (Atlas)
- **Frontend Web**: React + Shadcn UI
- **Mobile**: React Native (Expo/EAS)

## Fonctionnalités Implémentées

### Phase 1-4 (DONE)
- Core Platform, Mobile, Backend Refactoring, Harmonisation Clés Françaises

### Phase 5 - Notifications Push (DONE)
- 4 types: new_parcel_to_verify, parcel_verified, ssrte_critical_alert, payment_received

### Phase 6 - Système de Livraison Marketplace (DONE - 21/03/2026)
- 3 modèles cumulables par fournisseur: frais_fixe, par_distance (zones), par_poids
- Seuil de gratuité optionnel
- Page web /supplier/delivery-settings + mobile CartScreen/CheckoutScreen mis à jour
- Backend: GET/PUT delivery-settings, delivery-fees, cart avec frais, checkout avec zone

### Phase 7 - Correction Erreurs de Connexion (DONE - 21/03/2026)
**Problème**: "Erreur de connexion" générique sur mobile au lieu de messages d'erreur spécifiques
**Corrections:**
- Rate limiter backend retourne maintenant du JSON (au lieu de texte brut qui cassait le parsing mobile)
- Intercepteur API mobile gère les réponses non-JSON (pages HTML du proxy K8s)
- Login mobile: messages spécifiques pour 401, 403, 422, 429, 5xx, timeout, erreur réseau
- Register mobile: même traitement robuste
- Endpoint /api/health ajouté pour vérification de connectivité
- Build v1.39.4

## Credentials
- Cooperative: bielaghana@gmail.com / greenlink2024
- Fournisseur: testfournisseur@test.com / supplier2024

## APIs Mockées
- Orange SMS, Orange Money

## Backlog
- P1: Soumettre AAB au Google Play Console
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoulé, Dioula)
- P2: Stockage cloud AWS S3

## Key API Endpoints
- POST /api/auth/login
- POST /api/auth/register
- GET /api/health
- GET/PUT /api/marketplace/supplier/delivery-settings
- GET /api/marketplace/delivery-fees?zone=...
- GET /api/marketplace/cart?zone=...
- POST /api/marketplace/cart/checkout (JSON body)

## Builds
- v1.39.2: Notifications + fixes mobile
- v1.39.3: Système de livraison marketplace
- v1.39.4: Correction erreurs de connexion (rate limiter JSON, messages spécifiques)
