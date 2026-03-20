# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Session Precedente (19 Mars 2026)
- Fix login comptes telephone (pre-validateur EmailStr)
- Integration Resend Email (domaine greenlink-agritech.com verifie)
- 8 notifications email automatiques (fire-and-forget)
- Enrichissement EUDR Dashboard (cooperative + super-admin)
- Enrichissement formulaire SSRTE (backend + web modal + web dashboard + mobile)
- Suppression SSRTE standalone cooperative/agent + Analytics SSRTE super-admin
- Alertes automatiques SSRTE critiques par email
- Suppression complete QR Code du projet

### Build Mobile v1.36.0 (20 Mars 2026)
- Nouvelle icone app GreenLink (logo vert sur fond #2d5a4d)
- Icones generees: icon.png, adaptive-icon.png, monochrome, splash, favicon
- Section "Une plateforme tout-en-un" masquee (conformite Google Play metadonnees)
- versionCode 36, version 1.36.0
- APK: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/32c8fa26-99cb-4abb-9ae2-11bcd5ef3023
- AAB: https://expo.dev/artifacts/eas/bGqpS9YzkKxNfHoq3unWNq.aab
- Meme keystore: Build Credentials 3Ses4evueO

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway

## Backlog
### P1
- [ ] Soumission AAB Google Play Store
### P1.5
- [ ] Configurer Orange SMS API (en attente des cles)
### P2
- [ ] Langues Baoule/Dioula
- [ ] Stockage cloud fichiers (S3)
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: traore_eric@yahoo.fr / greenlink2024
- Agent Test: +2250700000001 / greenlink2024
- EAS: treckadzo (session active)
