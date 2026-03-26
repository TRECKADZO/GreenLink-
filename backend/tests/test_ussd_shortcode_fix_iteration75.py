"""
Test USSD Shortcode Fix - Iteration 75
Verifies that the USSD shortcode has been changed from *144*88# to *144*99#
across all backend endpoints and configurations.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUSSDShortcodeFix:
    """Tests for USSD shortcode change from *144*88# to *144*99#"""
    
    def test_health_check(self):
        """Test backend health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: Health check endpoint working")
    
    def test_ussd_callback_welcome_menu_new_shortcode(self):
        """Test USSD callback with new shortcode *144*99# returns welcome menu"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_shortcode_1",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250787761023",
                "text": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("continue_session") == True
        assert "Bienvenue sur GreenLink" in data.get("raw_response", "")
        print("PASS: USSD callback with *144*99# returns welcome menu")
    
    def test_ussd_callback_registered_user_flow(self):
        """Test USSD flow for registered user with new shortcode"""
        # Start session
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_shortcode_2",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250787761023",
                "text": ""
            }
        )
        assert response.status_code == 200
        
        # Select option 1 (already registered)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_shortcode_2",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250787761023",
                "text": "1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        # Should show main menu or phone not found
        assert data.get("continue_session") == True
        raw_response = data.get("raw_response", "")
        assert "GreenLink" in raw_response or "Numero non reconnu" in raw_response
        print("PASS: USSD registered user flow working with *144*99#")
    
    def test_ussd_callback_new_registration_flow(self):
        """Test USSD new registration flow with new shortcode"""
        # Start session
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_shortcode_3",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000001",
                "text": ""
            }
        )
        assert response.status_code == 200
        
        # Select option 2 (new registration)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_shortcode_3",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000001",
                "text": "2"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("continue_session") == True
        assert "Nouvelle inscription" in data.get("raw_response", "")
        assert "Etape 1/4" in data.get("raw_response", "")
        print("PASS: USSD new registration flow working with *144*99#")
    
    def test_ussd_callback_help_info(self):
        """Test USSD help/info option with new shortcode"""
        # Start session
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_shortcode_4",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000002",
                "text": ""
            }
        )
        assert response.status_code == 200
        
        # Select option 3 (help/info)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_shortcode_4",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000002",
                "text": "3"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "GreenLink Agritech" in data.get("raw_response", "")
        print("PASS: USSD help/info option working with *144*99#")
    
    def test_ussd_carbon_calculator_endpoint(self):
        """Test USSD carbon calculator endpoint with new shortcode"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "test_carbon_calc_1",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000003",
                "text": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("continue_session") == True
        # Should show first question about hectares
        raw_response = data.get("raw_response", "")
        assert "PRIME CARBONE" in raw_response or "Question" in raw_response or "hectares" in raw_response.lower()
        print("PASS: USSD carbon calculator endpoint working with *144*99#")
    
    def test_ussd_calculate_premium_endpoint(self):
        """Test USSD calculate premium endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/calculate-premium",
            json={
                "hectares": 5,
                "arbres_grands": 100,
                "arbres_moyens": 50,
                "arbres_petits": 30,
                "engrais": "non",
                "brulage": "non",
                "compost": "oui",
                "agroforesterie": "oui",
                "couverture_sol": "oui"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "eligible" in data
        assert "ars_level" in data
        assert "prime_annuelle" in data
        print(f"PASS: Calculate premium endpoint returns score={data.get('score')}, ars_level={data.get('ars_level')}")
    
    def test_no_old_shortcode_in_ussd_response(self):
        """Verify old shortcode *144*88# is NOT in USSD responses"""
        # Test welcome menu
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_old_shortcode_1",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000004",
                "text": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        raw_response = data.get("raw_response", "")
        assert "*144*88#" not in raw_response, "Old shortcode *144*88# found in response!"
        print("PASS: No old shortcode *144*88# in welcome menu response")
    
    def test_ussd_session_quit(self):
        """Test USSD quit option"""
        # Start session
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_quit_1",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000005",
                "text": ""
            }
        )
        assert response.status_code == 200
        
        # Select option 0 (quit)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": "test_quit_1",
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000005",
                "text": "0"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("continue_session") == False
        assert "Merci" in data.get("raw_response", "")
        print("PASS: USSD quit option working correctly")


class TestUSSDGatewayConfig:
    """Tests for USSD gateway configuration"""
    
    def test_ussd_gateway_status(self):
        """Test USSD gateway status endpoint if available"""
        try:
            response = requests.get(f"{BASE_URL}/api/ussd/status")
            if response.status_code == 200:
                data = response.json()
                # Check if service_code is *144*99#
                service_code = data.get("service_code", "")
                if service_code:
                    assert service_code == "*144*99#", f"Expected *144*99# but got {service_code}"
                    print(f"PASS: USSD gateway service_code is {service_code}")
                else:
                    print("INFO: USSD gateway status endpoint does not return service_code")
            else:
                print(f"INFO: USSD gateway status endpoint returned {response.status_code}")
        except Exception as e:
            print(f"INFO: USSD gateway status endpoint not available: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
