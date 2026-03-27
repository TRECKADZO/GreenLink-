"""
GreenLink Agritech Platform - Comprehensive API Tests
Tests for: Authentication, Carbon Auditors, Cooperative Management, Missions
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://redd-mrvdash.preview.emergentagent.com').rstrip('/')

# Test Credentials
ADMIN_CREDENTIALS = {"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"}
COOP_CREDENTIALS = {"identifier": "coop-test@greenlink.ci", "password": "coop123"}
AUDITOR_CREDENTIALS = {"identifier": "auditeur@greenlink.ci", "password": "audit123"}


class TestAuthentication:
    """Test authentication endpoints for different user types"""
    
    def test_admin_login(self):
        """Test admin login returns valid token and correct user type"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "admin"
        assert data["user"]["email"] == "klenakan.eric@gmail.com"
        print(f"✓ Admin login successful: {data['user']['full_name']}")
    
    def test_cooperative_login(self):
        """Test cooperative login returns valid token and correct user type"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "cooperative"
        assert data["user"]["email"] == "coop-test@greenlink.ci"
        print(f"✓ Cooperative login successful: {data['user']['full_name']}")
    
    def test_carbon_auditor_login(self):
        """Test carbon auditor login returns valid token and correct user type"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=AUDITOR_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "carbon_auditor"
        assert data["user"]["email"] == "auditeur@greenlink.ci"
        assert "certifications" in data["user"]
        print(f"✓ Carbon Auditor login successful: {data['user']['full_name']}")
    
    def test_invalid_login(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"identifier": "invalid@test.com", "password": "wrong"})
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected with 401")


class TestCarbonAuditorAdminAPIs:
    """Test Carbon Auditor management endpoints (Admin access)"""
    
    def test_list_auditors(self):
        """Test listing all carbon auditors"""
        response = requests.get(f"{BASE_URL}/api/carbon-auditor/admin/auditors")
        assert response.status_code == 200
        data = response.json()
        assert "auditors" in data
        assert "total" in data
        assert data["total"] >= 1  # At least one auditor exists
        
        # Verify auditor structure
        if data["auditors"]:
            auditor = data["auditors"][0]
            assert "id" in auditor
            assert "full_name" in auditor
            assert "email" in auditor
            assert "zone_coverage" in auditor
            assert "certifications" in auditor
            assert "is_active" in auditor
        print(f"✓ Listed {data['total']} auditor(s)")
    
    def test_get_audit_stats_overview(self):
        """Test getting audit statistics overview"""
        response = requests.get(f"{BASE_URL}/api/carbon-auditor/admin/stats/overview")
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "auditors" in data
        assert "missions" in data
        assert "audits" in data
        
        assert "total" in data["auditors"]
        assert "pending" in data["missions"]
        assert "completed" in data["missions"]
        assert "approval_rate" in data["audits"]
        print(f"✓ Stats: {data['auditors']['total']} auditors, {data['missions']['total']} missions")
    
    def test_list_missions(self):
        """Test listing all audit missions"""
        response = requests.get(f"{BASE_URL}/api/carbon-auditor/admin/missions")
        assert response.status_code == 200
        data = response.json()
        assert "missions" in data
        assert "total" in data
        
        # Verify mission structure if any exist
        if data["missions"]:
            mission = data["missions"][0]
            assert "id" in mission
            assert "auditor_id" in mission
            assert "auditor_name" in mission
            assert "cooperative_id" in mission
            assert "cooperative_name" in mission
            assert "parcels_count" in mission
            assert "status" in mission
        print(f"✓ Listed {data['total']} mission(s)")


