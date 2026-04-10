# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. **PDC v2 - Stepper 3 Etapes / 8 Fiches** + Generation PDF officiel (10 avril 2026)
2. PDC v1 (7 Fiches) via /api/ars1000/pdc
3. Lots Traceabilite, Certification Bronze/Argent/Or, Agroforesterie
4. Visite Terrain Agent, Declarations Recolte, Registre Reclamations
5. Diagnostic Conformite, Protection Environnementale

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn UI
- PDF: ReportLab | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)

## Revue de code appliquee (10 avril 2026)
### Corrections CRITIQUES
- 114 fichiers de test casses supprimes (syntaxe, secrets hardcodes) -> __init__.py propre avec os.getenv()
- Vulnerabilite XSS corrigee dans UsersManagement.jsx (document.write securise)
- random -> secrets dans 4 fichiers routes (auth.py, sms.py, greenlink.py, cooperative_referral.py)
- Hook dependencies corrigees avec useCallback dans 7 fichiers (5 supplier + SSRTERealTime + UsersManagement)

### Corrections IMPORTANTES
- 175 console.log/error/warn supprimes (reste 1 pour PWA service worker)
- Array index as key corrige dans 3 fichiers (FarmerProtectionEnvPage, FarmerPDCPage, AgentVisitePDC)
- useEffect 7 deps splitte dans UsersManagement.jsx

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend en spam (DNS SPF/DKIM/DMARC)
- P3: Refactoring ussd.py (2700+ lignes)
- P3: Refactoring composants > 300 lignes (AgentMapLeaflet 1109, Profile 806, etc.)
- P3: Refactoring fonctions complexes admin.py (get_realtime_dashboard 149 lignes)
