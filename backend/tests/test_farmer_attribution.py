"""
Tests for Farmer Attribution Feature (Iteration 32)
- GET /api/cooperative/agents returns agents with assigned_farmers_count
- POST /api/cooperative/agents/{agent_id}/assign-farmers assigns farmers
- POST /api/cooperative/agents/{agent_id}/unassign-farmers removes assignments
- GET /api/cooperative/agents/{agent_id}/assigned-farmers lists farmers for agent
- GET /api/field-agent/my-farmers returns assigned farmers for logged-in agent
- Reassignment logic: assigning a farmer already assigned to another agent should reassign
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_IDENTIFIER = "bielaghana@gmail.com"
COOP_PASSWORD = "greenlink2024"
AGENT_IDENTIFIER = "+2250709005301"
AGENT_PASSWORD = "greenlink2024"
KNOWN_AGENT_ID = "69b98dda122dd07c63479438"  # Kone Alphone
KNOWN_MEMBER_ID = "69b98dda122dd07c6347943a"  # Balde ibo


class TestCooperativeAuth:
    """Test authentication for cooperative user"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200, f"Coop login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_coop_login_success(self, coop_token):
        """Verify cooperative login works"""
        assert coop_token is not None
        assert len(coop_token) > 0
        print(f"SUCCESS: Cooperative login works, token length: {len(coop_token)}")


class TestAgentAuth:
    """Test authentication for field agent"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_IDENTIFIER,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_agent_login_success(self, agent_token):
        """Verify agent login works"""
        assert agent_token is not None
        print(f"SUCCESS: Agent login works, token length: {len(agent_token)}")


class TestGetAgentsWithAssignedCount:
    """Test GET /api/cooperative/agents returns assigned_farmers_count"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_get_agents_returns_assigned_farmers_count(self, coop_token):
        """GET /api/cooperative/agents should return assigned_farmers_count field"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/agents",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"GET agents failed: {response.text}"
        agents = response.json()
        assert isinstance(agents, list), "Response should be a list of agents"
        
        # Find the known agent
        agent = next((a for a in agents if a.get("id") == KNOWN_AGENT_ID), None)
        if agent:
            assert "assigned_farmers_count" in agent, "Agent should have assigned_farmers_count field"
            assert isinstance(agent["assigned_farmers_count"], int), "assigned_farmers_count should be int"
            print(f"SUCCESS: Agent {agent.get('full_name')} has assigned_farmers_count={agent['assigned_farmers_count']}")
        else:
            print(f"WARNING: Known agent {KNOWN_AGENT_ID} not found, checking first agent")
            if agents:
                first_agent = agents[0]
                assert "assigned_farmers_count" in first_agent
                print(f"SUCCESS: First agent has assigned_farmers_count field")
    
    def test_get_agents_returns_assigned_farmers_list(self, coop_token):
        """GET /api/cooperative/agents should also return assigned_farmers array"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/agents",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        agents = response.json()
        if agents:
            first_agent = agents[0]
            assert "assigned_farmers" in first_agent, "Agent should have assigned_farmers field"
            assert isinstance(first_agent["assigned_farmers"], list), "assigned_farmers should be a list"
            print(f"SUCCESS: Agent has assigned_farmers array with {len(first_agent['assigned_farmers'])} items")


