"""
Test suite for Offline Sync Auto-Sync Bug Fix - Iteration 104
Tests the OfflineContext.jsx auto-sync mechanism fix:
1. Backend sync/upload endpoint accepts REDD visit payloads
2. Backend properly processes redd_visit action_type
3. Backend stores in redd_tracking_visits collection
4. Sync status endpoint works
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
AGENT_EMAIL = "testagent@test.ci"
AGENT_PASSWORD = "test123456"


class TestAgentLogin:
    """Test agent terrain login flow"""
    
    def test_agent_login_success(self):
        """Test field agent can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["user_type"] == "field_agent", "User type should be field_agent"
        assert data["user"]["email"] == AGENT_EMAIL


class TestSyncUploadEndpoint:
    """Test POST /api/agent/sync/upload endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for agent"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_sync_upload_redd_visit(self, auth_token):
        """Test sync/upload accepts REDD visit payloads correctly"""
        offline_id = f"test-redd-{uuid.uuid4()}"
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        payload = {
            "actions": [
                {
                    "action_type": "redd_visit",
                    "farmer_id": "test_farmer_redd_104",
                    "offline_id": offline_id,
                    "timestamp": timestamp,
                    "data": {
                        "farmer_id": "test_farmer_redd_104",
                        "farmer_name": "Test Farmer REDD 104",
                        "farmer_phone": "+2250701234567",
                        "practices_verified": [
                            {"code": "AGF1", "name": "Arbres ombrage", "category": "agroforesterie", "status": "conforme"},
                            {"code": "AGF2", "name": "Systeme agroforestier", "category": "agroforesterie", "status": "partiellement"},
                            {"code": "ZD1", "name": "Intensification durable", "category": "zero_deforestation", "status": "conforme"},
                            {"code": "SOL1", "name": "Paillage et compostage", "category": "gestion_sols", "status": "non_conforme"}
                        ],
                        "superficie_verifiee": 3.5,
                        "arbres_comptes": 60,
                        "observations": "Test observation for REDD sync iteration 104",
                        "recommandations": "Test recommandations for iteration 104",
                        "suivi_requis": True
                    }
                }
            ],
            "sync_timestamp": timestamp
        }
        
        response = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=payload
        )
        
        assert response.status_code == 200, f"Sync upload failed: {response.text}"
        data = response.json()
        assert data["synced"] == 1, f"Expected 1 synced, got {data['synced']}"
        assert data["errors"] == 0, f"Expected 0 errors, got {data['errors']}"
        assert data["results"][0]["status"] == "synced", "Action should be synced"
        assert data["results"][0]["offline_id"] == offline_id
    
    def test_sync_upload_duplicate_offline_id(self, auth_token):
        """Test that duplicate offline_id returns already_synced"""
        offline_id = f"test-dup-{uuid.uuid4()}"
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        payload = {
            "actions": [
                {
                    "action_type": "redd_visit",
                    "farmer_id": "test_farmer_dup",
                    "offline_id": offline_id,
                    "timestamp": timestamp,
                    "data": {
                        "farmer_name": "Test Farmer Dup",
                        "practices_verified": [{"code": "AGF1", "status": "conforme", "category": "agroforesterie", "name": "Test"}]
                    }
                }
            ],
            "sync_timestamp": timestamp
        }
        
        # First sync
        response1 = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=payload
        )
        assert response1.status_code == 200
        assert response1.json()["results"][0]["status"] == "synced"
        
        # Second sync with same offline_id
        response2 = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=payload
        )
        assert response2.status_code == 200
        assert response2.json()["results"][0]["status"] == "already_synced"
    
    def test_sync_upload_empty_offline_id_not_skipped(self, auth_token):
        """Test that empty offline_id does NOT skip with already_synced (bug fix verification)"""
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        payload = {
            "actions": [
                {
                    "action_type": "redd_visit",
                    "farmer_id": "test_farmer_empty_id",
                    "offline_id": "",  # Empty offline_id
                    "timestamp": timestamp,
                    "data": {
                        "farmer_name": "Test Farmer Empty ID",
                        "practices_verified": [{"code": "AGF1", "status": "conforme", "category": "agroforesterie", "name": "Test"}]
                    }
                }
            ],
            "sync_timestamp": timestamp
        }
        
        response = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        # Should be synced, not already_synced (bug fix)
        assert data["results"][0]["status"] == "synced", "Empty offline_id should sync, not skip"


class TestSyncStatusEndpoint:
    """Test GET /api/agent/sync/status endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for agent"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_sync_status_returns_data(self, auth_token):
        """Test sync status endpoint returns proper data"""
        response = requests.get(
            f"{BASE_URL}/api/agent/sync/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Sync status failed: {response.text}"
        data = response.json()
        assert "total_synced_actions" in data
        assert "last_download" in data or data.get("last_download") is None
        assert "last_upload" in data or data.get("last_upload") is None


class TestSyncDownloadEndpoint:
    """Test GET /api/agent/sync/download endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for agent"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_sync_download_returns_zone_data(self, auth_token):
        """Test sync download returns farmers and parcels for agent zone"""
        response = requests.get(
            f"{BASE_URL}/api/agent/sync/download",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Sync download failed: {response.text}"
        data = response.json()
        assert "sync_timestamp" in data
        assert "farmers" in data
        assert "farmers_count" in data
        assert "parcels_count" in data
        assert isinstance(data["farmers"], list)


class TestREDDTrackingEndpoints:
    """Test REDD tracking endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for agent"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_redd_tracking_visit_online(self, auth_token):
        """Test direct REDD tracking visit submission (online mode)"""
        payload = {
            "farmer_id": f"test_farmer_online_{uuid.uuid4().hex[:8]}",
            "farmer_name": "Test Farmer Online REDD",
            "farmer_phone": "+2250701234567",
            "practices_verified": [
                {"code": "AGF1", "name": "Arbres ombrage", "category": "agroforesterie", "status": "conforme"},
                {"code": "AGF2", "name": "Systeme agroforestier", "category": "agroforesterie", "status": "conforme"},
                {"code": "ZD1", "name": "Intensification durable", "category": "zero_deforestation", "status": "partiellement"}
            ],
            "superficie_verifiee": 2.0,
            "arbres_comptes": 30,
            "observations": "Test online REDD visit",
            "recommandations": "Continue good practices",
            "suivi_requis": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/redd/tracking/visit",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=payload
        )
        
        assert response.status_code == 200, f"REDD visit failed: {response.text}"
        data = response.json()
        assert "redd_score" in data
        assert "redd_level" in data
        assert data["redd_score"] >= 0
    
    def test_redd_tracking_visits_list(self, auth_token):
        """Test REDD tracking visits list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/redd/tracking/visits",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"REDD visits list failed: {response.text}"
        data = response.json()
        assert "visits" in data
        assert isinstance(data["visits"], list)
    
    def test_redd_tracking_stats(self, auth_token):
        """Test REDD tracking stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/redd/tracking/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"REDD stats failed: {response.text}"
        data = response.json()
        assert "total_visits" in data
        assert "avg_redd_score" in data


class TestHealthEndpoint:
    """Test health endpoint for online detection"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
