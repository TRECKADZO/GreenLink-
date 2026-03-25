# Configuration Firebase Cloud Messaging pour GreenLink

Ce guide explique comment configurer Firebase Cloud Messaging (FCM) pour envoyer des notifications push en production.

## 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Nommez-le "greenlink-farmer" 
4. Suivez les étapes de configuration

## 2. Configurer l'application Android

### Dans Firebase Console :
1. Cliquez sur l'icône Android pour ajouter une app
2. Package name : `com.greenlink.farmer`
3. Téléchargez `google-services.json`
4. Placez-le dans `/app/mobile/greenlink-farmer/`

### Mettre à jour app.json :
Le fichier est déjà configuré avec :
```json
"android": {
  "googleServicesFile": "./google-services.json"
}
```

## 3. Configurer l'application iOS (optionnel)

### Dans Firebase Console :
1. Cliquez sur l'icône iOS pour ajouter une app
2. Bundle ID : `com.greenlink.farmer`
3. Téléchargez `GoogleService-Info.plist`
4. Placez-le dans `/app/mobile/greenlink-farmer/`

### Certificats APNs :
1. Allez dans Apple Developer Portal
2. Créez un certificat APNs pour votre app
3. Uploadez-le dans Firebase Console > Project Settings > Cloud Messaging > iOS app configuration

## 4. Configuration Backend

### Variables d'environnement :
Ajoutez ces variables dans `/app/backend/.env` :

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=greenlink-farmer
FIREBASE_SERVER_KEY=votre-server-key-fcm
```

### Obtenir la Server Key :
1. Firebase Console > Project Settings > Cloud Messaging
2. Copiez la "Server Key" (Legacy server key)

## 5. Test des notifications

### Via l'API backend :
```bash
# Login pour obtenir un token
TOKEN=$(curl -s -X POST "https://mobile-harmonize.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"farmer1@test.com","password":"test123"}' | jq -r '.access_token')

# Envoyer une notification de test
curl -X POST "https://mobile-harmonize.preview.emergentagent.com/api/greenlink/notifications/test-push" \
  -H "Authorization: Bearer $TOKEN"
```

### Via Firebase Console :
1. Firebase Console > Cloud Messaging
2. "Send your first message"
3. Entrez le contenu de la notification
4. Ciblez l'app GreenLink Farmer

## 6. Types de notifications envoyées automatiquement

Le système envoie automatiquement des notifications pour :

| Événement | Titre | Contenu |
|-----------|-------|---------|
| Parcelle déclarée | "Parcelle déclarée 🌳" | Surface + Score carbone |
| Récolte enregistrée | "Récolte enregistrée 🌾" | Quantité + Prime carbone |
| Paiement reçu | "Paiement reçu 💰" | Montant + Mode de paiement |
| Prime carbone | "Prime carbone disponible 🌱" | Montant de la prime |

## 7. Architecture du service

```
/app/backend/services/fcm_service.py
├── FCMService          # Service principal
│   ├── send_notification()      # Envoi simple
│   ├── send_bulk_notifications() # Envoi en masse
│   └── Fallback Expo Push       # Si pas de FCM configuré
│
├── Fonctions utilitaires
│   ├── notify_farmer_parcel_verified()
│   ├── notify_farmer_payment_received()
│   ├── notify_farmer_harvest_confirmed()
│   └── notify_farmer_carbon_premium()
│
└── send_notification_to_user()  # Lookup DB + envoi
```

## 8. Tokens supportés

Le service détecte automatiquement le type de token :

- **ExponentPushToken[...]** → Utilise Expo Push Service
- **Autres tokens** → Utilise Firebase FCM (si configuré)

## 9. Mode fallback

Sans `FIREBASE_SERVER_KEY`, le système utilise automatiquement le **Expo Push Service**, qui fonctionne bien pour le développement et les petites applications.

Pour la production avec > 1000 utilisateurs, il est recommandé de configurer FCM pour :
- Meilleure fiabilité
- Analytics avancés
- Intégration avec Firebase Analytics

## 10. Dépannage

### Notification non reçue :
1. Vérifiez que le device a accepté les permissions
2. Vérifiez le token dans la collection `device_tokens`
3. Consultez les logs : `tail -f /var/log/supervisor/backend.err.log | grep -i push`

### Token invalide :
- Cause : L'utilisateur a désinstallé l'app ou changé de device
- Solution : Le service marque automatiquement les tokens invalides

### Délai de réception :
- Normal : 1-5 secondes
- Si plus long : Vérifiez la connexion internet du device
