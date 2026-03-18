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

### Abonnement par DEVIS avec 15 jours gratuit (18 Mars 2026)
- Backend: 6 endpoints devis + admin dans routes/quotes.py
- Statuts: PENDING_QUOTE, SUSPENDED, ACTIVE, TRIAL, EXPIRED
- Frontend Admin: Page /admin/quotes (KPIs + gestion devis + gestion comptes)
- Frontend Fournisseur: Banner abonnement (trial, devis, suspendu)

### Notifications Email Automatiques (18 Mars 2026)
- Service email: services/email_service.py (MOCK si SMTP non configure)
- Templates: devis approuve, refuse, compte suspendu, reactive

### Page Accueil + FAQ - Tarifs Actualises (18 Mars 2026)
- Producteurs: GRATUIT - Profil, Vente recoltes, Credits carbone, Messagerie, Alertes prix, Boutique intrants, App mobile
- Cooperatives: GRATUIT - Gestion membres, Attribution agents terrain, Fiches ICI/SSRTE, Suivi completion, Distribution primes, Rapports EUDR, App mobile agents
- Acheteurs: Sur devis (15j gratuits) - Bourse Recoltes, Propositions achat, Messagerie vendeurs, Alertes, Tableau de bord commandes
- Fournisseurs: Sur devis (15j gratuits) - Boutique en ligne, Catalogue, Commandes, Statistiques, Notifications
- Entreprises RSE: Sur devis (15j gratuits) - Credits carbone certifies, Certificats conformite, Rapports ESG, Tracabilite, Tableau de bord impact
- Section 3 etapes: Inscription gratuite -> Formulaire devis -> Approbation sous 48h
- FAQ mise a jour avec les nouveaux tarifs
- Enleve: "29 000 XOF" fournisseurs, "Verification IA des credits" RSE

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: Code complet, rebuild necessaire

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
- [ ] Notifications multi-canal
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Agent Kone: +2250709005301 / greenlink2024
