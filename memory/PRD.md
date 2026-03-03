# GreenLink PRD - Updated March 3, 2026

## Latest Updates - March 3, 2026 (Session 11)

### 💬 MESSAGERIE SÉCURISÉE - NOUVEAU

**Système de messagerie temps réel de classe mondiale entre acheteurs et vendeurs (agriculteurs/coopératives) sur la marketplace.**

#### URL: `/messages` et `/messages/:conversationId`

#### Fonctionnalités:

**1. Messagerie Temps Réel (WebSocket)**
- Messages instantanés comme WhatsApp
- Indicateur de frappe ("écrit...")
- Statut en ligne/hors ligne
- Reconnexion automatique

**2. Conversations Liées aux Annonces**
- Chaque conversation est liée à une annonce du marketplace
- Contexte de l'annonce affiché dans le chat (photo, prix, quantité)
- Bouton "Contacter" directement sur les annonces

**3. Pièces Jointes**
- Upload de photos et documents (PDF, DOC)
- Limite de 5 MB par fichier
- Prévisualisation des images dans le chat

**4. Accusés de Lecture**
- ✓ Message envoyé
- ✓✓ Message lu (vert)
- Marquage automatique lors de la lecture

**5. Messages Épinglés/Favoris**
- Épingler les messages importants
- Panneau latéral pour voir tous les messages épinglés

**6. Sécurité Avancée**
- Chiffrement des messages (Fernet/AES)
- Badge "Messages chiffrés de bout en bout"
- Signalement de messages (spam, harcèlement, fraude)
- Blocage d'utilisateurs
- **Notifications push mobiles** pour utilisateurs hors ligne (Expo Push API)

#### API Endpoints:
- `GET /api/messaging/conversations` - Liste des conversations
- `POST /api/messaging/conversations` - Créer une conversation
- `GET /api/messaging/conversations/{id}` - Détails conversation
- `GET /api/messaging/conversations/{id}/messages` - Messages
- `GET /api/messaging/conversations/{id}/pinned` - Messages épinglés
- `PUT /api/messaging/conversations/{id}/archive` - Archiver
- `DELETE /api/messaging/messages/{id}` - Supprimer message
- `POST /api/messaging/report` - Signaler
- `POST /api/messaging/block` - Bloquer
- `DELETE /api/messaging/block/{id}` - Débloquer
- `GET /api/messaging/blocked` - Utilisateurs bloqués
- `POST /api/messaging/upload` - Upload pièce jointe
- `GET /api/messaging/stats` - Statistiques
- `WS /api/messaging/ws` - WebSocket temps réel

#### Fichiers:
- `/app/backend/routes/messaging.py` (NOUVEAU)
- `/app/frontend/src/pages/messaging/MessagingPage.jsx` (NOUVEAU)
- `/app/frontend/src/services/messagingApi.js` (NOUVEAU)

#### Intégration UI:
- Icône messagerie dans la Navbar (utilisateurs connectés)
- Bouton "Contacter" sur chaque annonce du marketplace
- Navigation directe depuis marketplace vers conversation

---

## Session 10 Updates

### 🏢 TABLEAU DE BORD ACHETEUR - NOUVEAU

**Espace dédié aux acheteurs (négociants, exportateurs, transformateurs) pour gérer leurs activités sur le marketplace.**

#### URL: `/buyer/marketplace`

#### Fonctionnalités:

**1. Vue d'ensemble (Aperçu)**
- Statistiques: Demandes de devis, En attente, Devis reçus, Favoris, Alertes actives
- Dernières demandes
- Actions rapides

**2. Historique des Devis (Mes Devis)**
- Liste de toutes les demandes envoyées
- Statut: En attente, Devis reçu, Refusé, Info demandée
- Détails des devis reçus avec prix proposés

**3. Favoris**
- Récoltes sauvegardées
- Alerte si prix modifié depuis l'ajout
- Action rapide pour demander un devis
- Bouton coeur dans le marketplace pour ajouter/retirer

**4. Alertes Personnalisées**
- Création d'alertes avec critères:
  - Types de culture (cacao, café, anacarde)
  - Prix maximum
  - Quantité minimum
  - Certifications requises (Fairtrade, Rainforest, UTZ, Bio, EUDR)
  - EUDR Compliant requis
- Activation/désactivation des alertes
- Vue des correspondances (récoltes matchant les critères)

**5. Aperçu du Marché**
- Prix par culture (moyenne, min, max)
- Top régions par volume
- Certifications les plus courantes
- Nouvelles annonces de la semaine

#### API Endpoints:
- `GET /api/buyer/dashboard` - Stats dashboard
- `GET /api/buyer/quotes` - Historique devis
- `GET/POST/DELETE /api/buyer/favorites` - Gestion favoris
- `GET/POST/PUT/DELETE /api/buyer/alerts` - Gestion alertes
- `GET /api/buyer/matching-listings` - Correspondances alertes
- `GET /api/buyer/market-insights` - Aperçu marché

#### Fichiers:
- `/app/backend/routes/buyer_dashboard.py` (NOUVEAU)
- `/app/frontend/src/pages/buyer/BuyerDashboard.jsx` (NOUVEAU)

---

### 🌍 BOURSE DES RÉCOLTES - MARKETPLACE INTERNATIONAL

**Fonctionnalité majeure permettant aux producteurs et coopératives d'exposer leurs récoltes aux acheteurs internationaux avec une fiche produit aux normes internationales.**

#### Caractéristiques Principales:

**1. Fiche Produit aux Normes Internationales:**
- **Cacao**: Standards ICCO (International Cocoa Organization)
  - Grainage (fèves/100g) - Max 100
  - Humidité (%) - Max 7.5%
  - Taux de défauts, matière grasse, fermentation
