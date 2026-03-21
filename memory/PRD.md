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

### Sessions Precedentes
- Fix login, Integration Resend Email, 8 notifications email
- Enrichissement EUDR Dashboard + SSRTE
- Suppression QR Code, Alertes SSRTE critiques
- Build Mobile v1.36.0 - v1.37.1, Nouvelle icone
- Fix 5 bugs ICI/SSRTE (genre, taille_menage, sync, compteur, auto-update)
- Dashboard Progression Agents + page web
- Refactoring farmer_id / member_id en String
- Fix Email SSRTE enfants_observes
- Fix Crash Parcelle mobile + Visibilite my-parcels
- Fix Dashboard Agent SSRTE Stats auto-update
- Audit Complet Dashboards (27/27 endpoints)
- Refactoring cooperative.py en 7 modules

### Verification Parcelles Terrain (21 Mars 2026 - Session actuelle)
- GET /api/field-agent/parcels-to-verify: Liste des parcelles a verifier par agent
  - Filtre par fermiers assignes + zone/village de l'agent
  - Support status_filter (pending, needs_correction, verified, all)
- PUT /api/field-agent/parcels/{id}/verify: Verification terrain par agent
  - GPS verifie, notes, photos, surface corrigee
  - Statuts: verified, rejected, needs_correction
- Mobile: ParcelVerifyListScreen.js - Liste parcelles a verifier avec onglets statut
- Mobile: ParcelVerifyFormScreen.js - Formulaire verification (GPS, photos, notes, decision)
- Navigation: Bouton sur FieldAgentDashboard vers ParcelVerifyList
- Tests: 16/16 endpoints passes a 100% (iteration 51)

## Flux de Verification Parcelles
1. Agriculteur ou cooperative declare une parcelle -> status: "pending"
2. Agent terrain voit la parcelle dans sa liste (filtree par fermiers assignes/zone)
3. Agent se deplace sur le terrain, ouvre le formulaire de verification
4. Agent prend le GPS, photos, verifie surface, ajoute notes
5. Agent decide: Conforme (verified) / A corriger (needs_correction) / Non conforme (rejected)
6. La parcelle mise a jour est visible dans le dashboard cooperative

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
