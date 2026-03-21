# GreenLink - Product Requirements Document

## Problème Original
Plateforme agricole full-stack pour la gestion des coopératives cacao en Côte d'Ivoire, avec suivi carbone, conformité EUDR, et protection des enfants (SSRTE).

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend Web**: React + Shadcn UI
- **Mobile**: React Native (Expo/EAS)
- **Stack**: Python 3.x, Node.js, MongoDB

## Fonctionnalités Implémentées

### Phase 1 - Core Platform (DONE)
- Authentification multi-rôles (cooperative, farmer, field_agent, admin, buyer, supplier)
- Dashboard coopérative avec statistiques agrégées
- Gestion des membres (CRUD, activation, validation)
- Gestion des parcelles (déclaration, suivi carbone)
- Système SSRTE (visites ménages, détection travail enfants)
- Ventes groupées (lots) avec primes carbone

### Phase 2 - Mobile & Field Agent (DONE)
- App mobile React Native (Expo)
- Écrans farmer: dashboard, parcelles, profil
- Écrans field agent: dashboard, vérification parcelles, visites SSRTE
- Écrans coopérative: dashboard, membres, rapports
- Auto-refresh avec useFocusEffect

### Phase 3 - Refactoring Backend (DONE)
- Refactorisé cooperative.py (2700 lignes) en 7 modules

### Phase 4 - Harmonisation Clés Françaises (DONE - 21/03/2026)
- Toutes les clés de réponse API converties en français (superficie, score_carbone, nom_producteur, etc.)
- Frontend Web et Mobile mis à jour
- Collision de routes /api/ssrte/visits corrigée

### Phase 5 - Notifications Push (DONE - 21/03/2026)
- Notification automatique aux agents terrain quand une parcelle est déclarée
- Centre de notifications (NotificationCenter) intégré dans les dashboards coopérative, agent terrain, et SSRTE
- Cloche avec badge non-lues animé (pulse)
- Dropdown avec historique, marquer comme lu, marquer tout comme lu
- API endpoints: GET /unread-count, GET /history, PUT /history/{id}/read, PUT /history/read-all
- Stockage en DB (notification_history) pour persistance
- Type mobile ajouté: NEW_PARCEL_TO_VERIFY avec channel 'alerts'

## Credentials de Test
- Cooperative: identifier=bielaghana@gmail.com, password=greenlink2024

## APIs Mockées
- Orange SMS (mode MOCK)
- Orange Money (mode MOCK)
- Expo Push (pas de device physique, mais notifications stockées en DB)

## Backlog
- P1: Générer build EAS (v1.38.3+) après stabilisation complète
- P1: Soumettre AAB au Google Play Console
- P2: Configurer passerelle SMS réelle (Orange API)
- P2: Implémenter langues locales (Baoulé, Dioula)
- P2: Stockage cloud (AWS S3) pour fichiers/images
- P3: Notifications pour d'autres événements (vérification terminée, paiement reçu, visite SSRTE critique)
