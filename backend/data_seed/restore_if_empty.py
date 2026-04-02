"""
Auto-restore database from seed archive if the database is empty.
This ensures deployed environments have data immediately.
"""
import subprocess
import os
from pathlib import Path

ARCHIVE_PATH = Path(__file__).parent / "greenlink_production.archive"

def check_and_restore(mongo_url: str, db_name: str):
    """Restore data from archive if the database has no users."""
    if not ARCHIVE_PATH.exists():
        print(f"[SEED] No archive found at {ARCHIVE_PATH}")
        return

    # Check if users collection has data
    try:
        from pymongo import MongoClient
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        user_count = db.users.count_documents({})
        client.close()

        if user_count > 0:
            print(f"[SEED] Database already has {user_count} users. Skipping restore.")
            return

        print(f"[SEED] Database is empty. Restoring from archive...")
        result = subprocess.run(
            [
                "mongorestore",
                f"--uri={mongo_url}",
                f"--nsFrom=greenlink_production.*",
                f"--nsTo={db_name}.*",
                f"--archive={ARCHIVE_PATH}",
                "--gzip",
                "--drop"
            ],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0:
            # Verify
            client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
            db = client[db_name]
            new_count = db.users.count_documents({})
            collections = db.list_collection_names()
            client.close()
            print(f"[SEED] Restore complete: {len(collections)} collections, {new_count} users")
        else:
            print(f"[SEED] Restore failed: {result.stderr[:500]}")

    except Exception as e:
        print(f"[SEED] Error during restore check: {e}")
