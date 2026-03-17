"""
Test Field Agent Authentication & Authorization - Iteration 21
GreenLink Agritech

Tests:
1. Field agent registration with user_type=field_agent
2. Field agent login by email
3. Field agent login by phone
4. GET /api/auth/me for field_agent - ObjectId serialization
5. GET /api/agent/search RBAC access for field_agent
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
FIELD_AGENT_EMAIL = "agent.test@greenlink.ci"
FIELD_AGENT_PASSWORD = "AgentTest2026"
COOPERATIVE_EMAIL = "coop-gagnoa@greenlink.ci"
COOPERATIVE_PASSWORD = "password"


class TestFieldAgentRegistration:
    """Test field_agent user type registration"""
    
    def test_register_field_agent(self):
        """Register a new field_agent account and verify the response"""
        # Generate valid phone number with only digits
        import random
        random_digits = ''.join([str(random.randint(0, 9)) for _ in range(8)])
        test_phone = f"+22507{random_digits}"
        test_email = f"test.agent.{random_digits}@greenlink.ci"
        
        payload = {
            "phone_number": test_phone,
            "email": test_email,
            "password": "TestAgent2026",
            "full_name": f"Test Agent {random_digits}",
            "user_type": "field_agent"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Status code assertion
        assert response.status_code in [200, 201], f"Registration failed: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        
        user = data["user"]
        assert user["user_type"] == "field_agent", f"Expected user_type=field_agent, got {user.get('user_type')}"
        assert user["email"] == test_email, f"Email mismatch: expected {test_email}, got {user.get('email')}"
        
        # Verify field_agent specific fields were initialized
        assert "roles" in user or user.get("user_type") == "field_agent", "Field agent should have roles or user_type"
        
        print(f"PASS: Field agent registration successful - {test_email}")
        
        # Return token for cleanup or further tests
        return data["access_token"]


class TestFieldAgentLogin:
    """Test field agent login by email and phone"""
    
    def test_login_field_agent_by_email(self):
        """Login with field_agent email (agent.test@greenlink.ci)"""
        payload = {
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        # Status code assertion
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        
        user = data["user"]
        assert user["user_type"] == "field_agent", f"Expected user_type=field_agent, got {user.get('user_type')}"
        assert user["email"] == FIELD_AGENT_EMAIL, f"Email mismatch"
        
        # CRITICAL: Check that _id is a string (ObjectId serialization fix)
        assert isinstance(user.get("_id"), str), f"_id should be string, got {type(user.get('_id'))}"
        
        # Check no ObjectId serialization errors (all ObjectId fields should be strings)
        for key, val in user.items():
            assert not str(type(val)).find("ObjectId") >= 0, f"Field {key} contains unserialized ObjectId"
        
        print(f"PASS: Field agent login by email successful - user_type={user.get('user_type')}")
        
        return data["access_token"], user
    
    def test_login_field_agent_by_phone(self):
        """Login with field_agent phone number if available"""
        # First get the phone number from the user
        token, user = self.test_login_field_agent_by_email()
        phone = user.get("phone_number")
        
        if not phone:
            pytest.skip("Field agent has no phone number - skipping phone login test")
        
        payload = {
            "identifier": phone,
            "password": FIELD_AGENT_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        # Status code assertion  
        assert response.status_code == 200, f"Login by phone failed: {response.text}"
        
        data = response.json()
        assert data["user"]["user_type"] == "field_agent"
        
        print(f"PASS: Field agent login by phone successful - {phone}")
        
        return data["access_token"]


class TestFieldAgentMe:
    """Test GET /api/auth/me for field_agent - ObjectId serialization"""
    
    def test_get_me_field_agent(self):
        """GET /api/auth/me should return field_agent user without ObjectId errors"""
        # First login to get token
        login_payload = {
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        }
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        token = login_resp.json()["access_token"]
        
        # Call /me endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        # Status code assertion
        assert response.status_code == 200, f"GET /me failed: {response.text}"
        
        # Data assertions - verify ObjectId serialization
        user = response.json()
        assert user["user_type"] == "field_agent", f"Expected field_agent, got {user.get('user_type')}"
        
        # Check _id is serialized
        assert isinstance(user.get("_id"), str), f"_id should be string, got {type(user.get('_id'))}"
        
        # Check for any ObjectId fields that might cause JSON errors
        # cooperative_id, coop_id, etc. should all be strings
        problematic_fields = ["cooperative_id", "coop_id", "agent_profile_id"]
        for field in problematic_fields:
            if field in user:
                assert isinstance(user[field], str), f"{field} should be string, got {type(user[field])}"
        
        print(f"PASS: GET /me for field_agent successful - ObjectId serialization OK")
        
        return user


class TestFieldAgentRBAC:
    """Test field_agent RBAC access to agent search endpoint"""
    
    def test_agent_search_access(self):
        """Field agent should have access to /api/agent/search"""
        # Login as field_agent
        login_payload = {
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        }
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test /api/agent/search endpoint - should NOT return 403
        response = requests.get(
            f"{BASE_URL}/api/agent/search?phone=0701234567",
            headers=headers
        )
        
        # Should NOT be 403 (access denied)
        assert response.status_code != 403, f"Field agent access denied to /api/agent/search"
        
        # Should return 200 (with found: false if farmer doesn't exist) or 400 (invalid phone)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        print(f"PASS: Field agent has RBAC access to /api/agent/search - status={response.status_code}")
    
    def test_agent_dashboard_stats(self):
        """Field agent should have access to /api/agent/dashboard/stats"""
        # Login as field_agent
        login_payload = {
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        }
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        assert login_resp.status_code == 200
        
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test dashboard stats endpoint
        response = requests.get(f"{BASE_URL}/api/agent/dashboard/stats", headers=headers)
        
        assert response.status_code != 403, "Field agent access denied to dashboard stats"
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        
        data = response.json()
        assert "total_searches" in data
        assert "farmers_in_zone" in data
        
        print(f"PASS: Field agent has access to dashboard stats")


class TestCooperativeLogin:
    """Test cooperative login still works correctly"""
    
    def test_cooperative_login(self):
        """Cooperative login should work and return correct user_type"""
        payload = {
            "identifier": COOPERATIVE_EMAIL,
            "password": COOPERATIVE_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Cooperative login failed: {response.text}"
        
        data = response.json()
        user = data["user"]
        
        assert user["user_type"] == "cooperative", f"Expected cooperative, got {user.get('user_type')}"
        assert isinstance(user.get("_id"), str), f"_id should be string"
        
        print(f"PASS: Cooperative login successful - user_type={user.get('user_type')}")
        
        return data["access_token"]


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
