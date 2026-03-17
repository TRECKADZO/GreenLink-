# GreenLink - Product Requirements Document

## Problème Original
Plateforme agritech multi-persona pour la Côte d'Ivoire. Gestion des coopératives, producteurs, acheteurs, agents terrain et entreprises RSE.

## Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: React Native (Expo/EAS)
- **PWA**: Service Worker + IndexedDB (mode offline)

## Modèle de Revenus Carbone
```
Prix de vente (fixé par Super Admin) aux entreprises RSE
  → 30% frais de service
  → 70% net distribué :
    → 70% Agriculteurs (prime producteur)
    → 25% GreenLink (revenu plateforme)
    → 5% Coopérative (commission)
```

## Fonctionnalités Implémentées (Mars 2026)

### "Ma Prime Carbone" — Dashboard Planteur
- **Expérience simplifiée** : le planteur ne voit QUE sa prime résultante
- **Comment ça marche** en 5 étapes : *144*88# → 8 questions → prime → vente → Orange Money
- **Calculateur** : 8 questions (hectares, arbres >8m, culture, engrais, brûlage, résidus, couverture, espèces)
- **Résultat** : prime en FCFA/kg (ex: 106 FCFA/kg pour 48 arbres/ha), prime annuelle, conseil personnalisé
- Aucune clé de répartition visible au planteur

### Marché Carbone — Workflow Admin
- Coopérative soumet quantité uniquement
- Super Admin fixe le prix et approuve
- Distribution automatique : 30% frais → 70% farmer / 25% GreenLink / 5% coop

### Activation Comptes
- Membres/agents créés par coop → activation par téléphone → login web + mobile

### Accès Rapide + Suppression QR Code
- Boutons Bourse Récoltes + Marché Carbone sur dashboards
- QR Code supprimé, remplacé par recherche téléphone

## Endpoints API Clés
- `POST /api/carbon-payments/ma-prime` — Calculateur prime planteur (public, 8 questions)
- `POST /api/carbon-listings/submit` — Soumettre crédits (quantité uniquement)
- `PUT /api/carbon-listings/{id}/review` — Approuver avec prix (admin)
- `GET/PUT /api/carbon-listings/carbon-price` — Prix par défaut

## Comptes Test
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coopérative: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

## Issues Connues
- P0: Google Play - hashtags (action utilisateur)
- P1: Page blanche inscription web (vérification utilisateur)
- P2: Page blanche formulaire parcelle

## Backlog
- Données démo Marketplace Intrants
- Builds APK/AAB v1.21.2
- Intégration Orange Money
- Langues Baoulé/Dioula mobile
- Notifications multi-canal
- USSD réelle, refactoring backend, stockage S3