class TestCarbonAuditorDashboard:
    """Test Carbon Auditor dashboard and missions endpoints"""
    
    @pytest.fixture(scope="class")
    def auditor_data(self):
        """Get auditor ID from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=AUDITOR_CREDENTIALS)
        data = response.json()
        return {
            "token": data["access_token"],
            "id": data["user"]["_id"],
            "name": data["user"]["full_name"]
        }
    
    def test_auditor_dashboard(self, auditor_data):
        """Test auditor dashboard returns correct data"""
        response = requests.get(f"{BASE_URL}/api/carbon-auditor/dashboard/{auditor_data['id']}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "auditor" in data
        assert "stats" in data
        assert "pending_missions" in data
        assert "missions_count" in data
        
        # Verify stats
        assert "total_audits" in data["stats"]
        assert "approved" in data["stats"]
        assert "rejected" in data["stats"]
        assert "approval_rate" in data["stats"]
        print(f"✓ Dashboard for {data['auditor']['full_name']}: {data['stats']['total_audits']} total audits")
    
    def test_auditor_missions(self, auditor_data):
        """Test getting auditor's missions list"""
        response = requests.get(f"{BASE_URL}/api/carbon-auditor/missions/{auditor_data['id']}")
        assert response.status_code == 200
        data = response.json()
        assert "missions" in data
        print(f"✓ Auditor has {len(data['missions'])} mission(s)")


class TestCooperativeAPIs:
    """Test Cooperative management endpoints"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        return response.json()["access_token"]
    
    def test_cooperative_dashboard(self, coop_token):
        """Test cooperative dashboard returns correct data"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "coop_info" in data
        assert "members" in data
        assert "parcels" in data
        assert "lots" in data
        assert "financial" in data
        
        # Verify coop info
        assert "name" in data["coop_info"]
        assert "code" in data["coop_info"]
        assert "certifications" in data["coop_info"]
        
        print(f"✓ Dashboard for {data['coop_info']['name']}: {data['members']['total']} members")
    
    def test_list_cooperative_members(self, coop_token):
        """Test listing cooperative members"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "members" in data
        
        # Verify member structure if any exist
        if data["members"]:
            member = data["members"][0]
            assert "id" in member
            assert "full_name" in member
            assert "phone_number" in member
            assert "village" in member
            assert "status" in member
        print(f"✓ Listed {data['total']} member(s)")
    
    def test_list_field_agents(self, coop_token):
        """Test listing cooperative field agents"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # Verify agent structure if any exist
        if data:
            agent = data[0]
            assert "id" in agent
            assert "full_name" in agent
            assert "phone_number" in agent
            assert "zone" in agent
            assert "village_coverage" in agent
            assert "is_active" in agent
            assert "account_activated" in agent
        print(f"✓ Listed {len(data)} field agent(s)")
    
    def test_list_cooperative_lots(self, coop_token):
        """Test listing cooperative lots"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/lots", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} lot(s)")


class TestCooperativeList:
    """Test public cooperative listing endpoint"""
    
    def test_list_all_cooperatives(self):
        """Test listing all cooperatives for admin selection"""
        response = requests.get(f"{BASE_URL}/api/cooperative/list")
        assert response.status_code == 200
        data = response.json()
        
        assert "cooperatives" in data
        assert "total" in data
        assert data["total"] >= 1
        
        # Verify cooperative structure
        if data["cooperatives"]:
            coop = data["cooperatives"][0]
            assert "id" in coop
            assert "name" in coop
        print(f"✓ Listed {data['total']} cooperative(s)")


class TestMemberActivation:
    """Test member account activation endpoint"""
    
    def test_check_member_phone_not_found(self):
        """Test checking a non-existent member phone"""
        response = requests.get(f"{BASE_URL}/api/auth/check-member-phone/+2250000000000")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False
        assert data["can_activate"] == False
        print("✓ Non-existent member phone correctly returns not found")
    
    def test_check_agent_phone_not_found(self):
        """Test checking a non-existent agent phone"""
        response = requests.get(f"{BASE_URL}/api/auth/check-agent-phone/+2250000000000")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False
        assert data["can_activate"] == False
        print("✓ Non-existent agent phone correctly returns not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
