"""
Sync API — full bidirectional sync between mobile clients and server.

Endpoints:
  POST /api/sync/batch   — push offline changes (batched, last-write-wins)
  POST /api/sync/pull    — pull changes since last_sync_at per collection
  GET  /api/sync/status  — quick check: server time + change counts per table
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone
from bson import ObjectId
import logging

router = APIRouter(prefix="/api/sync", tags=["sync"])
logger = logging.getLogger(__name__)

from routes.auth import get_current_user

# ═══════════════════════════════════════════════════════════════
#  SHARED HELPERS
# ═══════════════════════════════════════════════════════════════

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

TABLE_OWNER_FIELD = {
    "parcels": "farmer_id",
    "harvests": "farmer_id",
    "orders": "customer_id",
    "payments": "farmer_id",
    "notifications": "user_id",
    "messages": None,  # special: sender_id OR receiver_id
    "carbon_scores": "farmer_id",
    "products": None,  # no owner filter — shared catalogue
}

def parse_ts(ts_str):
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
    for field in ("updated_at", "modified_at", "created_at"):
        val = doc.get(field)
        if val:
            return parse_ts(val if isinstance(val, str) else val.isoformat())
    return datetime.min.replace(tzinfo=timezone.utc)


def _serialize_doc(doc):
    """MongoDB doc → JSON-safe dict (stringify ObjectId, datetime)."""
    clean = {}
    for k, v in doc.items():
        if k == "_id":
            clean["id"] = str(v)
        elif isinstance(v, ObjectId):
            clean[k] = str(v)
        elif isinstance(v, datetime):
            clean[k] = v.isoformat()
        else:
            clean[k] = v
    return clean


async def _owner_ids(db, user):
    """Build list of IDs that could match the farmer across collections."""
    from routes.auth import normalize_phone
    uid = str(user["_id"])
    ids = [uid]
    phone = user.get("phone_number", "")
    if phone:
        variants = normalize_phone(phone)
        members = await db.coop_members.find(
            {"phone_number": {"$in": variants}}, {"_id": 1}
        ).to_list(20)
        for m in members:
            ids.append(str(m["_id"]))
    return ids


# ═══════════════════════════════════════════════════════════════
#  1.  POST /api/sync/batch  — PUSH offline changes
# ═══════════════════════════════════════════════════════════════

class SyncAction(BaseModel):
    action_type: str
    entity_table: str
    entity_id: Optional[str] = None
    payload: dict
    client_timestamp: str


class BatchSyncRequest(BaseModel):
    actions: List[SyncAction]
    device_id: Optional[str] = None


class ActionResult(BaseModel):
    index: int
    entity_id: Optional[str] = None
    status: str  # synced | conflict_server_wins | conflict_client_wins | error
    message: Optional[str] = None
    server_data: Optional[dict] = None


class BatchSyncResponse(BaseModel):
    total: int
    synced: int
    conflicts: int
    errors: int
    results: List[ActionResult]
    server_time: str


@router.post("/batch", response_model=BatchSyncResponse)
async def batch_sync(req: BatchSyncRequest, user=Depends(get_current_user)):
    from database import db

    now_utc = datetime.now(timezone.utc)
    results: List[ActionResult] = []
    synced = conflicts = errors = 0

    for idx, action in enumerate(req.actions):
        try:
            result = await _process_action(db, user, action, idx, now_utc)
            results.append(result)
            if result.status in ("synced", "conflict_client_wins"):
                synced += 1
            elif result.status.startswith("conflict"):
                conflicts += 1
            else:
                errors += 1
        except Exception as e:
            logger.error(f"[batch_sync] action {idx} error: {e}")
            results.append(ActionResult(index=idx, entity_id=action.entity_id, status="error", message=str(e)[:200]))
            errors += 1

    # Record the sync event for the device
    await db.sync_log.insert_one({
        "user_id": str(user["_id"]),
        "device_id": req.device_id,
        "direction": "push",
        "total": len(req.actions),
        "synced": synced,
        "conflicts": conflicts,
        "errors": errors,
        "timestamp": now_utc.isoformat(),
    })

    return BatchSyncResponse(
        total=len(req.actions), synced=synced, conflicts=conflicts, errors=errors,
        results=results, server_time=now_utc.isoformat(),
    )


async def _process_action(db, user, action: SyncAction, idx: int, now_utc: datetime) -> ActionResult:
    collection_name = TABLE_TO_COLLECTION.get(action.entity_table)
    if not collection_name:
        return ActionResult(index=idx, status="error", message=f"Unknown table: {action.entity_table}")

    coll = db[collection_name]
    payload = {**action.payload}
    client_ts = parse_ts(action.client_timestamp)

    entity_id = action.entity_id
    if entity_id and entity_id.startswith("local_"):
        entity_id = None

    owner_field = TABLE_OWNER_FIELD.get(action.entity_table)
    if owner_field:
        payload[owner_field] = str(user["_id"])

    # ── CREATE ────────────────────────────────────────────────
    if action.action_type.startswith("CREATE"):
        payload["created_at"] = now_utc.isoformat()
        payload["updated_at"] = now_utc.isoformat()
        payload.pop("_id", None)
        payload.pop("id", None)
        result = await coll.insert_one(payload)
        return ActionResult(index=idx, entity_id=str(result.inserted_id), status="synced", message="Created")

    # ── UPDATE ────────────────────────────────────────────────
    if action.action_type.startswith("UPDATE") and entity_id:
        try:
            server_doc = await coll.find_one({"_id": ObjectId(entity_id)})
        except Exception:
            server_doc = await coll.find_one({"id": entity_id})

        if not server_doc:
            payload["created_at"] = now_utc.isoformat()
            payload["updated_at"] = now_utc.isoformat()
            payload.pop("_id", None)
            payload.pop("id", None)
            result = await coll.insert_one(payload)
            return ActionResult(index=idx, entity_id=str(result.inserted_id), status="synced", message="Created (was missing)")

        server_ts = server_timestamp_field(server_doc)

        if client_ts >= server_ts:
            payload["updated_at"] = now_utc.isoformat()
            payload.pop("_id", None)
            payload.pop("id", None)
            await coll.update_one({"_id": server_doc["_id"]}, {"$set": payload})
            return ActionResult(
                index=idx, entity_id=entity_id,
                status="conflict_client_wins" if server_ts > datetime.min.replace(tzinfo=timezone.utc) else "synced",
                message="Client version applied",
            )
        else:
            return ActionResult(
                index=idx, entity_id=entity_id, status="conflict_server_wins",
                message=f"Server version is newer ({server_ts.isoformat()} > {client_ts.isoformat()})",
                server_data=_serialize_doc(server_doc),
            )

    # ── DELETE ────────────────────────────────────────────────
    if action.action_type.startswith("DELETE") and entity_id:
        try:
            await coll.delete_one({"_id": ObjectId(entity_id)})
        except Exception:
            await coll.delete_one({"id": entity_id})
        # Record deletion so pull endpoint can tell clients
        await db.sync_deletions.insert_one({
            "collection": action.entity_table,
            "entity_id": entity_id,
            "deleted_by": str(user["_id"]),
            "deleted_at": now_utc.isoformat(),
        })
        return ActionResult(index=idx, entity_id=entity_id, status="synced", message="Deleted")

    return ActionResult(index=idx, status="error", message=f"Unhandled action: {action.action_type}")


# ═══════════════════════════════════════════════════════════════
#  2.  POST /api/sync/pull  — PULL changes since last sync
# ═══════════════════════════════════════════════════════════════

class PullTableRequest(BaseModel):
    table: str
    last_sync_at: Optional[str] = None  # ISO 8601; null = first sync (get everything)


class PullRequest(BaseModel):
    tables: List[PullTableRequest]
    device_id: Optional[str] = None


class PullTableResult(BaseModel):
    table: str
    upserts: List[dict]       # docs modified/created after last_sync_at
    deletions: List[str]      # entity IDs deleted after last_sync_at
    count: int
    has_more: bool = False    # if truncated due to page size


class PullResponse(BaseModel):
    results: List[PullTableResult]
    server_time: str          # client stores this as next last_sync_at


PAGE_LIMIT = 500  # max docs returned per table per pull


@router.post("/pull", response_model=PullResponse)
async def pull_changes(req: PullRequest, user=Depends(get_current_user)):
    from database import db

    now_utc = datetime.now(timezone.utc)
    owner_ids = await _owner_ids(db, user)
    user_id = str(user["_id"])
    results: List[PullTableResult] = []

    for table_req in req.tables:
        table = table_req.table
        collection_name = TABLE_TO_COLLECTION.get(table)
        if not collection_name:
            results.append(PullTableResult(table=table, upserts=[], deletions=[], count=0))
            continue

        coll = db[collection_name]
        since = parse_ts(table_req.last_sync_at)

        # ── Build time filter ──
        time_filter = {}
        if since > datetime.min.replace(tzinfo=timezone.utc):
            since_str = since.isoformat()
            time_filter = {"$or": [
                {"updated_at": {"$gt": since_str}},
                {"created_at": {"$gt": since_str}},
                {"modified_at": {"$gt": since_str}},
            ]}

        # ── Build ownership filter ──
        owner_field = TABLE_OWNER_FIELD.get(table)
        if owner_field:
            owner_filter = {owner_field: {"$in": owner_ids}}
        elif table == "messages":
            owner_filter = {"$or": [
                {"sender_id": {"$in": owner_ids}},
                {"receiver_id": {"$in": owner_ids}},
            ]}
        else:
            owner_filter = {}  # products, etc. — no owner filter

        # ── Combine filters ──
        if time_filter and owner_filter:
            query = {"$and": [owner_filter, time_filter]}
        elif owner_filter:
            query = owner_filter
        elif time_filter:
            query = time_filter
        else:
            query = {}

        # ── Fetch docs ──
        cursor = coll.find(query).sort("updated_at", -1).limit(PAGE_LIMIT + 1)
        docs = await cursor.to_list(PAGE_LIMIT + 1)
        has_more = len(docs) > PAGE_LIMIT
        if has_more:
            docs = docs[:PAGE_LIMIT]

        upserts = [_serialize_doc(d) for d in docs]

        # ── Fetch deletions ──
        del_query = {"collection": table}
        if since > datetime.min.replace(tzinfo=timezone.utc):
            del_query["deleted_at"] = {"$gt": since.isoformat()}
        del_docs = await db.sync_deletions.find(del_query).to_list(200)
        deletions = [d["entity_id"] for d in del_docs if "entity_id" in d]

        results.append(PullTableResult(
            table=table,
            upserts=upserts,
            deletions=deletions,
            count=len(upserts),
            has_more=has_more,
        ))

    # Record the pull event
    await db.sync_log.insert_one({
        "user_id": user_id,
        "device_id": req.device_id,
        "direction": "pull",
        "tables": [t.table for t in req.tables],
        "timestamp": now_utc.isoformat(),
    })

    return PullResponse(results=results, server_time=now_utc.isoformat())


# ═══════════════════════════════════════════════════════════════
#  3.  GET /api/sync/status  — quick change-count check
# ═══════════════════════════════════════════════════════════════

class TableStatus(BaseModel):
    table: str
    changes_since: int     # number of docs modified since the provided timestamp
    deletions_since: int


class SyncStatusResponse(BaseModel):
    server_time: str
    tables: List[TableStatus]
    total_changes: int


@router.get("/status", response_model=SyncStatusResponse)
async def sync_status(
    since: Optional[str] = Query(None, description="ISO 8601 timestamp — if omitted, counts all docs"),
    user=Depends(get_current_user),
):
    from database import db

    now_utc = datetime.now(timezone.utc)
    owner_ids = await _owner_ids(db, user)
    since_dt = parse_ts(since) if since else datetime.min.replace(tzinfo=timezone.utc)
    since_str = since_dt.isoformat() if since_dt > datetime.min.replace(tzinfo=timezone.utc) else None

    table_statuses: List[TableStatus] = []
    total = 0

    for table, coll_name in TABLE_TO_COLLECTION.items():
        coll = db[coll_name]

        # Time filter
        time_match = {}
        if since_str:
            time_match = {"$or": [
                {"updated_at": {"$gt": since_str}},
                {"created_at": {"$gt": since_str}},
            ]}

        # Ownership filter
        owner_field = TABLE_OWNER_FIELD.get(table)
        if owner_field:
            owner_match = {owner_field: {"$in": owner_ids}}
        elif table == "messages":
            owner_match = {"$or": [
                {"sender_id": {"$in": owner_ids}},
                {"receiver_id": {"$in": owner_ids}},
            ]}
        else:
            owner_match = {}

        if time_match and owner_match:
            query = {"$and": [owner_match, time_match]}
        elif owner_match:
            query = owner_match
        elif time_match:
            query = time_match
        else:
            query = {}

        count = await coll.count_documents(query)

        # Deletions
        del_query = {"collection": table}
        if since_str:
            del_query["deleted_at"] = {"$gt": since_str}
        del_count = await db.sync_deletions.count_documents(del_query)

        table_statuses.append(TableStatus(table=table, changes_since=count, deletions_since=del_count))
        total += count + del_count

    return SyncStatusResponse(
        server_time=now_utc.isoformat(),
        tables=table_statuses,
        total_changes=total,
    )
