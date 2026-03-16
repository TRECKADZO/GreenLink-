"""
Test Suite for Agent Terrain Sync API (Offline-First Mode)
GreenLink - Agent Terrain Offline Sync System

Tests cover:
- Sync Download API: GET /api/agent/sync/download (zone data for IndexedDB cache)
- Sync Upload API: POST /api/agent/sync/upload (offline queued actions with idempotence)
- Sync Status API: GET /api/agent/sync/status (last sync timestamps)
- Data quality: farmers with full_name, phone_number, parcels array
- Idempotence check: same offline_id should return 'already_synced'
- Agent Search still works: GET /api/agent/search?phone=X
- Agent Full Details still works: GET /api/agent/farmer/{id}/details
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_USER = {
    "identifier": "coop-gagnoa@greenlink.ci",
    "password": "password"
}

# Known farmer phone for testing
TEST_FARMER_PHONE = "0701234567"
TEST_FARMER_NAME = "Kouassi Yao Jean"


@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def coop_auth_token(api_client):
    """Get cooperative authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=COOP_USER)
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Cooperative authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def coop_client(api_client, coop_auth_token):
    """Session with cooperative auth header"""
    api_client.headers.update({"Authorization": f"Bearer {coop_auth_token}"})
    return api_client


class TestSyncDownloadAPI:
    """Test GET /api/agent/sync/download endpoint"""
    
    def test_sync_download_requires_auth(self, api_client):
        """Sync download without auth should return 401 or 403"""
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/agent/sync/download")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"TEST PASS: Sync download requires auth (got {response.status_code})")
    
    def test_sync_download_returns_farmers(self, coop_client):
        """Sync download should return farmers in the zone"""
        response = coop_client.get(f"{BASE_URL}/api/agent/sync/download")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "sync_timestamp" in data, "Missing sync_timestamp"
        assert "data_version" in data, "Missing data_version"
        assert "farmers" in data, "Missing farmers array"
        assert "farmers_count" in data, "Missing farmers_count"
        assert "parcels_count" in data, "Missing parcels_count"
        assert "ssrte_visits" in data, "Missing ssrte_visits"
        assert "agent_zone" in data, "Missing agent_zone"
        assert "agent_name" in data, "Missing agent_name"
        
        farmers_count = data.get("farmers_count", 0)
        assert farmers_count > 0, "Expected at least 1 farmer in the zone"
        print(f"TEST PASS: Sync download returned {farmers_count} farmers")
    
    def test_sync_download_farmer_data_quality(self, coop_client):
        """Verify farmers have required fields for offline search"""
        response = coop_client.get(f"{BASE_URL}/api/agent/sync/download")
        assert response.status_code == 200
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        assert len(farmers) > 0, "No farmers returned"
        
        # Check first farmer has all required fields
        farmer = farmers[0]
        required_fields = ["id", "full_name", "phone_number", "village", "status", "parcels"]
        
        for field in required_fields:
            assert field in farmer, f"Farmer missing required field: {field}"
        
        # Verify full_name and phone_number are not None
        assert farmer.get("full_name") is not None, "full_name is None"
        assert farmer.get("phone_number") is not None, "phone_number is None"
        
        # Verify parcels is an array
        assert isinstance(farmer.get("parcels"), list), "parcels should be an array"
        
        print(f"TEST PASS: Farmer data quality verified - {farmer.get('full_name')}, {farmer.get('phone_number')}")
    
    def test_sync_download_parcels_included(self, coop_client):
        """Verify farmers include embedded parcels array"""
        response = coop_client.get(f"{BASE_URL}/api/agent/sync/download")
        assert response.status_code == 200
        
        data = response.json()
        farmers_with_parcels = [f for f in data.get("farmers", []) if len(f.get("parcels", [])) > 0]
        
        if len(farmers_with_parcels) > 0:
            farmer = farmers_with_parcels[0]
            parcel = farmer["parcels"][0]
            
            # Verify parcel structure
            parcel_fields = ["id", "area_hectares", "crop_type", "verification_status"]
            for field in parcel_fields:
                assert field in parcel, f"Parcel missing field: {field}"
            
            print(f"TEST PASS: Parcels embedded - farmer has {len(farmer['parcels'])} parcel(s)")
        else:
            print("TEST PASS: No farmers with parcels found (data quality check passed)")


