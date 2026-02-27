import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

load_dotenv()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

async def seed_greenlink():
    print("🌱 Seeding GreenLink data...")
    
    # Seed carbon credits
    carbon_credits = [
        {
            "credit_type": "agroforesterie",
            "quantity_tonnes_co2": 500,
            "price_per_tonne": 12000,
            "vintage_year": 2024,
            "verification_standard": "Verra",
            "project_location": "Bouaflé, Côte d'Ivoire",
            "project_description": "Projet d'agroforesterie cacao avec 2500 cacaoyers et arbres d'ombrage",
            "impact_metrics": {
                "trees_planted": 5000,
                "farmers_benefited": 150,
                "women_percentage": 45,
                "area_hectares": 250
            },
            "seller_id": "platform",
            "seller_type": "platform",
            "status": "available",
            "certificate_number": "VCS2024-CI-001",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "credit_type": "agriculture_regenerative",
            "quantity_tonnes_co2": 300,
            "price_per_tonne": 15000,
            "vintage_year": 2024,
            "verification_standard": "Gold_Standard",
            "project_location": "Daloa, Côte d'Ivoire",
            "project_description": "Agriculture régénérative anacarde - pratiques zéro labour et couverture végétale permanente",
            "impact_metrics": {
                "trees_planted": 3000,
                "farmers_benefited": 80,
                "women_percentage": 52,
                "area_hectares": 150
            },
            "seller_id": "platform",
            "seller_type": "platform",
            "status": "available",
            "certificate_number": "GS2024-CI-002",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "credit_type": "reforestation",
            "quantity_tonnes_co2": 1000,
            "price_per_tonne": 18000,
            "vintage_year": 2023,
            "verification_standard": "Plan_Vivo",
            "project_location": "Soubré, Côte d'Ivoire",
            "project_description": "Reforestation zones dégradées avec essences locales et cacaoyers",
            "impact_metrics": {
                "trees_planted": 10000,
                "farmers_benefited": 200,
                "women_percentage": 38,
                "area_hectares": 500
            },
            "seller_id": "platform",
            "seller_type": "cooperative",
            "status": "available",
            "certificate_number": "PV2023-CI-003",
            "created_at": datetime.utcnow() - timedelta(days=180),
            "updated_at": datetime.utcnow()
        }
    ]
    
    await db.carbon_credits.delete_many({})
    await db.carbon_credits.insert_many(carbon_credits)
    print(f"✓ Seeded {len(carbon_credits)} carbon credits")
    
    print("\n🎉 GreenLink data seeding completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_greenlink())
