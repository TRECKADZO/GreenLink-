"""
Cooperative Agents Management Routes
GreenLink Agritech - Côte d'Ivoire
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative, coop_id_query, AgentCreate, FarmerAssignRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cooperative", tags=["Cooperative Agents"])


@router.get("/agents")
async def get_coop_agents(current_user: dict = Depends(get_current_user)):
    """Liste des agents terrain"""
    verify_cooperative(current_user)
    
    coop_id = current_user["_id"]
    coop_oid = ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None
    agents_or = [{"coop_id": coop_id}]
    if coop_oid:
        agents_or.append({"coop_id": coop_oid})
    
    agents = await db.coop_agents.find({"$or": agents_or}).to_list(100)
    
    return [{
        "id": str(a["_id"]),
        "full_name": a.get("full_name", ""),
        "phone_number": a.get("phone_number", ""),
        "email": a.get("email", ""),
        "zone": a.get("zone", ""),
        "village_coverage": a.get("village_coverage", []),
        "members_onboarded": a.get("members_onboarded", 0),
        "parcels_declared": a.get("parcels_declared", 0),
        "ssrte_visits_count": a.get("ssrte_visits_count", 0),
        "is_active": a.get("is_active", True),
        "account_activated": a.get("account_activated", False),
        "user_id": a.get("user_id"),
        "assigned_farmers": [str(f) for f in a.get("assigned_farmers", [])],
        "assigned_farmers_count": len(a.get("assigned_farmers", [])),
        "created_at": a.get("created_at", datetime.utcnow()).isoformat() if isinstance(a.get("created_at"), datetime) else str(a.get("created_at", ""))
    } for a in agents]

@router.post("/agents")
async def create_agent(
    agent: AgentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Ajouter un agent terrain"""
    verify_cooperative(current_user)
    
    existing_agent = await db.coop_agents.find_one({"phone_number": agent.phone_number})
    if existing_agent:
        raise HTTPException(status_code=400, detail="Un agent avec ce numéro de téléphone existe déjà")
    
    existing_user = await db.users.find_one({"phone_number": agent.phone_number})
    if existing_user:
        raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà associé à un compte utilisateur")
    
    agent_doc = {
        "coop_id": current_user["_id"],
        "coop_name": current_user.get("coop_name") or current_user.get("full_name"),
        "full_name": agent.full_name,
        "phone_number": agent.phone_number,
        "email": agent.email,
        "zone": agent.zone,
        "village_coverage": agent.village_coverage,
        "members_onboarded": 0,
        "parcels_declared": 0,
        "ssrte_visits_count": 0,
        "is_active": True,
        "account_activated": False,
        "user_id": None,
        "created_at": datetime.utcnow()
    }
    
    result = await db.coop_agents.insert_one(agent_doc)
    
    return {
        "message": "Agent ajouté avec succès. L'agent peut maintenant activer son compte via l'application mobile avec son numéro de téléphone.",
        "agent_id": str(result.inserted_id),
        "activation_instructions": f"L'agent {agent.full_name} doit télécharger l'application GreenLink et utiliser le numéro {agent.phone_number} pour activer son compte."
    }


