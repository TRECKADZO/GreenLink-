from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 92 - Mobile App Shell Testing
Iteration 92 - Mobile App Shell Testing
Tests for Agent Terrain Dashboard and Farmer Dashboard mobile-first rewrite
Tests for Agent Terrain Dashboard and Farmer Dashboard mobile-first rewrite
Backend API tests for /api/field-agent/dashboard, /api/field-agent/my-farmers, /api/agent/search
Backend API tests for /api/field-agent/dashboard, /api/field-agent/my-farmers, /api/agent/search
"""
"""

import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config


class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: /api/health returns 200 with status=ok")
    
    def test_root_endpoint(self):
        """Test /api/ returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Root endpoint failed: {response.text}"
        print("PASS: /api/ returns 200")


class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in login response"
        print(f"PASS: Admin login successful, user_type={data.get('user', {}).get('user_type')}")
        return data["access_token"]
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print("PASS: Admin token obtained")


class TestFieldAgentDashboard:
    """Tests for /api/field-agent/dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    def test_field_agent_dashboard_returns_200(self, admin_token):
        """Test /api/field-agent/dashboard returns 200 for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        print(f"PASS: /api/field-agent/dashboard returns 200")
        print(f"  Response keys: {list(data.keys())}")
    
    def test_field_agent_dashboard_structure(self, admin_token):
        """Test dashboard response has expected structure for coop/admin view"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Admin/coop view should have cooperative_info, global_stats, agents_ranking
        # OR agent view should have agent_info, performance, statistics
        has_coop_view = "cooperative_info" in data or "global_stats" in data
        has_agent_view = "agent_info" in data or "performance" in data
        
        assert has_coop_view or has_agent_view, f"Unexpected response structure: {list(data.keys())}"
        print(f"PASS: Dashboard has valid structure (coop_view={has_coop_view}, agent_view={has_agent_view})")
    
    def test_field_agent_dashboard_unauthorized(self):
        """Test dashboard returns 401 or 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: /api/field-agent/dashboard returns {response.status_code} without auth")


class TestFieldAgentMyFarmers:
    """Tests for /api/field-agent/my-farmers endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    def test_my_farmers_returns_200(self, admin_token):
        """Test /api/field-agent/my-farmers returns 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200, f"My farmers failed: {response.text}"
        data = response.json()
        assert "farmers" in data, "Response missing 'farmers' key"
        assert "total" in data, "Response missing 'total' key"
        print(f"PASS: /api/field-agent/my-farmers returns 200 with {data.get('total', 0)} farmers")
    
    def test_my_farmers_structure(self, admin_token):
        """Test my-farmers response structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data.get("farmers"), list), "farmers should be a list"
        assert "last_updated" in data, "Response missing 'last_updated'"
        
        # If there are farmers, check structure
        if data.get("farmers"):
            farmer = data["farmers"][0]
            expected_keys = ["id", "full_name", "phone_number"]
            for key in expected_keys:
                assert key in farmer, f"Farmer missing key: {key}"
            print(f"PASS: Farmer structure valid with keys: {list(farmer.keys())[:10]}...")
        else:
            print("PASS: my-farmers returns empty list (no assigned farmers for admin)")
    
    def test_my_farmers_unauthorized(self):
        """Test my-farmers returns 401 or 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: /api/field-agent/my-farmers returns {response.status_code} without auth")


class TestAgentSearch:
    """Tests for /api/agent/search endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    def test_agent_search_returns_200(self, admin_token):
        """Test /api/agent/search returns 200 with valid phone"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Use a test phone number
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=0701234567", headers=headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "found" in data, "Response missing 'found' key"
        print(f"PASS: /api/agent/search returns 200, found={data.get('found')}")
    
    def test_agent_search_invalid_phone(self, admin_token):
        """Test search with invalid phone format"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=abc", headers=headers)
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"
        print("PASS: /api/agent/search returns 400 for invalid phone format")
    
    def test_agent_search_unauthorized(self):
        """Test search returns 401 or 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=0701234567")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: /api/agent/search returns {response.status_code} without auth")
    
    def test_agent_search_missing_phone(self, admin_token):
        """Test search without phone parameter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/search", headers=headers)
        assert response.status_code == 422, f"Expected 422 for missing phone, got {response.status_code}"
        print("PASS: /api/agent/search returns 422 when phone param missing")


class TestFieldAgentLeaderboard:
    """Tests for /api/field-agent/leaderboard endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    def test_leaderboard_returns_200(self, admin_token):
        """Test /api/field-agent/leaderboard returns 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/leaderboard", headers=headers)
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
        data = response.json()
        assert "leaderboard" in data, "Response missing 'leaderboard' key"
        assert "period" in data, "Response missing 'period' key"
        print(f"PASS: /api/field-agent/leaderboard returns 200, period={data.get('period')}")


class TestFieldAgentMyVisits:
    """Tests for /api/field-agent/my-visits endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    def test_my_visits_returns_200(self, admin_token):
        """Test /api/field-agent/my-visits returns 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-visits", headers=headers)
        assert response.status_code == 200, f"My visits failed: {response.text}"
        data = response.json()
        assert "visits" in data, "Response missing 'visits' key"
        assert "total" in data, "Response missing 'total' key"
        print(f"PASS: /api/field-agent/my-visits returns 200, total={data.get('total')}")


class TestAgentSyncEndpoints:
    """Tests for agent sync endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    def test_sync_download_returns_200(self, admin_token):
        """Test /api/agent/sync/download returns 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/sync/download", headers=headers)
        assert response.status_code == 200, f"Sync download failed: {response.text}"
        data = response.json()
        assert "farmers" in data, "Response missing 'farmers' key"
        assert "sync_timestamp" in data, "Response missing 'sync_timestamp' key"
        print(f"PASS: /api/agent/sync/download returns 200, farmers_count={data.get('farmers_count', 0)}")
    
    def test_sync_status_returns_200(self, admin_token):
        """Test /api/agent/sync/status returns 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/sync/status", headers=headers)
        assert response.status_code == 200, f"Sync status failed: {response.text}"
        data = response.json()
        assert "total_synced_actions" in data, "Response missing 'total_synced_actions' key"
        print(f"PASS: /api/agent/sync/status returns 200")


class TestAgentDashboardStats:
    """Tests for /api/agent/dashboard/stats endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    def test_dashboard_stats_returns_200(self, admin_token):
        """Test /api/agent/dashboard/stats returns 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        expected_keys = ["total_searches", "total_views", "farmers_in_zone"]
        for key in expected_keys:
            assert key in data, f"Response missing key: {key}"
        print(f"PASS: /api/agent/dashboard/stats returns 200 with keys: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
