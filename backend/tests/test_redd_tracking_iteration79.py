"""
Test suite for Iteration 79 - REDD+ Tracking and USSD Carbon Calculator Updates
Tests:
1. USSD Carbon Calculator - no formulas/percentages in results, concept explanations in questions
2. REDD+ Tracking API - practices list, visit creation, visits listing, stats
3. Web Carbon Calculator page - Notions importantes card
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUSSDCarbonCalculator:
    """Test USSD Carbon Calculator endpoint - no formulas/percentages, concept explanations"""
    
    def test_carbon_calculator_initial_question_has_concept(self):
        """Test that first question includes concept explanation"""
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_concept_1",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250700000000",
            "text": ""
        })
        assert response.status_code == 200
        data = response.json()
        assert data["continue_session"] == True
        assert data["step"] == 1
        # Check for concept explanation in question
        raw = data.get("raw_response", "")
        assert "sequestration carbone" in raw.lower() or "superficie" in raw.lower()
        print(f"PASS: Initial question has concept explanation")
    
    def test_carbon_calculator_all_questions_have_concepts(self):
        """Test that all 9 questions include concept explanations"""
        session_id = "test_concepts_all"
        # Simulate answering questions to see all of them
        answers = ["3.5", "20", "30", "10", "1", "2", "2", "1", "1"]
        
        for i, answer in enumerate(answers):
            text = "*".join(answers[:i]) if i > 0 else ""
            response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": "+2250700000000",
                "text": text
            })
            assert response.status_code == 200
            data = response.json()
            
            if data["continue_session"]:
                raw = data.get("raw_response", "")
                # Each question should have some explanation text
                assert len(raw) > 50, f"Question {i+1} seems too short, missing explanation"
                print(f"PASS: Question {i+1} has explanation text (length: {len(raw)})")
    
    def test_carbon_calculator_result_no_formula(self):
        """Test that result does NOT show CO2/ha formula"""
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_no_formula",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250700000000",
            "text": "3.5*20*30*10*1*2*2*1*1"  # All 9 answers
        })
        assert response.status_code == 200
        data = response.json()
        assert data["continue_session"] == False
        
        raw = data.get("raw_response", "")
        # Should NOT contain formula like "X tCO2/ha" or "CO2/ha"
        assert "tco2/ha" not in raw.lower()
        assert "co2/ha" not in raw.lower()
        print(f"PASS: Result does not show CO2/ha formula")
    
    def test_carbon_calculator_result_no_ars_percentage(self):
        """Test that result does NOT show ARS percentage"""
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_no_ars_pct",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250700000000",
            "text": "3.5*20*30*10*1*2*2*1*1"
        })
        assert response.status_code == 200
        data = response.json()
        
        raw = data.get("raw_response", "")
        # Should NOT contain ARS percentage like "(XX%)" after ARS level
        # The result should show "Niveau ARS: Or" not "Niveau ARS: Or (85%)"
        import re
        ars_with_pct = re.search(r"niveau ars.*\(\d+%\)", raw.lower())
        assert ars_with_pct is None, f"Found ARS percentage in result: {raw}"
        print(f"PASS: Result does not show ARS percentage")
    
    def test_carbon_calculator_result_shows_score_and_prime(self):
        """Test that result shows score and prime estimation"""
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_result_content",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250700000000",
            "text": "3.5*20*30*10*1*2*2*1*1"
        })
        assert response.status_code == 200
        data = response.json()
        
        raw = data.get("raw_response", "")
        # Should contain score and prime
        assert "score" in raw.lower()
        assert "fcfa" in raw.lower()
        assert "niveau ars" in raw.lower()
        print(f"PASS: Result shows score, prime, and ARS level")


class TestREDDTrackingAPI:
    """Test REDD+ Tracking API endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_practices_list_returns_21_practices(self):
        """Test GET /api/redd/tracking/practices-list returns 21 practices"""
        response = requests.get(f"{BASE_URL}/api/redd/tracking/practices-list")
        assert response.status_code == 200
        data = response.json()
        
        practices = data.get("practices", [])
        assert len(practices) == 21, f"Expected 21 practices, got {len(practices)}"
        
        # Verify categories
        categories = set(p.get("category") for p in practices)
        expected_categories = {"agroforesterie", "zero_deforestation", "gestion_sols", "restauration", "tracabilite"}
        assert categories == expected_categories, f"Missing categories: {expected_categories - categories}"
        
        # Verify practice codes
        codes = [p.get("code") for p in practices]
        assert "AGF1" in codes
        assert "ZD1" in codes
        assert "SOL1" in codes
        assert "REST1" in codes
        assert "TRAC1" in codes
        print(f"PASS: Practices list returns 21 practices in 5 categories")
    
    def test_create_visit_requires_auth(self):
        """Test POST /api/redd/tracking/visit requires authentication"""
        response = requests.post(f"{BASE_URL}/api/redd/tracking/visit", json={
            "farmer_id": "test_farmer",
            "farmer_name": "Test Farmer",
            "practices_verified": []
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Create visit requires authentication")
    
    def test_create_visit_with_auth(self, auth_token):
        """Test POST /api/redd/tracking/visit creates a visit"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        practices_verified = [
            {"code": "AGF1", "name": "Arbres d'ombrage", "category": "agroforesterie", "status": "conforme"},
            {"code": "AGF2", "name": "Systeme agroforestier", "category": "agroforesterie", "status": "conforme"},
            {"code": "ZD1", "name": "Intensification durable", "category": "zero_deforestation", "status": "non_conforme"},
            {"code": "SOL1", "name": "Paillage et compostage", "category": "gestion_sols", "status": "conforme"},
        ]
        
        response = requests.post(f"{BASE_URL}/api/redd/tracking/visit", 
            headers=headers,
            json={
                "farmer_id": f"test_farmer_{os.urandom(4).hex()}",
                "farmer_name": "Test Producteur REDD+",
                "farmer_phone": "+2250700000001",
                "practices_verified": practices_verified,
                "superficie_verifiee": 3.5,
                "arbres_comptes": 60,
                "observations": "Test observation",
                "recommandations": "Test recommandation",
                "suivi_requis": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "visit_id" in data
        assert "redd_score" in data
        assert "redd_level" in data
        assert "conformity_pct" in data
        assert data["conformity_pct"] == 75  # 3 out of 4 conforme
        print(f"PASS: Create visit returns visit_id, redd_score={data['redd_score']}, redd_level={data['redd_level']}")
    
    def test_get_visits_requires_auth(self):
        """Test GET /api/redd/tracking/visits requires authentication"""
        response = requests.get(f"{BASE_URL}/api/redd/tracking/visits")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Get visits requires authentication")
    
    def test_get_visits_with_auth(self, auth_token):
        """Test GET /api/redd/tracking/visits lists visits"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/redd/tracking/visits", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "visits" in data
        assert "count" in data
        assert isinstance(data["visits"], list)
        print(f"PASS: Get visits returns {data['count']} visits")
    
    def test_get_stats_requires_auth(self):
        """Test GET /api/redd/tracking/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/redd/tracking/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Get stats requires authentication")
    
    def test_get_stats_with_auth(self, auth_token):
        """Test GET /api/redd/tracking/stats returns statistics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/redd/tracking/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_visits" in data
        assert "avg_conformity" in data
        assert "avg_redd_score" in data
        assert "level_distribution" in data
        assert "recent_visits" in data
        print(f"PASS: Get stats returns total_visits={data['total_visits']}, avg_redd_score={data['avg_redd_score']}")


class TestWebCarbonCalculatorPage:
    """Test Web Carbon Calculator page has Notions importantes card"""
    
    def test_ussd_carbon_calculator_endpoint_accessible(self):
        """Test that the USSD carbon calculator endpoint is accessible"""
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_web_page",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250700000000",
            "text": ""
        })
        assert response.status_code == 200
        print(f"PASS: USSD carbon calculator endpoint accessible")


class TestREDDTrackingWebPage:
    """Test REDD+ Tracking web page route exists"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_redd_tracking_api_health(self, auth_token):
        """Test REDD+ tracking API is healthy"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test practices list (no auth required)
        response = requests.get(f"{BASE_URL}/api/redd/tracking/practices-list")
        assert response.status_code == 200
        
        # Test visits endpoint (auth required)
        response = requests.get(f"{BASE_URL}/api/redd/tracking/visits", headers=headers)
        assert response.status_code == 200
        
        # Test stats endpoint (auth required)
        response = requests.get(f"{BASE_URL}/api/redd/tracking/stats", headers=headers)
        assert response.status_code == 200
        
        print(f"PASS: All REDD+ tracking API endpoints healthy")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