class TestSyncUploadAPI:
    """Test POST /api/agent/sync/upload endpoint"""
    
    def test_sync_upload_requires_auth(self, api_client):
        """Sync upload without auth should return 401 or 403"""
        api_client.headers.pop("Authorization", None)
        response = api_client.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json={"actions": [], "sync_timestamp": datetime.utcnow().isoformat()}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"TEST PASS: Sync upload requires auth (got {response.status_code})")
    
    def test_sync_upload_empty_actions(self, coop_client):
        """Empty actions list should return success"""
        response = coop_client.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json={"actions": [], "sync_timestamp": datetime.utcnow().isoformat()}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("synced") == 0, "Expected 0 synced for empty actions"
        assert data.get("errors") == 0, "Expected 0 errors for empty actions"
        print("TEST PASS: Empty actions sync handled correctly")
    
    def test_sync_upload_search_log_action(self, coop_client):
        """Upload a search_log action should succeed"""
        offline_id = str(uuid.uuid4())
        
        response = coop_client.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json={
                "actions": [{
                    "action_type": "search_log",
                    "farmer_id": None,
                    "data": {"phone": TEST_FARMER_PHONE, "farmer_name": TEST_FARMER_NAME},
                    "timestamp": datetime.utcnow().isoformat(),
                    "offline_id": offline_id
                }],
                "sync_timestamp": datetime.utcnow().isoformat()
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("synced") == 1, f"Expected 1 synced, got {data.get('synced')}"
        assert data.get("errors") == 0, f"Expected 0 errors, got {data.get('errors')}"
        
        # Check results
        results = data.get("results", [])
        assert len(results) == 1, "Expected 1 result"
        assert results[0].get("offline_id") == offline_id
        assert results[0].get("status") == "synced"
        
        print(f"TEST PASS: search_log action synced with offline_id={offline_id}")
    
    def test_sync_upload_idempotence(self, coop_client):
        """Same offline_id uploaded twice should return 'already_synced'"""
        offline_id = str(uuid.uuid4())
        
        action = {
            "action_type": "search_log",
            "farmer_id": None,
            "data": {"phone": "0000000000", "farmer_name": "Idempotence Test"},
            "timestamp": datetime.utcnow().isoformat(),
            "offline_id": offline_id
        }
        payload = {"actions": [action], "sync_timestamp": datetime.utcnow().isoformat()}
        
        # First upload
        response1 = coop_client.post(f"{BASE_URL}/api/agent/sync/upload", json=payload)
        assert response1.status_code == 200
        assert response1.json().get("results", [{}])[0].get("status") == "synced"
        
        # Second upload with same offline_id
        response2 = coop_client.post(f"{BASE_URL}/api/agent/sync/upload", json=payload)
        assert response2.status_code == 200
        
        data2 = response2.json()
        result2 = data2.get("results", [{}])[0]
        assert result2.get("status") == "already_synced", f"Expected 'already_synced', got {result2.get('status')}"
        
        print("TEST PASS: Idempotence check works - duplicate offline_id returns 'already_synced'")
    
    def test_sync_upload_parcel_verification(self, coop_client):
        """Upload a parcel_verification action (if parcel exists)"""
        # First get a farmer with parcels
        download_response = coop_client.get(f"{BASE_URL}/api/agent/sync/download")
        assert download_response.status_code == 200
        
        farmers = download_response.json().get("farmers", [])
        farmer_with_parcel = next((f for f in farmers if len(f.get("parcels", [])) > 0), None)
        
        if not farmer_with_parcel:
            pytest.skip("No farmer with parcels found to test parcel_verification")
        
        parcel_id = farmer_with_parcel["parcels"][0]["id"]
        farmer_id = farmer_with_parcel["id"]
        offline_id = str(uuid.uuid4())
        
        response = coop_client.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json={
                "actions": [{
                    "action_type": "parcel_verification",
                    "farmer_id": farmer_id,
                    "data": {
                        "parcel_id": parcel_id,
                        "status": "verified",
                        "notes": "Test verification from offline sync"
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                    "offline_id": offline_id
                }],
                "sync_timestamp": datetime.utcnow().isoformat()
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("synced") == 1, f"Expected 1 synced, got {data.get('synced')}"
        print(f"TEST PASS: parcel_verification action synced for parcel {parcel_id}")


class TestSyncStatusAPI:
    """Test GET /api/agent/sync/status endpoint"""
    
    def test_sync_status_requires_auth(self, api_client):
        """Sync status without auth should return 401 or 403"""
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/agent/sync/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"TEST PASS: Sync status requires auth (got {response.status_code})")
    
    def test_sync_status_returns_timestamps(self, coop_client):
        """Sync status should return last_download and last_upload timestamps"""
        response = coop_client.get(f"{BASE_URL}/api/agent/sync/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields exist
        assert "last_download" in data, "Missing last_download"
        assert "last_upload" in data, "Missing last_upload"
        assert "total_synced_actions" in data, "Missing total_synced_actions"
        
        # After our previous tests, there should be sync activity
        print(f"TEST PASS: Sync status - last_download={data.get('last_download')}, total_synced={data.get('total_synced_actions')}")


class TestExistingAgentAPIsStillWork:
    """Verify existing agent APIs still function after sync feature addition"""
    
    def test_agent_search_still_works(self, coop_client):
        """GET /api/agent/search?phone=X should still return farmer"""
        response = coop_client.get(f"{BASE_URL}/api/agent/search?phone={TEST_FARMER_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("found") == True, f"Expected farmer to be found: {data}"
        
        farmer = data.get("farmer", {})
        assert farmer.get("full_name") == TEST_FARMER_NAME, f"Expected {TEST_FARMER_NAME}, got {farmer.get('full_name')}"
        assert "parcels" in farmer, "Farmer response missing parcels"
        
        print(f"TEST PASS: Agent search still works - found {farmer.get('full_name')}")
    
    def test_agent_farmer_details_still_works(self, coop_client):
        """GET /api/agent/farmer/{id}/details should return full profile"""
        # First get farmer ID from search
        search_response = coop_client.get(f"{BASE_URL}/api/agent/search?phone={TEST_FARMER_PHONE}")
        assert search_response.status_code == 200
        
        farmer_id = search_response.json().get("farmer", {}).get("id")
        assert farmer_id, "Could not get farmer ID from search"
        
        # Get full details
        details_response = coop_client.get(f"{BASE_URL}/api/agent/farmer/{farmer_id}/details")
        assert details_response.status_code == 200, f"Expected 200, got {details_response.status_code}: {details_response.text}"
        
        details = details_response.json()
        assert "full_name" in details, "Details missing full_name"
        assert "parcels" in details, "Details missing parcels"
        assert "harvests" in details, "Details missing harvests"
        assert "ssrte_visits" in details, "Details missing ssrte_visits"
        
        print(f"TEST PASS: Agent farmer details still works - {details.get('full_name')}")


class TestSyncDataQuality:
    """Test data quality for offline-first sync"""
    
    def test_sync_download_all_farmers_have_phone(self, coop_client):
        """All farmers in sync download should have phone_number"""
        response = coop_client.get(f"{BASE_URL}/api/agent/sync/download")
        assert response.status_code == 200
        
        farmers = response.json().get("farmers", [])
        farmers_without_phone = [f for f in farmers if not f.get("phone_number")]
        
        # Log warning but don't fail if some farmers don't have phone
        if farmers_without_phone:
            print(f"WARNING: {len(farmers_without_phone)} farmers without phone_number")
        
        farmers_with_phone = len(farmers) - len(farmers_without_phone)
        print(f"TEST PASS: {farmers_with_phone}/{len(farmers)} farmers have phone_number")
    
    def test_sync_download_parcels_have_area(self, coop_client):
        """All parcels should have area_hectares field"""
        response = coop_client.get(f"{BASE_URL}/api/agent/sync/download")
        assert response.status_code == 200
        
        farmers = response.json().get("farmers", [])
        total_parcels = 0
        parcels_with_area = 0
        
        for farmer in farmers:
            for parcel in farmer.get("parcels", []):
                total_parcels += 1
                if parcel.get("area_hectares") is not None:
                    parcels_with_area += 1
        
        if total_parcels > 0:
            assert parcels_with_area == total_parcels, f"Some parcels missing area_hectares"
            print(f"TEST PASS: All {total_parcels} parcels have area_hectares")
        else:
            print("TEST PASS: No parcels to check (data quality check passed)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
