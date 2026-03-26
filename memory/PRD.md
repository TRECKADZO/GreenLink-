# GreenLink Agritech - PRD

## Problème Original
Plateforme agricole complète (React + FastAPI + Expo React Native + MongoDB) pour la Côte d'Ivoire. Gestion des primes carbone cacao, traçabilité EUDR, conformité ARS 1000, REDD+ et suivi SSRTE/ICI via USSD.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native
- **Proxy CDN**: Bunny CDN
- **Email**: Resend

## Shortcode USSD
- **Actuel**: `*144*99#`

## Ce qui est implémenté

### Core
- Authentification (JWT + rôles: admin, cooperative, farmer, auditor)
- Dashboard coopérative avec gestion des membres
- Marketplace produits agricoles, Page FAQ
- Dashboard agent terrain, inscription planteur
- Dashboard paiements carbone, SuperAdmin dashboard
- Conformité EUDR & ARS 1000

### USSD & Carbon
- Calculateur carbone USSD (backend + frontend + mobile offline)
- Simulateur USSD complet avec moteur offline (`ussdOfflineEngine.js`)
- **12 questions détaillées** (9 originales + 3 REDD+: biochar, zéro-déforestation, reboisement)
- Score carbone + Score REDD+ + Niveau ARS dans les résultats

### REDD+ (Nouveau - Phase 42)
- **Guide Pratiques REDD+** (`/guide-redd`) : 5 catégories, 21 pratiques, bonus score et primes estimées
- **Dashboard MRV REDD+** (`/cooperative/mrv`) : KPIs, barres adoption pratiques, distribution niveaux, tableau planteurs
- **Score REDD+** calculé sur 10 (Excellence/Avancé/Intermédiaire/Débutant/Non conforme)
- **API REDD+** : `/api/redd/practices`, `/api/redd/mrv/summary`, `/api/redd/mrv/farmers`

### SSRTE/ICI
- Module SSRTE/ICI (travail des enfants) dans USSD
- Tableau de bord SSRTE alertes USSD dans portail coopérative (`/cooperative/ssrte`)

### Mobile
- Permissions Android corrigées
- API mobile simplifiée (Axios direct vers Bunny CDN)
- Version actuelle: v1.69.0

## Phases Complétées (Résumé)
- Phase 1-37: Construction complète de la plateforme
- Phase 38: Moteur USSD offline mobile, simplification API, module SSRTE
- Phase 39 (26/03/2026): Changement shortcode *144*88# → *144*99#
- Phase 40 (26/03/2026): Version v1.69.0, builds APK/AAB lancés
- Phase 41 (26/03/2026): Tableau de bord SSRTE/ICI alertes USSD
- Phase 42 (26/03/2026): Intégration complète REDD+ (Guide, MRV, Score, Questions USSD)

## Backlog Priorisé

### P1 (Important)
- Vérification connexion mobile v1.69.0 (en attente confirmation utilisateur)
- Nouveau build v1.70.0 avec questions REDD+ dans moteur offline

### P2 (Moyen)
- Configurer passerelle SMS réelle Orange CI / MTN (remplacer mock)
- Implémenter langues locales (Baoulé et Dioula) dans l'app mobile

### P3 (Faible)
- Refactoriser `ussd.py` (>2200 lignes)
- Optimiser `get_coop_members` (problème N+1 query)

## Intégrations Tierces
- Resend (Emails), Expo EAS Builds, Bunny CDN, Cloudflare Workers
- Orange SMS/Money — **MOCKED**

## Credentials de Test
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Test USSD: `+2250787761023`
