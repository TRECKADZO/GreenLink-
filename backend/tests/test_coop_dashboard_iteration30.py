from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test file for Cooperative Dashboard Iteration 30
Test file for Cooperative Dashboard Iteration 30
Tests: Cooperative login, dashboard API, Agents Terrain stat, Naturalisation menu, Home/Profile buttons
Tests: Cooperative login, dashboard API, Agents Terrain stat, Naturalisation menu, Home/Profile buttons
"""
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_BIELAGHANA = {"identifier": COOP_EMAIL, "password": "greenlink2024"}
COOP_GAGNOA = {"identifier": "coop-gagnoa@greenlink.ci", "password": "password"}
AGENT_TERRAIN = {"identifier": "+2250709005301", "password": "greenlink2024"}


class TestCooperativeLogin:
    """Test cooperative login functionality"""
    
    def test_bielaghana_login_success(self):
        """Test login with bielaghana@gmail.com / greenlink2024"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_BIELAGHANA
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["user_type"] == "cooperative"
        assert data["user"]["email"] == COOP_EMAIL
        
    def test_gagnoa_login_success(self):
        """Test login with coop-gagnoa@greenlink.ci / password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_GAGNOA
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["user_type"] == "cooperative"
        assert data["user"]["email"] == "coop-gagnoa@greenlink.ci"
        
    def test_agent_terrain_login_success(self):
        """Test agent terrain login with +2250709005301 / greenlink2024"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=AGENT_TERRAIN
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["user_type"] == "field_agent"
        assert data["user"]["phone_number"] == "+2250709005301"


class TestCooperativeDashboard:
    """Test cooperative dashboard API - Agents Terrain stat"""
    
    @pytest.fixture
    def bielaghana_token(self):
        """Get auth token for bielaghana cooperative"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_BIELAGHANA
        )
        return response.json()["access_token"]
        
    @pytest.fixture
    def gagnoa_token(self):
        """Get auth token for gagnoa cooperative"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_GAGNOA
        )
        return response.json()["access_token"]
    
    def test_bielaghana_dashboard_returns_agents_object(self, bielaghana_token):
        """Dashboard should return 'agents' object with total, active, activated"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers={"Authorization": f"Bearer {bielaghana_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check agents object exists
        assert "agents" in data, "Missing 'agents' object in dashboard response"
        agents = data["agents"]
        assert "total" in agents, "Missing 'total' in agents object"
        assert "active" in agents, "Missing 'active' in agents object"
        assert "activated" in agents, "Missing 'activated' in agents object"
        
    def test_bielaghana_dashboard_agents_count(self, bielaghana_token):
        """Bielaghana coop should have 1 agent terrain"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers={"Authorization": f"Bearer {bielaghana_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check agents count
        agents = data["agents"]
        assert agents["total"] >= 1, f"Expected at least 1 agent, got {agents['total']}"
        assert agents["active"] >= 1, f"Expected at least 1 active agent, got {agents['active']}"
        
    def test_bielaghana_dashboard_members(self, bielaghana_token):
        """Bielaghana coop should have members including 'Balde ibo' from 'zebia'"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers={"Authorization": f"Bearer {bielaghana_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check members
        assert "members" in data
        assert data["members"]["total"] >= 1
        
        # Check recent_members for 'Balde ibo' from 'zebia'
        assert "recent_members" in data
        recent = data["recent_members"]
        
        # Look for Balde ibo from zebia
        found_balde = False
        for member in recent:
            if "balde" in member.get("name", "").lower() and member.get("village", "").lower() == "zebia":
                found_balde = True
                break
        assert found_balde, f"Expected 'Balde ibo' from 'zebia' in recent members, got: {[m.get('name') for m in recent]}"
        
    def test_gagnoa_dashboard_returns_agents_object(self, gagnoa_token):
        """Gagnoa dashboard should also return 'agents' object"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers={"Authorization": f"Bearer {gagnoa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check agents object exists
        assert "agents" in data, "Missing 'agents' object in dashboard response"
        agents = data["agents"]
        assert "total" in agents, "Missing 'total' in agents object"
        assert "active" in agents, "Missing 'active' in agents object"
        assert "activated" in agents, "Missing 'activated' in agents object"
        
    def test_gagnoa_dashboard_has_all_stats(self, gagnoa_token):
        """Gagnoa dashboard should have all expected stats sections"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers={"Authorization": f"Bearer {gagnoa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All required sections
        assert "coop_info" in data
        assert "members" in data
        assert "parcels" in data
        assert "lots" in data
        assert "financial" in data
        assert "recent_members" in data
        assert "agents" in data  # New field for agents terrain


class TestDashboardRequiresAuth:
    """Test dashboard access control"""
    
    def test_dashboard_without_auth_fails(self):
        """Dashboard should return 401 or 403 without auth token"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestAPIRoot:
    """Basic API health check"""
    
    def test_root_endpoint(self):
        """Root endpoint should return Hello World"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert response.json() == {"message": "Hello World"}
