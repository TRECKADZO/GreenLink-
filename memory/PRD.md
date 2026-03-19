# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Build Mobile v1.33.0 (19 Mars 2026)
- APK: https://expo.dev/artifacts/eas/49BprsiA4wLbLNAaLt53X1.apk
- AAB: https://expo.dev/artifacts/eas/fdeQ3vTafF5mU721kU6yVD.aab
- Fix: double /api dans config.js (causait 404 activation agent/membre)
- Fix: suppression Actions Rapides redondantes du SSRTEAgentDashboard
- Fix: option "Agent Terrain" retiree de l'inscription web

## Corrections v1.33.0
- Bug double /api corrige: config.js API_URL ne contient plus le suffixe /api
- Activation agent terrain et membre cooperative fonctionne correctement
- Page inscription web: Agent Terrain supprime (crees uniquement par cooperatives/admin)

## Backlog
### P1
- [ ] Soumission AAB Google Play Store
- [ ] Configurer SMTP pour emails reels
### P2
- [ ] Langues Baoule/Dioula
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: bielaghana@gmail.com / greenlink2024
- Agent: +2250709005301 / greenlink2024
