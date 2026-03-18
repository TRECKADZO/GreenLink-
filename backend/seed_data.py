import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_database():
    print("🌱 Starting database seeding...")
    
    # Clear existing data
    await db.features.delete_many({})
    await db.steps.delete_many({})
    await db.crops.delete_many({})
    await db.producers.delete_many({})
    await db.testimonials.delete_many({})
    await db.pricing_plans.delete_many({})
    print("✓ Cleared existing data")
    
    # Seed Features
    features = [
        {
            "icon": "ShoppingBag",
            "title": "Marché digital",
            "description": "Achetez et vendez des récoltes avec photos, descriptions détaillées et enchères en temps réel",
            "badge": "Nouveau",
            "badgeColor": "bg-emerald-100 text-emerald-700",
            "order": 1
        },
        {
            "icon": "Building2",
            "title": "Marketplace RSE",
            "description": "Entreprises RSE : publiez vos besoins en crédits carbone. Producteurs : répondez aux demandes et vendez vos crédits",
            "badge": "B2B",
            "badgeColor": "bg-blue-100 text-blue-700",
            "order": 2
        },
        {
            "icon": "Sparkles",
            "title": "Recommandations IA",
            "description": "Suggestions personnalisées de produits et producteurs basées sur votre historique d'achats",
            "badge": "IA",
            "badgeColor": "bg-purple-100 text-purple-700",
            "order": 3
        },
        {
            "icon": "Award",
            "title": "Vérification carbone",
            "description": "Évaluation IA des pratiques durables avec génération de certificats vérifiables conformes aux standards internationaux",
            "badge": "Gold Standard",
            "badgeColor": "bg-amber-100 text-amber-700",
            "order": 4
        },
        {
            "icon": "GitCompare",
            "title": "Comparateur avancé",
            "description": "Comparez jusqu'à 4 produits côte à côte : prix, qualité, score carbone, certifications et bien plus",
            "badge": "Nouveau",
            "badgeColor": "bg-emerald-100 text-emerald-700",
            "order": 5
        },
        {
            "icon": "MessageSquare",
            "title": "Messagerie & Contrats",
            "description": "Communication intégrée et contrats numériques sécurisés avec signatures électroniques",
            "order": 6
        },
        {
            "icon": "BarChart3",
            "title": "Analytics & Rapports",
            "description": "Tableaux de bord détaillés, export de données, rapports automatiques et insights personnalisés",
            "order": 7
        }
    ]
    await db.features.insert_many(features)
    print(f"✓ Seeded {len(features)} features")
    
    # Seed Steps
    steps = [
        {
            "number": "1",
            "icon": "UserPlus",
            "title": "Inscrivez-vous",
            "description": "Créez votre profil producteur ou acheteur en 2 minutes avec notre onboarding guidé",
            "order": 1
        },
        {
            "number": "2",
            "icon": "ImagePlus",
            "title": "Déclarez vos récoltes",
            "description": "Ajoutez photos, certifications et lancez des enchères pour maximiser vos ventes",
            "order": 2
        },
        {
            "number": "3",
            "icon": "TrendingUp",
            "title": "Gagnez plus",
            "description": "Recevez des primes carbone, accédez aux acheteurs premium et suivez tout en temps réel",
            "order": 3
        }
    ]
    await db.steps.insert_many(steps)
    print(f"✓ Seeded {len(steps)} steps")
    
    # Seed Crops
    crops = [
        {
            "icon": "🍫",
            "title": "Cacao",
            "locations": "Bouaflé, Daloa, Soubré",
            "color": "from-amber-600 to-amber-800",
            "order": 1
        },
        {
            "icon": "☕",
            "title": "Café",
            "locations": "Man, Danané",
            "color": "from-amber-700 to-amber-900",
            "order": 2
        },
        {
            "icon": "🥜",
            "title": "Anacarde",
            "locations": "Korhogo, Boundiali",
            "color": "from-orange-600 to-orange-800",
            "order": 3
        },
        {
            "icon": "🌳",
            "title": "Hévéa",
            "locations": "Grand-Lahou, Dabou",
            "color": "from-green-600 to-green-800",
            "order": 4
        },
        {
            "icon": "🌾",
            "title": "Riz",
            "locations": "Nord et Centre",
            "color": "from-yellow-600 to-yellow-800",
            "order": 5
        },
        {
            "icon": "🥬",
            "title": "Maraîchage",
            "locations": "Toute la Côte d'Ivoire",
            "color": "from-emerald-600 to-emerald-800",
            "order": 6
        }
    ]
    await db.crops.insert_many(crops)
    print(f"✓ Seeded {len(crops)} crops")
    
    # Seed Producers
    producers = [
        {
            "name": "Kouadio Yao",
            "initial": "KY",
            "crop": "Cacao",
            "location": "Soubré",
            "color": "bg-amber-600",
            "order": 1
        },
        {
            "name": "Aminata Koné",
            "initial": "AK",
            "crop": "Anacarde",
            "location": "Korhogo",
            "color": "bg-orange-600",
            "order": 2
        },
        {
            "name": "Jean Bakayoko",
            "initial": "JB",
            "crop": "Café",
            "location": "Man",
            "color": "bg-amber-700",
            "order": 3
        },
        {
            "name": "Fatou Sangaré",
            "initial": "FS",
            "crop": "Maraîchage",
            "location": "Abidjan",
            "color": "bg-emerald-600",
            "order": 4
        }
    ]
    await db.producers.insert_many(producers)
    print(f"✓ Seeded {len(producers)} producers")
    
    # Seed Testimonials
    testimonials = [
        {
            "text": "Grâce à GreenLink, j'ai augmenté mes revenus de 40% avec les primes carbone.",
            "author": "Kouadio Yao",
            "role": "Producteur de cacao, Soubré",
            "initial": "K",
            "color": "bg-amber-600",
            "order": 1
        },
        {
            "text": "La traçabilité nous a permis d'accéder aux marchés européens premium.",
            "author": "Aminata Koné",
            "role": "Coopérative COOP-CA, Daloa",
            "initial": "A",
            "color": "bg-emerald-600",
            "order": 2
        }
    ]
    await db.testimonials.insert_many(testimonials)
    print(f"✓ Seeded {len(testimonials)} testimonials")
    
    # Seed Pricing Plans
    pricing_plans = [
        {
            "name": "Producteurs",
            "price": "GRATUIT",
            "period": "",
            "popular": False,
            "features": [
                "Profil producteur vérifié",
                "Vente de récoltes illimitée",
                "Crédits carbone illimités",
                "Messagerie & contrats",
                "Formation gratuite",
                "Alertes prix",
                "Accès boutique intrants"
            ],
            "cta": "Inscription gratuite",
            "ctaVariant": "outline",
            "order": 1
        },
        {
            "name": "Acheteurs",
            "price": "49 000 XOF",
            "period": "/mois",
            "badge": "1 mois gratuit",
            "popular": True,
            "features": [
                "Recommandations IA",
                "Comparateur avancé",
                "Filtres granulaires",
                "Analytics détaillés",
                "Export de données",
                "Support prioritaire",
                "Badge vérifié"
            ],
            "cta": "Essayer gratuitement",
            "ctaVariant": "default",
            "order": 2
        },
        {
            "name": "Entreprises RSE",
            "price": "Sur devis",
            "period": "",
            "badge": "15 jours gratuits",
            "popular": False,
            "features": [
                "15 jours d'essai gratuit",
                "Achat credits carbone certifies",
                "Certificats de conformite",
                "Rapports ESG automatiques",
                "Tracabilite complete parcelle",
                "Tableau de bord impact",
                "Accompagnement RSE dedie"
            ],
            "cta": "Demander un devis",
            "ctaVariant": "outline",
            "order": 3
        },
        {
            "name": "Fournisseurs",
            "price": "Sur devis",
            "period": "",
            "badge": "15 jours gratuits",
            "popular": False,
            "features": [
                "15 jours d'essai gratuit",
                "Boutique en ligne dediee",
                "Gestion catalogue produits",
                "Systeme de commandes integre",
                "Statistiques de ventes",
                "Notifications temps reel",
                "Support marchand dedie"
            ],
            "cta": "Essai gratuit 15 jours",
            "ctaVariant": "outline",
            "order": 4
        }
    ]
    await db.pricing_plans.insert_many(pricing_plans)
    print(f"✓ Seeded {len(pricing_plans)} pricing plans")
    
    print("\n🎉 Database seeding completed successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
