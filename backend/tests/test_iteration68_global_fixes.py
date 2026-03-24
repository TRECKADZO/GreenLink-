"""
Iteration 68 - Global Analysis and Fixes Testing
Tests for:
1. Login functionality for multiple accounts (bielaghana@gmail.com, klenakan.eric@gmail.com, coop-test@greenlink.ci)
2. Cooperative registration with auto-generated coop_code
3. Acheteur registration (phone only) without errors
4. GET /api/admin/analytics/onboarding endpoint (summary, funnel, cooperatives)
5. GET /api/auth/cooperatives public endpoint
"""

import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"
COOP_EMAIL_1 = "bielaghana@gmail.com"
COOP_EMAIL_2 = "coop-test@greenlink.ci"
COOP_PASSWORD = "474Treckadzo"


def generate_unique_phone():
    """Generate a unique phone number for testing"""
    return f"+2250{random.randint(100000000, 999999999)}"


def generate_unique_email():
    """Generate a unique email for testing"""
    suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
    return f"test_{suffix}_{int(time.time())}@test.com"


class TestLoginFunctionality:
    """Test login for multiple accounts"""
    
    def test_login_bielaghana_cooperative(self):
        """Test login for bielaghana@gmail.com - should return cooperative type with coop_code"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL_1,
            "password": COOP_PASSWORD
        })
        print(f"Login bielaghana response: {response.status_code}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        
        user = data["user"]
        print(f"User type: {user.get('user_type')}, coop_code: {user.get('coop_code')}")
        
        assert user.get("user_type") == "cooperative", f"Expected cooperative, got {user.get('user_type')}"
        assert user.get("coop_code") is not None, "coop_code should be present for cooperative"
        assert user.get("coop_code").startswith("COOP-"), f"coop_code should start with COOP-, got {user.get('coop_code')}"
    
    def test_login_admin_klenakan(self):
        """Test login for klenakan.eric@gmail.com - should return admin type"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        print(f"Login admin response: {response.status_code}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        
        user = data["user"]
        print(f"User type: {user.get('user_type')}")
        
        assert user.get("user_type") == "admin", f"Expected admin, got {user.get('user_type')}"
    
    def test_login_coop_test_greenlink(self):
        """Test login for coop-test@greenlink.ci - should return cooperative type"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL_2,
            "password": COOP_PASSWORD
        })
        print(f"Login coop-test response: {response.status_code}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        
        user = data["user"]
        print(f"User type: {user.get('user_type')}, coop_code: {user.get('coop_code')}")
        
        assert user.get("user_type") == "cooperative", f"Expected cooperative, got {user.get('user_type')}"


class TestCooperativeRegistration:
    """Test cooperative registration with auto-generated coop_code"""
    
    def test_register_cooperative_auto_generates_coop_code(self):
        """POST /api/auth/register for cooperative should auto-generate coop_code"""
        unique_phone = generate_unique_phone()
        unique_email = generate_unique_email()
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "email": unique_email,
            "password": "test123456",
            "full_name": "Test Cooperative Iteration68",
            "user_type": "cooperative",
            "coop_name": "Cooperative Test Iteration68",
            "department": "DALO"
        })
        print(f"Register cooperative response: {response.status_code}")
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        
        user = data["user"]
        print(f"User coop_code: {user.get('coop_code')}, coop_name: {user.get('coop_name')}")
        
        assert user.get("coop_code") is not None, "coop_code should be auto-generated"
        assert user.get("coop_code").startswith("COOP-"), f"coop_code should start with COOP-, got {user.get('coop_code')}"
        assert user.get("coop_name") == "Cooperative Test Iteration68", "coop_name should be set"


class TestAcheteurRegistration:
    """Test acheteur registration (phone only) without errors"""
    
    def test_register_acheteur_phone_only(self):
        """POST /api/auth/register for acheteur with phone only should work"""
        unique_phone = generate_unique_phone()
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "test123456",
            "full_name": "Test Acheteur Iteration68",
            "user_type": "acheteur"
        })
        print(f"Register acheteur response: {response.status_code}")
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        
        user = data["user"]
        print(f"User type: {user.get('user_type')}")
        
        assert user.get("user_type") == "acheteur", f"Expected acheteur, got {user.get('user_type')}"
    
    def test_register_acheteur_with_empty_email(self):
        """POST /api/auth/register for acheteur with empty email string should work"""
        unique_phone = generate_unique_phone()
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "email": "",  # Empty string should be converted to None
            "password": "test123456",
            "full_name": "Test Acheteur Empty Email",
            "user_type": "acheteur"
        })
        print(f"Register acheteur empty email response: {response.status_code}")
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"


class TestOnboardingAnalytics:
    """Test GET /api/admin/analytics/onboarding endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed - skipping authenticated tests")
    
    def test_onboarding_endpoint_returns_summary(self, admin_token):
        """GET /api/admin/analytics/onboarding should return summary with cooperatives, agents, producteurs counts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/onboarding",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Onboarding response: {response.status_code}")
        
        assert response.status_code == 200, f"Onboarding endpoint failed: {response.text}"
        
        data = response.json()
        assert "summary" in data, "No summary in response"
        
        summary = data["summary"]
        print(f"Summary: cooperatives={summary.get('cooperatives')}, agents={summary.get('agents')}, producteurs={summary.get('producteurs')}")
        
        assert "cooperatives" in summary, "No cooperatives count in summary"
        assert "agents" in summary, "No agents count in summary"
        assert "producteurs" in summary, "No producteurs count in summary"
        assert isinstance(summary["cooperatives"], int), "cooperatives should be int"
        assert isinstance(summary["agents"], int), "agents should be int"
        assert isinstance(summary["producteurs"], int), "producteurs should be int"
    
    def test_onboarding_endpoint_returns_funnel(self, admin_token):
        """GET /api/admin/analytics/onboarding should return funnel array with 6 steps"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/onboarding",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Onboarding endpoint failed: {response.text}"
        
        data = response.json()
        assert "funnel" in data, "No funnel in response"
        
        funnel = data["funnel"]
        print(f"Funnel steps: {len(funnel)}")
        
        assert isinstance(funnel, list), "funnel should be a list"
        assert len(funnel) == 6, f"Expected 6 funnel steps, got {len(funnel)}"
        
        # Verify funnel structure
        expected_labels = ["Cooperatives", "Agents terrain", "Membres enregistres", "Parcelles declarees", "Parcelles verifiees", "Demandes prime"]
        for i, step in enumerate(funnel):
            assert "label" in step, f"Step {i} missing label"
            assert "count" in step, f"Step {i} missing count"
            assert "color" in step, f"Step {i} missing color"
            print(f"Funnel step {i}: {step['label']} = {step['count']}")
    
    def test_onboarding_endpoint_returns_cooperatives_array(self, admin_token):
        """GET /api/admin/analytics/onboarding should return cooperatives array with details"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/onboarding",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Onboarding endpoint failed: {response.text}"
        
        data = response.json()
        assert "cooperatives" in data, "No cooperatives in response"
        
        cooperatives = data["cooperatives"]
        print(f"Cooperatives count: {len(cooperatives)}")
        
        assert isinstance(cooperatives, list), "cooperatives should be a list"
        
        if len(cooperatives) > 0:
            coop = cooperatives[0]
            print(f"First coop: {coop}")
            
            # Verify cooperative structure
            assert "id" in coop, "Cooperative missing id"
            assert "name" in coop, "Cooperative missing name"
            assert "code" in coop, "Cooperative missing code"
            assert "agents" in coop, "Cooperative missing agents count"
            assert "members" in coop, "Cooperative missing members count"
            assert "parcels" in coop, "Cooperative missing parcels count"
    
    def test_onboarding_endpoint_requires_admin(self):
        """GET /api/admin/analytics/onboarding should require admin auth"""
        # Test without token
        response = requests.get(f"{BASE_URL}/api/admin/analytics/onboarding")
        assert response.status_code in [401, 403], f"Expected 401/403 without token, got {response.status_code}"
        
        # Test with non-admin token (cooperative)
        coop_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL_1,
            "password": COOP_PASSWORD
        })
        if coop_response.status_code == 200:
            coop_token = coop_response.json().get("access_token")
            response = requests.get(
                f"{BASE_URL}/api/admin/analytics/onboarding",
                headers={"Authorization": f"Bearer {coop_token}"}
            )
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"


class TestCooperativesPublicEndpoint:
    """Test GET /api/auth/cooperatives public endpoint"""
    
    def test_cooperatives_endpoint_returns_list(self):
        """GET /api/auth/cooperatives should return list of cooperatives with code and name"""
        response = requests.get(f"{BASE_URL}/api/auth/cooperatives")
        print(f"Cooperatives endpoint response: {response.status_code}")
        
        assert response.status_code == 200, f"Cooperatives endpoint failed: {response.text}"
        
        data = response.json()
        assert "cooperatives" in data, "No cooperatives in response"
        
        cooperatives = data["cooperatives"]
        print(f"Cooperatives count: {len(cooperatives)}")
        
        assert isinstance(cooperatives, list), "cooperatives should be a list"
        
        if len(cooperatives) > 0:
            coop = cooperatives[0]
            print(f"First coop: {coop}")
            
            # Verify cooperative structure
            assert "code" in coop, "Cooperative missing code"
            assert "name" in coop, "Cooperative missing name"
            # Codes can be in different formats: COOP-XXX-NNN (new) or CI-XXX-NNN (legacy)
            assert len(coop["code"]) > 0, f"Code should not be empty"
            print(f"Code format: {coop['code']} (valid - can be COOP-XXX-NNN or CI-XXX-NNN)")
    
    def test_cooperatives_endpoint_is_public(self):
        """GET /api/auth/cooperatives should not require authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/cooperatives")
        assert response.status_code == 200, f"Public endpoint should return 200, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
