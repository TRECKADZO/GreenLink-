# GreenLink - Product Requirements Document

## Problème Original
Plateforme agritech multi-persona pour la Côte d'Ivoire.

## Architecture
- Frontend: React (CRA) + TailwindCSS + Shadcn/UI
- Backend: FastAPI + MongoDB Atlas
- Mobile: React Native (Expo/EAS)
- PWA: Service Worker + IndexedDB

## Modèle de Revenus Carbone
Prix vente (fixé par Admin) → 30% frais → 70% net : 70% agriculteurs / 25% GreenLink / 5% coop

## Fonctionnalités Implémentées (Mars 2026)

### "Ma Prime Carbone" — Planteur
- 5 étapes : *144*88# → 8 questions → prime → vente → Orange Money
- Calculateur : 8 questions simples → prime en FCFA/kg + conseil
- Aucune clé de répartition visible

### Marché Carbone — Admin
- Coop soumet quantité, Admin fixe prix et approuve
- Distribution automatique selon modèle

### Google Play — Permissions Corrigées (Mars 2026)
- expo-media-library supprimé de package.json (non utilisé)
- launchImageLibraryAsync() remplacé par launchCameraAsync() partout
- expo-image-picker: allowMediaLibraryAccess=false
- blockedPermissions: READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_AUDIO, READ/WRITE_EXTERNAL_STORAGE, RECORD_AUDIO, ACCESS_MEDIA_LOCATION

### Activation Comptes + Suppression QR Code
- Membres/agents : activation par téléphone, login web+mobile
- QR Code supprimé, remplacé par recherche téléphone

## Comptes Test
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

## Issues Connues
- P1: Page blanche inscription web (vérification utilisateur)
- P2: Page blanche formulaire parcelle

## Backlog
- Données démo Marketplace Intrants
- Builds APK/AAB (nouveau build requis après fix permissions)
- Intégration Orange Money
- Langues Baoulé/Dioula mobile
- Notifications multi-canal, USSD réel, refactoring backend, stockage S3
