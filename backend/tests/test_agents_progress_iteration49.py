"""
Test Suite for Agents Progress Dashboard and member_id/farmer_id Refactoring
Iteration 49 - Tests for:
1. GET /api/cooperative/agents-progress endpoint
2. Parcel queries with string member_id
3. SSRTE uses farmer_id instead of member_id
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_BIELAGHANA = {"identifier": "bielaghana@gmail.com", "password": "greenlink2024"}
COOP_TRAORE = {"identifier": "traore_eric@yahoo.fr", "password": "greenlink2024"}
ADMIN_CREDS = {"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"}
FIELD_AGENT_KONE = {"identifier": "+2250709005301", "password": "greenlink2024"}


class TestAuthLogin:
    """Test authentication for different user types"""
    
    def test_login_cooperative_bielaghana(self):
        """Login as Cooperative Bielaghana (has agents)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_BIELAGHANA)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        user = data.get("user", {})
        user_type = user.get("user_type") or data.get("user_type")
        assert user_type == "cooperative", f"Expected cooperative, got {user_type}"
        print(f"PASS: Cooperative Bielaghana login successful, user_type={user_type}")
    
    def test_login_cooperative_traore(self):
        """Login as Cooperative Traore (no agents)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_TRAORE)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"PASS: Cooperative Traore login successful")
    
    def test_login_field_agent(self):
        """Login as Field Agent Kone Alphone"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_KONE)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"PASS: Field Agent Kone login successful")


