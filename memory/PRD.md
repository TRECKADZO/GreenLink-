# GreenLink Agritech - PRD

## Problème Original
Plateforme agricole complète (React + FastAPI + Expo React Native + MongoDB) pour la Côte d'Ivoire. Gestion des primes carbone cacao, traçabilité EUDR, conformité ARS 1000, et suivi SSRTE/ICI via USSD.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native
- **Proxy CDN**: Bunny CDN
- **Email**: Resend

## Shortcode USSD
- **Actuel**: `*144*99#` (modifié le 26/03/2026, anciennement `*144*88#`)

## Ce qui est implémenté
- Authentification (JWT + rôles: admin, cooperative, farmer, auditor)
- Dashboard coopérative avec gestion des membres
- Calculateur carbone USSD (backend + frontend + mobile offline)
- Simulateur USSD complet avec moteur offline (`ussdOfflineEngine.js`)
- Module SSRTE/ICI (travail des enfants) dans USSD
- Marketplace produits agricoles
- Page FAQ
- Dashboard agent terrain
- Inscription planteur
- Dashboard paiements carbone
- Conformité EUDR & ARS 1000
- SuperAdmin dashboard
- Permissions Android corrigées (suppression `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`)
- API mobile simplifiée (Axios direct vers Bunny CDN, v1.68.0)

## Phases Complétées (Résumé)
- Phase 1-37: Construction complète de la plateforme
- Phase 38: Moteur USSD offline mobile, simplification API, module SSRTE
- Phase 39 (26/03/2026): Changement shortcode *144*88# → *144*99# (115 occurrences, tests 100% réussis)
- Phase 40 (26/03/2026): Mise à jour version v1.68.0 → v1.69.0, préparation builds APK/AAB

## Backlog Priorisé

### P0 (Critique)
- ~~Changement shortcode *144*88# → *144*99#~~ ✅ FAIT

### P1 (Important)
- Vérification connexion mobile v1.68.0 (en attente confirmation utilisateur)
- Tableau de bord SSRTE alertes ICI dans portail coopérative web

### P2 (Moyen)
- Configurer passerelle SMS réelle Orange CI / MTN (remplacer mock)
- Implémenter langues locales (Baoulé et Dioula) dans l'app mobile

### P3 (Faible)
- Refactoriser `ussd.py` (>2100 lignes, mélange logique/routage/UI)
- Optimiser `get_coop_members` (problème N+1 query)

## Intégrations Tierces
- Resend (Emails) — Variables d'environnement
- Expo EAS Builds — Auth utilisateur
- Bunny CDN — Proxy serveur
- Cloudflare Workers — Edge proxy (configuré mais pas actif)
- Orange SMS/Money — **MOCKED** (pas de passerelle réelle)

## Credentials de Test
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Test USSD: `+2250787761023`