@router.put("/agents/{agent_id}/activate")
async def activate_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Valider/activer un agent terrain (statut En attente -> Activé)"""
    coop_id = current_user["_id"]

    agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id), "coop_id": coop_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent non trouvé")

    if agent.get("account_activated"):
        return {"message": "Agent déjà activé"}

    await db.coop_agents.update_one(
        {"_id": ObjectId(agent_id)},
        {"$set": {"account_activated": True, "is_active": True}}
    )

    # Aussi activer le compte utilisateur lié si existant
    if agent.get("user_id"):
        await db.users.update_one(
            {"_id": ObjectId(agent["user_id"])},
            {"$set": {"is_active": True, "account_activated": True}}
        )

    return {"message": f"Agent {agent.get('full_name', '')} activé avec succès"}



@router.get("/agents/{agent_id}/assigned-farmers")
async def get_assigned_farmers(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Liste des fermiers assignés à un agent terrain"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="ID agent invalide")

    agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent non trouvé")
    if str(agent.get("coop_id")) != str(coop_id) and agent.get("coop_id") != (ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None):
        raise HTTPException(status_code=403, detail="Cet agent n'appartient pas à votre coopérative")

    assigned_ids = agent.get("assigned_farmers", [])
    if not assigned_ids:
        return {"agent_id": agent_id, "agent_name": agent.get("full_name", ""), "farmers": [], "total": 0}

    oid_list = [ObjectId(fid) for fid in assigned_ids if ObjectId.is_valid(str(fid))]
    members = await db.coop_members.find({"_id": {"$in": oid_list}}).to_list(500)

    farmers = [{
        "id": str(m["_id"]),
        "full_name": m.get("full_name", ""),
        "phone_number": m.get("phone_number", ""),
        "village": m.get("village", ""),
        "is_active": m.get("is_active", True),
        "parcels_count": m.get("parcels_count", 0),
    } for m in members]

    return {"agent_id": agent_id, "agent_name": agent.get("full_name", ""), "farmers": farmers, "total": len(farmers)}


@router.post("/agents/{agent_id}/assign-farmers")
async def assign_farmers_to_agent(agent_id: str, body: FarmerAssignRequest, current_user: dict = Depends(get_current_user)):
    """Assigner des fermiers (membres) à un agent terrain"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="ID agent invalide")

    agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent non trouvé")
    if str(agent.get("coop_id")) != str(coop_id) and agent.get("coop_id") != (ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None):
        raise HTTPException(status_code=403, detail="Cet agent n'appartient pas à votre coopérative")

    if not body.farmer_ids:
        raise HTTPException(status_code=400, detail="La liste de fermiers ne peut pas être vide")

    coop_q = coop_id_query(coop_id)
    valid_ids = []
    for fid in body.farmer_ids:
        if not ObjectId.is_valid(fid):
            continue
        member = await db.coop_members.find_one({"_id": ObjectId(fid), **coop_q})
        if member:
            valid_ids.append(fid)

    if not valid_ids:
        raise HTTPException(status_code=400, detail="Aucun fermier valide trouvé dans la coopérative")

    await db.coop_agents.update_many(
        {"coop_id": {"$in": [coop_id, ObjectId(coop_id) if ObjectId.is_valid(coop_id) else coop_id]}},
        {"$pull": {"assigned_farmers": {"$in": valid_ids}}}
    )

    await db.coop_agents.update_one(
        {"_id": ObjectId(agent_id)},
        {"$addToSet": {"assigned_farmers": {"$each": valid_ids}}}
    )

    updated_agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    new_count = len(updated_agent.get("assigned_farmers", []))

    return {
        "message": f"{len(valid_ids)} fermier(s) assigné(s) à {agent.get('full_name', 'agent')}",
        "assigned_count": new_count,
        "assigned_ids": valid_ids
    }


