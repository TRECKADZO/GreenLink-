# Spécification Produit - Profil Coopérative Agricole

## Profil : Coopérative agricole

### Objectifs métier / utilisateur
La coopérative agricole (ex. CAMAYE, CAYAT, SCEB, ABOCFA) regroupe 500 à 5 000 membres producteurs de cacao/anacarde. Son objectif principal est d'onboarder massivement ses membres, centraliser les déclarations de parcelles avec suivi agroforestier, vendre des lots groupés tracés bas-carbone aux acheteurs responsables, négocier et redistribuer équitablement les primes carbone (120-180 FCFA/kg) via Orange Money Business, assurer la conformité EUDR avec géolocalisation groupée, et maintenir une transparence totale sur les flux financiers pour éviter les risques de gouvernance.

### Points d'entrée principaux
| Canal | Utilisateur | Description |
|-------|-------------|-------------|
| **Web Dashboard Coop** | Directeur, Secrétaire général, Comptable | Tableau de bord complet : gestion membres, lots, finances, rapports EUDR |
| **App Mobile Agent Terrain** | Techniciens, Agents de collecte | Onboarding planteurs, géoloc parcelles, photos, sync offline |
| **USSD Délégué** | Planteurs membres (via agent) | Consultation solde, historique primes, déclaration simplifiée |
| **SMS/Email** | Tous | Notifications primes, audits, ventes groupées |
| **API Partenaires** | ANADER, Conseil Café-Cacao | Intégration données agronomiques |

---

## Fonctionnalités principales

### Priorité 1 - Critique / Quotidien

#### 1.1 Gestion des membres planteurs
**Description** : Onboarding massif des planteurs avec collecte des informations d'identité (CNI/passeport), coordonnées (téléphone Orange Money), localisation du village, et consentement RGPD. Import CSV pour migration depuis registres existants. Validation par le bureau de la coopérative avec workflow d'approbation.

**Exemple concret** : La coopérative CAMAYE (2 500 membres, région Soubré) importe 1 800 planteurs existants via CSV, puis ses 12 agents terrain onboardent 700 nouveaux membres en 3 semaines via l'app mobile, avec photo CNI et consentement digital.

**Canal** : Web Dashboard + App Mobile Agent
**KPI** : Taux d'onboarding (membres actifs / membres cibles) > 90%

#### 1.2 Déclaration groupée des parcelles
**Description** : Enregistrement massif des parcelles avec géolocalisation GPS (polygones ou points), superficie déclarée vs mesurée, type de culture (cacao, anacarde), densité arbres d'ombrage (40-60/ha pour prime carbone), et photos terrain. Vérification automatique zéro-déforestation post-2020 via API satellite.

**Exemple concret** : Agent terrain Konan déclare 45 parcelles en une journée dans le village de Zahia. Total coop : 1 800 ha cacao, 4 800 t CO₂ séquestrés/an (estimé 4-5 t/ha), score carbone moyen 7.8/10.

**Canal** : App Mobile Agent (mode offline disponible)
**KPI** : 100% parcelles géolocalisées, < 5% écart superficie déclarée/mesurée

#### 1.3 Dashboard temps réel coopérative
**Description** : Vue consolidée : nombre de membres actifs, surface totale déclarée, tonnes CO₂ agrégées, primes carbone disponibles et redistribuées, lots en cours de vente, alertes (audits à venir, paiements en attente). Filtres par zone géographique, certification, saison.

**Exemple concret** : Le directeur de CAYAT consulte : 3 200 membres, 2 400 ha, 12 000 t CO₂/an, 45M FCFA primes reçues ce trimestre, 38M redistribués (84%), 3 lots en négociation.

**Canal** : Web Dashboard
**KPI** : Taux de redistribution > 85%, délai redistribution < 7 jours

### Priorité 2 - Hebdomadaire / Mensuel

#### 2.1 Vente groupée de lots bas-carbone
**Description** : Création de lots de vente groupant les récoltes des membres avec traçabilité complète (parcelle → planteur → lot). Négociation avec acheteurs (Nestlé, Barry Callebaut, Cargill) sur prix base + premium carbone. Génération automatique des documents de traçabilité EUDR.

**Exemple concret** : SCEB crée un lot de 180 tonnes cacao UTZ, 45 planteurs contributeurs, score carbone moyen 8.2/10. Négociation avec Cémoi : prix base 1 850 FCFA/kg + prime carbone 150 FCFA/kg = 2 000 FCFA/kg. Total : 360M FCFA dont 27M de prime carbone.

**Canal** : Web Dashboard
**KPI** : Premium carbone moyen négocié (FCFA/kg), volume vendu groupé (tonnes/mois)

#### 2.2 Redistribution transparente des primes
**Description** : Calcul automatique de la part de chaque planteur basé sur : quantité livrée, score carbone parcelle, bonus certifications. Redistribution via Orange Money Business (ou virement coop pour gros montants). Historique complet consultable par chaque membre.

