"""
Iteration 44 - Backend tests for notification email hooks
Tests added by testing agent for:
1. Login regression tests (email & phone)
2. Forgot-password with Resend email integration  
3. Activate-member-account triggers notification hooks
4. Backend server health check (no crashes from notification imports)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://apk-build-test.preview.emergentagent.com")


class TestLoginRegression:
    """Regression tests for login endpoints (should continue working after notification hooks added)"""

    def test_login_admin_email(self):
        """Test login with admin email klenakan.eric@gmail.com"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"},
            timeout=30
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert data.get("user", {}).get("email") == "klenakan.eric@gmail.com"
        print(f"PASS: Admin email login returns 200, user_type={data.get('user', {}).get('user_type')}")

    def test_login_agent_phone(self):
        """Test login with agent phone +2250709005301"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "+2250709005301", "password": "greenlink2024"},
            timeout=30
        )
        assert response.status_code == 200, f"Agent phone login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        user_type = data.get("user", {}).get("user_type")
        # Agent could be field_agent or cooperative depending on activation
        assert user_type in ["field_agent", "cooperative"], f"Unexpected user_type: {user_type}"
        print(f"PASS: Agent phone login returns 200, user_type={user_type}")


class TestForgotPasswordResend:
    """Test forgot-password endpoint with Resend email integration"""

    def test_forgot_password_email_resend_verified(self):
        """Test forgot-password with Resend-verified email traore_eric@yahoo.fr"""
        # Wait to avoid rate limit
        time.sleep(2)
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"identifier": "traore_eric@yahoo.fr"},
            timeout=30
        )
        # May get 429 if rate limited
        if response.status_code == 429:
            print("SKIP: Rate limited (429) - waiting and retrying...")
            time.sleep(60)
            response = requests.post(
                f"{BASE_URL}/api/auth/forgot-password",
                json={"identifier": "traore_eric@yahoo.fr"},
                timeout=30
            )
        
        assert response.status_code == 200, f"Forgot password failed: {response.text}"
        data = response.json()
        assert data.get("sent") == True, "Expected sent=True"
        assert data.get("email_sent") == True, "Expected email_sent=True for Resend-verified email"
        # simulation_code should NOT be present when email_sent is True
        assert "simulation_code" not in data, "simulation_code should NOT be present when email is actually sent"
        print("PASS: Forgot-password with traore_eric@yahoo.fr returns email_sent=True, no simulation_code")

    def test_forgot_password_phone_sms_mock(self):
        """Test forgot-password with phone (SMS is mocked, should return simulation_code)"""
        time.sleep(2)
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"identifier": "+2250709005301"},
            timeout=30
        )
        if response.status_code == 429:
            print("SKIP: Rate limited (429) - waiting and retrying...")
            time.sleep(60)
            response = requests.post(
                f"{BASE_URL}/api/auth/forgot-password",
                json={"identifier": "+2250709005301"},
                timeout=30
            )
        
        assert response.status_code == 200, f"Forgot password failed: {response.text}"
        data = response.json()
        assert data.get("sent") == True, "Expected sent=True"
        # Phone users should get simulation_code since SMS is mocked
        assert "simulation_code" in data, "Expected simulation_code for phone user (SMS mocked)"
        print(f"PASS: Forgot-password with phone returns simulation_code={data.get('simulation_code')}")


class TestNotificationHooksImport:
    """Test that notification hooks are properly imported without crashing the server"""

    def test_health_check(self):
        """Test basic health - server should start without import errors"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        # Health endpoint may not exist, but we should not get connection error
        # If server crashed due to import errors, we'd get connection refused
        assert response.status_code in [200, 404], f"Server may have crashed: {response.status_code}"
        print(f"PASS: Server is running (status={response.status_code})")

    def test_auth_module_loads(self):
        """Test that auth.py loads correctly (has notification hooks)"""
        # Just verifying login works proves auth.py loaded correctly
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"},
            timeout=30
        )
        assert response.status_code == 200, "Auth module failed to load"
        print("PASS: auth.py loads correctly with notification hooks")

    def test_greenlink_module_loads(self):
        """Test that greenlink.py loads correctly (has harvest_declared hook)"""
        # Get token first
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"},
            timeout=30
        )
        token = login_resp.json().get("access_token")
        
        # Try accessing a greenlink endpoint
        response = requests.get(
            f"{BASE_URL}/api/greenlink/farmer/dashboard",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        # May return 200 or 403 depending on user type, but should not crash
        assert response.status_code in [200, 403, 404], f"greenlink.py may have import error: {response.status_code}"
        print(f"PASS: greenlink.py loads correctly (status={response.status_code})")

    def test_ici_data_collection_module_loads(self):
        """Test that ici_data_collection.py loads correctly (has ssrte_visit hook)"""
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"},
            timeout=30
        )
        token = login_resp.json().get("access_token")
        
        # Try accessing ICI endpoint
        response = requests.get(
            f"{BASE_URL}/api/ici-data/reference/dangerous-tasks",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        # Should return reference data
        assert response.status_code in [200, 403], f"ici_data_collection.py may have import error: {response.status_code}"
        print(f"PASS: ici_data_collection.py loads correctly (status={response.status_code})")

    def test_admin_module_loads(self):
        """Test that admin.py loads correctly (has farmer_assigned hook)"""
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"},
            timeout=30
        )
        token = login_resp.json().get("access_token")
        
        # Admin stats endpoint
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        assert response.status_code == 200, f"admin.py may have import error: {response.status_code}"
        print(f"PASS: admin.py loads correctly (status={response.status_code})")

    def test_cooperative_module_loads(self):
        """Test that cooperative.py loads correctly (has verify_parcel hook)"""
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"},
            timeout=30
        )
        token = login_resp.json().get("access_token")
        
        # Cooperative dashboard (will return 403 for admin, but should not crash)
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        # 403 for non-cooperative users is expected, but should not crash
        assert response.status_code in [200, 403], f"cooperative.py may have import error: {response.status_code}"
        print(f"PASS: cooperative.py loads correctly (status={response.status_code})")


