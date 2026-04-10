from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test suite for code quality refactoring - Iteration 124
Test suite for code quality refactoring - Iteration 124
Tests:
Tests:
1. Login with tokenService migration (cooperative and admin)
1. Login with tokenService migration (cooperative and admin)
2. Admin analytics dashboard API with all 11 sections
2. Admin analytics dashboard API with all 11 sections
3. Auth flow verification
3. Auth flow verification
"""
import requests
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment
load_dotenv(Path(__file__).parent.parent / '.env', override=False)

# Configuration
BASE_URL = os.getenv("REACT_APP_BACKEND_URL", "https://agritech-pdc.preview.emergentagent.com")
API_URL = f"{BASE_URL}/api"

# Test credentials from test_credentials.md
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config
# COOP_EMAIL imported from test_config
# COOP_PASSWORD imported from test_config


class TestAuthLogin:
    """Test authentication login endpoints - verifies tokenService migration works"""
    
    def test_cooperative_login_success(self):
        """Test cooperative login returns access_token"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"identifier": COOP_EMAIL, "password": COOP_PASSWORD},
            timeout=30
        )
        print(f"Cooperative login status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response missing access_token"
        assert "user" in data, "Response missing user object"
        assert data["user"]["user_type"] == "cooperative", f"Expected cooperative, got {data['user']['user_type']}"
        assert len(data["access_token"]) > 0, "Token is empty"
        print(f"Cooperative login SUCCESS - user_type: {data['user']['user_type']}")
        return data["access_token"]
    
    def test_admin_login_success(self):
        """Test admin login returns access_token"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30
        )
        print(f"Admin login status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response missing access_token"
        assert "user" in data, "Response missing user object"
        assert data["user"]["user_type"] == "admin", f"Expected admin, got {data['user']['user_type']}"
        assert len(data["access_token"]) > 0, "Token is empty"
        print(f"Admin login SUCCESS - user_type: {data['user']['user_type']}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"identifier": "invalid@test.com", "password": "wrongpassword"},
            timeout=30
        )
        print(f"Invalid login status: {response.status_code}")
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("Invalid credentials test PASSED")


class TestAdminAnalyticsDashboard:
    """Test admin analytics dashboard API - verifies refactored helper functions work"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return response.json()["access_token"]
    
    def test_strategic_dashboard_returns_all_sections(self, admin_token):
        """Test GET /api/admin/analytics/dashboard returns all 11 sections"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{API_URL}/admin/analytics/dashboard?period=year",
            headers=headers,
            timeout=60
        )
        print(f"Dashboard API status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all 11 required sections are present
        required_sections = [
            "production",
            "sustainability", 
            "eudr_compliance",
            "social_impact",
            "market",
            "macroeconomic",
            "cooperatives",
            "carbon_auditors",
            "ssrte_monitoring",
            "ici_alerts",
            "carbon_premiums"
        ]
        
        missing_sections = []
        for section in required_sections:
            if section not in data:
                missing_sections.append(section)
            else:
                print(f"  ✓ Section '{section}' present")
        
        assert len(missing_sections) == 0, f"Missing sections: {missing_sections}"
        
        # Verify metadata
        assert "generated_at" in data, "Missing generated_at timestamp"
        assert "period" in data, "Missing period field"
        assert data["period"] == "year", f"Expected period 'year', got {data['period']}"
        
        print(f"Dashboard API SUCCESS - All {len(required_sections)} sections present")
        return data
    
    def test_production_section_structure(self, admin_token):
        """Test production section has required fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{API_URL}/admin/analytics/dashboard?period=year",
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200
        
        production = response.json().get("production", {})
        required_fields = ["title", "total_hectares", "total_farmers", "total_cooperatives"]
        
        for field in required_fields:
            assert field in production, f"Production section missing '{field}'"
        
        print(f"Production section structure VALID - {len(production)} fields")
    
    def test_eudr_compliance_section_structure(self, admin_token):
        """Test EUDR compliance section has required fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{API_URL}/admin/analytics/dashboard?period=year",
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200
        
        eudr = response.json().get("eudr_compliance", {})
        required_fields = ["eudr_compliance_rate", "total_parcels", "geolocated_parcels", "per_cooperative"]
        
        for field in required_fields:
            assert field in eudr, f"EUDR section missing '{field}'"
        
        print(f"EUDR compliance section structure VALID - {len(eudr)} fields")
    
    def test_dashboard_unauthorized_access(self):
        """Test dashboard returns 401 without token"""
        response = requests.get(
            f"{API_URL}/admin/analytics/dashboard?period=year",
            timeout=30
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized access test PASSED")
    
    def test_dashboard_non_admin_access(self):
        """Test dashboard returns 403 for non-admin users"""
        # Login as cooperative
        login_response = requests.post(
            f"{API_URL}/auth/login",
            json={"identifier": COOP_EMAIL, "password": COOP_PASSWORD},
            timeout=30
        )
        if login_response.status_code != 200:
            pytest.skip("Cooperative login failed")
        
        coop_token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {coop_token}"}
        
        response = requests.get(
            f"{API_URL}/admin/analytics/dashboard?period=year",
            headers=headers,
            timeout=30
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Non-admin access test PASSED - correctly returns 403")


class TestAuthMeEndpoint:
    """Test /auth/me endpoint - verifies token validation works"""
    
    def test_auth_me_with_valid_token(self):
        """Test /auth/me returns user data with valid token"""
        # First login
        login_response = requests.post(
            f"{API_URL}/auth/login",
            json={"identifier": COOP_EMAIL, "password": COOP_PASSWORD},
            timeout=30
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Then call /auth/me
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_URL}/auth/me", headers=headers, timeout=30)
        
        print(f"/auth/me status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "user_type" in data, "Response missing user_type"
        print(f"/auth/me SUCCESS - user_type: {data['user_type']}")
    
    def test_auth_me_without_token(self):
        """Test /auth/me returns 401 without token"""
        response = requests.get(f"{API_URL}/auth/me", timeout=30)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("/auth/me unauthorized test PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