**Exemple concret** : Sur 27M FCFA de prime carbone du lot Cémoi, déduction frais coop 10% (2.7M), redistribution 24.3M à 45 planteurs. Planteur Yao Kouamé : 4.2 tonnes livrées × score 8.5 × 150 FCFA = 535 500 FCFA reçus sur Orange Money en 48h.

**Canal** : Web Dashboard + SMS confirmation planteur
**KPI** : Délai redistribution < 7 jours, 100% traçabilité (membre peut vérifier calcul)

#### 2.3 Rapports EUDR et certifications
**Description** : Génération de rapports conformes EUDR (géolocalisation groupée, preuves zéro-déforestation, chaîne de traçabilité). Export PDF/CSV pour audits Rainforest/UTZ/Fairtrade. Intégration données ANADER pour suivi agronomique.

**Exemple concret** : Export trimestriel CAYAT : 3 200 parcelles géolocalisées, 0 alerte déforestation, 2 400 ha certifiés Rainforest. Rapport PDF 45 pages transmis à Barry Callebaut pour audit fournisseur.

**Canal** : Web Dashboard
**KPI** : 100% parcelles conformes EUDR, 0 non-conformité audit

### Priorité 3 - Saisonnier / Annuel

#### 3.1 Audits carbone et vérifications terrain
**Description** : Planification audits 5-10% des parcelles pour certification Verra/Gold Standard. Sélection aléatoire + ciblée (scores extrêmes). Coordination agents terrain pour photos, mesures dendrométriques. Préparation audits drone (année 2).

**Exemple concret** : Audit annuel ABOCFA : 180 parcelles sélectionnées sur 1 800 (10%), 12 agents mobilisés sur 3 semaines. Résultat : 95% conformes, 9 parcelles reclassées (densité arbres insuffisante).

**Canal** : Web Dashboard + App Mobile Agent
**KPI** : Taux de conformité audit > 90%, coût audit/parcelle < 15 000 FCFA

#### 3.2 Formation et sensibilisation membres
**Description** : Bibliothèque de contenus de formation (vidéos, fiches PDF) sur pratiques agroforestières, certification, utilisation app. Suivi participation et quiz de validation. Partenariat ANADER pour modules techniques.

**Exemple concret** : Module "Augmenter son score carbone" : 1 200 planteurs CAMAYE ont visionné, 850 ont passé le quiz, score moyen post-formation +0.8 points.

**Canal** : App Mobile + USSD (version audio)
**KPI** : Taux de complétion formation > 60%, amélioration score carbone post-formation

#### 3.3 Assemblée générale et reporting annuel
**Description** : Génération automatique du rapport annuel : volumes, revenus, primes distribuées, investissements, conformité. Tableaux et graphiques prêts pour présentation AG. Comparatif N-1.

**Exemple concret** : AG SCEB 2025 : 2 800 membres présents, présentation rapport : 4 200 t vendues (+12%), 185M FCFA primes redistribuées (+23%), 98% conformité EUDR, NPS membres 72/100.

**Canal** : Web Dashboard
**KPI** : NPS membres, croissance revenus/membre

---

## Flux utilisateur typiques

### Flux 1 : Onboarding groupé + déclaration parcelles saisonnière

| Étape | Acteur | Action | Canal | Données |
|-------|--------|--------|-------|---------|
| 1 | Admin Coop | Créer campagne onboarding "Saison 2025" avec objectifs (800 nouveaux, 500 ha) | Web | Nom, dates, zones cibles |
| 2 | Admin Coop | Assigner agents terrain aux zones (3 agents zone Soubré, 2 zone Daloa) | Web | Agent → Villages |
| 3 | Agent terrain | Télécharger liste planteurs existants (CSV import registre papier) | Web/Mobile | CNI, nom, téléphone, village |
| 4 | Agent terrain | Se rendre au village, ouvrir app mode offline | Mobile | - |
| 5 | Agent terrain | Onboarder planteur : photo CNI, téléphone Orange Money, consentement vocal | Mobile | Données identité, consentement |
| 6 | Agent terrain | Aller à la parcelle, tracer polygone GPS, compter arbres ombrage, photos | Mobile | Coordonnées, superficie, photos |
| 7 | Agent terrain | En fin de journée, synchroniser (wifi village ou 3G ville) | Mobile | Upload batch |
| 8 | Admin Coop | Valider onboardings en attente, corriger erreurs, approuver | Web | Workflow validation |

**Résultat** : 45 planteurs onboardés/jour/agent, 1 800 ha déclarés en 3 semaines, données prêtes pour vente groupée.

### Flux 2 : Vente groupée + redistribution primes carbone

