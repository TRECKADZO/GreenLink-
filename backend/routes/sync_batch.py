"""
Batch Sync API — accepts offline changes in batches, applies last-write-wins
conflict resolution based on timestamps.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import logging

router = APIRouter(prefix="/api/sync", tags=["sync"])
logger = logging.getLogger(__name__)

# ─── Auth dependency (reuse from auth module) ──────────────────
from routes.auth import get_current_user


# ─── Models ────────────────────────────────────────────────────
class SyncAction(BaseModel):
    action_type: str            # CREATE_PARCEL, UPDATE_PARCEL, CREATE_HARVEST, etc.
    entity_table: str           # parcels, harvests, orders, payments
    entity_id: Optional[str] = None
    payload: dict
    client_timestamp: str       # ISO 8601 — the moment the user made the change


class BatchSyncRequest(BaseModel):
    actions: List[SyncAction]
    device_id: Optional[str] = None


class ActionResult(BaseModel):
    index: int
    entity_id: Optional[str] = None
    status: str                 # "synced" | "conflict_server_wins" | "conflict_client_wins" | "error"
    message: Optional[str] = None
    server_data: Optional[dict] = None   # returned when server wins conflict


class BatchSyncResponse(BaseModel):
    total: int
    synced: int
    conflicts: int
    errors: int
    results: List[ActionResult]
    server_time: str


# ─── Collection mapping ───────────────────────────────────────
TABLE_TO_COLLECTION = {
    "parcels": "parcels",
    "harvests": "harvests",
    "orders": "orders",
    "payments": "payment_requests",
    "products": "products",
    "notifications": "notifications",
    "messages": "messages",
    "carbon_scores": "redd_tracking",
}

# Fields that identify the owner of a record
TABLE_OWNER_FIELD = {
    "parcels": "farmer_id",
    "harvests": "farmer_id",
    "orders": "customer_id",
    "payments": "farmer_id",
}


# ─── Last-Write-Wins helper ───────────────────────────────────
def parse_ts(ts_str):
    """Parse ISO timestamp to datetime. Returns epoch if unparseable."""
    if not ts_str:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.min.replace(tzinfo=timezone.utc)


def server_timestamp_field(doc):
    """Find the best timestamp field from a server document."""
    for field in ("updated_at", "modified_at", "created_at"):
        val = doc.get(field)
        if val:
            return parse_ts(val if isinstance(val, str) else val.isoformat())
    return datetime.min.replace(tzinfo=timezone.utc)


# ─── Route handler ─────────────────────────────────────────────
@router.post("/batch", response_model=BatchSyncResponse)
async def batch_sync(req: BatchSyncRequest, user=Depends(get_current_user)):
    from database import db

    now_utc = datetime.now(timezone.utc)
    results: List[ActionResult] = []
    synced = 0
    conflicts = 0
    errors = 0

    for idx, action in enumerate(req.actions):
        try:
            result = await _process_action(db, user, action, idx, now_utc)
            results.append(result)
            if result.status == "synced" or result.status == "conflict_client_wins":
                synced += 1
            elif result.status.startswith("conflict"):
                conflicts += 1
            else:
                errors += 1
        except Exception as e:
            logger.error(f"[batch_sync] action {idx} error: {e}")
            results.append(ActionResult(
                index=idx,
                entity_id=action.entity_id,
                status="error",
                message=str(e)[:200],
            ))
            errors += 1

    return BatchSyncResponse(
        total=len(req.actions),
        synced=synced,
        conflicts=conflicts,
        errors=errors,
        results=results,
        server_time=now_utc.isoformat(),
    )


async def _process_action(db, user, action: SyncAction, idx: int, now_utc: datetime) -> ActionResult:
    collection_name = TABLE_TO_COLLECTION.get(action.entity_table)
    if not collection_name:
        return ActionResult(index=idx, status="error", message=f"Unknown table: {action.entity_table}")

    coll = db[collection_name]
    payload = {**action.payload}
    client_ts = parse_ts(action.client_timestamp)

    # Strip local-only IDs
    entity_id = action.entity_id
    if entity_id and entity_id.startswith("local_"):
        entity_id = None

    # Inject ownership
    owner_field = TABLE_OWNER_FIELD.get(action.entity_table)
    if owner_field:
        payload[owner_field] = str(user["_id"])

    # ── CREATE actions ──────────────────────────────────────────
    if action.action_type.startswith("CREATE"):
        payload["created_at"] = now_utc.isoformat()
        payload["updated_at"] = now_utc.isoformat()
        # Remove any _id / id to let Mongo generate one
        payload.pop("_id", None)
        payload.pop("id", None)

        result = await coll.insert_one(payload)
        new_id = str(result.inserted_id)
        return ActionResult(index=idx, entity_id=new_id, status="synced", message="Created")

    # ── UPDATE actions ──────────────────────────────────────────
    if action.action_type.startswith("UPDATE") and entity_id:
        # Find server version
        try:
            server_doc = await coll.find_one({"_id": ObjectId(entity_id)})
        except Exception:
            server_doc = await coll.find_one({"id": entity_id})

        if not server_doc:
            # Entity doesn't exist on server → create it
            payload["created_at"] = now_utc.isoformat()
            payload["updated_at"] = now_utc.isoformat()
            payload.pop("_id", None)
            payload.pop("id", None)
            result = await coll.insert_one(payload)
            return ActionResult(index=idx, entity_id=str(result.inserted_id), status="synced", message="Created (was missing)")

        server_ts = server_timestamp_field(server_doc)

        # ── Last-Write-Wins ──
        if client_ts >= server_ts:
            # Client wins → apply update
            payload["updated_at"] = now_utc.isoformat()
            payload.pop("_id", None)
            payload.pop("id", None)
            await coll.update_one(
                {"_id": server_doc["_id"]},
                {"$set": payload}
            )
            return ActionResult(
                index=idx,
                entity_id=entity_id,
                status="conflict_client_wins" if server_ts > datetime.min.replace(tzinfo=timezone.utc) else "synced",
                message="Client version applied",
            )
        else:
            # Server wins → return server data for client to update locally
            server_doc.pop("_id", None)
            return ActionResult(
                index=idx,
                entity_id=entity_id,
                status="conflict_server_wins",
                message=f"Server version is newer ({server_ts.isoformat()} > {client_ts.isoformat()})",
                server_data=_serialize_doc(server_doc),
            )

    # ── DELETE actions ──────────────────────────────────────────
    if action.action_type.startswith("DELETE") and entity_id:
        try:
            await coll.delete_one({"_id": ObjectId(entity_id)})
        except Exception:
            await coll.delete_one({"id": entity_id})
        return ActionResult(index=idx, entity_id=entity_id, status="synced", message="Deleted")

    return ActionResult(index=idx, status="error", message=f"Unhandled action: {action.action_type}")


def _serialize_doc(doc):
    """Convert a MongoDB doc to a JSON-safe dict."""
    clean = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            clean[k] = str(v)
        elif isinstance(v, datetime):
            clean[k] = v.isoformat()
        else:
            clean[k] = v
    return clean