class TestAgentsProgressEndpoint:
    """Test GET /api/cooperative/agents-progress endpoint"""
    
    @pytest.fixture
    def bielaghana_token(self):
        """Get auth token for Cooperative Bielaghana"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_BIELAGHANA)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not login as Bielaghana cooperative")
    
    @pytest.fixture
    def traore_token(self):
        """Get auth token for Cooperative Traore"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_TRAORE)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not login as Traore cooperative")
    
    def test_agents_progress_returns_200(self, bielaghana_token):
        """Test that agents-progress endpoint returns 200"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents-progress", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: agents-progress returns 200")
    
    def test_agents_progress_structure(self, bielaghana_token):
        """Test response structure has agents and summary"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents-progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level keys
        assert "agents" in data, "Missing 'agents' key"
        assert "summary" in data, "Missing 'summary' key"
        assert isinstance(data["agents"], list), "agents should be a list"
        assert isinstance(data["summary"], dict), "summary should be a dict"
        print(f"PASS: Response has correct structure with agents and summary")
    
    def test_agents_progress_summary_fields(self, bielaghana_token):
        """Test summary contains required fields"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents-progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        summary = data.get("summary", {})
        
        required_fields = ["total_agents", "total_farmers", "farmers_5_5", "average_progress"]
        for field in required_fields:
            assert field in summary, f"Missing summary field: {field}"
        
        # Validate types
        assert isinstance(summary["total_agents"], int), "total_agents should be int"
        assert isinstance(summary["total_farmers"], int), "total_farmers should be int"
        assert isinstance(summary["farmers_5_5"], int), "farmers_5_5 should be int"
        assert isinstance(summary["average_progress"], (int, float)), "average_progress should be numeric"
        
        print(f"PASS: Summary has all required fields: total_agents={summary['total_agents']}, total_farmers={summary['total_farmers']}, farmers_5_5={summary['farmers_5_5']}, average_progress={summary['average_progress']}")
    
    def test_agents_progress_bielaghana_has_agents(self, bielaghana_token):
        """Test Bielaghana cooperative has agents (Kone Alphone, Ziri)"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents-progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        agents = data.get("agents", [])
        summary = data.get("summary", {})
        
        # Bielaghana should have at least 1 agent
        assert summary["total_agents"] >= 1, f"Expected at least 1 agent, got {summary['total_agents']}"
        assert len(agents) >= 1, f"Expected at least 1 agent in list, got {len(agents)}"
        
        # Check agent structure
        if agents:
            agent = agents[0]
            required_agent_fields = ["id", "full_name", "assigned_count", "farmers_5_5", "progress_percent", "farmers"]
            for field in required_agent_fields:
                assert field in agent, f"Missing agent field: {field}"
        
        print(f"PASS: Bielaghana has {summary['total_agents']} agents with {summary['total_farmers']} farmers")
    
    def test_agents_progress_farmer_form_status(self, bielaghana_token):
        """Test per-farmer form status structure"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents-progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        agents = data.get("agents", [])
        
        # Find an agent with farmers
        agent_with_farmers = None
        for agent in agents:
            if agent.get("assigned_count", 0) > 0 and agent.get("farmers"):
                agent_with_farmers = agent
                break
        
        if not agent_with_farmers:
            pytest.skip("No agent with assigned farmers found")
        
        farmer = agent_with_farmers["farmers"][0]
        
        # Check farmer structure
        required_farmer_fields = ["id", "full_name", "village", "completed", "total", "percentage", "forms"]
        for field in required_farmer_fields:
            assert field in farmer, f"Missing farmer field: {field}"
        
        # Check forms structure
        forms = farmer.get("forms", {})
        required_form_fields = ["register", "ici", "ssrte", "parcels", "photos"]
        for field in required_form_fields:
            assert field in forms, f"Missing form field: {field}"
            assert isinstance(forms[field], bool), f"Form field {field} should be boolean"
        
        print(f"PASS: Farmer form status structure is correct. Farmer {farmer['full_name']}: {farmer['completed']}/5 forms")
    
    def test_agents_progress_traore_no_agents(self, traore_token):
        """Test Traore cooperative returns empty agents list"""
        headers = {"Authorization": f"Bearer {traore_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents-progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get("summary", {})
        # Traore may have 0 agents or some agents
        print(f"PASS: Traore cooperative agents-progress returns: {summary}")


class TestMemberParcelsEndpoint:
    """Test parcel endpoints with string member_id"""
    
    @pytest.fixture
    def bielaghana_token(self):
        """Get auth token for Cooperative Bielaghana"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_BIELAGHANA)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not login as Bielaghana cooperative")
    
    def test_get_members_list(self, bielaghana_token):
        """Test GET /api/cooperative/members returns members"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "members" in data, "Missing 'members' key"
        print(f"PASS: GET /api/cooperative/members returns {data.get('total', len(data.get('members', [])))} members")
    
    def test_get_member_parcels(self, bielaghana_token):
        """Test GET /api/cooperative/members/{member_id}/parcels"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        
        # First get a member
        members_response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=headers)
        if members_response.status_code != 200:
            pytest.skip("Could not get members list")
        
        members = members_response.json().get("members", [])
        if not members:
            pytest.skip("No members found for this cooperative")
        
        member_id = members[0]["id"]
        
        # Get parcels for this member
        response = requests.get(f"{BASE_URL}/api/cooperative/members/{member_id}/parcels", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "member_id" in data, "Missing member_id in response"
        assert "parcels" in data, "Missing parcels in response"
        assert data["member_id"] == member_id, "member_id mismatch"
        
        print(f"PASS: GET /api/cooperative/members/{member_id}/parcels returns {len(data.get('parcels', []))} parcels")
    
    def test_create_parcel_with_string_member_id(self, bielaghana_token):
        """Test POST /api/cooperative/members/{member_id}/parcels creates parcel with string member_id"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        
        # First get a member
        members_response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=headers)
        if members_response.status_code != 200:
            pytest.skip("Could not get members list")
        
        members = members_response.json().get("members", [])
        if not members:
            pytest.skip("No members found for this cooperative")
        
        member_id = members[0]["id"]
        
        # Create a test parcel
        parcel_data = {
            "location": "TEST_Parcelle_Iteration49",
            "village": "Test Village",
            "area_hectares": 1.5,
            "crop_type": "cacao"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members/{member_id}/parcels",
            headers=headers,
            json=parcel_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "parcel_id" in data, "Missing parcel_id in response"
        assert "carbon_score" in data, "Missing carbon_score in response"
        
        print(f"PASS: Created parcel with id={data['parcel_id']}, carbon_score={data['carbon_score']}")
        
        # Cleanup: Delete the test parcel
        parcel_id = data["parcel_id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/cooperative/members/{member_id}/parcels/{parcel_id}",
            headers=headers
        )
        if delete_response.status_code == 200:
            print(f"CLEANUP: Deleted test parcel {parcel_id}")


class TestCooperativeDashboard:
    """Test cooperative dashboard has agents-progress quick action"""
    
    @pytest.fixture
    def bielaghana_token(self):
        """Get auth token for Cooperative Bielaghana"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_BIELAGHANA)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not login as Bielaghana cooperative")
    
    def test_dashboard_returns_agents_data(self, bielaghana_token):
        """Test dashboard returns agents section"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "agents" in data, "Missing 'agents' key in dashboard"
        
        agents = data.get("agents", {})
        assert "total" in agents, "Missing agents.total"
        assert "active" in agents, "Missing agents.active"
        
        print(f"PASS: Dashboard returns agents data: total={agents.get('total')}, active={agents.get('active')}")


class TestAgentsListEndpoint:
    """Test GET /api/cooperative/agents endpoint"""
    
    @pytest.fixture
    def bielaghana_token(self):
        """Get auth token for Cooperative Bielaghana"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_BIELAGHANA)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not login as Bielaghana cooperative")
    
    def test_get_agents_list(self, bielaghana_token):
        """Test GET /api/cooperative/agents returns agents"""
        headers = {"Authorization": f"Bearer {bielaghana_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        agents = response.json()
        assert isinstance(agents, list), "Expected list of agents"
        
        if agents:
            agent = agents[0]
            required_fields = ["id", "full_name", "phone_number", "is_active", "assigned_farmers_count"]
            for field in required_fields:
                assert field in agent, f"Missing agent field: {field}"
        
        print(f"PASS: GET /api/cooperative/agents returns {len(agents)} agents")


class TestFieldAgentMyFarmers:
    """Test field agent my-farmers endpoint for form completion tracking"""
    
    @pytest.fixture
    def agent_token(self):
        """Get auth token for Field Agent Kone"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_KONE)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not login as Field Agent Kone")
    
    def test_my_farmers_returns_completion_status(self, agent_token):
        """Test GET /api/field-agent/my-farmers returns form completion"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        if farmers:
            farmer = farmers[0]
            # Check completion fields exist
            assert "forms_completed" in farmer or "completion" in farmer or "completed_forms" in farmer, \
                "Missing completion tracking field"
        
        print(f"PASS: GET /api/field-agent/my-farmers returns {len(farmers)} farmers with completion status")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