class TestAssignFarmers:
    """Test POST /api/cooperative/agents/{agent_id}/assign-farmers"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_assign_farmer_to_agent(self, coop_token):
        """Assign a farmer to an agent"""
        response = requests.post(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assign-farmers",
            json={"farmer_ids": [KNOWN_MEMBER_ID]},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Assign failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "assigned_count" in data
        assert "assigned_ids" in data
        assert KNOWN_MEMBER_ID in data["assigned_ids"], "Assigned ID should be in response"
        print(f"SUCCESS: Assigned farmer, message: {data['message']}, count: {data['assigned_count']}")
    
    def test_assign_empty_list_fails(self, coop_token):
        """Assigning empty farmer list should fail"""
        response = requests.post(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assign-farmers",
            json={"farmer_ids": []},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"SUCCESS: Empty farmer list correctly rejected with 400")
    
    def test_assign_invalid_agent_id(self, coop_token):
        """Assigning to invalid agent ID should fail"""
        response = requests.post(
            f"{BASE_URL}/api/cooperative/agents/invalid_id_123/assign-farmers",
            json={"farmer_ids": [KNOWN_MEMBER_ID]},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
        print(f"SUCCESS: Invalid agent ID correctly rejected")


class TestGetAssignedFarmers:
    """Test GET /api/cooperative/agents/{agent_id}/assigned-farmers"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_get_assigned_farmers(self, coop_token):
        """Get list of farmers assigned to an agent"""
        # First assign a farmer
        requests.post(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assign-farmers",
            json={"farmer_ids": [KNOWN_MEMBER_ID]},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        
        # Then get assigned farmers
        response = requests.get(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assigned-farmers",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Get assigned failed: {response.text}"
        data = response.json()
        assert "agent_id" in data
        assert "agent_name" in data
        assert "farmers" in data
        assert "total" in data
        assert isinstance(data["farmers"], list)
        print(f"SUCCESS: Got {data['total']} assigned farmers for agent {data['agent_name']}")
        
        # Verify farmer data structure
        if data["farmers"]:
            farmer = data["farmers"][0]
            assert "id" in farmer
            assert "full_name" in farmer
            assert "phone_number" in farmer
            assert "village" in farmer
            print(f"SUCCESS: Farmer data has required fields: id, full_name, phone_number, village")
    
    def test_get_assigned_farmers_invalid_agent(self, coop_token):
        """Getting farmers for invalid agent should fail"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/agents/invalid_id/assigned-farmers",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 400
        print(f"SUCCESS: Invalid agent ID correctly rejected with 400")


class TestUnassignFarmers:
    """Test POST /api/cooperative/agents/{agent_id}/unassign-farmers"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_unassign_farmer(self, coop_token):
        """Unassign a farmer from an agent"""
        # First ensure farmer is assigned
        requests.post(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assign-farmers",
            json={"farmer_ids": [KNOWN_MEMBER_ID]},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        
        # Now unassign
        response = requests.post(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/unassign-farmers",
            json={"farmer_ids": [KNOWN_MEMBER_ID]},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Unassign failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "remaining_count" in data
        print(f"SUCCESS: Unassigned farmer, remaining: {data['remaining_count']}")
    
    def test_unassign_empty_list_fails(self, coop_token):
        """Unassigning empty farmer list should fail"""
        response = requests.post(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/unassign-farmers",
            json={"farmer_ids": []},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 400
        print(f"SUCCESS: Empty farmer list for unassign correctly rejected")


class TestFieldAgentMyFarmers:
    """Test GET /api/field-agent/my-farmers for logged-in agent"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_IDENTIFIER,
            "password": AGENT_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_my_farmers_returns_assigned_farmers(self, agent_token, coop_token):
        """GET /api/field-agent/my-farmers should return assigned farmers"""
        # First ensure a farmer is assigned to this agent
        requests.post(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assign-farmers",
            json={"farmer_ids": [KNOWN_MEMBER_ID]},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        
        # Now get my-farmers as the agent
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"my-farmers failed: {response.text}"
        data = response.json()
        assert "farmers" in data
        assert "total" in data
        assert "last_updated" in data
        assert isinstance(data["farmers"], list)
        print(f"SUCCESS: my-farmers returned {data['total']} farmers, last_updated: {data['last_updated']}")
        
        # Verify enriched farmer data
        if data["farmers"]:
            farmer = data["farmers"][0]
            assert "id" in farmer
            assert "full_name" in farmer
            assert "phone_number" in farmer
            assert "village" in farmer
            assert "parcels" in farmer
            assert "parcels_count" in farmer
            print(f"SUCCESS: Farmer data is enriched with parcels info")


class TestReassignment:
    """Test that assigning a farmer already assigned to another agent reassigns them"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_reassignment_logic(self, coop_token):
        """Assigning a farmer to a new agent should remove from previous agent"""
        # First assign farmer to known agent
        response1 = requests.post(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assign-farmers",
            json={"farmer_ids": [KNOWN_MEMBER_ID]},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response1.status_code == 200
        print(f"SUCCESS: First assignment completed")
        
        # Verify farmer is assigned
        response2 = requests.get(
            f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assigned-farmers",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        data2 = response2.json()
        farmer_ids = [f["id"] for f in data2["farmers"]]
        assert KNOWN_MEMBER_ID in farmer_ids, "Farmer should be assigned to agent"
        print(f"SUCCESS: Verified farmer is assigned to known agent")
        
        # If there's another agent, test reassignment
        agents_response = requests.get(
            f"{BASE_URL}/api/cooperative/agents",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        agents = agents_response.json()
        
        if len(agents) > 1:
            other_agent = next((a for a in agents if a["id"] != KNOWN_AGENT_ID), None)
            if other_agent:
                # Reassign to other agent
                response3 = requests.post(
                    f"{BASE_URL}/api/cooperative/agents/{other_agent['id']}/assign-farmers",
                    json={"farmer_ids": [KNOWN_MEMBER_ID]},
                    headers={"Authorization": f"Bearer {coop_token}"}
                )
                assert response3.status_code == 200
                
                # Verify removed from original agent
                response4 = requests.get(
                    f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assigned-farmers",
                    headers={"Authorization": f"Bearer {coop_token}"}
                )
                data4 = response4.json()
                farmer_ids_after = [f["id"] for f in data4["farmers"]]
                assert KNOWN_MEMBER_ID not in farmer_ids_after, "Farmer should be removed from original agent"
                print(f"SUCCESS: Reassignment correctly removed farmer from original agent")
                
                # Reassign back for cleanup
                requests.post(
                    f"{BASE_URL}/api/cooperative/agents/{KNOWN_AGENT_ID}/assign-farmers",
                    json={"farmer_ids": [KNOWN_MEMBER_ID]},
                    headers={"Authorization": f"Bearer {coop_token}"}
                )
        else:
            print("INFO: Only one agent exists, skipping multi-agent reassignment test")
            # Just verify the assignment API works correctly
            assert data2["total"] >= 1
            print(f"SUCCESS: Single agent test - farmer assignment verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
