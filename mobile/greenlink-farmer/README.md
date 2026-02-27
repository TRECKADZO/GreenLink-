# GreenLink Farmer - Application Mobile

Application mobile React Native pour les producteurs agricoles en Côte d'Ivoire.

## Caractéristiques

### 🌱 Fonctionnalités
- **Authentification** : Connexion par téléphone ou email
- **Gestion des Parcelles** : Déclaration et suivi des exploitations
- **Déclaration de Récoltes** : Enregistrement de la production
- **Paiements Orange Money** : Demande et suivi des primes carbone
- **Notifications** : Alertes et messages importants
- **Mode Hors-ligne** : Fonctionne sans connexion internet

### 📱 Optimisé pour
- Faible connectivité (2G/3G)
- Écrans tactiles simples
- Interface style USSD
- Économie de données

## Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo CLI
- Expo Go (pour le test)

### Démarrage rapide

```bash
# Aller dans le dossier
cd mobile/greenlink-farmer

# Installer les dépendances
npm install

# Démarrer en mode développement
npx expo start
```

### Test sur appareil
1. Téléchargez "Expo Go" sur votre téléphone
2. Scannez le QR code affiché
3. L'application se charge automatiquement

## Structure du projet

```
greenlink-farmer/
├── App.js                    # Point d'entrée
├── src/
│   ├── config.js            # Configuration (API, couleurs, etc.)
│   ├── components/
│   │   └── UI.js            # Composants réutilisables
│   ├── context/
│   │   ├── AuthContext.js   # Gestion authentification
│   │   └── OfflineContext.js # Mode hors-ligne
│   ├── services/
│   │   └── api.js           # Appels API
│   └── screens/
│       ├── auth/            # Connexion/Inscription
│       ├── home/            # Écran principal
│       ├── parcels/         # Gestion parcelles
│       ├── harvest/         # Déclaration récoltes
│       ├── payments/        # Paiements
│       ├── notifications/   # Notifications
│       └── profile/         # Profil utilisateur
└── assets/                  # Images et icônes
```

## Configuration API

L'application se connecte à l'API backend GreenLink. 
Modifier `src/config.js` pour changer l'URL :

```javascript
export const CONFIG = {
  API_URL: 'https://votre-api.com/api',
  // ...
};
```

## Mode Hors-ligne

L'application supporte le mode hors-ligne :
- Les données sont mises en cache localement
- Les actions sont enregistrées et synchronisées plus tard
- Indicateur visuel du statut de connexion

## Build Production

### Android (APK)
```bash
npx expo build:android -t apk
```

### iOS
```bash
npx expo build:ios
```

### EAS Build (recommandé)
```bash
npx eas build --platform all
```

## Publication

### Google Play Store
1. Générer un APK signé
2. Créer une fiche sur Google Play Console
3. Soumettre pour review

### Apple App Store
1. Générer un build iOS
2. Soumettre via App Store Connect
3. Attendre la validation Apple

## Contact

Support : +225 07 87 76 10 23
Email : support@greenlink-agritech.com

---
© 2026 GreenLink CI - Agriculture durable en Côte d'Ivoire
