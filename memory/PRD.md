# GreenLink Agritech - PRD

## Problème Original
Plateforme agricole complète (React + FastAPI + Expo React Native + MongoDB) pour la Côte d'Ivoire. Gestion des primes carbone cacao, traçabilité EUDR, conformité ARS 1000, REDD+ et suivi SSRTE/ICI via USSD.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native
- **Proxy CDN**: Bunny CDN
- **Email**: Resend

## Shortcode USSD: `*144*99#`

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
- 12 questions détaillées (9 originales + 3 REDD+: biochar, zéro-déforestation, reboisement)
- Score carbone + Score REDD+ + Niveau ARS dans les résultats

### REDD+
- **Guide Pratiques REDD+** (`/guide-redd`) : 5 catégories, 21 pratiques
- **Dashboard MRV REDD+** (`/cooperative/mrv`) : KPIs, adoption, distribution, tableau planteurs
- **Score REDD+** calculé sur 10 (Excellence/Avancé/Intermédiaire/Débutant/Non conforme)
- **Export PDF MRV** professionnel avec logo, tableaux, recommandations
- **Section REDD+ page d'accueil web** : 4 cartes + CTA
- **Features Section** mise à jour : 9 cartes incluant REDD+ et MRV
- **Mobile HomeScreen** : Carte Score REDD+ + menu item Pratiques REDD+

### SSRTE/ICI
- Module SSRTE/ICI (travail des enfants) dans USSD
- Tableau de bord SSRTE alertes USSD (`/cooperative/ssrte`)

### Mobile
- Version actuelle: v1.70.0 (builds APK/AAB lancés)
- Moteur USSD offline avec 12 questions REDD+
- API simplifiée (Axios direct vers Bunny CDN)

## Phases Complétées
- Phase 1-37: Construction complète
- Phase 38: Moteur USSD offline, simplification API, module SSRTE
- Phase 39: Shortcode *144*88# → *144*99#
- Phase 40: Version v1.69.0 → v1.70.0, builds APK/AAB
- Phase 41: Tableau de bord SSRTE/ICI alertes USSD
- Phase 42: REDD+ complet (Guide, MRV, Score, Questions USSD)
- Phase 43: Export PDF MRV professionnel + Mise à jour pages d'accueil web & mobile

## Backlog Priorisé

### P1 (Important)
- Vérification connexion mobile v1.70.0

### P2 (Moyen)
- Passerelle SMS réelle Orange CI / MTN
- Langues locales (Baoulé et Dioula) dans l'app mobile

### P3 (Faible)
- Refactoriser `ussd.py` (>2200 lignes)
- Optimiser `get_coop_members` (problème N+1)

## Credentials de Test
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Test USSD: `+2250787761023`
