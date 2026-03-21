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
- Refactorisé cooperative.py (2700 lignes) en 7 modules:
  - cooperative.py (core + dashboard)
  - cooperative_members.py
  - cooperative_parcels.py
  - cooperative_lots.py
  - cooperative_agents.py
  - cooperative_reports.py
  - cooperative_carbon_premiums.py

### Phase 4 - Harmonisation Clés Françaises (DONE - 21/03/2026)
- Toutes les clés de réponse API converties en français:
  - area_hectares → superficie
  - carbon_score → score_carbone
  - farmer_name → nom_producteur
  - crop_type → type_culture
  - risk_level → niveau_risque
  - children_count → enfants_observes
  - visit_date → date_visite
  - total_hectares → superficie_totale
  - average_carbon_score → score_carbone_moyen
  - total_co2 → co2_total
- Frontend Web mis à jour pour lire les nouvelles clés
- Mobile mis à jour pour lire les nouvelles clés
- Collision de routes /api/ssrte/visits corrigée (analytics → /api/ssrte/analytics/visits)

## Credentials de Test
- Cooperative: identifier=bielaghana@gmail.com, password=greenlink2024

## APIs Mockées
- Orange SMS (mode MOCK)
- Orange Money (mode MOCK)

## Backlog
- P1: Générer build EAS (v1.38.3+) après stabilisation complète
- P1: Soumettre AAB au Google Play Console
- P2: Configurer passerelle SMS réelle (Orange API)
- P2: Implémenter langues locales (Baoulé, Dioula)
- P2: Stockage cloud (AWS S3) pour fichiers/images