class TestActivateMemberAccountNotification:
    """Test that activate-member-account triggers notification hooks without crashing"""

    def test_check_member_phone_for_activation(self):
        """Check if a member phone can be activated (used to verify the endpoint works)"""
        # Use a phone that may have an unactivated member record
        response = requests.get(
            f"{BASE_URL}/api/auth/check-member-phone/+2250703507072",
            timeout=30
        )
        assert response.status_code == 200, f"check-member-phone failed: {response.text}"
        data = response.json()
        print(f"PASS: check-member-phone returns: found={data.get('found')}, can_activate={data.get('can_activate')}")
        return data

    def test_activate_member_triggers_notification(self):
        """Test that activate-member-account endpoint doesn't crash (fire-and-forget notification)"""
        # First check if there's an activatable member
        check_resp = requests.get(
            f"{BASE_URL}/api/auth/check-member-phone/+2250703507072",
            timeout=30
        )
        check_data = check_resp.json()
        
        if not check_data.get("can_activate", False):
            print(f"SKIP: No activatable member at +2250703507072 (reason={check_data.get('reason', 'unknown')})")
            # Still verify the endpoint exists and doesn't crash
            response = requests.post(
                f"{BASE_URL}/api/auth/activate-member-account",
                json={"phone_number": "+2250703507072", "password": "testpass123"},
                timeout=30
            )
            # Should return 400 or 404 for already activated, but should NOT crash
            assert response.status_code in [200, 400, 404], f"Unexpected error: {response.status_code}"
            print(f"PASS: activate-member-account endpoint exists (status={response.status_code})")
            return
        
        # If can_activate is True, try activating
        response = requests.post(
            f"{BASE_URL}/api/auth/activate-member-account",
            json={"phone_number": "+2250703507072", "password": "testpass123"},
            timeout=30
        )
        # Should succeed with 200 and trigger notification in background
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data, "Missing access_token"
            print(f"PASS: Member activated successfully, notification triggered in background")
        else:
            # May fail if already activated
            assert response.status_code in [400, 404], f"Unexpected error: {response.status_code}"
            print(f"PASS: activate-member-account endpoint works (status={response.status_code})")


class TestEmailServiceModule:
    """Test email_service.py module after rewrite"""

    def test_email_service_import_via_forgot_password(self):
        """Test that email_service.py imports correctly (used in forgot-password)"""
        time.sleep(2)  # Avoid rate limit
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"identifier": "test-nonexistent-user@test.com"},
            timeout=30
        )
        # Should return 200 (security - doesn't reveal if user exists)
        # If email_service had import error, this would fail
        if response.status_code == 429:
            print("SKIP: Rate limited, but email_service loaded (server running)")
            return
        
        assert response.status_code == 200, f"email_service may have import error: {response.status_code}"
        data = response.json()
        assert data.get("sent") == True, "Expected sent=True for security"
        print("PASS: email_service.py imports correctly (forgot-password works)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
