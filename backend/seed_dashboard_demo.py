"""
Seed script: Populates demo REDD+, SSRTE, ICI data for the cooperative dashboard.
Run with: python seed_dashboard_demo.py
"""
import asyncio
import random
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# Use the SAME database connection as the app
import sys
sys.path.insert(0, '.')
from database import db

VILLAGES = [
    "Daloa", "Soubre", "San Pedro", "Gagnoa", "Divo", "Issia",
    "Bouafle", "Vavoua", "Duékoue", "Guiglo", "Man", "Danane",
    "Abengourou", "Agboville", "Adzope"
]

FARMER_NAMES = [
    "Kouame Yao Jean", "Tra Bi Lou Rosalie", "Kone Aboubakar",
    "Dje Bi Tra Marcel", "Yao Akissi Marie", "Bamba Seydou",
    "Gohou Zady Pierre", "Oulai Sery Claudine", "Konan Kouadio Felix",
    "Boa Thiemele Sylvie", "Tanoh Achi Georges", "Gbagbo Nahi Jeanne",
    "Koffi Assi Olivier", "Zadi Bi Gohi Veronique", "Diabate Moussa",
    "Ehui N'Dri Simone", "Toure Ibrahim", "Kouassi Amenan Estelle",
    "Irie Bi Lou Mathieu", "Ouattara Aminata"
]

REDD_PRACTICES = [
    {"code": "AGF1", "category": "agroforesterie"}, {"code": "AGF2", "category": "agroforesterie"},
    {"code": "AGF3", "category": "agroforesterie"}, {"code": "AGF4", "category": "agroforesterie"},
    {"code": "ZD1", "category": "zero_deforestation"}, {"code": "ZD2", "category": "zero_deforestation"},
    {"code": "ZD3", "category": "zero_deforestation"}, {"code": "ZD4", "category": "zero_deforestation"},
    {"code": "SOL1", "category": "gestion_sols"}, {"code": "SOL2", "category": "gestion_sols"},
    {"code": "SOL3", "category": "gestion_sols"}, {"code": "SOL4", "category": "gestion_sols"},
    {"code": "SOL5", "category": "gestion_sols"},
    {"code": "REST1", "category": "restauration"}, {"code": "REST2", "category": "restauration"},
    {"code": "REST3", "category": "restauration"}, {"code": "REST4", "category": "restauration"},
    {"code": "TRAC1", "category": "tracabilite"}, {"code": "TRAC2", "category": "tracabilite"},
    {"code": "TRAC3", "category": "tracabilite"}, {"code": "TRAC4", "category": "tracabilite"},
]

RISK_LEVELS = ["critique", "eleve", "modere", "faible", "faible", "faible", "modere", "faible"]


