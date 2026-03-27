# GreenLink Agritech - PRD

## Problème Original
Plateforme agricole complète (React + FastAPI + Expo React Native + MongoDB) pour la Côte d'Ivoire.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.71.0
- **Proxy CDN**: Bunny CDN (frontend uniquement, NE proxy PAS les routes /api)

## Shortcode USSD: `*144*99#`

## Fix Critique v1.71.0
- **Cause du bug "données introuvables"** : Le Bunny CDN (`greenlink-cdn.b-cdn.net`) retourne 404 pour toutes les routes `/api/`. L'intercepteur mobile ne faisait le fallback que pour les erreurs >= 500, donc les 404 du CDN bloquaient toutes les requêtes données après login.
- **Fix** : URL directe (`DIRECT_API_URL`) maintenant en priorité, CDN en fallback. L'intercepteur gère aussi les 404 pour le fallback.

## Ce qui est implémenté
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Calculateur carbone USSD (12 questions dont 3 REDD+)
- Guide REDD+ (21 pratiques, 5 catégories)
- Dashboard MRV REDD+ + Export PDF professionnel
- SSRTE/ICI alertes USSD
- Section REDD+ page d'accueil web + mobile
- Conformité EUDR & ARS 1000
- Marketplace, FAQ, Notifications

## Backlog
### P1
- Vérifier que v1.71.0 résout le problème de données sur mobile
### P2
- Configurer Bunny CDN pour proxyer les routes /api (ou utiliser uniquement l'URL directe)
- Passerelle SMS Orange CI / MTN
- Langues locales (Baoulé/Dioula)
### P3
- Refactoriser ussd.py (>2200 lignes)
- Optimiser get_coop_members (N+1)

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Test farmer: `+2250707070707` (KINDA YABRE, 6 parcelles, 18 ha)
