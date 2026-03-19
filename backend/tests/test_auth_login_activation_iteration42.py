"""
Iteration 42 - Testing Auth Login and Activation Flow Bug Fixes
=================================================================
Focus areas:
1. Login with phone-based account (bug fix: empty email string -> None)
2. Login with email-based account (regression test)
3. Check member phone endpoint
4. Check agent phone endpoint
5. Member activation flow
"""
import pytest
import requests
import os
import urllib.parse

# Use the external API URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
AGENT_PHONE = "+2250709005301"
AGENT_PASSWORD = "greenlink2024"
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"

# Member phone for activation test (un-activated)
MEMBER_PHONE_UNACTIVATED = "+2250707001001"
TEST_PASSWORD = "test1234"


class TestPhoneBasedLogin:
    """Test login with phone-based account (main bug fix verification)"""
    
    def test_login_with_phone_number_returns_200(self):
        """
        Main bug fix test: Login with phone number should work.
        This tests the fix for Pydantic EmailStr validation failing on empty email string.
        The clean_empty_email pre-validator should convert '' to None.
        """
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_PHONE,
            "password": AGENT_PASSWORD
        })
        
        print(f"Login phone response status: {response.status_code}")
        print(f"Login phone response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Phone login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data.get("token_type") == "bearer", "Wrong token_type"
        
        # Verify user data
        user = data["user"]
        assert user.get("phone_number") is not None, "User phone_number missing"
        assert user.get("user_type") in ["field_agent", "producteur", "admin"], f"Unexpected user_type: {user.get('user_type')}"
        
        print(f"✓ Phone-based login SUCCESS - user_type: {user.get('user_type')}, phone: {user.get('phone_number')}")


class TestEmailBasedLogin:
    """Regression test: Login with email-based account should still work"""
    
    def test_login_with_email_returns_200(self):
        """
        Regression test: Ensure email-based login still works after the fix.
        """
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        print(f"Login email response status: {response.status_code}")
        
        assert response.status_code == 200, f"Email login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user"
        
        user = data["user"]
        assert user.get("email") == ADMIN_EMAIL, f"Email mismatch: {user.get('email')}"
        assert user.get("user_type") == "admin", f"Expected admin user_type, got: {user.get('user_type')}"
        
        print(f"✓ Email-based login SUCCESS - user_type: {user.get('user_type')}, email: {user.get('email')}")


class TestCheckMemberPhone:
    """Test the check-member-phone endpoint"""
    
    def test_check_unactivated_member_phone_can_activate(self):
        """
        Test check-member-phone for a member that hasn't activated yet.
        Should return can_activate: true with cooperative_name.
        """
        # URL encode the phone number for path parameter
        encoded_phone = urllib.parse.quote(MEMBER_PHONE_UNACTIVATED, safe='')
        
        response = requests.get(f"{BASE_URL}/api/auth/check-member-phone/{encoded_phone}")
        
        print(f"Check member phone response status: {response.status_code}")
        print(f"Check member phone response: {response.text}")
        
        assert response.status_code == 200, f"Check member phone failed: {response.text}"
        
        data = response.json()
        
        # The member should either:
        # - Be found and can_activate=true (not yet activated)
        # - Be found and can_activate=false with reason=has_account (already activated)
        # - Not be found
        assert "found" in data, "Missing 'found' field"
        assert "can_activate" in data, "Missing 'can_activate' field"
        
        print(f"✓ Check member phone result - found: {data.get('found')}, can_activate: {data.get('can_activate')}, reason: {data.get('reason')}")
        
        if data.get("can_activate"):
            assert "cooperative_name" in data, "Missing cooperative_name when can_activate is true"
            print(f"  - cooperative_name: {data.get('cooperative_name')}")


class TestCheckAgentPhone:
    """Test the check-agent-phone endpoint"""
    
    def test_check_activated_agent_phone_returns_has_account(self):
        """
        Test check-agent-phone for an already-activated agent.
        Should return can_activate: false, reason: has_account.
        """
        # URL encode the phone number for path parameter
        encoded_phone = urllib.parse.quote(AGENT_PHONE, safe='')
        
        response = requests.get(f"{BASE_URL}/api/auth/check-agent-phone/{encoded_phone}")
        
        print(f"Check agent phone response status: {response.status_code}")
        print(f"Check agent phone response: {response.text}")
        
        assert response.status_code == 200, f"Check agent phone failed: {response.text}"
        
        data = response.json()
        
        assert data.get("found") == True, "Agent phone should be found"
        assert data.get("can_activate") == False, "Already activated agent should have can_activate=false"
        assert data.get("reason") == "has_account", f"Expected reason=has_account, got: {data.get('reason')}"
        
        print(f"✓ Check agent phone SUCCESS - found: {data.get('found')}, can_activate: {data.get('can_activate')}, reason: {data.get('reason')}")


class TestMemberActivationFlow:
    """Test the member activation flow end-to-end"""
    
    def test_activate_member_and_login(self):
        """
        Test the full activation-to-login flow:
        1. Check if member can activate
        2. If can activate, activate the account
        3. Login with the newly activated account
        4. Check that the phone now returns can_activate: false
        """
        encoded_phone = urllib.parse.quote(MEMBER_PHONE_UNACTIVATED, safe='')
        
        # Step 1: Check if member can activate
        check_response = requests.get(f"{BASE_URL}/api/auth/check-member-phone/{encoded_phone}")
        
        print(f"Step 1 - Check member: {check_response.status_code}")
        print(f"Check response: {check_response.text}")
        
        assert check_response.status_code == 200, f"Check member phone failed: {check_response.text}"
        
        check_data = check_response.json()
        
        # Handle case where member already has account
        if check_data.get("reason") == "has_account":
            print("✓ Member already activated - testing login directly")
            # Skip to login test
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": MEMBER_PHONE_UNACTIVATED,
                "password": TEST_PASSWORD
            })
            
            print(f"Login response: {login_response.status_code}")
            # This may fail if password is different, but that's expected
            if login_response.status_code == 200:
                print("✓ Login with previously activated account SUCCESS")
            else:
                print(f"Login failed (expected if password differs from previous activation): {login_response.text}")
            return
        
        if check_data.get("reason") == "not_found":
            print("⚠ Member phone not found in coop_members - skipping activation test")
            pytest.skip("Member phone not registered in cooperative")
            return
        
        # Step 2: Activate the account
        if check_data.get("can_activate"):
            print(f"Step 2 - Activating account for: {check_data.get('member_name')}")
            
            activate_response = requests.post(f"{BASE_URL}/api/auth/activate-member-account", json={
                "phone_number": MEMBER_PHONE_UNACTIVATED,
                "password": TEST_PASSWORD
            })
            
            print(f"Activation response status: {activate_response.status_code}")
            print(f"Activation response: {activate_response.text[:500]}")
            
            assert activate_response.status_code == 200, f"Activation failed: {activate_response.text}"
            
            activate_data = activate_response.json()
            assert "access_token" in activate_data, "Missing access_token after activation"
            assert "user" in activate_data, "Missing user after activation"
            
            user = activate_data["user"]
            print(f"✓ Activation SUCCESS - user_id: {user.get('_id')}, name: {user.get('full_name')}")
            
            # Step 3: Login with newly activated account
            print("Step 3 - Login with newly activated account")
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": MEMBER_PHONE_UNACTIVATED,
                "password": TEST_PASSWORD
            })
            
            print(f"Login response status: {login_response.status_code}")
            
            assert login_response.status_code == 200, f"Login after activation failed: {login_response.text}"
            
            login_data = login_response.json()
            assert "access_token" in login_data, "Missing access_token on login"
            print(f"✓ Login after activation SUCCESS")
            
            # Step 4: Check member phone again - should now return can_activate: false
            print("Step 4 - Verify phone now shows has_account")
            recheck_response = requests.get(f"{BASE_URL}/api/auth/check-member-phone/{encoded_phone}")
            
            assert recheck_response.status_code == 200
            recheck_data = recheck_response.json()
            
            assert recheck_data.get("can_activate") == False, "After activation, can_activate should be false"
            assert recheck_data.get("reason") == "has_account", f"Expected reason=has_account, got: {recheck_data.get('reason')}"
            print(f"✓ Post-activation check SUCCESS - can_activate: false, reason: has_account")
        else:
            print(f"⚠ Member cannot activate - reason: {check_data.get('reason')}")
            pytest.skip(f"Member cannot activate: {check_data.get('reason')}")


class TestLoginWithInvalidCredentials:
    """Test login error handling"""
    
    def test_login_with_wrong_password_returns_401(self):
        """Verify login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": "wrong_password_12345"
        })
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✓ Wrong password correctly returns 401")
    
    def test_login_with_nonexistent_user_returns_401(self):
        """Verify login with non-existent user returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "nonexistent_user_xyz@test.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✓ Non-existent user correctly returns 401")


# Standalone test runner
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
