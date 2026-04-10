from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test file for Field Agent Dashboard - Iteration 31
Test file for Field Agent Dashboard - Iteration 31
Tests: Agent terrain login, dashboard API, KPIs, performance score, search functionality, cooperative agents list
Tests: Agent terrain login, dashboard API, KPIs, performance score, search functionality, cooperative agents list
"""
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
AGENT_TERRAIN = {"identifier": "+2250709005301", "password": "greenlink2024"}
COOP_BIELAGHANA = {"identifier": COOP_EMAIL, "password": "greenlink2024"}


class TestAgentTerrainLogin:
    """Test agent terrain login functionality"""
    
    def test_agent_login_success(self):
        """Test login with +2250709005301 / greenlink2024"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=AGENT_TERRAIN
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["user_type"] == "field_agent"
        assert data["user"]["phone_number"] == "+2250709005301"
        assert data["user"]["full_name"] == "Kone Alphone"
        
    def test_agent_login_returns_proper_structure(self):
        """Login response should have token_type bearer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=AGENT_TERRAIN
        )
        assert response.status_code == 200
        data = response.json()
        assert data["token_type"] == "bearer"


class TestFieldAgentDashboardAPI:
    """Test GET /api/field-agent/dashboard endpoint"""
    
    @pytest.fixture
    def agent_token(self):
        """Get auth token for agent terrain"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=AGENT_TERRAIN
        )
        return response.json()["access_token"]
    
    def test_dashboard_returns_agent_info(self, agent_token):
        """Dashboard should return agent_info with name, cooperative"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "agent_info" in data
        agent_info = data["agent_info"]
        assert agent_info["name"] == "Kone Alphone"
        assert agent_info["cooperative"] == "Coopérative Bielaghana"
        
    def test_dashboard_returns_performance(self, agent_token):
        """Dashboard should return performance with score, level"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "performance" in data
        perf = data["performance"]
        assert "score" in perf
        assert "level" in perf
        # New agent should be Débutant level
        assert perf["level"] == "Débutant"
        assert perf["score"] == 0
        
    def test_dashboard_returns_statistics(self, agent_token):
        """Dashboard should return statistics with ssrte_visits, members_onboarded, etc."""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "statistics" in data
        stats = data["statistics"]
        
        # Check KPIs structure
        assert "ssrte_visits" in stats
        assert stats["ssrte_visits"]["total"] >= 0
        assert stats["ssrte_visits"]["this_month"] >= 0
        assert stats["ssrte_visits"]["target"] == 20
        assert "progress" in stats["ssrte_visits"]
        
        assert "members_onboarded" in stats
        assert stats["members_onboarded"]["total"] >= 0
        assert stats["members_onboarded"]["target"] == 10
        
        assert "parcels_declared" in stats
        assert stats["parcels_declared"]["total"] >= 0
        assert stats["parcels_declared"]["target"] == 15
        
        assert "geotagged_photos" in stats
        assert stats["geotagged_photos"]["total"] >= 0
        assert stats["geotagged_photos"]["target"] == 30
        
        assert "qr_scans" in stats
        assert "children_identified" in stats
        
    def test_dashboard_returns_achievements(self, agent_token):
        """Dashboard should return achievements array"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "achievements" in data
        assert isinstance(data["achievements"], list)
        
    def test_dashboard_returns_risk_distribution(self, agent_token):
        """Dashboard should return risk_distribution object"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "risk_distribution" in data
        risk = data["risk_distribution"]
        assert "critique" in risk
        assert "eleve" in risk
        assert "modere" in risk
        assert "faible" in risk
        
    def test_dashboard_returns_recent_activities(self, agent_token):
        """Dashboard should return recent_activities array"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_activities" in data
        assert isinstance(data["recent_activities"], list)


class TestAgentSearchAPI:
    """Test GET /api/agent/search endpoint"""
    
    @pytest.fixture
    def agent_token(self):
        """Get auth token for agent terrain"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=AGENT_TERRAIN
        )
        return response.json()["access_token"]
    
    def test_search_existing_farmer(self, agent_token):
        """Search should find farmer by phone number"""
        response = requests.get(
            f"{BASE_URL}/api/agent/search?phone=0701234567",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["found"] == True
        assert "farmer" in data
        assert data["farmer"]["full_name"] is not None
        
    def test_search_nonexistent_farmer(self, agent_token):
        """Search for non-existent phone should return found=false"""
        response = requests.get(
            f"{BASE_URL}/api/agent/search?phone=0000000000",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["found"] == False


class TestCooperativeAgentsList:
    """Test GET /api/cooperative/agents endpoint"""
    
    @pytest.fixture
    def coop_token(self):
        """Get auth token for cooperative"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_BIELAGHANA
        )
        return response.json()["access_token"]
    
    def test_agents_list_returns_kone_alphone(self, coop_token):
        """Agents list should include Kone Alphone"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/agents",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Find Kone Alphone
        found_kone = False
        for agent in data:
            if agent.get("full_name") == "Kone Alphone":
                found_kone = True
                assert agent["phone_number"] == "+2250709005301"
                assert agent["account_activated"] == True
                break
        assert found_kone, f"Kone Alphone not found in agents list: {[a['full_name'] for a in data]}"
        
    def test_agents_list_has_correct_structure(self, coop_token):
        """Each agent should have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/agents",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) >= 1
        agent = data[0]
        
        # Required fields
        assert "id" in agent
        assert "full_name" in agent
        assert "phone_number" in agent
        assert "zone" in agent
        assert "is_active" in agent
        assert "account_activated" in agent
        assert "members_onboarded" in agent
        assert "ssrte_visits_count" in agent


class TestCooperativeDashboardAgentsCount:
    """Test cooperative dashboard agents count (from previous iteration)"""
    
    @pytest.fixture
    def coop_token(self):
        """Get auth token for cooperative"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_BIELAGHANA
        )
        return response.json()["access_token"]
    
    def test_dashboard_agents_count_is_1(self, coop_token):
        """Cooperative dashboard should show 1 agent terrain"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "agents" in data
        agents = data["agents"]
        assert agents["total"] == 1
        assert agents["active"] == 1
        assert agents["activated"] == 1


class TestAPIAuth:
    """Test API authentication requirements"""
    
    def test_dashboard_requires_auth(self):
        """Dashboard should require authentication"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard")
        assert response.status_code in [401, 403]
        
    def test_agent_search_requires_auth(self):
        """Agent search should require authentication"""
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=0701234567")
        assert response.status_code in [401, 403]


class TestRootAPI:
    """Basic API health check"""
    
    def test_root_endpoint(self):
        """Root endpoint should return Hello World"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert response.json() == {"message": "Hello World"}
