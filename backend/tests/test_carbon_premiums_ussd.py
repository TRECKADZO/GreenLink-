"""
Test Carbon Premiums and USSD API for GreenLink
Tests:
1. Carbon Premiums API endpoints for cooperatives
2. USSD API for farmers (access without internet)
3. Home page verification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
COOP_CREDENTIALS = {
    "identifier": "coop-gagnoa@greenlink.ci",  # Note: uses 'identifier' not 'email'
    "password": "password"
}

FARMER_PHONE = "+2250703333333"
FARMER_NAME = "Bamba Fatou"


class TestCooperativeAuth:
    """Test cooperative authentication"""
    
    def test_cooperative_login(self):
        """Test cooperative can login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_CREDENTIALS
        )
        print(f"Login status: {response.status_code}")
        print(f"Login response: {response.json() if response.status_code != 500 else response.text}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert data.get("user", {}).get("user_type") == "cooperative", f"Wrong user type: {data.get('user', {}).get('user_type')}"
        return data["access_token"]


class TestCarbonPremiumsAPI:
    """Test Carbon Premiums endpoints for cooperative"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_members_carbon_premiums(self, auth_headers):
        """
        Test /api/cooperative/carbon-premiums/members
        Should return members with calculated carbon premiums
        """
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-premiums/members",
            headers=auth_headers
        )
        print(f"Members premiums status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "members" in data, "Missing 'members' key"
        assert "summary" in data, "Missing 'summary' key"
        
        # Check summary structure
        summary = data["summary"]
        assert "total_members" in summary, "Missing total_members"
        assert "eligible_members" in summary, "Missing eligible_members"
        assert "total_hectares" in summary, "Missing total_hectares"
        assert "total_premium_fcfa" in summary, "Missing total_premium_fcfa"
        assert "rate_per_hectare" in summary, "Missing rate_per_hectare"
        
        # Check members structure if any
        if data["members"]:
            member = data["members"][0]
            assert "member_id" in member, "Missing member_id"
            assert "full_name" in member, "Missing full_name"
            assert "phone_number" in member, "Missing phone_number"
            assert "premium_fcfa" in member, "Missing premium_fcfa"
    
    def test_export_csv(self, auth_headers):
        """
        Test /api/cooperative/carbon-premiums/export-csv
        Should generate a CSV file with premiums data
        """
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-premiums/export-csv",
            headers=auth_headers
        )
        print(f"Export CSV status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "text/csv" in response.headers.get("Content-Type", ""), "Not a CSV response"
        
        # Check CSV has content
        content = response.text
        assert len(content) > 0, "CSV is empty"
        
        # Check CSV headers
        lines = content.split('\n')
        if lines:
            header = lines[0]
            assert "Nom" in header or "nom" in header.lower(), "Missing 'Nom' header"
            print(f"CSV header: {header}")
    
    def test_payment_history(self, auth_headers):
        """
        Test /api/cooperative/carbon-premiums/history
        Should return payment history
        """
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-premiums/history",
            headers=auth_headers
        )
        print(f"History status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "payments" in data, "Missing 'payments' key"
        assert "total" in data, "Missing 'total' key"
        
        # If there are payments, check structure
        if data["payments"]:
            payment = data["payments"][0]
            assert "id" in payment, "Missing payment id"
            assert "member_name" in payment, "Missing member_name"
            assert "amount_fcfa" in payment, "Missing amount_fcfa"
            assert "status" in payment, "Missing status"
    
    def test_process_payment(self, auth_headers):
        """
        Test /api/cooperative/carbon-premiums/pay
        Should create payment and register in history
        Note: Payment is MOCKED (no real Orange Money transfer)
        """
        # First get members to find one with premium > 0
        members_response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-premiums/members",
            headers=auth_headers
        )
        assert members_response.status_code == 200
        members = members_response.json().get("members", [])
        
        # Find eligible member (with premium > 0)
        eligible_member = None
        for m in members:
            if m.get("premium_fcfa", 0) > 0:
                eligible_member = m
                break
        
        if not eligible_member:
            pytest.skip("No eligible member with premium > 0")
        
        member_id = eligible_member["member_id"]
        print(f"Testing payment for member: {eligible_member['full_name']} ({member_id})")
        
        response = requests.post(
            f"{BASE_URL}/api/cooperative/carbon-premiums/pay?member_id={member_id}",
            headers=auth_headers
        )
        print(f"Payment status: {response.status_code}")
        print(f"Response: {response.json() if response.status_code != 500 else response.text}")
        
        assert response.status_code == 200, f"Payment failed: {response.text}"
        data = response.json()
        
        # Verify payment response structure
        assert "payment_id" in data, "Missing payment_id"
        assert "payment_ref" in data, "Missing payment_ref"
        assert "amount_fcfa" in data, "Missing amount_fcfa"
        assert "status" in data, "Missing status"
        assert "sms_sent" in data, "Missing sms_sent"
        
        # Verify payment was recorded in history
        history_response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-premiums/history",
            headers=auth_headers
        )
        assert history_response.status_code == 200
        payments = history_response.json().get("payments", [])
        
        payment_found = any(p.get("id") == data["payment_id"] for p in payments)
        assert payment_found, "Payment not found in history"


class TestUSSDAPI:
    """Test USSD API for farmers without internet access"""
    
    def test_ussd_test_endpoint(self):
        """
        Test /api/ussd/test
        Should return USSD menu for a phone number
        """
        response = requests.get(
            f"{BASE_URL}/api/ussd/test",
            params={"phone": FARMER_PHONE}
        )
        print(f"USSD test status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "session_id" in data, "Missing session_id"
        assert "text" in data, "Missing text"
        assert "continue_session" in data, "Missing continue_session"
        
        # Check main menu content
        text = data["text"]
        assert "GreenLink" in text, "Missing GreenLink in menu"
        assert FARMER_NAME in text, f"Missing farmer name '{FARMER_NAME}' in menu"
        assert "1. Mes parcelles" in text or "1." in text, "Missing menu option 1"
    
    def test_ussd_callback_main_menu(self):
        """
        Test /api/ussd/callback - Main menu (empty input)
        """
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_main_menu",
                "serviceCode": "*123*45#",
                "phoneNumber": FARMER_PHONE,
                "text": ""
            }
        )
        print(f"Callback main menu status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert "GreenLink" in data["text"]
        assert data["continue_session"] == True
    
    def test_ussd_callback_option1_parcels(self):
        """
        Test /api/ussd/callback - Option 1: Mes parcelles
        """
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_option1",
                "serviceCode": "*123*45#",
                "phoneNumber": FARMER_PHONE,
                "text": "1"
            }
        )
        print(f"Option 1 status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        # Should show parcels or "aucune parcelle" message
        text = data["text"]
        assert "parcelle" in text.lower() or "PARCELLE" in text
    
    def test_ussd_callback_option2_premiums(self):
        """
        Test /api/ussd/callback - Option 2: Primes carbone
        """
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_option2",
                "serviceCode": "*123*45#",
                "phoneNumber": FARMER_PHONE,
                "text": "2"
            }
        )
        print(f"Option 2 status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "PRIME" in text.upper() or "carbone" in text.lower()
    
    def test_ussd_callback_option3_history(self):
        """
        Test /api/ussd/callback - Option 3: Historique paiements
        """
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_option3",
                "serviceCode": "*123*45#",
                "phoneNumber": FARMER_PHONE,
                "text": "3"
            }
        )
        print(f"Option 3 status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "HISTORIQUE" in text.upper() or "paiement" in text.lower() or "Aucun" in text
    
    def test_ussd_callback_option4_harvest(self):
        """
        Test /api/ussd/callback - Option 4: Déclarer récolte
        """
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_option4",
                "serviceCode": "*123*45#",
                "phoneNumber": FARMER_PHONE,
                "text": "4"
            }
        )
        print(f"Option 4 status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "RECOLTE" in text.upper() or "récolte" in text.lower()
    
    def test_ussd_callback_option5_score(self):
        """
        Test /api/ussd/callback - Option 5: Score carbone
        """
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_option5",
                "serviceCode": "*123*45#",
                "phoneNumber": FARMER_PHONE,
                "text": "5"
            }
        )
        print(f"Option 5 status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "SCORE" in text.upper() or "score" in text.lower()
    
    def test_ussd_callback_option6_help(self):
        """
        Test /api/ussd/callback - Option 6: Aide
        """
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_option6",
                "serviceCode": "*123*45#",
                "phoneNumber": FARMER_PHONE,
                "text": "6"
            }
        )
        print(f"Option 6 status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "AIDE" in text.upper() or "aide" in text.lower() or "Support" in text


class TestHomepageAPI:
    """Test homepage-related API endpoints"""
    
    def test_features_api(self):
        """Test features endpoint for homepage"""
        response = requests.get(f"{BASE_URL}/api/features")
        print(f"Features status: {response.status_code}")
        assert response.status_code == 200
    
    def test_testimonials_api(self):
        """Test testimonials endpoint for homepage"""
        response = requests.get(f"{BASE_URL}/api/testimonials")
        print(f"Testimonials status: {response.status_code}")
        assert response.status_code == 200
    
    def test_pricing_plans_api(self):
        """Test pricing plans endpoint for homepage"""
        response = requests.get(f"{BASE_URL}/api/pricing-plans")
        print(f"Pricing plans status: {response.status_code}")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