- **Café**: Standards ICO/SCA (Specialty Coffee Association)
  - Score SCA (0-100), Specialty ≥80
  - Calibre (Screen Size), méthode traitement, altitude
- **Anacarde**: Standards AFI
  - KOR (Kernel Output Ratio)
  - Classification W180-W450

**2. Système de Demande de Devis (comme RSE):**
- Formulaire professionnel pour acheteurs
- Informations entreprise (nom, type, contact)
- Détails commande (quantité, Incoterm, lieu livraison)
- Exigences qualité
- Les vendeurs reçoivent les demandes et envoient des devis personnalisés

**3. Certifications Supportées:**
- Fairtrade International
- Rainforest Alliance
- UTZ Certified
- Agriculture Biologique (AB/EU)
- USDA Organic
- EUDR Compliant
- ICI (Child Labor Free)

**4. Traçabilité Complète:**
- Région/Village d'origine
- Nombre de producteurs
- Coordonnées GPS
- Conformité EUDR avec référence
- Attestation zéro déforestation
- Certification travail des enfants (ICI)

**5. Informations Logistiques:**
- Incoterms (EXW, FCA, FOB, CIF, DAP)
- Conditionnement (sacs jute, big bags, containers)
- Dates récolte et disponibilité
- Lieu d'entreposage

#### URLs:
- Marketplace: `/marketplace/harvest`
- Créer annonce: `/marketplace/create-listing`
- Mes annonces: `/marketplace/my-listings`

#### API Endpoints:
- `GET /api/harvest-marketplace/listings` - Liste des annonces
- `POST /api/harvest-marketplace/listings` - Créer une annonce
- `GET /api/harvest-marketplace/stats` - Statistiques
- `POST /api/harvest-marketplace/quote-requests` - Demander un devis
- `GET /api/harvest-marketplace/quote-requests/received` - Devis reçus
- `GET /api/harvest-marketplace/admin/analytics` - Analytics Super Admin

#### Restrictions:
- **Seuls les producteurs individuels et coopératives** peuvent publier des récoltes
- Les acheteurs (négociants, exportateurs, transformateurs) peuvent seulement demander des devis

#### Fichiers Créés/Modifiés:
- `/app/backend/routes/harvest_marketplace.py` (NOUVEAU)
- `/app/frontend/src/pages/marketplace/HarvestMarketplace.jsx` (NOUVEAU)
- `/app/frontend/src/pages/marketplace/CreateHarvestListing.jsx` (NOUVEAU)
- `/app/frontend/src/pages/admin/SuperAdminDashboard.jsx` (onglet Bourse Récoltes)
- `/app/frontend/src/App.js` (routes)
- `/app/backend/server.py` (router)

---

### 📱 Corrections Mobile Prévues (APK v1.18.0)

**Changements prêts à déployer:**
1. **Image déclaration récolte**: Cabosses de cacao au lieu de tablette chocolat
2. **Code USSD**: Changé de `*144*88#` à `*123*45#`
3. **Nouvelle parcelle**: 3 cultures seulement (Cacao, Café, Anacarde) avec images

**Fichiers modifiés:**
- `/app/mobile/greenlink-farmer/src/screens/harvest/HarvestScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/ussd/USSDSimulatorScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/parcels/AddParcelScreen.js`
- `/app/mobile/greenlink-farmer/app.json` (version 1.18.0)

**Note**: Build APK à lancer via `npx eas-cli build --platform android --profile preview`

---

## Architecture

### Collections MongoDB Ajoutées:
- `harvest_listings` - Annonces de récoltes
- `quote_requests` - Demandes de devis

### Schéma harvest_listings:
```json
{
  "listing_id": "HRV-YYYYMMDD-XXXXXX",
  "crop_type": "cacao|cafe|anacarde",
  "variety": "Forastero|Arabica|W240...",
  "grade": "grade_1|specialty|w180...",
  "quantity_kg": 5000,
  "price_per_kg": 1250,
  "incoterm": "FOB",
  "certifications": ["fairtrade", "rainforest", "eudr"],
  "eudr_compliant": true,
  "child_labor_free": true,
  "bean_count": 95,
  "moisture_rate": 7.2,
  "seller_id": "ObjectId",
  "seller_name": "Coopérative XYZ",
  "seller_type": "cooperative|producteur",
  "status": "active",
  "quotes_count": 0
}
```

---

## Tâches Restantes

### P0 (Critique):
- [ ] **Build APK v1.18.0** pour corrections mobile

### P1 (Important):
- [ ] Bug formulaire "Nouvelle Parcelle" - page blanche
- [ ] Intégration paiement réel (Orange Money)
- [ ] Notifications multi-canal pour paiements

### P2 (Backlog):
- [ ] Intégration USSD réelle
- [ ] Stockage cloud (S3) pour fichiers
- [ ] Refactoring cooperative.py

---

## Credentials Test
- **Super Admin**: klenakan.eric@gmail.com / 474Treckadzo
- **Cooperative**: coop-gagnoa@greenlink.ci / password
- **Producer**: kouame.jb@test.com / password

---

## Session History

| Session | Date | Features |
|---------|------|----------|
| 10 | Mar 3, 2026 | Bourse des Récoltes (Marketplace International) |
| 11 | Mar 3, 2026 | Messagerie Sécurisée temps réel (WebSocket) |
| 9 | Mar 2, 2026 | APK v1.15.0, Replay Trajectoires |
| 8 | Mar 2, 2026 | Gestion Utilisateurs, Contenu Dynamique |
| 7 | Mar 1, 2026 | Carte Agents Live, WebSocket Dashboard |
