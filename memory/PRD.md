# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Recuperation mot de passe telephone (19 Mars 2026)
- Backend: /api/auth/forgot-password retourne TOUJOURS simulation_code (SMS mocks)
- Web + Mobile: affichage code en mode simulation

### Attribution Admin Globale Agriculteurs-Agents (19 Mars 2026)
- Backend: GET/POST /api/admin/agents, /api/admin/all-farmers, /api/admin/assign-farmers-to-agent
- Frontend: /admin/farmer-assignment

### Fix Login Comptes Telephone - EmailStr Vide (19 Mars 2026)
- Pre-validateur clean_empty_email dans UserBase convertit "" en None

### Notifications Email Automatiques (19 Mars 2026)
- 8 hooks de notification fire-and-forget via Resend
- Domaine greenlink-agritech.com verifie

### Integration Resend Email (19 Mars 2026)
- email_service.py: send_email() + send_email_async()
- SENDER_EMAIL: noreply@greenlink-agritech.com

### Enrichissement EUDR Dashboard (19 Mars 2026)
- Cooperative: ReportsPage.jsx - Diligence Raisonnee, Tracabilite, Matrice Risques
- Super-admin: SuperAdminDashboard.jsx - Score EUDR Global, Marche Carbone
- Backend: admin_analytics.py et cooperative.py enrichis
- Exports PDF/CSV fonctionnels

### Enrichissement Formulaire SSRTE - Web + Mobile (19 Mars 2026)
- Backend: SSRTEVisitReport enrichi (taille_menage, liste_enfants, conditions_vie, eau, electricite, distance_ecole)
- Web Modal + Dashboard + Mobile: formulaires enrichis
- Tests: 13/13 backend OK, Frontend 100%

### Suppression SSRTE Standalone + Analytics Super Admin (19 Mars 2026)
- Supprime bouton "Suivi SSRTE" du dashboard cooperative
- Supprime route /cooperative/ssrte de App.js
- Logique: SSRTE accessible uniquement via profil agriculteur
- Nouveau endpoint GET /api/ssrte/dashboard avec living_conditions enrichies (admin-only)
- Nouveau endpoint GET /api/ssrte/leaderboard (admin-only)
- SSRTEAnalytics.jsx enrichi: KPIs, conditions de vie, acces services, enfants, risques, tendances
- Conflit de routes corrige (ssrte_analytics.py vs ssrte.py)
- Tests: Backend OK, Frontend avec donnees reelles

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway

## Backlog
### P0
- [ ] Build mobile v1.36.0 APK/AAB avec toutes les corrections recentes
### P1
- [ ] Soumission AAB Google Play Store
### P1.5
- [ ] Configurer Orange SMS API (en attente des cles)
### P2
- [ ] Langues Baoule/Dioula
- [ ] Stockage cloud fichiers (S3)
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: traore_eric@yahoo.fr / greenlink2024
- Agent: +2250709005301 / greenlink2024
