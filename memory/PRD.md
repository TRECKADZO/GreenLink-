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
- Backend: 6 endpoints devis + admin dans routes/quotes.py
- Statuts: PENDING_QUOTE, SUSPENDED, ACTIVE, TRIAL, EXPIRED
- Frontend Admin: Page /admin/quotes (KPIs + gestion devis + gestion comptes)
- Frontend Fournisseur: Banner abonnement (trial, devis, suspendu)

### Notifications Email Automatiques (18 Mars 2026)
- Service email dans services/email_service.py
- Templates HTML: devis approuve, devis refuse, compte suspendu, compte reactive
- Mode MOCK actif (configurer SMTP_HOST, SMTP_USER, SMTP_PASSWORD pour activer)
- Declenche sur: approbation/rejet devis, suspension/activation compte

### Page Accueil - Tarifs Mis a Jour (18 Mars 2026)
- Producteurs: GRATUIT (Gratuit a vie)
- Cooperatives: GRATUIT (Attribution agents, Fiches ICI/SSRTE, Suivi completion)
- Acheteurs: Sur devis (15 jours gratuits)
- Fournisseurs: Sur devis (15 jours gratuits)
- Entreprises RSE: Sur devis (15 jours gratuits)
- Section "Comment fonctionne l'abonnement sur devis ?" en 3 etapes

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: Code complete, rebuild necessaire

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway
- Email Service (SMTP non configure)

## Backlog
### P0
- [ ] Rebuild APK/AAB v1.29.0
### P1
- [ ] Soumission AAB Google Play
- [ ] Configurer SMTP pour emails reels
### P2
- [ ] Langues Baoule/Dioula
- [ ] Notifications multi-canal (Push, SMS, Email)
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Agent Kone: +2250709005301 / greenlink2024
