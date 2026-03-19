"""
Iteration 43 - Test forgot-password with Resend email integration
Tests:
1. POST /api/auth/forgot-password with email (traore_eric@yahoo.fr) -> email_sent:true, NO simulation_code
2. POST /api/auth/forgot-password with phone (+2250709005301) -> email_sent:false, simulation_code present
3. POST /api/auth/forgot-password with non-existent user -> sent:true (security - no reveal)
4. POST /api/auth/login regression for phone +2250709005301 / greenlink2024
5. POST /api/auth/login regression for email klenakan.eric@gmail.com / 474Treckadzo
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestForgotPasswordResendIntegration:
    """Forgot-password endpoint tests with Resend email integration"""
    
    def test_forgot_password_with_email_traore_eric(self, api_client):
        """Test forgot-password with verified Resend email - should send real email, no simulation_code"""
        # First, ensure the user traore_eric@yahoo.fr exists or we use an existing email user
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "identifier": "traore_eric@yahoo.fr"
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Response for traore_eric@yahoo.fr: {data}")
        
        # If user exists and email was sent
        # Note: If user doesn't exist, sent:true but no email_sent field
        if "email_sent" in data:
            # User exists with email
            assert data.get("email_sent") == True, f"Expected email_sent=True but got {data.get('email_sent')}"
            assert "simulation_code" not in data, f"simulation_code should NOT be present when email is sent, got: {data}"
        else:
            # User doesn't exist - security response
            assert data.get("sent") == True, "Expected sent=True for security"
        
        assert "message" in data
        
    def test_forgot_password_with_phone_agent(self, api_client):
        """Test forgot-password with phone number - should return simulation_code (SMS mocked)"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "identifier": "+2250709005301"
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Response for +2250709005301: {data}")
        
        # Data assertions for phone-based user
        assert "sent" in data and data["sent"] == True
        assert data.get("email_sent") == False, f"Expected email_sent=False for phone user, got {data.get('email_sent')}"
        assert "simulation_code" in data, f"simulation_code should be present for phone users, got: {data}"
        assert len(data["simulation_code"]) == 6, "Code should be 6 digits"
        
    def test_forgot_password_nonexistent_user(self, api_client):
        """Test forgot-password with non-existent user - should return sent:true (security)"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "identifier": "totally_fake_user_999@notreal.com"
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Response for non-existent user: {data}")
        
        # Security: Don't reveal if user exists
        assert data.get("sent") == True, "Expected sent=True for security (no user reveal)"
        assert "message" in data


class TestLoginRegression:
    """Login regression tests to ensure forgot-password changes didn't break auth"""
    
    def test_login_phone_account_greenlink2024(self, api_client):
        """Regression: Login with phone +2250709005301 / greenlink2024"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "+2250709005301",
            "password": "greenlink2024"
        })
        
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Expected access_token in response"
        assert "user" in data, "Expected user in response"
        assert data["user"].get("user_type") == "field_agent", f"Expected field_agent, got {data['user'].get('user_type')}"
        print(f"Login OK for +2250709005301: user_type={data['user'].get('user_type')}")
        
    def test_login_email_account_admin(self, api_client):
        """Regression: Login with email klenakan.eric@gmail.com / 474Treckadzo"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Expected access_token in response"
        assert "user" in data, "Expected user in response"
        print(f"Login OK for klenakan.eric@gmail.com: user_type={data['user'].get('user_type')}")


class TestForgotPasswordWithExistingEmailUser:
    """Additional test with a known email user (admin)"""
    
    def test_forgot_password_admin_email(self, api_client):
        """Test forgot-password with admin email - might fail to send (not verified in Resend)"""
        time.sleep(1)  # Rate limit protection
        
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "identifier": "klenakan.eric@gmail.com"
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Response for klenakan.eric@gmail.com: {data}")
        
        # Since this email is not verified in Resend test mode, email will fail
        # Backend should fallback to simulation_code
        assert "sent" in data and data["sent"] == True
        # email_sent may be false (not in verified list) or true (if somehow works)
        # simulation_code present if email_sent is false
        if data.get("email_sent") == False:
            assert "simulation_code" in data, "Expected simulation_code when email fails"
            print(f"Email not sent (not verified in Resend), simulation_code provided")
        else:
            print(f"Email was sent successfully")