@router.post("/agents/{agent_id}/unassign-farmers")
async def unassign_farmers_from_agent(agent_id: str, body: FarmerAssignRequest, current_user: dict = Depends(get_current_user)):
    """Retirer l'attribution de fermiers d'un agent"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="ID agent invalide")

    agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent non trouvé")
    if str(agent.get("coop_id")) != str(coop_id) and agent.get("coop_id") != (ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None):
        raise HTTPException(status_code=403, detail="Cet agent n'appartient pas à votre coopérative")

    if not body.farmer_ids:
        raise HTTPException(status_code=400, detail="La liste de fermiers ne peut pas être vide")

    await db.coop_agents.update_one(
        {"_id": ObjectId(agent_id)},
        {"$pull": {"assigned_farmers": {"$in": body.farmer_ids}}}
    )

    updated_agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    remaining = len(updated_agent.get("assigned_farmers", []))

    return {
        "message": f"{len(body.farmer_ids)} fermier(s) retiré(s) de {agent.get('full_name', 'agent')}",
        "remaining_count": remaining
    }


@router.get("/agents-progress")
async def get_agents_progress(current_user: dict = Depends(get_current_user)):
    """Tableau de bord de progression des agents - montre quels fermiers sont a 5/5"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    coop_oid = ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None

    agents_or = [{"coop_id": coop_id}]
    if coop_oid:
        agents_or.append({"coop_id": coop_oid})
    agents = await db.coop_agents.find({"$or": agents_or}).to_list(100)

    if not agents:
        return {"agents": [], "summary": {"total_agents": 0, "total_farmers": 0, "farmers_5_5": 0, "average_progress": 0}}

    agent_user_ids = [a.get("user_id") for a in agents if a.get("user_id")]
    agent_users = {}
    for uid in agent_user_ids:
        if uid and ObjectId.is_valid(str(uid)):
            u = await db.users.find_one({"_id": ObjectId(uid)}, {"full_name": 1, "phone_number": 1})
            if u:
                agent_users[str(uid)] = u

    all_farmer_ids = []
    for a in agents:
        all_farmer_ids.extend(a.get("assigned_farmers", []))
    all_farmer_ids = list(set(all_farmer_ids))

    if not all_farmer_ids:
        agent_results = []
        for a in agents:
            uid = a.get("user_id", "")
            au = agent_users.get(str(uid), {})
            agent_results.append({
                "id": str(a["_id"]),
                "full_name": a.get("full_name") or au.get("full_name", "Agent"),
                "phone_number": a.get("phone_number") or au.get("phone_number", ""),
                "zone": a.get("zone", ""),
                "assigned_count": 0,
                "farmers_5_5": 0,
                "progress_percent": 0,
                "farmers": []
            })
        return {"agents": agent_results, "summary": {"total_agents": len(agents), "total_farmers": 0, "farmers_5_5": 0, "average_progress": 0}}

    oid_list = [ObjectId(fid) for fid in all_farmer_ids if ObjectId.is_valid(str(fid))]
    members_list = await db.coop_members.find({"_id": {"$in": oid_list}}).to_list(500)
    members_map = {str(m["_id"]): m for m in members_list}

    ici_docs = await db.ici_profiles.find({"farmer_id": {"$in": all_farmer_ids}}, {"farmer_id": 1, "taille_menage": 1}).to_list(1000)
    ici_set = {d["farmer_id"] for d in ici_docs if d.get("taille_menage") and d["taille_menage"] > 0}

    ssrte_agg = await db.ssrte_visits.aggregate([
        {"$match": {"farmer_id": {"$in": all_farmer_ids}}},
        {"$group": {"_id": "$farmer_id", "count": {"$sum": 1}}}
    ]).to_list(500)
    ssrte_set = {s["_id"] for s in ssrte_agg if s["count"] > 0}

    parcel_agg = await db.parcels.aggregate([
        {"$match": {"$or": [
            {"farmer_id": {"$in": all_farmer_ids}},
            {"member_id": {"$in": all_farmer_ids}}
        ]}},
        {"$group": {"_id": {"$ifNull": ["$member_id", "$farmer_id"]}, "count": {"$sum": 1}}}
    ]).to_list(500)
    parcel_set = set()
    for p in parcel_agg:
        pid = str(p["_id"]) if p["_id"] else None
        if pid and p["count"] > 0:
            parcel_set.add(pid)

    photo_agg = await db.geotagged_photos.aggregate([
        {"$match": {"farmer_id": {"$in": all_farmer_ids}}},
        {"$group": {"_id": "$farmer_id", "count": {"$sum": 1}}}
    ]).to_list(500)
    photo_set = {p["_id"] for p in photo_agg if p["count"] > 0}

    total_5_5 = 0
    total_completed_forms = 0
    total_farmers_count = 0
    agent_results = []

    for a in agents:
        uid = a.get("user_id", "")
        au = agent_users.get(str(uid), {})
        assigned = a.get("assigned_farmers", [])
        farmers_detail = []
        agent_5_5 = 0

        for fid in assigned:
            member = members_map.get(fid, {})
            registered = member.get("status") == "active" or member.get("is_active", False)
            ici_done = fid in ici_set
            ssrte_done = fid in ssrte_set
            parcels_done = fid in parcel_set
            photos_done = fid in photo_set

            completed = sum([registered, ici_done, ssrte_done, parcels_done, photos_done])
            if completed == 5:
                agent_5_5 += 1
            total_completed_forms += completed

            farmers_detail.append({
                "id": fid,
                "full_name": member.get("full_name", "Inconnu"),
                "village": member.get("village", ""),
                "completed": completed,
                "total": 5,
                "percentage": round(completed / 5 * 100),
                "forms": {
                    "register": registered,
                    "ici": ici_done,
                    "ssrte": ssrte_done,
                    "parcels": parcels_done,
                    "photos": photos_done
                }
            })

        total_5_5 += agent_5_5
        total_farmers_count += len(assigned)

        farmers_detail.sort(key=lambda f: f["completed"])

        agent_results.append({
            "id": str(a["_id"]),
            "full_name": a.get("full_name") or au.get("full_name", "Agent"),
            "phone_number": a.get("phone_number") or au.get("phone_number", ""),
            "zone": a.get("zone", ""),
            "assigned_count": len(assigned),
            "farmers_5_5": agent_5_5,
            "progress_percent": round(total_completed_forms / (len(assigned) * 5) * 100) if assigned else 0,
            "farmers": farmers_detail
        })

    agent_results.sort(key=lambda a: a["progress_percent"])

    avg_progress = round(total_completed_forms / (total_farmers_count * 5) * 100) if total_farmers_count > 0 else 0

    return {
        "agents": agent_results,
        "summary": {
            "total_agents": len(agents),
            "total_farmers": total_farmers_count,
            "farmers_5_5": total_5_5,
            "average_progress": avg_progress
        }
    }
