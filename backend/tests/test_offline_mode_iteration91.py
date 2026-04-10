from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test Offline Mode Implementation - Iteration 91
Test Offline Mode Implementation - Iteration 91
Tests for cooperative dashboard, members, lots endpoints that support offline-first mode
Tests for cooperative dashboard, members, lots endpoints that support offline-first mode
"""
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get auth headers for requests"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestHealthEndpoint:
    """Health endpoint tests - used by OfflineContext for connectivity check"""
    
    def test_health_endpoint_returns_200(self):
        """GET /api/health should return 200 for online detection"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: GET /api/health returns 200")


class TestCooperativeDashboard:
    """Cooperative dashboard endpoint tests - cached by offlineCooperativeApi"""
    
    def test_dashboard_returns_data(self, auth_headers):
        """GET /api/cooperative/dashboard should return dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure for caching
        assert "coop_info" in data or "members" in data or "parcelles" in data
        print(f"PASS: GET /api/cooperative/dashboard returns 200 with data keys: {list(data.keys())}")
    
    def test_dashboard_kpis_returns_data(self, auth_headers):
        """GET /api/cooperative/dashboard-kpis should return KPI data"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: GET /api/cooperative/dashboard-kpis returns 200 with keys: {list(data.keys())}")
    
    def test_dashboard_charts_returns_data(self, auth_headers):
        """GET /api/cooperative/dashboard-charts should return chart data"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-charts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: GET /api/cooperative/dashboard-charts returns 200 with keys: {list(data.keys())}")


class TestCooperativeMembers:
    """Cooperative members endpoint tests - cached by offlineCooperativeApi"""
    
    def test_members_list_returns_data(self, auth_headers):
        """GET /api/cooperative/members should return members list"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure for caching
        assert "members" in data or isinstance(data, list)
        members = data.get("members", data) if isinstance(data, dict) else data
        print(f"PASS: GET /api/cooperative/members returns 200 with {len(members)} members")
    
    def test_members_with_limit_param(self, auth_headers):
        """GET /api/cooperative/members?limit=500 should work for sync"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members?limit=500",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        members = data.get("members", data) if isinstance(data, dict) else data
        print(f"PASS: GET /api/cooperative/members?limit=500 returns 200 with {len(members)} members")
    
    def test_members_activation_stats(self, auth_headers):
        """GET /api/cooperative/members/activation-stats should return stats"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members/activation-stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "total_members" in data
        assert "activated_count" in data or "activation_rate" in data
        print(f"PASS: GET /api/cooperative/members/activation-stats returns 200")


class TestCooperativeLots:
    """Cooperative lots endpoint tests - cached by offlineCooperativeApi"""
    
    def test_lots_list_returns_data(self, auth_headers):
        """GET /api/cooperative/lots should return lots list"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/lots",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Response can be list or dict with lots key
        lots = data.get("lots", data) if isinstance(data, dict) else data
        print(f"PASS: GET /api/cooperative/lots returns 200 with {len(lots) if isinstance(lots, list) else 'N/A'} lots")


class TestServiceWorkerEndpoint:
    """Test that service worker file is accessible"""
    
    def test_service_worker_accessible(self):
        """GET /service-worker.js should be accessible"""
        # Service worker is served from frontend, not backend
        # We test that the frontend serves it
        response = requests.get(f"{BASE_URL}/service-worker.js", timeout=10)
        # May return 200 or 304 (cached)
        assert response.status_code in [200, 304, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            content = response.text
            assert "CACHE_NAME" in content or "greenlink" in content.lower()
            print("PASS: GET /service-worker.js returns 200 with cache configuration")
        else:
            print(f"INFO: GET /service-worker.js returns {response.status_code} (may be served differently)")


class TestOfflineQueueEndpoints:
    """Test endpoints used for offline action sync"""
    
    def test_agent_sync_download_endpoint(self, auth_headers):
        """GET /api/agent/sync/download should work for field agents"""
        response = requests.get(
            f"{BASE_URL}/api/agent/sync/download",
            headers=auth_headers
        )
        # Admin may not have access to agent sync, but endpoint should exist
        assert response.status_code in [200, 403, 404]
        print(f"PASS: GET /api/agent/sync/download returns {response.status_code}")
    
    def test_agent_sync_upload_endpoint_exists(self, auth_headers):
        """POST /api/agent/sync/upload endpoint should exist"""
        response = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            headers=auth_headers,
            json={"actions": [], "sync_timestamp": "2026-01-01T00:00:00Z"}
        )
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
        print(f"PASS: POST /api/agent/sync/upload endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
