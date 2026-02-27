#!/usr/bin/env python3
"""
Seed realistic data for the Super Admin Dashboard
High-value metrics for governments, World Bank, IMF, WTO, etc.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta
import random

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Regions of Côte d'Ivoire
REGIONS = [
    "Gôh-Djiboua", "Haut-Sassandra", "Marahoué", "Worodougou", 
    "Bafing", "Tonkpi", "Guémon", "Cavally", "San-Pédro", "Nawa",
    "Gbôklé", "Lôh-Djiboua", "Agnéby-Tiassa", "La Mé", "Sud-Comoé"
]

VILLAGES = [
    "Gagnoa", "Daloa", "Soubré", "San-Pédro", "Divo", "Lakota",
    "Issia", "Oumé", "Sinfra", "Vavoua", "Duékoué", "Guiglo",
    "Tabou", "Sassandra", "Fresco", "Grand-Lahou", "Dabou"
]

CROPS = ["Cacao", "Café Robusta", "Café Arabica", "Anacarde", "Hévéa", "Palmier à huile"]

async def seed_data():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['greenlink_production']
    
    print("🌱 Seeding realistic data for Super Admin Dashboard...")
    print("=" * 60)
    
    # 1. Create Farmers (Producteurs)
    print("\n👨‍🌾 Creating farmers...")
    farmers = []
    first_names_m = ["Konan", "Kouassi", "Yao", "Koffi", "Aka", "Kouamé", "Brou", "N'Guessan", "Assi", "Tra"]
    first_names_f = ["Adjoua", "Akissi", "Amenan", "Aya", "Lou", "Affoué", "Tanoh", "Bla", "Marie", "Jeanne"]
    last_names = ["Koffi", "Kouadio", "Yeboua", "N'Dri", "Gnamien", "Achi", "Ehui", "Dje", "Gbagbo", "Ouattara"]
    
    for i in range(150):
        is_female = random.random() < 0.35
        first_name = random.choice(first_names_f if is_female else first_names_m)
        last_name = random.choice(last_names)
        age = random.randint(22, 65)
        
        farmer = {
            'email': f'farmer{i+1}@greenlink.ci',
            'phone_number': f'+22507{random.randint(10000000, 99999999)}',
            'full_name': f'{first_name} {last_name}',
            'user_type': 'producteur',
            'hashed_password': pwd_context.hash('password123'),
            'is_verified': True,
            'is_active': True,
            'gender': 'F' if is_female else 'M',
            'age': age,
            'village': random.choice(VILLAGES),
            'region': random.choice(REGIONS),
            'has_mobile_money': random.random() < 0.78,
            'has_bank_account': random.random() < 0.45,
            'created_at': datetime.utcnow() - timedelta(days=random.randint(30, 365)),
            'updated_at': datetime.utcnow()
        }
        farmers.append(farmer)
    
    await db.users.insert_many(farmers)
    print(f"   ✅ Created {len(farmers)} farmers")
    
    # 2. Create Cooperatives
    print("\n🤝 Creating cooperatives...")
    cooperatives = []
    coop_names = [
        "COOP-GAGNOA", "COOP-DALOA", "COOP-SOUBRE", "COOP-SANPEDRO",
        "COOP-DIVO", "COOP-ISSIA", "COOP-OUME", "COOP-SINFRA"
    ]
    
    for i, name in enumerate(coop_names):
        coop = {
            'email': f'{name.lower()}@greenlink.ci',
            'phone_number': f'+22505{random.randint(10000000, 99999999)}',
            'full_name': f'Coopérative Agricole de {name.split("-")[1].title()}',
            'user_type': 'cooperative',
            'hashed_password': pwd_context.hash('password123'),
            'is_verified': True,
            'is_active': True,
            'coop_name': name,
            'coop_code': f'CI-{name.split("-")[1][:3].upper()}-{i+1:03d}',
            'certifications': random.sample(['Rainforest Alliance', 'UTZ', 'Fairtrade', 'Bio'], k=random.randint(1, 3)),
            'commission_rate': 0.10,
            'region': REGIONS[i % len(REGIONS)],
            'created_at': datetime.utcnow() - timedelta(days=random.randint(100, 500)),
            'updated_at': datetime.utcnow()
        }
        cooperatives.append(coop)
    
    await db.users.insert_many(cooperatives)
    print(f"   ✅ Created {len(cooperatives)} cooperatives")
    
    # 3. Create Parcels
    print("\n🗺️ Creating parcels...")
    parcels = []
    farmer_ids = [str(f.get('_id', '')) for f in await db.users.find({'user_type': 'producteur'}).to_list(200)]
    
    for i in range(250):
        crop = random.choice(CROPS[:3])  # Focus on Cacao, Café
        area = round(random.uniform(0.5, 8.0), 2)
        carbon_score = round(random.uniform(5.5, 9.8), 1)
        
        parcel = {
            'farmer_id': random.choice(farmer_ids) if farmer_ids else f'farmer_{i}',
            'location': f'Parcelle {i+1}',
            'village': random.choice(VILLAGES),
            'region': random.choice(REGIONS),
            'area_hectares': area,
            'crop_type': crop,
            'carbon_score': carbon_score,
            'co2_captured_tonnes': round(area * carbon_score * 2.5, 2),
            'gps_coordinates': {
                'lat': round(random.uniform(5.0, 8.0), 6),
                'lng': round(random.uniform(-8.0, -3.0), 6)
            } if random.random() < 0.85 else None,
            'certification': random.choice(['Rainforest Alliance', 'UTZ', 'Fairtrade', 'Bio', None]),
            'eudr_compliant': random.random() < 0.92,
            'deforestation_free': True,
            'last_satellite_check': datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            'created_at': datetime.utcnow() - timedelta(days=random.randint(30, 400)),
            'updated_at': datetime.utcnow()
        }
        parcels.append(parcel)
    
    await db.parcels.insert_many(parcels)
    print(f"   ✅ Created {len(parcels)} parcels")
    
    # 4. Create Harvests
    print("\n🌿 Creating harvests...")
    harvests = []
    
    for i in range(300):
        crop = random.choice(CROPS[:3])
        harvest = {
            'farmer_id': random.choice(farmer_ids) if farmer_ids else f'farmer_{i}',
            'crop_type': crop,
            'quantity_kg': random.randint(200, 2500),
            'quality_grade': random.choice(['A', 'A', 'A', 'B', 'B', 'C']),
            'harvest_date': datetime.utcnow() - timedelta(days=random.randint(1, 180)),
            'price_per_kg': {
                'Cacao': random.randint(1200, 1500),
                'Café Robusta': random.randint(1500, 1800),
                'Café Arabica': random.randint(2500, 3200),
                'Anacarde': random.randint(750, 950)
            }.get(crop, 1000),
            'certification': random.choice(['Rainforest Alliance', 'UTZ', 'Fairtrade', None]),
            'created_at': datetime.utcnow() - timedelta(days=random.randint(1, 180))
        }
        harvests.append(harvest)
    
    await db.harvests.insert_many(harvests)
    print(f"   ✅ Created {len(harvests)} harvests")
    
    # 5. Create Carbon Credits
    print("\n🌍 Creating carbon credits...")
    carbon_credits = []
    
    for i in range(85):
        status = random.choices(['available', 'sold', 'reserved'], weights=[0.3, 0.5, 0.2])[0]
        credit = {
            'credit_id': f'GLC-2026-{i+1:05d}',
            'farmer_id': random.choice(farmer_ids) if farmer_ids else f'farmer_{i}',
            'co2_tonnes': round(random.uniform(1, 15), 2),
            'price_per_tonne': random.randint(12000, 18000),
            'status': status,
            'verification_date': datetime.utcnow() - timedelta(days=random.randint(10, 100)),
            'buyer_id': f'buyer_{random.randint(1, 20)}' if status == 'sold' else None,
            'created_at': datetime.utcnow() - timedelta(days=random.randint(30, 200))
        }
        carbon_credits.append(credit)
    
    await db.carbon_credits.insert_many(carbon_credits)
    print(f"   ✅ Created {len(carbon_credits)} carbon credits")
    
    # 6. Create Carbon Purchases
    print("\n💰 Creating carbon purchases...")
    carbon_purchases = []
    buyers = ['Nestlé CI', 'Barry Callebaut', 'Cargill', 'Olam', 'Cemoi', 'Touton', 'SACO']
    
    for i in range(40):
        purchase = {
            'buyer_name': random.choice(buyers),
            'credits_purchased': random.randint(5, 50),
            'total_amount': random.randint(500000, 5000000),
            'purchase_date': datetime.utcnow() - timedelta(days=random.randint(1, 120)),
            'status': 'completed'
        }
        carbon_purchases.append(purchase)
    
    await db.carbon_purchases.insert_many(carbon_purchases)
    print(f"   ✅ Created {len(carbon_purchases)} carbon purchases")
    
    # 7. Create Orders (Marketplace)
    print("\n📦 Creating marketplace orders...")
    orders = []
    
    for i in range(120):
        order = {
            'order_id': f'ORD-2026-{i+1:05d}',
            'buyer_id': f'buyer_{random.randint(1, 30)}',
            'seller_id': random.choice(farmer_ids) if farmer_ids else f'seller_{i}',
            'items': [{'product': random.choice(CROPS[:3]), 'quantity_kg': random.randint(100, 1000)}],
            'total_amount': random.randint(100000, 2000000),
            'status': random.choice(['pending', 'confirmed', 'completed', 'completed', 'completed']),
            'created_at': datetime.utcnow() - timedelta(days=random.randint(1, 90))
        }
        orders.append(order)
    
    await db.orders.insert_many(orders)
    print(f"   ✅ Created {len(orders)} orders")
    
    # 8. Create Cooperative Members
    print("\n👥 Creating cooperative members...")
    coop_members = []
    coop_ids = [c['coop_code'] for c in cooperatives]
    
    for i in range(200):
        is_female = random.random() < 0.35
        first_name = random.choice(first_names_f if is_female else first_names_m)
        last_name = random.choice(last_names)
        
        member = {
            'coop_id': random.choice(coop_ids),
            'full_name': f'{first_name} {last_name}',
            'phone_number': f'+22507{random.randint(10000000, 99999999)}',
            'village': random.choice(VILLAGES),
            'status': random.choice(['active', 'active', 'active', 'pending_validation']),
            'gender': 'F' if is_female else 'M',
            'parcels_count': random.randint(1, 5),
            'total_hectares': round(random.uniform(1, 15), 2),
            'carbon_score': round(random.uniform(6, 9.5), 1),
            'created_at': datetime.utcnow() - timedelta(days=random.randint(30, 300))
        }
        coop_members.append(member)
    
    await db.coop_members.insert_many(coop_members)
    print(f"   ✅ Created {len(coop_members)} cooperative members")
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ SEEDING COMPLETE!")
    print("=" * 60)
    print(f"""
📊 Data Summary:
   • Farmers: {len(farmers)}
   • Cooperatives: {len(cooperatives)}
   • Parcels: {len(parcels)}
   • Harvests: {len(harvests)}
   • Carbon Credits: {len(carbon_credits)}
   • Carbon Purchases: {len(carbon_purchases)}
   • Marketplace Orders: {len(orders)}
   • Cooperative Members: {len(coop_members)}
   
🎯 Total Records: {len(farmers) + len(cooperatives) + len(parcels) + len(harvests) + len(carbon_credits) + len(carbon_purchases) + len(orders) + len(coop_members)}
""")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
