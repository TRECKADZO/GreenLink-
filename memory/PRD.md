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

**Frontend Web :**
- NotificationCenter (cloche + badge + dropdown) dans 3 dashboards
- Historique avec icônes par type, timestamps relatifs, marquer lu

**Mobile :**
- Écran NotificationsScreen avec filtrage par type (Parcelles, Paiements, Alertes)
- Navigation contextuelle au tap (ouvre l'écran pertinent)
- Types enrichis dans notification service

**Backend :**
- Déclencheurs dans cooperative_parcels.py, ssrte.py, cooperative_carbon_premiums.py
- API: GET /unread-count, GET /history, PUT /{id}/read, PUT /read-all
- Stockage persistant dans notification_history

## Credentials
- Cooperative: identifier=bielaghana@gmail.com, password=greenlink2024

## APIs Mockées
- Orange SMS, Orange Money, Expo Push (notifications stockées en DB)

## Backlog
- P1: Build EAS mobile (v1.38.3+)
- P1: Soumettre AAB au Google Play Console
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoulé, Dioula)
- P2: Stockage cloud AWS S3
