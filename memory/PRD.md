# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Structure Backend cooperative
```
/app/backend/routes/
  cooperative.py              (274 lignes) - Core: models, helpers, dashboard, audit, list
  cooperative_members.py      (258 lignes) - CRUD membres, import CSV
  cooperative_parcels.py      (414 lignes) - Parcelles, verification terrain
  cooperative_lots.py         (363 lignes) - Lots, distribution primes
  cooperative_agents.py       (355 lignes) - Agents terrain, attribution fermiers, progression
  cooperative_reports.py      (468 lignes) - Rapports EUDR, stats villages, PDFs
  cooperative_carbon_premiums.py (475 lignes) - Primes carbone, paiements, CSV, PDF
```

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
- ssrte.py stats/overview: filtre recorded_by pour agents
- ssrte_analytics.py visits: filtre $or recorded_by/agent_id

### Audit Complet Dashboards (21 Mars 2026)
- 27/27 endpoints testes a 100%
- Fix parcelles membres: requete par member_id + farmer_id
- Fix carbon-premiums: coop_id_query() pour coherence
- Bugs corriges: KeyError trees_count, TypeError round(None), KeyError total_producteurs

### Refactoring cooperative.py (21 Mars 2026)
- Decoupe de 2706 lignes en 7 modules specialises
- 17/17 endpoints testes OK apres refactoring
- Aucun changement d'URL, retrocompatibilite totale

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway

## Backlog
### P1
- [ ] Soumission AAB Google Play Store (action utilisateur)
### P1.5
- [ ] Configurer Orange SMS API (en attente des cles)
### P2
- [ ] Langues Baoule/Dioula dans l'app mobile
- [ ] Stockage cloud fichiers (S3)

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Coop Traore: traore_eric@yahoo.fr / greenlink2024
- Agent Test (Kone Alphone): +2250709005301 / greenlink2024
- Producteur Test (Kouassi): +2250701234567 / greenlink2024
- EAS: treckadzo (session active)
