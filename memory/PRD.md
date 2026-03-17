# GreenLink - Product Requirements Document

## Problème Original
Plateforme agritech multi-persona pour la Côte d'Ivoire. Gestion des coopératives agricoles, producteurs, acheteurs, agents terrain et entreprises RSE. Traçabilité EUDR/SSRTE, commerce de récoltes et crédits carbone.

## Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: React Native (Expo/EAS)
- **PWA**: Service Worker + IndexedDB (mode offline)

## Personas
1. **Super Admin** — Gestion globale, fixation prix carbone, approbation crédits
2. **Coopérative** — Gestion membres, parcelles, récoltes, lots, soumission crédits carbone (quantité)
3. **Producteur** — Déclaration parcelles/récoltes, accès marchés, réception primes carbone
4. **Acheteur** — Achat récoltes, traçabilité
5. **Agent Terrain** — Recherche producteurs par téléphone, vérification terrain
6. **Entreprise RSE** — Achat crédits carbone

## Modèle de Revenus Carbone
```
Prix de vente (fixé par Super Admin) aux entreprises RSE
  → 30% frais de service
  → 70% net distribué :
    → 70% Agriculteurs (prime producteur)
    → 25% GreenLink (revenu plateforme)
    → 5% Coopérative (commission)
```
Exemple : 1000t à 20 000 XOF/t = 20 000 000 XOF
- Frais : 6 000 000 XOF
- Agriculteurs : 9 800 000 XOF
- GreenLink : 3 500 000 XOF
- Coopérative : 700 000 XOF

## Fonctionnalités Implémentées

### Activation & Connexion Membres/Agents (Mars 2026)
- Flux complet : Création par coop → Vérification téléphone → Activation → Login (web + mobile)

### Marché Carbone avec Modèle de Prix Admin (Mars 2026)
- Coopérative soumet quantité CO2 uniquement
- Super Admin fixe le prix de vente par tonne lors de l'approbation
- Prime calculée selon le modèle ci-dessus
- Dashboard producteur affiche prix RSE + répartition complète
- Endpoint simulation : /api/carbon-listings/simulate-premium
- Gestion prix par défaut : /api/carbon-listings/carbon-price

### Accès Rapide Marchés + Suppression QR Code (Mars 2026)
- Boutons Bourse des Récoltes + Marché Carbone sur tous les dashboards
- QR Code entièrement supprimé et remplacé par recherche téléphone

### Système Recherche Agent + PWA Offline + Bourse Récoltes (Sessions précédentes)
- Voir sessions précédentes

## Comptes Test
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coopérative: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

## Issues Connues
- P0: Google Play - hashtags à supprimer (action utilisateur)
- P1: Page blanche inscription web (vérification utilisateur)
- P2: Page blanche après soumission formulaire parcelle

## Backlog (P1-P2)
- Données démo Marketplace Intrants
- Builds APK/AAB v1.21.2
- Intégration Orange Money
- Langues Baoulé/Dioula mobile
- Notifications multi-canal
- Intégration USSD réelle
- Refactoring cooperative.py / auth.py
- Stockage cloud S3
