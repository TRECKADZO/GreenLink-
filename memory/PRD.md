# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Attribution Fermier-Agent (17 Mars 2026)
- 5 endpoints API, modale attribution web, offline mobile

### Fiche ICI (18 Mars 2026)
- ChildDetail (prenom, sexe, age, scolarise, travaille)
- Web: ICIProfileModal, Mobile: FarmerICIFormScreen

### Approche "Selection Fermier -> Toutes les Fiches" (18 Mars 2026)
- Web + Mobile: workflow farmer-centric pour agents terrain

### Interface Agent Terrain Mobile (18 Mars 2026)
- BottomTabBar, Quick Actions, Dashboard, FarmerProfileScreen

### Fix Normalisation Telephone Membre (18 Mars 2026)
- check-member-phone + activate-member-account: normalize_phone()

### Suivi Completion Formulaires (18 Mars 2026)
- Backend: API /api/field-agent/my-farmers enrichi avec forms_status/completion
- 5 formulaires suivis: ICI, SSRTE, Parcelles, Photos, Enregistrement
- Web + Mobile: barres de progression + badges "Complete"

### Abonnement par DEVIS avec 15 jours gratuit (18 Mars 2026)
- **Backend** (routes/quotes.py):
  - POST /api/subscriptions/quote/submit - soumettre un devis
  - GET /api/subscriptions/quote/my-quote - voir statut de son devis
  - GET /api/admin/quotes - lister tous les devis (admin)
  - PUT /api/admin/quotes/{id} - approuver/rejeter un devis (admin)
  - PUT /api/admin/accounts/{id}/action - activer/suspendre/supprimer (admin)
  - GET /api/admin/devis-accounts - lister comptes sur devis (admin)
- **Subscription Model**: 
  - Nouveaux statuts: PENDING_QUOTE, SUSPENDED
  - Trial 15 jours pour fournisseurs/acheteurs/entreprises RSE
  - Apres trial: formulaire devis -> approbation admin -> compte actif
- **Frontend Admin** (pages/admin/QuotesManagement.jsx):
  - Page /admin/quotes avec KPIs (en attente, approuves, refuses)
  - Onglet "Devis" avec liste et detail + actions approuver/rejeter
  - Onglet "Comptes sur devis" avec boutons Activer/Suspendre/Supprimer
- **Frontend Fournisseur** (components/SubscriptionBanner.jsx):
  - Banner trial avec jours restants
  - Banner devis en attente
  - Formulaire de devis apres expiration du trial
  - Banner pour compte suspendu
- **Tests**: 15/15 backend, 100% frontend (iteration 36)

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: Code complete, rebuild necessaire

## Backlog
### P0
- [ ] Rebuild APK/AAB v1.29.0
### P1
- [ ] Soumission AAB Google Play
### P2
- [ ] Langues Baoule/Dioula
- [ ] Notifications multi-canal
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Agent Kone: +2250709005301 / greenlink2024
- Fournisseur Test: testfournisseur@test.com / test1234
