# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.74.0 (SDK 53)
- **Mobile API Proxy**: Cloudflare Worker -> `https://greenlink-agritech.com`

## Modele Economique
**Cooperatives : 100% GRATUIT** — acces complet, sans abonnement, sans limite de temps.
Producteurs : gratuit a vie.
Acheteurs/Fournisseurs/RSE : sur devis.

### Formule Prime Carbone (CONFIDENTIELLE)
```
Prix vente RSE = 30% frais + 70% (25% GreenLink + 70% agriculteurs + 5% cooperatives)
```
- RSE_total = score_carbone x taux_par_hectare x hectares
- Seuil admissibilite : score >= 6.0/10
- Taux par defaut : 5000 FCFA/ha (modifiable par Super Admin)

### Score Carbone (0-10)
**3 calculateurs** :
1. **USSD** (`ussd.py`): 9 questions, base 4.0, bonus REDD+ (biochar, zero-def, reboisement)
2. **Agent terrain** (`field_agent_dashboard.py`): Verification terrain, base 3.0, + 21 pratiques REDD+ (5 categories)
3. **Creation parcelle** (`cooperative_parcels.py`): Score initial simplifie, recalcule lors verification

**Composantes du score agent terrain** :
- Base: 3.0
- Densite arbres (pondere allometrique petits/moyens/grands): 0-2.0
- Couverture ombrage: 0-2.0
- Pratiques ecologiques (5): 0-2.5
- **REDD+ (21 pratiques, 5 categories): 0-5.2**
  - Agroforesterie (AGF1-4): +0.3 chacune, max 1.2
  - Zero-deforestation (ZD1-4): +0.3 chacune, max 1.2
  - Gestion sols (SOL1-5): +0.2 chacune, max 1.0
  - Restauration (REST1-4): +0.3 chacune, max 1.2
  - Tracabilite (TRAC1-4): +0.15 chacune, max 0.6
- Surface bonus: 0-0.5

## Ce qui est implemente

### Core
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Marketplace, FAQ, Notifications, Conformite EUDR & ARS 1000

### REDD+ / SSRTE / ICI
- Guide REDD+ (21 pratiques, 5 categories)
- Dashboard MRV REDD+ + Export PDF
- SSRTE/ICI alertes + dashboard
- KPIs gates -> 100% gratuit

### Audit Score Carbone + Formule Prime (31 Mars 2026)
- Score agent terrain enrichi avec 21 pratiques REDD+ (5 categories)
- Verification parcelle cooperative integre les visites REDD+ tracking
- Formule prime validee : 30% frais + 70% (25% GL + 70% paysans + 5% coops)
- Commentaires errones corriges dans carbon_business_model.py
- Tests automatises : score sans REDD+ 6.1 -> avec REDD+ 8.3 (+2.2 pts)

## Backlog
### P1
- SSL custom domain Cloudflare (bloque)
### P2
- Passerelle SMS reelle Orange CI / MTN (MOCK)
- Langues locales (Baoule/Dioula) mobile
### P3
- Refactoriser ussd.py (>2400 lignes)
- Optimiser get_coop_members (N+1)
- Nettoyage code mort (subscription files)

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Expo: `treckadzo` / `474Treckadzo$1986`
- Test farmer: `+2250707070707`
