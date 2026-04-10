from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 89 - Cooperative Referral System Bug Fixes Testing
Iteration 89 - Cooperative Referral System Bug Fixes Testing


Tests for:
Tests for:
1. POST /api/auth/register with user_type=cooperative - creates user with coop_name, referral_code, user_type
1. POST /api/auth/register with user_type=cooperative - creates user with coop_name, referral_code, user_type
2. POST /api/auth/register with sponsor_referral_code - links new coop to sponsor
2. POST /api/auth/register with sponsor_referral_code - links new coop to sponsor
3. GET /api/cooperative-referral/my-code - returns 200 with referral_code and coop_name (NOT 403)
3. GET /api/cooperative-referral/my-code - returns 200 with referral_code and coop_name (NOT 403)
4. GET /api/cooperative-referral/my-affiliates - lists affiliated cooperatives
4. GET /api/cooperative-referral/my-affiliates - lists affiliated cooperatives
5. POST /api/cooperative-referral/validate - validates a referral code
5. POST /api/cooperative-referral/validate - validates a referral code
"""
"""

import requests
import os
import random
import string
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config


def generate_unique_id():
    """Generate unique identifier for test data"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


class TestCooperativeRegistration:
    """Test cooperative registration with referral code generation"""
    
    def test_register_cooperative_creates_referral_code(self):
        """
        POST /api/auth/register with user_type=cooperative should:
        - Create user with user_type=cooperative
        - Generate coop_name
        - Generate unique referral_code
        """
        unique_id = generate_unique_id()
        payload = {
            "email": f"test_coop_{unique_id}@test.com",
            "password": "TestPass123",
            "full_name": f"Test Cooperative {unique_id}",
            "user_type": "cooperative",
            "coop_name": f"Coop Test {unique_id}",
            "department": "Abidjan"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Status assertion
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        
        user = data["user"]
        assert user.get("user_type") == "cooperative", f"user_type should be 'cooperative', got {user.get('user_type')}"
        assert user.get("coop_name") == f"Coop Test {unique_id}", f"coop_name mismatch: {user.get('coop_name')}"
        assert user.get("referral_code") is not None, "referral_code should be generated"
        assert user.get("referral_code").startswith("GL-COOP-"), f"referral_code should start with GL-COOP-, got {user.get('referral_code')}"
        
        print(f"✓ Cooperative registered with referral_code: {user.get('referral_code')}")
        
        # Store for cleanup
        return data
    
    def test_register_cooperative_with_sponsor_code(self):
        """
        POST /api/auth/register with sponsor_referral_code should:
        - Link new cooperative to sponsor
        - Store sponsor_id and sponsor_referral_code
        """
        # First, create a sponsor cooperative
        unique_id_sponsor = generate_unique_id()
        sponsor_payload = {
            "email": f"test_sponsor_{unique_id_sponsor}@test.com",
            "password": "TestPass123",
            "full_name": f"Sponsor Coop {unique_id_sponsor}",
            "user_type": "cooperative",
            "coop_name": f"Sponsor Coop {unique_id_sponsor}",
            "department": "Daloa"
        }
        
        sponsor_response = requests.post(f"{BASE_URL}/api/auth/register", json=sponsor_payload)
        assert sponsor_response.status_code in [200, 201], f"Sponsor registration failed: {sponsor_response.text}"
        
        sponsor_data = sponsor_response.json()
        sponsor_referral_code = sponsor_data["user"].get("referral_code")
        assert sponsor_referral_code, "Sponsor should have referral_code"
        
        print(f"✓ Sponsor created with referral_code: {sponsor_referral_code}")
        
        # Now create a new cooperative with the sponsor's referral code
        unique_id_affiliate = generate_unique_id()
        affiliate_payload = {
            "email": f"test_affiliate_{unique_id_affiliate}@test.com",
            "password": "TestPass123",
            "full_name": f"Affiliate Coop {unique_id_affiliate}",
            "user_type": "cooperative",
            "coop_name": f"Affiliate Coop {unique_id_affiliate}",
            "department": "Bouake",
            "sponsor_referral_code": sponsor_referral_code
        }
        
        affiliate_response = requests.post(f"{BASE_URL}/api/auth/register", json=affiliate_payload)
        assert affiliate_response.status_code in [200, 201], f"Affiliate registration failed: {affiliate_response.text}"
        
        affiliate_data = affiliate_response.json()
        affiliate_user = affiliate_data["user"]
        
        # Verify sponsor linkage
        assert affiliate_user.get("sponsor_id") is not None, "sponsor_id should be set"
        assert affiliate_user.get("sponsor_referral_code") == sponsor_referral_code.upper(), \
            f"sponsor_referral_code mismatch: expected {sponsor_referral_code.upper()}, got {affiliate_user.get('sponsor_referral_code')}"
        
        print(f"✓ Affiliate linked to sponsor via code {sponsor_referral_code}")
        
        return {
            "sponsor": sponsor_data,
            "affiliate": affiliate_data
        }


class TestCooperativeReferralMyCode:
    """Test GET /api/cooperative-referral/my-code endpoint - THE MAIN BUG FIX"""
    
    def test_my_code_returns_200_for_cooperative(self):
        """
        GET /api/cooperative-referral/my-code should return 200 (NOT 403) for cooperative user
        This was the main bug being fixed.
        """
        # Create a new cooperative
        unique_id = generate_unique_id()
        register_payload = {
            "email": f"test_mycode_{unique_id}@test.com",
            "password": "TestPass123",
            "full_name": f"MyCode Test Coop {unique_id}",
            "user_type": "cooperative",
            "coop_name": f"MyCode Coop {unique_id}",
            "department": "San-Pedro"
        }
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert register_response.status_code in [200, 201], f"Registration failed: {register_response.text}"
        
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # THE CRITICAL TEST: GET /api/cooperative-referral/my-code should return 200
        my_code_response = requests.get(f"{BASE_URL}/api/cooperative-referral/my-code", headers=headers)
        
        # This was returning 403 before the fix
        assert my_code_response.status_code == 200, \
            f"Expected 200, got {my_code_response.status_code}: {my_code_response.text}"
        
        data = my_code_response.json()
        
        # Verify response structure
        assert "referral_code" in data, "Response should contain referral_code"
        assert "coop_name" in data, "Response should contain coop_name"
        assert data["coop_name"] != "N/A", f"coop_name should not be 'N/A', got {data['coop_name']}"
        assert data["coop_name"] == f"MyCode Coop {unique_id}", f"coop_name mismatch: {data['coop_name']}"
        
        print(f"✓ GET /api/cooperative-referral/my-code returned 200 with referral_code: {data['referral_code']}")
        print(f"✓ coop_name correctly returned: {data['coop_name']}")
    
    def test_my_code_returns_403_for_non_cooperative(self):
        """
        GET /api/cooperative-referral/my-code should return 403 for non-cooperative users
        """
        # Create a producer (non-cooperative)
        unique_id = generate_unique_id()
        register_payload = {
            "email": f"test_producer_{unique_id}@test.com",
            "password": "TestPass123",
            "full_name": f"Producer {unique_id}",
            "user_type": "producteur",
            "department": "Abidjan"
        }
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert register_response.status_code in [200, 201], f"Registration failed: {register_response.text}"
        
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Non-cooperative should get 403
        my_code_response = requests.get(f"{BASE_URL}/api/cooperative-referral/my-code", headers=headers)
        assert my_code_response.status_code == 403, \
            f"Expected 403 for non-cooperative, got {my_code_response.status_code}"
        
        print("✓ Non-cooperative user correctly gets 403 on /my-code")


class TestCooperativeReferralValidate:
    """Test POST /api/cooperative-referral/validate endpoint"""
    
    def test_validate_valid_referral_code(self):
        """
        POST /api/cooperative-referral/validate should return valid=true for existing code
        """
        # Create a cooperative to get a valid referral code
        unique_id = generate_unique_id()
        register_payload = {
            "email": f"test_validate_{unique_id}@test.com",
            "password": "TestPass123",
            "full_name": f"Validate Test Coop {unique_id}",
            "user_type": "cooperative",
            "coop_name": f"Validate Coop {unique_id}",
            "department": "Gagnoa"
        }
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert register_response.status_code in [200, 201], f"Registration failed: {register_response.text}"
        
        referral_code = register_response.json()["user"]["referral_code"]
        
        # Validate the code (public endpoint - no auth needed)
        validate_response = requests.post(
            f"{BASE_URL}/api/cooperative-referral/validate",
            json={"referral_code": referral_code}
        )
        
        assert validate_response.status_code == 200, f"Validate failed: {validate_response.text}"
        
        data = validate_response.json()
        assert data.get("valid") == True, f"Expected valid=true, got {data}"
        assert data.get("sponsor_name") is not None, "sponsor_name should be returned"
        
        print(f"✓ Referral code {referral_code} validated successfully")
    
    def test_validate_invalid_referral_code(self):
        """
        POST /api/cooperative-referral/validate should return valid=false for invalid code
        """
        validate_response = requests.post(
            f"{BASE_URL}/api/cooperative-referral/validate",
            json={"referral_code": "INVALID-CODE-12345"}
        )
        
        assert validate_response.status_code == 200, f"Validate request failed: {validate_response.text}"
        
        data = validate_response.json()
        assert data.get("valid") == False, f"Expected valid=false for invalid code, got {data}"
        
        print("✓ Invalid referral code correctly returns valid=false")


class TestCooperativeReferralMyAffiliates:
    """Test GET /api/cooperative-referral/my-affiliates endpoint"""
    
    def test_my_affiliates_returns_list(self):
        """
        GET /api/cooperative-referral/my-affiliates should return list of affiliated cooperatives
        """
        # Create sponsor and affiliate
        unique_id_sponsor = generate_unique_id()
        sponsor_payload = {
            "email": f"test_aff_sponsor_{unique_id_sponsor}@test.com",
            "password": "TestPass123",
            "full_name": f"Affiliates Sponsor {unique_id_sponsor}",
            "user_type": "cooperative",
            "coop_name": f"Affiliates Sponsor Coop {unique_id_sponsor}",
            "department": "Divo"
        }
        
        sponsor_response = requests.post(f"{BASE_URL}/api/auth/register", json=sponsor_payload)
        assert sponsor_response.status_code in [200, 201], f"Sponsor registration failed: {sponsor_response.text}"
        
        sponsor_token = sponsor_response.json()["access_token"]
        sponsor_referral_code = sponsor_response.json()["user"]["referral_code"]
        
        # Create an affiliate
        unique_id_affiliate = generate_unique_id()
        affiliate_payload = {
            "email": f"test_aff_child_{unique_id_affiliate}@test.com",
            "password": "TestPass123",
            "full_name": f"Affiliate Child {unique_id_affiliate}",
            "user_type": "cooperative",
            "coop_name": f"Affiliate Child Coop {unique_id_affiliate}",
            "department": "Issia",
            "sponsor_referral_code": sponsor_referral_code
        }
        
        affiliate_response = requests.post(f"{BASE_URL}/api/auth/register", json=affiliate_payload)
        assert affiliate_response.status_code in [200, 201], f"Affiliate registration failed: {affiliate_response.text}"
        
        # Get affiliates list for sponsor
        headers = {"Authorization": f"Bearer {sponsor_token}"}
        affiliates_response = requests.get(f"{BASE_URL}/api/cooperative-referral/my-affiliates", headers=headers)
        
        assert affiliates_response.status_code == 200, f"my-affiliates failed: {affiliates_response.text}"
        
        data = affiliates_response.json()
        assert "affiliates" in data, "Response should contain affiliates list"
        assert "total_affiliates" in data, "Response should contain total_affiliates count"
        assert data["total_affiliates"] >= 1, f"Should have at least 1 affiliate, got {data['total_affiliates']}"
        
        # Verify the affiliate is in the list
        affiliate_names = [a.get("coop_name") for a in data["affiliates"]]
        assert f"Affiliate Child Coop {unique_id_affiliate}" in affiliate_names, \
            f"Affiliate not found in list: {affiliate_names}"
        
        print(f"✓ my-affiliates returned {data['total_affiliates']} affiliates")


class TestExistingAdminCooperativeAccess:
    """Test that existing admin can access cooperative referral endpoints"""
    
    def test_admin_login_and_check_user_type(self):
        """
        Verify admin account exists and check its user_type
        """
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        user_type = data["user"].get("user_type")
        
        print(f"✓ Admin logged in, user_type: {user_type}")
        
        # If admin is a cooperative, test my-code endpoint
        if user_type == "cooperative":
            token = data["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            my_code_response = requests.get(f"{BASE_URL}/api/cooperative-referral/my-code", headers=headers)
            assert my_code_response.status_code == 200, \
                f"Admin cooperative should get 200 on my-code, got {my_code_response.status_code}"
            
            code_data = my_code_response.json()
            print(f"✓ Admin cooperative referral_code: {code_data.get('referral_code')}")
            print(f"✓ Admin cooperative coop_name: {code_data.get('coop_name')}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
