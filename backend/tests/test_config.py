"""
Centralized test configuration.
All test credentials and URLs should be loaded from environment variables.
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend root
load_dotenv(Path(__file__).parent.parent / '.env', override=False)

# API Configuration
BASE_URL = os.getenv("TEST_BASE_URL", os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001"))
API_URL = f"{BASE_URL}/api"

# Admin credentials
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "klenakan.eric@gmail.com")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "474Treckadzo")

# Cooperative credentials
COOP_EMAIL = os.getenv("TEST_COOP_EMAIL", "bielaghana@gmail.com")
COOP_PASSWORD = os.getenv("TEST_COOP_PASSWORD", "test123456")

# Agent credentials
AGENT_EMAIL = os.getenv("TEST_AGENT_EMAIL", "testagent@test.ci")
AGENT_PASSWORD = os.getenv("TEST_AGENT_PASSWORD", "test123456")

# Farmer credentials
FARMER_EMAIL = os.getenv("TEST_FARMER_EMAIL", "testplanteur@test.ci")
FARMER_PASSWORD = os.getenv("TEST_FARMER_PASSWORD", "test123456")

# Test phone number
TEST_PHONE = os.getenv("TEST_PHONE", "+2250707070707")


def get_auth_headers(token: str) -> dict:
    """Return authorization headers for API calls."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
