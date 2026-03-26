"""
Test SSRTE Dashboard APIs - Iteration 76
Tests for:
- GET /api/ussd/ssrte/responses - returns stats and responses list
- GET /api/ussd/ssrte/alerts - returns only alerte_ici responses
- POST /api/auth/login - admin login with identifier field
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSSRTEDashboardAPIs:
    """Test SSRTE Dashboard backend APIs"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"PASS: Health check - API is accessible")
    
    def test_ssrte_responses_endpoint(self):
        """Test GET /api/ussd/ssrte/responses returns stats and responses"""
        response = requests.get(f"{BASE_URL}/api/ussd/ssrte/responses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "stats" in data, "Response should contain 'stats'"
        assert "responses" in data, "Response should contain 'responses'"
        
        stats = data["stats"]
        assert "total" in stats, "Stats should contain 'total'"
        assert "conforme" in stats, "Stats should contain 'conforme'"
        assert "alerte_ici" in stats, "Stats should contain 'alerte_ici'"
        
        print(f"PASS: GET /api/ussd/ssrte/responses - stats: {stats}")
        print(f"PASS: Responses count: {len(data['responses'])}")
    
    def test_ssrte_alerts_endpoint(self):
        """Test GET /api/ussd/ssrte/alerts returns only alerte_ici responses"""
        response = requests.get(f"{BASE_URL}/api/ussd/ssrte/alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "count" in data, "Response should contain 'count'"
        assert "alerts" in data, "Response should contain 'alerts'"
        
        # Verify all alerts have statut = alerte_ici
        for alert in data["alerts"]:
            assert alert.get("statut") == "alerte_ici", f"Alert should have statut='alerte_ici', got {alert.get('statut')}"
        
        print(f"PASS: GET /api/ussd/ssrte/alerts - count: {data['count']}")
    
    def test_ssrte_responses_with_filter(self):
        """Test GET /api/ussd/ssrte/responses with statut filter"""
        # Test with conforme filter
        response = requests.get(f"{BASE_URL}/api/ussd/ssrte/responses?statut=conforme")
        assert response.status_code == 200
        
        data = response.json()
        for r in data["responses"]:
            assert r.get("statut") == "conforme", f"Filtered response should have statut='conforme'"
        
        print(f"PASS: GET /api/ussd/ssrte/responses?statut=conforme - count: {len(data['responses'])}")
        
        # Test with alerte_ici filter
        response = requests.get(f"{BASE_URL}/api/ussd/ssrte/responses?statut=alerte_ici")
        assert response.status_code == 200
        
        data = response.json()
        for r in data["responses"]:
            assert r.get("statut") == "alerte_ici", f"Filtered response should have statut='alerte_ici'"
        
        print(f"PASS: GET /api/ussd/ssrte/responses?statut=alerte_ici - count: {len(data['responses'])}")


class TestAdminLogin:
    """Test admin login with identifier field"""
    
    def test_admin_login_with_identifier(self):
        """Test POST /api/auth/login with identifier field (not email)"""
        login_data = {
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        
        user = data["user"]
        assert user.get("user_type") in ["admin", "cooperative"], f"User should be admin or cooperative, got {user.get('user_type')}"
        
        print(f"PASS: Admin login successful - user_type: {user.get('user_type')}")
        return data["access_token"]
    
    def test_authenticated_ssrte_responses(self):
        """Test SSRTE responses with authentication"""
        # First login
        login_data = {
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        }
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test SSRTE responses with auth
        response = requests.get(f"{BASE_URL}/api/ussd/ssrte/responses", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"PASS: Authenticated SSRTE responses - total: {data['stats']['total']}, alerte_ici: {data['stats']['alerte_ici']}, conforme: {data['stats']['conforme']}")


class TestSSRTEDataStructure:
    """Test SSRTE response data structure"""
    
    def test_ssrte_response_fields(self):
        """Verify SSRTE response contains expected fields"""
        response = requests.get(f"{BASE_URL}/api/ussd/ssrte/responses")
        assert response.status_code == 200
        
        data = response.json()
        if data["responses"]:
            sample = data["responses"][0]
            expected_fields = ["farmer_id", "phone", "statut"]
            
            for field in expected_fields:
                assert field in sample, f"Response should contain '{field}'"
            
            print(f"PASS: SSRTE response structure verified - sample: {sample}")
        else:
            print("INFO: No SSRTE responses in database yet")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
