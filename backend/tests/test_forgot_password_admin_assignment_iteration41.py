"""
Iteration 41 - Testing New Features:
1. Forgot Password with simulation_code display (SMS mocked)
2. Admin farmer-agent assignment (super admin can assign any farmer to any agent)
3. Registration page - field_agent user type removed from options
"""

import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Credentials
SUPER_ADMIN_CREDS = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}

FIELD_AGENT_CREDS = {
    "identifier": "+2250709005301", 
    "password": "greenlink2024"
}


class TestForgotPasswordSimulationCode:
    """Tests for forgot-password endpoint with simulation_code in response"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_forgot_password_with_phone_returns_simulation_code(self):
        """POST /api/auth/forgot-password with phone should return simulation_code"""
        response = self.session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "identifier": FIELD_AGENT_CREDS["identifier"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sent" in data, "Response should have 'sent' field"
        assert data["sent"] == True, "sent should be True"
        assert "simulation_code" in data, "Response MUST include simulation_code when SMS is mocked"
        assert len(data["simulation_code"]) == 6, "simulation_code should be 6 digits"
        assert data["simulation_code"].isdigit(), "simulation_code should be numeric"
        
        print(f"✓ Forgot password with phone: simulation_code = {data['simulation_code']}")
        
    def test_forgot_password_with_email_returns_simulation_code(self):
        """POST /api/auth/forgot-password with email should also return simulation_code"""
        response = self.session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "identifier": SUPER_ADMIN_CREDS["identifier"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sent" in data
        assert "simulation_code" in data, "Email-based forgot-password should also return simulation_code"
        assert len(data["simulation_code"]) == 6
        
        print(f"✓ Forgot password with email: simulation_code = {data['simulation_code']}")
        
    def test_forgot_password_unknown_user_still_returns_sent(self):
        """For security, unknown users should still get 'sent: True' response"""
        response = self.session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "identifier": "unknown-user-test-12345@test.com"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("sent") == True, "Should return sent:True for security (don't reveal if user exists)"
        
        print("✓ Unknown user: sent=True for security")


class TestPasswordResetFlow:
    """Tests for complete password reset flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_full_password_reset_flow(self):
        """Test complete flow: forgot-password -> verify-reset-code -> reset-password"""
        # Step 1: Request reset code
        identifier = FIELD_AGENT_CREDS["identifier"]
        forgot_response = self.session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "identifier": identifier
        })
        
        assert forgot_response.status_code == 200
        forgot_data = forgot_response.json()
        assert "simulation_code" in forgot_data
        code = forgot_data["simulation_code"]
        
        print(f"✓ Step 1: Got simulation_code = {code}")
        
        # Step 2: Verify the code
        verify_response = self.session.post(f"{BASE_URL}/api/auth/verify-reset-code", json={
            "identifier": identifier,
            "code": code
        })
        
        assert verify_response.status_code == 200, f"Verify failed: {verify_response.text}"
        verify_data = verify_response.json()
        assert verify_data.get("valid") == True
        
        print("✓ Step 2: Code verified successfully")
        
        # Step 3: Reset password (use same password to not break other tests)
        reset_response = self.session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "identifier": identifier,
            "code": code,
            "new_password": FIELD_AGENT_CREDS["password"]  # Keep same password
        })
        
        assert reset_response.status_code == 200, f"Reset failed: {reset_response.text}"
        reset_data = reset_response.json()
        assert reset_data.get("success") == True
        
        print("✓ Step 3: Password reset successful")
        
        # Verify can still login with original password (we used same password)
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
        assert login_response.status_code == 200
        
        print("✓ Verified login still works")
        
    def test_reset_password_invalid_code_rejected(self):
        """Reset password with invalid code should fail"""
        response = self.session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "identifier": FIELD_AGENT_CREDS["identifier"],
            "code": "000000",  # Invalid code
            "new_password": "newpassword123"
        })
        
        assert response.status_code == 400, "Invalid code should return 400"
        print("✓ Invalid code correctly rejected")


