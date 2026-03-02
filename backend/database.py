"""
Database configuration module
Centralized MongoDB connection for all routes
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables from .env file
# This must happen BEFORE any other imports that use os.environ
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# MongoDB configuration
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'greenlink')

if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is required")

# Create single client instance to be shared
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

print(f"[DB] Connected to: {MONGO_URL[:50]}... / {DB_NAME}")
