# GreenLink Farmer - Application Mobile

Application mobile React Native pour les agriculteurs de GreenLink en Côte d'Ivoire.

## 🌱 Fonctionnalités

- **Authentification** : Connexion par téléphone/email
- **Gestion des parcelles** : Déclaration avec photos et géolocalisation GPS
- **Suivi des récoltes** : Enregistrement de la production
- **Score carbone** : Calcul automatique et primes associées
- **Paiements** : Suivi des primes Orange Money
- **Notifications push** : Alertes pour nouvelles primes, statuts, etc.
- **Mode hors-ligne** : Fonctionne sans connexion internet
- **Synchronisation automatique** : Sync en arrière-plan quand connecté

## 📱 Installation pour développement

```bash
# Installer les dépendances
cd /app/mobile/greenlink-farmer
yarn install

# Lancer en mode développement
npx expo start

# Pour Android
npx expo start --android

# Pour iOS (Mac requis)
npx expo start --ios
```

## 🔨 Build de production avec EAS

### Prérequis

1. **Créer un compte Expo** : https://expo.dev/signup
2. **Se connecter à EAS** :
   ```bash
   npx eas-cli login
   ```

3. **Configurer le projet** (première fois uniquement) :
   ```bash
   npx eas-cli init
   ```

### Build Android (APK)

```bash
# Build de preview (pour tests internes)
npx eas-cli build --platform android --profile preview

# Build de production
npx eas-cli build --platform android --profile production
```

Le fichier APK sera disponible en téléchargement sur le dashboard Expo.

### Build iOS (IPA)

Nécessite un compte Apple Developer ($99/an).

```bash
# Build pour simulateur
npx eas-cli build --platform ios --profile development

# Build de production
npx eas-cli build --platform ios --profile production
```

## 📲 Distribution aux agriculteurs

### Option 1 : QR Code (recommandé)

Après le build, Expo génère un QR code que les agriculteurs peuvent scanner :

1. Ouvrir l'app **Expo Go** sur leur téléphone
2. Scanner le QR code
3. L'application se télécharge automatiquement

### Option 2 : Lien de téléchargement direct

Expo fournit un lien `.apk` direct après chaque build :
```
https://expo.dev/artifacts/eas/xxxxx.apk
```

Partagez ce lien via WhatsApp, SMS, ou affichez-le sur votre site.

### Option 3 : Google Play Store

Pour une distribution officielle sur le Play Store :

1. Créer un compte Google Play Console ($25 une fois)
2. Configurer `eas.json` avec les credentials
3. ```bash
   npx eas-cli submit --platform android
   ```

## ⚙️ Configuration requise

### Variables d'environnement

L'application utilise l'API backend GreenLink. L'URL est configurée dans :
- `/app/mobile/greenlink-farmer/src/config.js`

```javascript
API_URL: 'https://redd-impact-metrics.preview.emergentagent.com/api'
```

### Notifications Push

Pour activer les notifications push en production :

1. Créer un projet Firebase
2. Télécharger `google-services.json`
3. Placer le fichier à la racine du projet
4. Configurer les credentials dans EAS

## 🧪 Test de l'application

### Credentials de test

```
Email: farmer1@test.com
Mot de passe: test123
```

### Tester les notifications

```bash
# Envoyer une notification de test via Expo
npx expo push:send --to ExponentPushToken[xxx] --title "Test" --body "Notification de test"
```

## 📁 Structure du projet

```
greenlink-farmer/
├── App.js                 # Point d'entrée avec navigation
├── app.json               # Configuration Expo
├── eas.json               # Configuration EAS Build
├── assets/                # Icônes et images
└── src/
    ├── components/        # Composants UI réutilisables
    ├── config.js          # Configuration (API URL, couleurs)
    ├── context/           # Contexts React (Auth, Offline)
    ├── screens/           # Écrans de l'application
    │   ├── auth/          # Login, Register
    │   ├── home/          # Accueil
    │   ├── parcels/       # Gestion parcelles
    │   ├── harvest/       # Déclaration récoltes
    │   ├── payments/      # Historique paiements
    │   ├── notifications/ # Notifications
    │   └── profile/       # Profil utilisateur
    └── services/          # Services API et utilitaires
        ├── api.js         # Client HTTP
        ├── camera.js      # Service caméra
        ├── location.js    # Service géolocalisation
        ├── notifications.js # Push notifications
        └── sync.js        # Synchronisation offline
```

## 🆘 Support

Pour toute question :
- **Téléphone** : +225 07 87 76 10 23
- **Email** : support@greenlink.ci

## 📜 Licence

Propriétaire - GreenLink Agritech © 2026
