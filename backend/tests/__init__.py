"""
GreenLink Agritech - Test configuration
All credentials loaded from environment variables.
"""
import os

def get_test_credentials():
    return {
        "cooperative": {
            "email": os.environ.get("TEST_COOP_EMAIL", ""),
            "password": os.environ.get("TEST_COOP_PASSWORD", ""),
        },
        "admin": {
            "email": os.environ.get("TEST_ADMIN_EMAIL", ""),
            "password": os.environ.get("TEST_ADMIN_PASSWORD", ""),
        },
        "agent": {
            "email": os.environ.get("TEST_AGENT_EMAIL", ""),
            "password": os.environ.get("TEST_AGENT_PASSWORD", ""),
        },
        "farmer": {
            "email": os.environ.get("TEST_FARMER_EMAIL", ""),
            "password": os.environ.get("TEST_FARMER_PASSWORD", ""),
        },
    }

API_URL = os.environ.get("REACT_APP_BACKEND_URL", "")