async def seed():
    # Find the admin/cooperative user
    coop_user = await db.users.find_one({"email": "klenakan.eric@gmail.com"})
    if not coop_user:
        print("ERROR: Admin user not found")
        return
    coop_id = str(coop_user["_id"])
    coop_name = coop_user.get("coop_name") or coop_user.get("full_name", "Cooperative GreenLink")
    print(f"Cooperative: {coop_name} (ID: {coop_id})")

    # Clean existing demo data
    await db.coop_members.delete_many({"coop_id": coop_id, "_seed": True})
    await db.redd_tracking_visits.delete_many({"coop_id": coop_id, "_seed": True})
    await db.ars_farmer_data.delete_many({"coop_id": coop_id, "_seed": True})
    await db.ssrte_visits.delete_many({"cooperative_id": coop_id, "_seed": True})
    await db.ssrte_cases.delete_many({"cooperative_id": coop_id, "_seed": True})
    print("Cleaned previous seed data")

    # --- 1. Create cooperative members ---
    member_ids = []
    for i, name in enumerate(FARMER_NAMES):
        village = VILLAGES[i % len(VILLAGES)]
        phone = f"+22507{random.randint(10000000, 99999999)}"
        member = {
            "full_name": name,
            "phone_number": phone,
            "village": village,
            "coop_id": coop_id,
            "cooperative_id": coop_id,
            "status": "active",
            "is_activated": True,
            "code_planteur": f"PL-{random.randint(1000, 9999)}",
            "superficie_ha": round(random.uniform(1.5, 15.0), 1),
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(10, 180)),
            "_seed": True,
        }
        result = await db.coop_members.insert_one(member)
        member_ids.append({"id": str(result.inserted_id), "name": name, "phone": phone, "village": village})
    print(f"Created {len(member_ids)} cooperative members")

    # --- 2. Create REDD+ tracking visits ---
    redd_visits_count = 0
    agent_name = "Tra Bi Agent Terrain"
    for i, m in enumerate(member_ids[:15]):
        # Generate random practices for this visit
        num_practices = random.randint(12, 21)
        practices_to_check = random.sample(REDD_PRACTICES, num_practices)
        practices_verified = []
        total_conforme = 0
        total_partiel = 0
        total_nc = 0

        for p in practices_to_check:
            r = random.random()
            if r < 0.55:
                status = "conforme"
                total_conforme += 1
            elif r < 0.80:
                status = "partiellement"
                total_partiel += 1
            else:
                status = "non_conforme"
                total_nc += 1
            practices_verified.append({"code": p["code"], "category": p["category"], "status": status})

        total_checked = total_conforme + total_partiel + total_nc
        conformity_pct = round((total_conforme + total_partiel * 0.5) / max(total_checked, 1) * 100)

        redd_score = 0
        for p in practices_verified:
            weight = {"agroforesterie": 0.75, "zero_deforestation": 0.5, "gestion_sols": 0.5,
                      "restauration": 0.375, "tracabilite": 0.25}.get(p["category"], 0.3)
            if p["status"] == "conforme":
                redd_score += weight
            elif p["status"] == "partiellement":
                redd_score += weight * 0.5
        redd_score = min(round(redd_score, 1), 10)

        if redd_score >= 8:
            redd_level = "Excellence"
        elif redd_score >= 6:
            redd_level = "Avance"
        elif redd_score >= 4:
            redd_level = "Intermediaire"
        elif redd_score >= 2:
            redd_level = "Debutant"
        else:
            redd_level = "Non conforme"

        visit_doc = {
            "farmer_id": m["id"],
            "farmer_name": m["name"],
            "farmer_phone": m["phone"],
            "coop_id": coop_id,
            "coop_name": coop_name,
            "agent_id": coop_id,
            "agent_name": agent_name,
            "date_visite": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 90))).isoformat(),
            "practices_verified": practices_verified,
            "total_checked": total_checked,
            "total_conforme": total_conforme,
            "total_partiel": total_partiel,
            "total_non_conforme": total_nc,
            "conformity_pct": conformity_pct,
            "redd_score": redd_score,
            "redd_level": redd_level,
            "superficie_verifiee": round(random.uniform(2.0, 12.0), 1),
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60)),
            "_seed": True,
        }
        await db.redd_tracking_visits.insert_one(visit_doc)
        redd_visits_count += 1
    print(f"Created {redd_visits_count} REDD+ tracking visits")

    # --- 3. Create ARS farmer data ---
    ars_count = 0
    for m in member_ids[:18]:
        farmer_data = {
            "farmer_id": m["id"],
            "farmer_name": m["name"],
            "coop_id": coop_id,
            "cooperative_id": coop_id,
            "agroforesterie": random.choice(["oui", "oui", "oui", "non"]),
            "compost": random.choice(["oui", "oui", "non", "non"]),
            "couverture_sol": random.choice(["oui", "oui", "oui", "non"]),
            "brulage": random.choice(["non", "non", "non", "oui"]),
            "updated_at": datetime.now(timezone.utc),
            "_seed": True,
        }
        await db.ars_farmer_data.insert_one(farmer_data)
        ars_count += 1
    print(f"Created {ars_count} ARS farmer data records")

    # --- 4. Create SSRTE visits ---
    ssrte_count = 0
    for i, m in enumerate(member_ids[:16]):
        risk = RISK_LEVELS[i % len(RISK_LEVELS)]
        enfants = 0
        if risk == "critique":
            enfants = random.randint(2, 4)
        elif risk == "eleve":
            enfants = random.randint(1, 2)
        elif risk == "modere":
            enfants = random.choice([0, 1])

        visit_doc = {
            "farmer_id": m["id"],
            "member_id": m["id"],
            "member_name": m["name"],
            "agent_id": coop_id,
            "agent_name": agent_name,
            "cooperative_id": coop_id,
            "coop_id": coop_id,
            "visit_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60))).isoformat(),
            "household_size": random.randint(4, 12),
            "children_count": random.randint(1, 6),
            "children_at_risk": enfants,
            "enfants_observes_travaillant": enfants,
            "niveau_risque": risk,
            "risk_level": risk,
            "living_conditions": random.choice(["acceptable", "precaire", "difficile"]),
            "has_piped_water": random.choice([True, False]),
            "has_electricity": random.choice([True, False]),
            "status": "completed",
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60)),
            "_seed": True,
        }
        await db.ssrte_visits.insert_one(visit_doc)
        ssrte_count += 1
    print(f"Created {ssrte_count} SSRTE visits")

    # --- 5. Create SSRTE/ICI remediation cases ---
    cases_count = 0
    statuses = ["in_progress", "in_progress", "resolved", "resolved", "resolved", "open", "open"]
    for i in range(7):
        m = member_ids[i]
        case_doc = {
            "farmer_id": m["id"],
            "farmer_name": m["name"],
            "cooperative_id": coop_id,
            "coop_id": coop_id,
            "case_type": random.choice(["child_labor", "hazardous_work", "school_dropout"]),
            "severity": random.choice(["high", "medium", "low"]),
            "status": statuses[i],
            "description": f"Cas identifie pour {m['name']} a {m['village']}",
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(5, 90)),
            "resolved_at": datetime.now(timezone.utc) if statuses[i] == "resolved" else None,
            "_seed": True,
        }
        await db.ssrte_cases.insert_one(case_doc)
        cases_count += 1
    print(f"Created {cases_count} SSRTE/ICI remediation cases")

    print("\n=== Seed complete ===")
    print(f"Members: {len(member_ids)}, REDD+ visits: {redd_visits_count}, ARS data: {ars_count}")
    print(f"SSRTE visits: {ssrte_count}, ICI cases: {cases_count}")


if __name__ == "__main__":
    asyncio.run(seed())
