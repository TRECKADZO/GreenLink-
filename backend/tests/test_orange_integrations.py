"""
Test Suite for Orange Money, Orange SMS, and USSD Gateway Integrations
Tests the mock mode functionality when credentials are absent in .env

Tested Endpoints:
- GET /api/payments/simulation-status - public, returns simulation_mode=true
- GET /api/payments/integrations-status - admin-only, returns status of all 3 services
- POST /api/ussd/calculate-premium - public carbon calculator
- POST /api/ussd/callback - USSD callback endpoint

Service Mock Mode Tests:
- OrangeMoneyService: mock mode when credentials absent
- OrangeSMSService: mock mode when credentials absent  
- USSDGatewayService: mock mode when credentials absent
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_CREDENTIALS = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}

COOP_CREDENTIALS = {
    "identifier": "coop-gagnoa@greenlink.ci",
    "password": "password"
}


class TestAuthHelper:
    """Helper class for authentication"""
    
    @staticmethod
    def get_token(credentials: dict) -> str:
        """Get auth token for given credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=credentials
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        return None


class TestSimulationStatusEndpoint:
    """Tests for GET /api/payments/simulation-status (public endpoint)"""
    
    def test_simulation_status_returns_200(self):
        """simulation-status endpoint should return 200 without auth"""
        response = requests.get(f"{BASE_URL}/api/payments/simulation-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ simulation-status endpoint returns 200")
    
    def test_simulation_status_returns_simulation_mode_true(self):
        """simulation-status should return simulation_mode=true when credentials are empty"""
        response = requests.get(f"{BASE_URL}/api/payments/simulation-status")
        assert response.status_code == 200
        
        data = response.json()
        assert "simulation_mode" in data, f"Response missing 'simulation_mode': {data}"
        assert data["simulation_mode"] == True, f"Expected simulation_mode=true, got {data['simulation_mode']}"
        print(f"✓ simulation_mode = {data['simulation_mode']} (expected: True)")
    
    def test_simulation_status_has_message(self):
        """simulation-status should return a message field"""
        response = requests.get(f"{BASE_URL}/api/payments/simulation-status")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data, f"Response missing 'message': {data}"
        assert "simulation" in data["message"].lower(), f"Message doesn't mention simulation: {data['message']}"
        print(f"✓ message = {data['message']}")