class TestAdminAgentsList:
    """Tests for GET /api/admin/agents endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_admin_agents_endpoint_exists(self):
        """GET /api/admin/agents should return list of all agents"""
        response = self.session.get(f"{BASE_URL}/api/admin/agents")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "agents" in data, "Response should have 'agents' array"
        assert isinstance(data["agents"], list)
        
        print(f"✓ GET /api/admin/agents: {len(data['agents'])} agents found")
        
    def test_admin_agents_response_structure(self):
        """Each agent should have required fields"""
        response = self.session.get(f"{BASE_URL}/api/admin/agents")
        data = response.json()
        
        if len(data["agents"]) > 0:
            agent = data["agents"][0]
            
            # Check required fields
            assert "id" in agent, "Agent should have 'id'"
            assert "full_name" in agent, "Agent should have 'full_name'"
            assert "phone_number" in agent, "Agent should have 'phone_number'"
            assert "cooperative_name" in agent, "Agent should have 'cooperative_name'"
            assert "assigned_farmers_count" in agent, "Agent should have 'assigned_farmers_count'"
            
            print(f"✓ Agent structure verified: {agent['full_name']} ({agent['cooperative_name']}) - {agent['assigned_farmers_count']} farmers assigned")
        else:
            print("⚠ No agents found in database")


class TestAdminAllFarmers:
    """Tests for GET /api/admin/all-farmers endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_admin_all_farmers_endpoint_exists(self):
        """GET /api/admin/all-farmers should return all farmers (coop members + producteurs)"""
        response = self.session.get(f"{BASE_URL}/api/admin/all-farmers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "farmers" in data, "Response should have 'farmers' array"
        assert "total" in data, "Response should have 'total' count"
        assert isinstance(data["farmers"], list)
        
        print(f"✓ GET /api/admin/all-farmers: {data['total']} farmers found")
        
    def test_admin_all_farmers_response_structure(self):
        """Each farmer should have required fields including source type"""
        response = self.session.get(f"{BASE_URL}/api/admin/all-farmers")
        data = response.json()
        
        if len(data["farmers"]) > 0:
            farmer = data["farmers"][0]
            
            # Check required fields
            assert "id" in farmer, "Farmer should have 'id'"
            assert "full_name" in farmer, "Farmer should have 'full_name'"
            assert "phone_number" in farmer, "Farmer should have 'phone_number'"
            assert "source" in farmer, "Farmer should have 'source' (coop_member or user_producteur)"
            assert "cooperative_name" in farmer, "Farmer should have 'cooperative_name'"
            
            print(f"✓ Farmer structure verified: {farmer['full_name']} - source: {farmer['source']}")
        else:
            print("⚠ No farmers found")
            
    def test_admin_all_farmers_search_by_name(self):
        """GET /api/admin/all-farmers?search=xxx should filter results"""
        # First get all farmers to find a searchable name
        all_response = self.session.get(f"{BASE_URL}/api/admin/all-farmers")
        all_data = all_response.json()
        
        if len(all_data["farmers"]) > 0:
            # Get first farmer's partial name
            first_farmer = all_data["farmers"][0]
            search_term = first_farmer["full_name"].split()[0] if first_farmer.get("full_name") else ""
            
            if search_term:
                # Search for it
                search_response = self.session.get(f"{BASE_URL}/api/admin/all-farmers?search={search_term}")
                search_data = search_response.json()
                
                assert search_response.status_code == 200
                assert search_data["total"] >= 1, f"Search for '{search_term}' should find at least 1 farmer"
                
                print(f"✓ Search for '{search_term}': found {search_data['total']} farmers")
            else:
                print("⚠ Skipping search test - no farmer name available")
        else:
            print("⚠ No farmers to search")


class TestAdminAssignFarmersToAgent:
    """Tests for POST /api/admin/assign-farmers-to-agent endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_assign_farmers_to_agent_endpoint_exists(self):
        """POST /api/admin/assign-farmers-to-agent should work"""
        # First get an agent
        agents_response = self.session.get(f"{BASE_URL}/api/admin/agents")
        agents_data = agents_response.json()
        
        if len(agents_data["agents"]) == 0:
            pytest.skip("No agents available for testing")
            
        agent = agents_data["agents"][0]
        
        # Get a farmer
        farmers_response = self.session.get(f"{BASE_URL}/api/admin/all-farmers")
        farmers_data = farmers_response.json()
        
        if len(farmers_data["farmers"]) == 0:
            pytest.skip("No farmers available for testing")
            
        farmer = farmers_data["farmers"][0]
        
        # Assign farmer to agent
        assign_response = self.session.post(f"{BASE_URL}/api/admin/assign-farmers-to-agent", json={
            "agent_id": agent["id"],
            "farmer_ids": [farmer["id"]]
        })
        
        assert assign_response.status_code == 200, f"Expected 200, got {assign_response.status_code}: {assign_response.text}"
        
        data = assign_response.json()
        assert "message" in data
        assert "assigned_count" in data
        
        print(f"✓ Assigned {farmer['full_name']} to {agent['full_name']}: {data['message']}")
        
    def test_assign_invalid_agent_id_rejected(self):
        """Invalid agent ID should be rejected"""
        farmers_response = self.session.get(f"{BASE_URL}/api/admin/all-farmers")
        farmers_data = farmers_response.json()
        
        if len(farmers_data["farmers"]) == 0:
            pytest.skip("No farmers available")
            
        response = self.session.post(f"{BASE_URL}/api/admin/assign-farmers-to-agent", json={
            "agent_id": "invalid-id-12345",
            "farmer_ids": [farmers_data["farmers"][0]["id"]]
        })
        
        assert response.status_code == 400, "Invalid agent_id should return 400"
        print("✓ Invalid agent_id correctly rejected")
        
    def test_assign_empty_farmer_list_rejected(self):
        """Empty farmer_ids list should be rejected"""
        agents_response = self.session.get(f"{BASE_URL}/api/admin/agents")
        agents_data = agents_response.json()
        
        if len(agents_data["agents"]) == 0:
            pytest.skip("No agents available")
            
        response = self.session.post(f"{BASE_URL}/api/admin/assign-farmers-to-agent", json={
            "agent_id": agents_data["agents"][0]["id"],
            "farmer_ids": []
        })
        
        assert response.status_code == 400, "Empty farmer_ids should return 400"
        print("✓ Empty farmer_ids correctly rejected")


class TestAdminEndpointsRequireAuth:
    """Test that admin endpoints require authentication"""
    
    def test_admin_agents_requires_auth(self):
        """GET /api/admin/agents without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/agents")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ /api/admin/agents requires authentication")
        
    def test_admin_all_farmers_requires_auth(self):
        """GET /api/admin/all-farmers without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/all-farmers")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ /api/admin/all-farmers requires authentication")
        
    def test_admin_assign_farmers_requires_auth(self):
        """POST /api/admin/assign-farmers-to-agent without auth should fail"""
        response = requests.post(f"{BASE_URL}/api/admin/assign-farmers-to-agent", json={
            "agent_id": "test",
            "farmer_ids": ["test"]
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ /api/admin/assign-farmers-to-agent requires authentication")


class TestAdminRequiresSuperAdmin:
    """Test that admin endpoints require admin user type"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as field agent (not admin)
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_field_agent_cannot_access_admin_agents(self):
        """Field agent should NOT be able to access admin endpoints"""
        response = self.session.get(f"{BASE_URL}/api/admin/agents")
        assert response.status_code == 403, f"Non-admin should get 403, got {response.status_code}"
        print("✓ Field agent correctly blocked from /api/admin/agents")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
