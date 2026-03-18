# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Portail Agent Terrain Mobile - Restructuration Complete (18 Mars 2026)
- v1.30: 3 onglets internes (Dashboard/Agriculteurs/Recherche), profil fermier enrichi
- v1.31: Suppression "Actions Rapides" de la barre navigation, navigation simplifiee
- v1.32: Suppression "Nouvelle Visite" et "Photo Geo" du SSRTEAgentDashboard
  - Remplacees par CTA farmer-centric "Selectionner un agriculteur"
  - Seuls "Chercher Planteur" et "Exporter Rapport" restent comme raccourcis utiles
  - Workflow coherent: toujours selectionner fermier -> acceder aux fiches

### Build Mobile v1.32.0 (18 Mars 2026)
- APK: https://expo.dev/artifacts/eas/pHAhcJjTcZeTsvnv36L8RP.apk
- AAB: https://expo.dev/artifacts/eas/trmsCU7XA2aLPpdFx445Bt.aab

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
