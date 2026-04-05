"""
Backend API Tests for Iteration 95
Testing: Agent Terrain Registration, Farmer Selection Flow, Plus Tab functionality

Test Focus:
1. /api/ussd/register-web endpoint (bug fix verification)
2. /api/field-agent/my-farmers endpoint
3. /api/auth/login for field_agent and producteur
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
FIELD_AGENT_EMAIL = "testagent@test.ci"
FIELD_AGENT_PASSWORD = "test123456"
FARMER_EMAIL = "testplanteur@test.ci"
FARMER_PASSWORD = "test123456"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_field_agent_login_success(self):
        """Test field agent can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["user_type"] == "field_agent", f"Expected field_agent, got {data['user']['user_type']}"
        assert data["user"]["email"] == FIELD_AGENT_EMAIL
        print(f"✓ Field agent login successful: {data['user']['full_name']}")
    
    def test_farmer_login_success(self):
        """Test farmer can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "producteur", f"Expected producteur, got {data['user']['user_type']}"
        print(f"✓ Farmer login successful: {data['user']['full_name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "invalid@test.ci",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestUSSDRegisterWeb:
    """Tests for /api/ussd/register-web endpoint (Bug fix verification)"""
    
    def test_register_web_success(self):
        """Test successful farmer registration via web endpoint"""
        unique_phone = f"+22507079{int(time.time()) % 100000:05d}"
        
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test Iteration95 Farmer",
            "telephone": unique_phone,
            "village": "TestVillage95",
            "pin": "1234",
            "hectares": "5",
            "cooperative_code": ""
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Registration should be successful"
        assert "farmer_id" in data, "Response should contain farmer_id"
        assert "code_planteur" in data, "Response should contain code_planteur"
        assert data["nom"] == "Test Iteration95 Farmer"
        assert data["telephone"] == unique_phone
        print(f"✓ Registration successful: {data['code_planteur']}")
    
    def test_register_web_missing_name(self):
        """Test registration fails with missing name"""
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "",
            "telephone": "+2250707999999",
            "pin": "1234"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing name correctly rejected")
    
    def test_register_web_missing_phone(self):
        """Test registration fails with missing phone"""
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test User",
            "telephone": "",
            "pin": "1234"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing phone correctly rejected")
    
    def test_register_web_invalid_pin(self):
        """Test registration fails with invalid PIN"""
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test User",
            "telephone": "+2250707888888",
            "pin": "12"  # Too short
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid PIN correctly rejected")
    
    def test_register_web_duplicate_phone(self):
        """Test registration fails with duplicate phone number"""
        # First registration
        unique_phone = f"+22507078{int(time.time()) % 100000:05d}"
        requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "First User",
            "telephone": unique_phone,
            "pin": "1234"
        })
        
        # Second registration with same phone
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Second User",
            "telephone": unique_phone,
            "pin": "5678"
        })
        assert response.status_code == 409, f"Expected 409 conflict, got {response.status_code}"
        print("✓ Duplicate phone correctly rejected")


class TestFieldAgentEndpoints:
    """Tests for field agent specific endpoints"""
    
    @pytest.fixture
    def agent_token(self):
        """Get authentication token for field agent"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Field agent authentication failed")
    
    def test_field_agent_dashboard(self, agent_token):
        """Test field agent dashboard endpoint"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Dashboard should have statistics
        assert "statistics" in data or "agent_info" in data, "Dashboard should contain statistics or agent_info"
        print(f"✓ Field agent dashboard accessible")
    
    def test_field_agent_my_farmers(self, agent_token):
        """Test field agent my-farmers endpoint"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "farmers" in data, "Response should contain farmers list"
        assert isinstance(data["farmers"], list), "Farmers should be a list"
        print(f"✓ Field agent my-farmers accessible, found {len(data['farmers'])} farmers")
    
    def test_field_agent_unauthorized(self):
        """Test field agent endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")


class TestUSSDRegistrations:
    """Tests for USSD registrations list endpoint"""
    
    @pytest.fixture
    def agent_token(self):
        """Get authentication token for field agent"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Field agent authentication failed")
    
    def test_get_registrations_list(self, agent_token):
        """Test getting list of recent registrations"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/ussd/registrations?limit=10", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "registrations" in data, "Response should contain registrations"
        print(f"✓ Registrations list accessible, found {len(data.get('registrations', []))} registrations")


class TestAgentSearch:
    """Tests for agent search endpoint"""
    
    @pytest.fixture
    def agent_token(self):
        """Get authentication token for field agent"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Field agent authentication failed")
    
    def test_search_farmer_by_phone(self, agent_token):
        """Test searching for a farmer by phone number"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        # Search for the test farmer
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=+2250101010101", headers=headers)
        
        # Either found or not found is acceptable
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "found" in data, "Response should indicate if farmer was found"
        print(f"✓ Agent search endpoint working, found={data.get('found')}")
    
    def test_search_invalid_phone_format(self, agent_token):
        """Test search with invalid phone format"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=abc", headers=headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid phone format correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
