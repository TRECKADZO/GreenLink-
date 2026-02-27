# Contracts Backend - GreenLink Agritech Clone

## 1. Données Mockées à Remplacer

### Frontend Mock Data (actuellement hardcodé):
- **Features** (7 items): fonctionnalités de la plateforme
- **Steps** (3 items): étapes "Comment ça marche"
- **Crops** (6 items): types de cultures supportées
- **Producers** (4 items): producteurs actifs de la communauté
- **Testimonials** (2 items): témoignages clients
- **Pricing Plans** (4 items): plans tarifaires

## 2. Modèles MongoDB

### Feature
```
{
  _id: ObjectId,
  icon: String,
  title: String,
  description: String,
  badge: String (optional),
  badgeColor: String (optional),
  order: Number
}
```

### Step
```
{
  _id: ObjectId,
  number: String,
  icon: String,
  title: String,
  description: String,
  order: Number
}
```

### Crop
```
{
  _id: ObjectId,
  icon: String,
  title: String,
  locations: String,
  color: String,
  order: Number
}
```

### Producer
```
{
  _id: ObjectId,
  name: String,
  initial: String,
  crop: String,
  location: String,
  color: String,
  order: Number
}
```

### Testimonial
```
{
  _id: ObjectId,
  text: String,
  author: String,
  role: String,
  initial: String,
  color: String,
  order: Number
}
```

### PricingPlan
```
{
  _id: ObjectId,
  name: String,
  price: String,
  period: String,
  badge: String (optional),
  popular: Boolean,
  features: Array<String>,
  cta: String,
  ctaVariant: String,
  order: Number
}
```

## 3. API Endpoints

### Features
- `GET /api/features` - Récupérer toutes les fonctionnalités
- `POST /api/features` - Créer une nouvelle fonctionnalité
- `GET /api/features/:id` - Récupérer une fonctionnalité
- `PUT /api/features/:id` - Mettre à jour une fonctionnalité
- `DELETE /api/features/:id` - Supprimer une fonctionnalité

### Steps
- `GET /api/steps` - Récupérer toutes les étapes

### Crops
- `GET /api/crops` - Récupérer toutes les cultures

### Producers
- `GET /api/producers` - Récupérer tous les producteurs
- `GET /api/producers?limit=4` - Récupérer les 4 premiers producteurs

### Testimonials
- `GET /api/testimonials` - Récupérer tous les témoignages

### Pricing Plans
- `GET /api/pricing-plans` - Récupérer tous les plans tarifaires

### Contact Form (nouveau)
- `POST /api/contact` - Envoyer un message de contact
  ```
  Body: {
    name: String,
    email: String,
    message: String,
    userType: String (producteur, acheteur, entreprise, fournisseur)
  }
  ```

## 4. Intégration Frontend-Backend

### Fichiers à modifier:

1. **FeaturesSection.jsx**
   - Remplacer le tableau `features` hardcodé par un `useState`
   - Ajouter un `useEffect` pour fetch `/api/features`
   - Mapper les icônes string vers les composants Lucide React

2. **HowItWorksSection.jsx**
   - Remplacer le tableau `steps` par un fetch `/api/steps`

3. **CropsSection.jsx**
   - Remplacer le tableau `crops` par un fetch `/api/crops`

4. **CommunitySection.jsx**
   - Remplacer le tableau `producers` par un fetch `/api/producers?limit=4`

5. **TestimonialsSection.jsx**
   - Remplacer le tableau `testimonials` par un fetch `/api/testimonials`

6. **PricingSection.jsx**
   - Remplacer le tableau `pricingPlans` par un fetch `/api/pricing-plans`

### Gestion des icônes:
- Backend stocke le nom de l'icône en string (ex: "ShoppingBag")
- Frontend mappe ces strings vers les composants Lucide React

## 5. Seed Data Script

Créer un script `/app/backend/seed_data.py` pour initialiser la base de données avec les données actuelles mockées.

## 6. Ordre d'implémentation

1. ✅ Créer les modèles MongoDB
2. ✅ Créer les endpoints API
3. ✅ Créer le script de seed
4. ✅ Exécuter le seed
5. ✅ Modifier le frontend pour utiliser les API
6. ✅ Tester avec le testing agent

## 7. Points d'attention

- Les icônes Lucide React doivent être mappées côté frontend
- L'ordre d'affichage est géré par le champ `order`
- Toutes les API retournent les données triées par `order`
- Gestion d'erreur: afficher les données mockées si l'API échoue (fallback)