class TestIntegrationsStatusEndpoint:
    """Tests for GET /api/payments/integrations-status (admin-only endpoint)"""
    
    def test_integrations_status_requires_auth(self):
        """integrations-status should require authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/integrations-status")
        assert response.status_code in (401, 403, 422), f"Expected 401/403/422 without auth, got {response.status_code}"
        print(f"✓ integrations-status requires auth (status: {response.status_code})")
    
    def test_integrations_status_rejects_non_admin(self):
        """integrations-status should reject non-admin users with 403"""
        token = TestAuthHelper.get_token(COOP_CREDENTIALS)
        if not token:
            pytest.skip("Could not get coop token - skipping non-admin test")
        
        response = requests.get(
            f"{BASE_URL}/api/payments/integrations-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}: {response.text}"
        print(f"✓ Non-admin user rejected with 403")
    
    def test_integrations_status_admin_access(self):
        """Admin should be able to access integrations-status"""
        token = TestAuthHelper.get_token(ADMIN_CREDENTIALS)
        if not token:
            pytest.skip("Could not get admin token - skipping admin access test")
        
        response = requests.get(
            f"{BASE_URL}/api/payments/integrations-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 for admin, got {response.status_code}: {response.text}"
        print(f"✓ Admin can access integrations-status")
    
    def test_integrations_status_returns_all_services(self):
        """integrations-status should return status for all 3 services"""
        token = TestAuthHelper.get_token(ADMIN_CREDENTIALS)
        if not token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/payments/integrations-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all 3 services are present
        assert "orange_money" in data, f"Missing orange_money in response: {data}"
        assert "orange_sms" in data, f"Missing orange_sms in response: {data}"
        assert "ussd_gateway" in data, f"Missing ussd_gateway in response: {data}"
        print(f"✓ All 3 services present in response")
    
    def test_orange_money_status_mock_mode(self):
        """OrangeMoneyService should be in mock mode"""
        token = TestAuthHelper.get_token(ADMIN_CREDENTIALS)
        if not token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/payments/integrations-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        om_status = data.get("orange_money", {})
        assert om_status.get("configured") == False, f"orange_money should be configured=false: {om_status}"
        assert om_status.get("mode") == "mock", f"orange_money should be mode=mock: {om_status}"
        print(f"✓ orange_money: configured={om_status.get('configured')}, mode={om_status.get('mode')}")
    
    def test_orange_sms_status_mock_mode(self):
        """OrangeSMSService should be in mock mode"""
        token = TestAuthHelper.get_token(ADMIN_CREDENTIALS)
        if not token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/payments/integrations-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        sms_status = data.get("orange_sms", {})
        assert sms_status.get("configured") == False, f"orange_sms should be configured=false: {sms_status}"
        assert sms_status.get("mode") == "mock", f"orange_sms should be mode=mock: {sms_status}"
        print(f"✓ orange_sms: configured={sms_status.get('configured')}, mode={sms_status.get('mode')}")
    
    def test_ussd_gateway_status_mock_mode(self):
        """USSDGatewayService should be in mock mode"""
        token = TestAuthHelper.get_token(ADMIN_CREDENTIALS)
        if not token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/payments/integrations-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        ussd_status = data.get("ussd_gateway", {})
        assert ussd_status.get("configured") == False, f"ussd_gateway should be configured=false: {ussd_status}"
        assert ussd_status.get("mode") == "mock", f"ussd_gateway should be mode=mock: {ussd_status}"
        print(f"✓ ussd_gateway: configured={ussd_status.get('configured')}, mode={ussd_status.get('mode')}")
    
    def test_all_configured_is_false(self):
        """all_configured should be false when any service is not configured"""
        token = TestAuthHelper.get_token(ADMIN_CREDENTIALS)
        if not token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/payments/integrations-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        assert "all_configured" in data, f"Missing all_configured field: {data}"
        assert data["all_configured"] == False, f"all_configured should be False: {data['all_configured']}"
        print(f"✓ all_configured = {data['all_configured']}")


class TestUSSDCalculatePremiumEndpoint:
    """Tests for POST /api/ussd/calculate-premium (public endpoint)"""
    
    def test_calculate_premium_returns_200(self):
        """calculate-premium should return 200 for valid input"""
        payload = {
            "hectares": 5,
            "trees": 50,
            "culture": "cacao",
            "practices": ["compost", "agroforesterie"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/calculate-premium",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ calculate-premium returns 200")
    
    def test_calculate_premium_returns_score(self):
        """calculate-premium should return a score"""
        payload = {
            "hectares": 5,
            "trees": 50,
            "culture": "cacao",
            "practices": ["compost", "agroforesterie"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/calculate-premium",
            json=payload
        )
        data = response.json()
        
        assert "score" in data, f"Missing 'score' in response: {data}"
        assert isinstance(data["score"], (int, float)), f"Score should be numeric: {data['score']}"
        assert 0 <= data["score"] <= 10, f"Score should be 0-10: {data['score']}"
        print(f"✓ score = {data['score']}")
    
    def test_calculate_premium_returns_prime_fcfa_kg(self):
        """calculate-premium should return prime_fcfa_kg"""
        payload = {
            "hectares": 5,
            "trees": 50,
            "culture": "cacao",
            "practices": ["compost"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/calculate-premium",
            json=payload
        )
        data = response.json()
        
        assert "prime_fcfa_kg" in data, f"Missing 'prime_fcfa_kg': {data}"
        assert isinstance(data["prime_fcfa_kg"], (int, float)), f"prime_fcfa_kg should be numeric"
        print(f"✓ prime_fcfa_kg = {data['prime_fcfa_kg']} FCFA/kg")
    
    def test_calculate_premium_returns_prime_annuelle(self):
        """calculate-premium should return prime_annuelle"""
        payload = {
            "hectares": 10,
            "trees": 100,
            "culture": "cacao",
            "practices": ["agroforesterie", "compost"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/calculate-premium",
            json=payload
        )
        data = response.json()
        
        assert "prime_annuelle" in data, f"Missing 'prime_annuelle': {data}"
        assert isinstance(data["prime_annuelle"], (int, float)), f"prime_annuelle should be numeric"
        print(f"✓ prime_annuelle = {data['prime_annuelle']} FCFA")
    
    def test_calculate_premium_eligible_field(self):
        """calculate-premium should return eligible field"""
        payload = {
            "hectares": 5,
            "trees": 60,
            "culture": "cacao",
            "practices": ["agroforesterie", "compost", "zero_pesticides"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/calculate-premium",
            json=payload
        )
        data = response.json()
        
        assert "eligible" in data, f"Missing 'eligible': {data}"
        assert isinstance(data["eligible"], bool), f"eligible should be boolean"
        print(f"✓ eligible = {data['eligible']}")
    
    def test_calculate_premium_different_cultures(self):
        """calculate-premium should work for different cultures"""
        cultures = ["cacao", "cafe", "anacarde"]
        
        for culture in cultures:
            payload = {
                "hectares": 5,
                "trees": 50,
                "culture": culture,
                "practices": []
            }
            
            response = requests.post(
                f"{BASE_URL}/api/ussd/calculate-premium",
                json=payload
            )
            assert response.status_code == 200, f"Failed for culture {culture}: {response.status_code}"
            
            data = response.json()
            assert data["culture"] == culture, f"Culture mismatch: expected {culture}, got {data['culture']}"
            print(f"✓ culture {culture}: score={data['score']}, prime_fcfa_kg={data['prime_fcfa_kg']}")


class TestUSSDCallbackEndpoint:
    """Tests for POST /api/ussd/callback"""
    
    def test_ussd_callback_returns_response(self):
        """USSD callback should return a valid response"""
        payload = {
            "sessionId": "test_session_001",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250787761023",
            "text": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ USSD callback returns 200")
    
    def test_ussd_callback_returns_session_id(self):
        """USSD callback should return session_id"""
        payload = {
            "sessionId": "test_session_002",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250787761023",
            "text": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json=payload
        )
        data = response.json()
        
        assert "session_id" in data, f"Missing 'session_id': {data}"
        assert data["session_id"] == "test_session_002", f"session_id mismatch"
        print(f"✓ session_id = {data['session_id']}")
    
    def test_ussd_callback_returns_text(self):
        """USSD callback should return text response"""
        payload = {
            "sessionId": "test_session_003",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250787761023",
            "text": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json=payload
        )
        data = response.json()
        
        assert "text" in data, f"Missing 'text': {data}"
        assert len(data["text"]) > 0, f"Text should not be empty"
        # Should start with CON (continue) or END
        assert data["text"].startswith("CON") or data["text"].startswith("END"), f"Text should start with CON/END: {data['text'][:20]}"
        print(f"✓ text starts with: {data['text'][:20]}...")
    
    def test_ussd_callback_returns_continue_session(self):
        """USSD callback should return continue_session field"""
        payload = {
            "sessionId": "test_session_004",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250787761023",
            "text": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json=payload
        )
        data = response.json()
        
        assert "continue_session" in data, f"Missing 'continue_session': {data}"
        assert isinstance(data["continue_session"], bool), f"continue_session should be boolean"
        print(f"✓ continue_session = {data['continue_session']}")
    
    def test_ussd_callback_menu_navigation(self):
        """USSD callback should handle menu navigation"""
        # Test menu option 1 (Mes parcelles)
        payload = {
            "sessionId": "test_session_005",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250787761023",
            "text": "1"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "text" in data
        # Should mention parcelles or similar
        print(f"✓ Menu option 1 response: {data['text'][:50]}...")


class TestBackendServerStartup:
    """Test that backend server starts without errors"""
    
    def test_root_endpoint(self):
        """Backend root endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/")
        # Root endpoint may return 200 or 404, just verify server is responding
        assert response.status_code in (200, 404), f"Server not responding: {response.status_code}"
        print(f"✓ Backend server is running (root returned {response.status_code})")
    
    def test_backend_with_placeholder_credentials(self):
        """Backend should start and work with placeholder credentials"""
        # Test multiple endpoints to verify server is working
        endpoints = [
            "/api/payments/simulation-status",
            "/api/ussd/stats"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in (200, 401, 403), f"Endpoint {endpoint} returned {response.status_code}"
            print(f"✓ {endpoint} is accessible (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
