"""
Test cooperative routes and APIs - Iteration 20
Verifies the route alias fixes for /cooperative/add-parcel and /cooperative/field-agents
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_CREDENTIALS = {
    "identifier": "coop-gagnoa@greenlink.ci",
    "password": "password"
}


class TestCooperativeAuth:
    """Authentication tests for cooperative user"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for cooperative user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_CREDENTIALS,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "cooperative"
        return data["access_token"]
    
    def test_login_returns_cooperative_user(self):
        """Test login returns correct user type"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_CREDENTIALS,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["user_type"] == "cooperative"
        assert data["user"]["coop_code"] == "COOP-001"


class TestCooperativeDashboardAPI:
    """Test cooperative dashboard API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_CREDENTIALS,
            headers={"Content-Type": "application/json"}
        )
        return response.json()["access_token"]
    
    def test_dashboard_returns_200(self, auth_token):
        """Dashboard API returns 200 with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "coop_info" in data
        assert "members" in data
        assert "parcels" in data
        assert "lots" in data
        assert "financial" in data
        assert "recent_members" in data
        
        # Verify coop info
        assert data["coop_info"]["name"] == "COOP-GAGNOA"
        assert data["coop_info"]["code"] == "COOP-001"


class TestCooperativeMembersAPI:
    """Test cooperative members API - used by AddParcelPage"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_CREDENTIALS,
            headers={"Content-Type": "application/json"}
        )
        return response.json()["access_token"]
    
    def test_members_returns_200(self, auth_token):
        """Members API returns 200 with member data"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total" in data
        assert "members" in data
        assert isinstance(data["members"], list)
    
    def test_members_have_required_fields(self, auth_token):
        """Members have full_name and phone_number fields"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["members"]) > 0:
            member = data["members"][0]
            assert "full_name" in member
            assert "phone_number" in member
            assert "id" in member
            assert "village" in member


class TestCooperativeAgentsAPI:
    """Test cooperative agents API - used by FieldAgentsPage"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_CREDENTIALS,
            headers={"Content-Type": "application/json"}
        )
        return response.json()["access_token"]
    
    def test_agents_returns_200(self, auth_token):
        """Agents API returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/agents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Returns empty list if no agents (normal)
        assert isinstance(data, list)


class TestFrontendRoutes:
    """Test frontend routes return HTTP 200 (not 404)"""
    
    def test_add_parcel_alias_route(self):
        """/cooperative/add-parcel returns 200 (alias to AddParcelPage)"""
        response = requests.get(f"{BASE_URL}/cooperative/add-parcel")
        assert response.status_code == 200
    
    def test_field_agents_alias_route(self):
        """/cooperative/field-agents returns 200 (alias to FieldAgentsPage)"""
        response = requests.get(f"{BASE_URL}/cooperative/field-agents")
        assert response.status_code == 200
    
    def test_parcels_new_route(self):
        """/cooperative/parcels/new returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/parcels/new")
        assert response.status_code == 200
    
    def test_agents_route(self):
        """/cooperative/agents returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/agents")
        assert response.status_code == 200
    
    def test_cooperative_dashboard_route(self):
        """/cooperative/dashboard returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/dashboard")
        assert response.status_code == 200
    
    def test_cooperative_members_route(self):
        """/cooperative/members returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/members")
        assert response.status_code == 200
    
    def test_cooperative_lots_route(self):
        """/cooperative/lots returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/lots")
        assert response.status_code == 200
    
    def test_cooperative_distributions_route(self):
        """/cooperative/distributions returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/distributions")
        assert response.status_code == 200
    
    def test_cooperative_reports_route(self):
        """/cooperative/reports returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/reports")
        assert response.status_code == 200
    
    def test_cooperative_carbon_premiums_route(self):
        """/cooperative/carbon-premiums returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/carbon-premiums")
        assert response.status_code == 200
    
    def test_cooperative_ssrte_route(self):
        """/cooperative/ssrte returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/ssrte")
        assert response.status_code == 200
    
    def test_cooperative_qrcodes_route(self):
        """/cooperative/qrcodes returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/qrcodes")
        assert response.status_code == 200
    
    def test_cooperative_notifications_route(self):
        """/cooperative/notifications returns 200"""
        response = requests.get(f"{BASE_URL}/cooperative/notifications")
        assert response.status_code == 200
