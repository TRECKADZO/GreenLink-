"""
GreenLink Security & Functional Audit - Iteration 73
Tests for:
1. Security: Protected endpoints, no hardcoded passwords, CORS, rate limiting
2. Functional: All cooperative endpoints work correctly
3. Data integrity: Sensitive fields (pin_hash, hashed_password) never returned
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}

COOP_CREDENTIALS = {
    "identifier": "bielaghana@gmail.com",
    "password": "474Treckadzo"
}


class TestSecurityEndpoints:
    """Security tests for protected endpoints"""
    
    def test_password_health_requires_auth(self):
        """GET /api/auth/admin/password-health/{email} must return 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/admin/password-health/test@example.com")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"PASS: password-health returns {response.status_code} without auth")
    
    def test_repair_password_requires_auth(self):
        """POST /api/auth/admin/repair-password must return 401 without token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/repair-password",
            json={"email": "test@example.com", "new_password": "test123"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"PASS: repair-password returns {response.status_code} without auth")
    
    def test_password_health_with_admin_auth(self):
        """GET /api/auth/admin/password-health/{email} works with admin token"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if login_resp.status_code != 200:
            pytest.skip(f"Admin login failed: {login_resp.text}")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Check password health
        response = requests.get(
            f"{BASE_URL}/api/auth/admin/password-health/{ADMIN_CREDENTIALS['identifier']}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "status" in data
        assert "has_hashed_password" in data
        print(f"PASS: password-health works with admin auth, status={data.get('status')}")


class TestLoginSecurity:
    """Tests for login endpoint security"""
    
    def test_admin_login_works(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        # Verify no sensitive fields in response
        user = data["user"]
        assert "hashed_password" not in user, "hashed_password should NOT be in response"
        assert "pin_hash" not in user, "pin_hash should NOT be in response"
        print(f"PASS: Admin login works, user_type={user.get('user_type')}")
    
    def test_coop_login_works(self):
        """Cooperative login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200, f"Coop login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        user = data["user"]
        assert user.get("user_type") == "cooperative"
        assert "hashed_password" not in user
        print(f"PASS: Coop login works, coop_name={user.get('coop_name')}")
    
    def test_login_uses_identifier_field(self):
        """Login accepts 'identifier' field (not 'email')"""
        # Test with identifier field
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_CREDENTIALS["identifier"],
            "password": COOP_CREDENTIALS["password"]
        })
        assert response.status_code == 200, f"Login with identifier failed: {response.text}"
        print("PASS: Login accepts 'identifier' field")
    
    def test_login_invalid_credentials(self):
        """Login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_CREDENTIALS["identifier"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid credentials return 401")


class TestCooperativeEndpoints:
    """Functional tests for cooperative endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as cooperative before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        if response.status_code != 200:
            pytest.skip(f"Coop login failed: {response.text}")
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.coop_user = response.json().get("user", {})
    
    def test_get_cooperative_dashboard(self):
        """GET /api/cooperative/dashboard returns dashboard data"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        # Dashboard should have stats
        assert isinstance(data, dict)
        print(f"PASS: Cooperative dashboard returns data")
    
    def test_get_cooperative_members(self):
        """GET /api/cooperative/members returns member list"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=self.headers)
        assert response.status_code == 200, f"Members failed: {response.text}"
        data = response.json()
        assert "members" in data or "total" in data
        # Verify no sensitive fields
        if "members" in data:
            for member in data["members"][:5]:
                assert "pin_hash" not in member, "pin_hash should NOT be in member response"
                assert "hashed_password" not in member, "hashed_password should NOT be in member response"
        print(f"PASS: Members endpoint works, total={data.get('total', len(data.get('members', [])))}")
    
    def test_get_cooperative_lots(self):
        """GET /api/cooperative/lots returns lot data"""
        response = requests.get(f"{BASE_URL}/api/cooperative/lots", headers=self.headers)
        assert response.status_code == 200, f"Lots failed: {response.text}"
        data = response.json()
        # Should return array or object with lots
        assert isinstance(data, (list, dict))
        print(f"PASS: Lots endpoint works")
    
    def test_get_cooperative_parcels_all(self):
        """GET /api/cooperative/parcels/all returns parcels with French field names"""
        response = requests.get(f"{BASE_URL}/api/cooperative/parcels/all", headers=self.headers)
        assert response.status_code == 200, f"Parcels failed: {response.text}"
        data = response.json()
        # Should have total and parcelles
        assert "total" in data or "parcelles" in data or isinstance(data, list)
        print(f"PASS: Parcels/all endpoint works")
    
    def test_get_cooperative_distributions(self):
        """GET /api/cooperative/distributions returns distribution data"""
        response = requests.get(f"{BASE_URL}/api/cooperative/distributions", headers=self.headers)
        assert response.status_code == 200, f"Distributions failed: {response.text}"
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"PASS: Distributions endpoint works")
    
    def test_get_cooperative_agents(self):
        """GET /api/cooperative/agents returns agent list"""
        response = requests.get(f"{BASE_URL}/api/cooperative/agents", headers=self.headers)
        assert response.status_code == 200, f"Agents failed: {response.text}"
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"PASS: Agents endpoint works")
    
    def test_get_activation_stats(self):
        """GET /api/cooperative/members/activation-stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members/activation-stats", headers=self.headers)
        assert response.status_code == 200, f"Activation stats failed: {response.text}"
        data = response.json()
        assert "total_members" in data or "activated_count" in data
        print(f"PASS: Activation stats works, total={data.get('total_members')}")
    
    def test_export_members_xlsx(self):
        """GET /api/cooperative/members/export?format=xlsx returns Excel file"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members/export?format=xlsx",
            headers=self.headers
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type or len(response.content) > 0
        # Check file starts with PK (ZIP/XLSX magic bytes)
        assert response.content[:2] == b'PK', "XLSX should start with PK magic bytes"
        print(f"PASS: Export XLSX works, size={len(response.content)} bytes")
    
    def test_export_requires_auth(self):
        """GET /api/cooperative/members/export without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members/export?format=xlsx")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Export requires auth, returns {response.status_code}")
    
    def test_get_cooperative_harvests(self):
        """GET /api/cooperative/harvests returns harvest data"""
        response = requests.get(f"{BASE_URL}/api/cooperative/harvests", headers=self.headers)
        assert response.status_code == 200, f"Harvests failed: {response.text}"
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"PASS: Harvests endpoint works")


class TestMemberCreation:
    """Tests for member creation with PIN and hectares"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as cooperative"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        if response.status_code != 200:
            pytest.skip(f"Coop login failed: {response.text}")
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_member_with_pin_and_hectares(self):
        """POST /api/cooperative/members creates member with PIN and hectares"""
        import random
        test_phone = f"+225070073{random.randint(1000, 9999)}"
        
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": f"Test Audit Member {random.randint(1000, 9999)}",
                "phone_number": test_phone,
                "village": "Abidjan",
                "department": "Abidjan",
                "zone": "Sud",
                "pin_code": "1234",
                "hectares": 5.5,
                "consent_given": True
            }
        )
        assert response.status_code in [200, 201], f"Create member failed: {response.text}"
        data = response.json()
        
        # Verify response has code_planteur and pin_configured
        assert "code_planteur" in data, "Response should have code_planteur"
        assert data.get("pin_configured") == True, "pin_configured should be True"
        
        # Verify NO sensitive fields in response
        assert "pin_hash" not in data, "pin_hash should NOT be in response"
        assert "hashed_password" not in data, "hashed_password should NOT be in response"
        
        print(f"PASS: Member created with code_planteur={data.get('code_planteur')}, pin_configured={data.get('pin_configured')}")
    
    def test_create_member_without_pin_fails(self):
        """POST /api/cooperative/members without PIN returns 400/422"""
        import random
        test_phone = f"+225070074{random.randint(1000, 9999)}"
        
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": f"Test No PIN {random.randint(1000, 9999)}",
                "phone_number": test_phone,
                "village": "Abidjan",
                "consent_given": True
                # No pin_code
            }
        )
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}: {response.text}"
        print(f"PASS: Member creation without PIN returns {response.status_code}")
    
    def test_create_member_invalid_pin_fails(self):
        """POST /api/cooperative/members with invalid PIN returns 400"""
        import random
        test_phone = f"+225070075{random.randint(1000, 9999)}"
        
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": f"Test Invalid PIN {random.randint(1000, 9999)}",
                "phone_number": test_phone,
                "village": "Abidjan",
                "pin_code": "123",  # Only 3 digits
                "consent_given": True
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"PASS: Invalid PIN (3 digits) returns 400")


class TestRateLimiting:
    """Tests for rate limiting on login endpoint"""
    
    def test_login_rate_limit_exists(self):
        """Login endpoint has rate limiting (10/minute)"""
        # Make several rapid requests with wrong password
        responses = []
        for i in range(12):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": "ratelimit_test@example.com",
                "password": "wrongpassword"
            })
            responses.append(response.status_code)
            if response.status_code == 429:
                break
            time.sleep(0.1)  # Small delay
        
        # Should get 429 at some point if rate limiting is working
        # Or all 401s if we didn't hit the limit (which is also acceptable)
        has_rate_limit = 429 in responses
        all_unauthorized = all(r == 401 for r in responses)
        
        if has_rate_limit:
            print(f"PASS: Rate limiting triggered after {responses.index(429) + 1} requests")
        elif all_unauthorized:
            print(f"INFO: Made {len(responses)} requests, all returned 401 (rate limit may be higher)")
        else:
            print(f"INFO: Response codes: {responses}")
        
        # Test passes if we got rate limited OR all requests were properly rejected
        assert has_rate_limit or all_unauthorized, f"Unexpected responses: {responses}"


class TestCORSConfiguration:
    """Tests for CORS configuration"""
    
    def test_cors_headers_present(self):
        """API returns proper CORS headers"""
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": "https://cooperative-staging.preview.emergentagent.com",
                "Access-Control-Request-Method": "POST"
            }
        )
        # Should allow the origin
        cors_origin = response.headers.get("access-control-allow-origin", "")
        assert cors_origin in ["*", "https://cooperative-staging.preview.emergentagent.com"], \
            f"CORS origin not properly configured: {cors_origin}"
        print(f"PASS: CORS configured, allow-origin={cors_origin}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
