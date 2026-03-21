# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Session Precedente (19 Mars 2026)
- Fix login, Integration Resend Email, 8 notifications email
- Enrichissement EUDR Dashboard + SSRTE
- Suppression QR Code, Alertes SSRTE critiques

### Build Mobile v1.36.0 - v1.37.1 (20-21 Mars 2026)
- Nouvelle icone app, builds APK + AAB

### Correction Bugs ICI/SSRTE (21 Mars 2026)
- Genre picker, taille_menage, sync croisee, compteur completion, auto-update 5/5

### Dashboard Progression Agents (21 Mars 2026)
- GET /api/cooperative/agents-progress + page web

### Refactoring farmer_id / member_id (21 Mars 2026)
- Migration DB, requetes uniformisees

### Fix Email SSRTE enfants_observes (21 Mars 2026)
- Corrige donnees + auto-sync + validation

### Fix Crash Parcelle + Visibilite (21 Mars 2026)
- ParcelCreate model elargi pour format mobile
- my-parcels: recherche via phone_number -> coop_members

### Fix Dashboard Agent SSRTE - Stats auto-update (21 Mars 2026)
- ssrte.py stats/overview: filtre recorded_by pour agents (pas cooperative_id)
- ssrte.py stats/overview: niveau_risque in [critique,eleve] au lieu de risk_level: high
- ssrte.py stats/overview: recorded_at au lieu de visit_date pour visites mensuelles
- ssrte_analytics.py visits: filtre $or recorded_by/agent_id pour agents
- Resultat: Kone Alphone voit 6 visites, 2 haut risque, 4 cas identifies (avant: 1/0/0)

### Audit Complet Dashboards - Stats Auto-update (21 Mars 2026)
- Tous les endpoints stats de tous les dashboards verifient et retournent HTTP 200
- Fix cooperative/members: requete parcelles par member_id + farmer_id (pas seulement user_id)
- Fix cooperative/parcels/all + pending-verification: recherche par liens membres (pas seulement coop_id)
- Fix cooperative/carbon-premiums: utilisation de coop_id_query() pour coherence
- Tests: 27/27 endpoints passes a 100% (backend + frontend)
- Bugs confirmes corriges: KeyError trees_count, TypeError round(None), KeyError total_producteurs

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway

## Backlog
### P1
- [ ] Soumission AAB Google Play Store (action utilisateur)
- [ ] Nouveau build APK/AAB v1.38.0 avec fix stats SSRTE mobile
### P1.5
- [ ] Configurer Orange SMS API (en attente des cles)
### P2
- [ ] Langues Baoule/Dioula
- [ ] Stockage cloud fichiers (S3)
- [ ] Refactoring cooperative.py (2700+ lignes)

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Coop Traore: traore_eric@yahoo.fr / greenlink2024
- Agent Test (Kone Alphone): +2250709005301 / greenlink2024
- Producteur Test (Kouassi): +2250701234567 / greenlink2024
- EAS: treckadzo (session active)
