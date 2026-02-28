# Guide de Build APK Production - GreenLink Farmer

## Prérequis

1. **Compte Expo**: Créez un compte sur [expo.dev](https://expo.dev)
2. **EAS CLI**: Installez globalement
   ```bash
   npm install -g eas-cli
   ```
3. **Connexion EAS**:
   ```bash
   cd /app/mobile/greenlink-farmer
   npx eas-cli login
   ```

## Build APK Production

### Option 1: APK Direct (Distribution interne)

```bash
cd /app/mobile/greenlink-farmer

# Build production APK
npx eas-cli build --platform android --profile production

# Ou via script npm
yarn build:android
```

### Option 2: AAB pour Google Play Store

Pour publier sur le Play Store, modifiez `eas.json`:
```json
"production": {
  "android": {
    "buildType": "app-bundle"
  }
}
```

Puis:
```bash
npx eas-cli build --platform android --profile production
```

## Configuration Expo Push Notifications

Les notifications push Expo sont **automatiquement configurées**:
- Project ID: `69cdf51e-6916-433e-99ed-bfdc2e852057`
- L'app enregistre automatiquement les tokens au démarrage

### Canaux de notification Android

L'app crée 3 canaux:
1. **default**: Notifications générales
2. **payments**: Paiements et primes (haute priorité)
3. **reminders**: Rappels hebdomadaires

## Version actuelle

- **Version**: 1.1.0
- **Nouvelles fonctionnalités**:
  - Notifications push en temps réel (Expo)
  - Préférences de notifications
  - Rappels hebdomadaires automatiques
  - Canaux de notification Android

## API Backend Notifications

### Endpoints disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/notifications/register-device` | POST | Enregistre un appareil |
| `/api/notifications/preferences` | GET/PUT | Préférences notifications |
| `/api/notifications/history` | GET | Historique des notifications |
| `/api/notifications/test` | POST | Envoie une notification test |
| `/api/notifications/send-to-all-members` | POST | Notifie tous les membres (coop) |

## Distribution APK

### Via lien direct
Après le build, EAS fournit un lien de téléchargement direct.

### Via QR Code
```bash
npx eas-cli build:list
# Copier l'URL et générer un QR code
```

### Via WhatsApp/SMS
Partagez le lien de téléchargement APK directement.

## Mise à jour OTA (Over-The-Air)

Pour les mises à jour sans nouveau build:
```bash
npx eas-cli update --branch production --message "Description de la mise à jour"
```

## Support

- **Email**: support@greenlink.ci
- **Téléphone**: +225 07 87 76 10 23
