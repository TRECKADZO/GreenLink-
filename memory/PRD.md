# GreenLink - Product Requirements Document

## Problème Original
Plateforme agricole full-stack pour la gestion des coopératives cacao en Côte d'Ivoire, avec suivi carbone, conformité EUDR, et protection des enfants (SSRTE).

## Architecture
- **Backend**: FastAPI + MongoDB (Atlas)
- **Frontend Web**: React + Shadcn UI
- **Mobile**: React Native (Expo/EAS)

## Fonctionnalités Implémentées

### Phase 1 - Core Platform (DONE)
- Authentification multi-rôles
- Dashboard coopérative, gestion membres, parcelles, SSRTE, lots, primes carbone

### Phase 2 - Mobile & Field Agent (DONE)
- App mobile React Native (Expo)
- Écrans farmer, field agent, coopérative
- Auto-refresh avec useFocusEffect

### Phase 3 - Refactoring Backend (DONE)
- cooperative.py refactorisé en 7 modules

### Phase 4 - Harmonisation Clés Françaises (DONE - 21/03/2026)
- Toutes les clés API en français + frontend/mobile synchronisés
- Collision routes /api/ssrte/visits corrigée

### Phase 5 - Système de Notifications Complet (DONE - 21/03/2026)
**4 types de notifications :**
| Type | Déclencheur | Destinataire | Icône |
|------|------------|-------------|-------|
| `new_parcel_to_verify` | Nouvelle parcelle déclarée | Agents terrain + Coopérative | MapPin (bleu) |
| `parcel_verified` | Parcelle vérifiée/rejetée par agent | Producteur | Check (vert) |
| `ssrte_critical_alert` | Visite SSRTE avec enfants à risque | Coopérative | AlertTriangle (rouge) |
| `payment_received` | Prime carbone payée | Producteur | Leaf (émeraude) |

### Phase 6 - Système de Livraison Marketplace (DONE - 21/03/2026)
**3 modèles de livraison par fournisseur (cumulables) :**
| Modèle | Description | Champs |
|--------|------------|--------|
| `frais_fixe` | Montant fixe par commande | actif, montant |
| `par_distance` | Tarif par zone de livraison | actif, zones (meme_ville, meme_region, national) |
| `par_poids` | Prix par unité commandée | actif, prix_par_unite |
| `seuil_gratuit` | Livraison gratuite au-dessus d'un montant | actif, montant_minimum |

**Backend :**
- Collection `delivery_settings` par fournisseur
- GET/PUT /api/marketplace/supplier/delivery-settings
- GET /api/marketplace/delivery-fees?zone=... (calcul des frais)
- GET /api/marketplace/cart inclut delivery_fees, total_delivery, total_with_delivery
- POST /api/marketplace/cart/checkout accepte delivery_zone dans le body JSON

**Frontend Web :**
- Page `/supplier/delivery-settings` avec 4 cartes configurables (Switch + inputs)
- Aperçu client en bas de page
- Sidebar fournisseur avec lien "Livraison"
- CheckoutPage mis à jour : sélection de zone + affichage des frais par fournisseur

**Mobile :**
- CartScreen affiche les frais de livraison par fournisseur
- CheckoutScreen avec sélection de zone et total incluant la livraison

## Credentials
- Cooperative: identifier=bielaghana@gmail.com, password=greenlink2024
- Fournisseur: identifier=testfournisseur@test.com, password=supplier2024

## APIs Mockées
- Orange SMS, Orange Money, Expo Push (notifications stockées en DB)

## Backlog
- P1: Soumettre AAB au Google Play Console
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoulé, Dioula)
- P2: Stockage cloud AWS S3

## Key API Endpoints
- POST /api/auth/login
- GET/PUT /api/marketplace/supplier/delivery-settings
- GET /api/marketplace/delivery-fees?zone=...
- GET /api/marketplace/cart?zone=...
- POST /api/marketplace/cart/checkout (JSON body)
- GET /api/marketplace/products
- POST /api/carbon-payments/request-payment
- GET /api/notifications/history

## DB Collections
- `delivery_settings`: {supplier_id, modeles_livraison, seuil_gratuit, updated_at}
- `notification_history`: {user_id, title, message, type, read, created_at, data}
- `carts`: {user_id, items: [{product_id, quantity}]}
- `orders`: {order_number, buyer_id, supplier_id, items, subtotal, frais_livraison, total_amount, delivery_zone, ...}
- `products`: {name, price, supplier_id, category, stock_quantity, ...}
- `parcels`: {superficie, nom_producteur, localisation}