| Étape | Acteur | Action | Canal | Données |
|-------|--------|--------|-------|---------|
| 1 | Responsable commercial coop | Créer lot de vente "Lot Cémoi Q1-2025" | Web | Tonnage cible, planteurs éligibles, certifications |
| 2 | Système | Agrège automatiquement : parcelles éligibles, scores carbone, volumes disponibles | Auto | 180t, 45 planteurs, score moyen 8.2 |
| 3 | Responsable commercial | Envoyer offre à acheteur Cémoi via plateforme | Web | Prix proposé, specs lot, docs EUDR |
| 4 | Acheteur (Cémoi) | Accepter offre, signer contrat digital | Web | Validation, prix final 2 000 FCFA/kg |
| 5 | Logisticien coop | Coordonner collecte, générer bordereaux pesée | Web/Mobile | Quantités par planteur |
| 6 | Système | Réception paiement acheteur (360M FCFA) | Auto | Virement bancaire |
| 7 | Comptable coop | Valider calcul redistribution : 10% frais coop, 90% aux planteurs | Web | Tableau détaillé par planteur |
| 8 | Système | Déclencher paiements Orange Money Business aux 45 planteurs | Auto | SMS confirmation à chaque planteur |

**Résultat** : 24.3M FCFA redistribués en 48h, chaque planteur reçoit sa part avec SMS détaillant le calcul, historique consultable.

---

## Contraintes & spécificités Côte d'Ivoire

| Contrainte | Solution GreenLink |
|------------|-------------------|
| **Faible bande passante rurale** | Mode offline app mobile, sync opportuniste, compression images |
| **Usage intensif USSD** | Interface USSD #123*456# pour planteurs (solde, historique, déclaration simple) |
| **Orange Money dominant** | Intégration Orange Money Business API pour paiements masse |
| **Langues locales** | Interface FR + audio Baoulé, Dioula, Sénoufo pour formations |
| **Conformité EUDR 2025** | Géolocalisation systématique, vérification satellite déforestation, export rapports |
| **Audits carbone Verra/Gold Standard** | Module audit terrain, photos géotaggées, mesures dendrométriques |
| **Gouvernance coopérative** | Transparence totale : chaque membre voit son calcul de prime, historique complet |
| **Intégration ANADER** | API pour données agronomiques, recommandations personnalisées |
| **Conseil Café-Cacao** | Export données conformes pour déclarations officielles |
| **Certifications multiples** | Support UTZ, Rainforest Alliance, Fairtrade, bio |

---

## KPIs suggérés pour le profil Coopérative

| KPI | Description | Cible |
|-----|-------------|-------|
| **Taux d'onboarding membres** | Membres actifs / Membres cibles | > 90% |
| **Couverture géolocalisation** | Parcelles géolocalisées / Parcelles totales | 100% |
| **Tonnes CO₂ agrégées** | Total séquestration annuelle de la coop | Croissance +15%/an |
| **Premium carbone moyen** | FCFA/kg négocié vs prix base | > 100 FCFA/kg |
| **Taux de redistribution** | Primes redistribuées / Primes reçues | > 85% |
| **Délai redistribution** | Jours entre réception et paiement membre | < 7 jours |
| **Taux conformité audit** | Parcelles conformes / Parcelles auditées | > 90% |
| **NPS membres** | Net Promoter Score satisfaction | > 60/100 |
| **Volume vendu groupé** | Tonnes vendues via lots groupés / mois | Croissance +20%/an |

---

## Modèle de données - Coopérative

```javascript
{
  "_id": ObjectId,
  "user_type": "cooperative",
  "coop_name": "CAMAYE",
  "coop_code": "CI-COOP-2025-001",
  "registration_number": "RC-ABJ-2015-B-12345",
  "certifications": ["UTZ", "Rainforest Alliance"],
  "headquarters": {
    "address": "Soubré, Nawa",
    "region": "Bas-Sassandra",
    "gps": { "lat": 5.7847, "lng": -6.5945 }
  },
  "contact": {
    "phone": "+22507123456789",
    "email": "direction@camaye.ci",
    "orange_money_business": "OM-BIZ-123456"
  },
  "management": {
    "director": { "name": "Kouassi Yao", "phone": "+22507111111" },
    "secretary": { "name": "Ama Koné", "phone": "+22507222222" },
    "accountant": { "name": "Bamba Drissa", "phone": "+22507333333" }
  },
  "stats": {
    "total_members": 2500,
    "active_members": 2350,
    "total_hectares": 1800,
    "total_co2_tonnes": 4800,
    "average_carbon_score": 7.8
  },
  "financial": {
    "commission_rate": 0.10,  // 10% frais coop
    "total_premiums_received": 185000000,
    "total_premiums_distributed": 166500000
  },
  "agents": [
    { "user_id": ObjectId, "name": "Agent Konan", "zone": "Soubré-Nord" }
  ],
  "created_at": ISODate,
  "updated_at": ISODate
}
```

---

## Intégration avec profils existants

| Profil existant | Interaction avec Coopérative |
|-----------------|------------------------------|
| **Producteur** | Membre de la coopérative, parcelles agrégées, primes redistribuées |
| **Acheteur** | Achète lots groupés de la coopérative |
| **Entreprise RSE** | Achète crédits carbone agrégés de la coopérative |
| **Fournisseur** | Vend intrants à la coopérative (commandes groupées) |
| **Admin** | Supervise toutes les coopératives, audits globaux |
