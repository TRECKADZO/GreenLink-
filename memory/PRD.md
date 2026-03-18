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

### Approche Farmer-Centric (18 Mars 2026)
- Web + Mobile: workflow selection fermier -> toutes les fiches

### Suivi Completion Formulaires (18 Mars 2026)
- 5 formulaires suivis: ICI, SSRTE, Parcelles, Photos, Enregistrement
- Web + Mobile: barres de progression + badges "Complete"

### Abonnement par DEVIS (18 Mars 2026)
- 15 jours gratuits pour fournisseurs/acheteurs/entreprises RSE
- Workflow: inscription -> trial 15j -> formulaire devis -> approbation admin
- Admin: approuver/rejeter devis + activer/suspendre/supprimer comptes
- **Tarification personnalisee par utilisateur:**
  - Admin fixe le montant d'abonnement (XOF) individuellement
  - Cycle: mensuel/trimestriel/annuel
  - Fournisseurs intrants: commission 3-5% sur chaque vente + abonnement
  - Montant affiche dans le dashboard de l'utilisateur
- Backend: routes/quotes.py (6 endpoints) + subscription_models.py (PENDING_QUOTE, SUSPENDED)
- Frontend Admin: /admin/quotes (KPIs, detail devis avec commission/cycle/montant, gestion comptes)
- Frontend User: SubscriptionBanner.jsx (trial, devis, tarification active avec montant/commission/cycle)

### Notifications Email (18 Mars 2026)
- services/email_service.py (MOCK si SMTP non configure)
- Templates: devis approuve, refuse, compte suspendu, reactive

### Tarifs Page Accueil + FAQ (18 Mars 2026)
- Producteurs: GRATUIT - Profil, Vente recoltes, Credits carbone, Messagerie, Alertes, Boutique, App mobile
- Cooperatives: GRATUIT - Gestion membres, Attribution agents, Fiches ICI/SSRTE, Suivi completion, Primes carbone, Rapports EUDR, App mobile agents
- Acheteurs: Sur devis (15j gratuits) - Bourse Recoltes, Propositions achat, Messagerie, Alertes, Commandes
- Fournisseurs: Sur devis (15j gratuits) - Commission 3-5% + abonnement, Boutique, Catalogue, Commandes, Stats
- Entreprises RSE: Sur devis (15j gratuits) - Credits carbone certifies, Certificats, Rapports ESG, Tracabilite
- Section 3 etapes expliquant le workflow devis

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway, Email (SMTP non configure)

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
- Fournisseur Test: intrants-ci@test.com / test1234 (35000 XOF/mois, 5% commission)
