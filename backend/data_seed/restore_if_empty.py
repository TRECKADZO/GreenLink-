"""
Auto-restore database from JSON seed files if the database is empty.
Pure Python implementation - no external tools required.
"""
from pathlib import Path
from pymongo import MongoClient
from bson import json_util

COLLECTIONS_DIR = Path(__file__).parent / "collections"

def check_and_restore(mongo_url: str, db_name: str):
    """Restore data from JSON files if the database has no users."""
    if not COLLECTIONS_DIR.exists():
        print(f"[SEED] No collections directory at {COLLECTIONS_DIR}")
        return

    try:
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        user_count = db.users.count_documents({})

        if user_count > 0:
            print(f"[SEED] Database has {user_count} users. Skipping restore.")
            client.close()
            return

        print(f"[SEED] Database is empty. Restoring from JSON seed files...")
        total_docs = 0
        total_colls = 0

        json_files = sorted(COLLECTIONS_DIR.glob("*.json"))
        for json_file in json_files:
            coll_name = json_file.stem
            with open(json_file, 'r') as f:
                docs = json_util.loads(f.read())

            if docs:
                db[coll_name].drop()
                db[coll_name].insert_many(docs)
                total_docs += len(docs)
                total_colls += 1

        client.close()
        print(f"[SEED] Restore complete: {total_colls} collections, {total_docs} documents")

    except Exception as e:
        print(f"[SEED] Error during restore: {e}")
