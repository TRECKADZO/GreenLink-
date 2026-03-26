"""
Test Suite for Homepage ARS 1000 Features - Iteration 74
Tests the following features:
1. Backend API: POST /api/ussd/calculate-premium returns score, eligible, ars_level
2. Backend API: POST /api/ussd/carbon-calculator (USSD simulator endpoint)
3. Frontend: Homepage hero badges, features section, how it works section
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUSSDCalculatePremiumAPI:
    """Tests for POST /api/ussd/calculate-premium endpoint"""
    
    def test_calculate_premium_basic(self):
        """Test basic premium calculation with valid data"""
        payload = {
            "hectares": 5,
            "arbres_grands": 20,
            "arbres_moyens": 15,
            "arbres_petits": 10,
            "culture": "cacao",
            "practices": ["agroforesterie", "compost"]
        }
        response = requests.post(f"{BASE_URL}/api/ussd/calculate-premium", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify required fields are present
        assert "score" in data, "Response missing 'score' field"
        assert "eligible" in data, "Response missing 'eligible' field"
        assert "ars_level" in data, "Response missing 'ars_level' field"
        assert "prime_annuelle" in data, "Response missing 'prime_annuelle' field"
        assert "ars_pct" in data, "Response missing 'ars_pct' field"
        assert "ars_conseil" in data, "Response missing 'ars_conseil' field"
        
        # Verify data types
        assert isinstance(data["score"], (int, float)), "Score should be numeric"
        assert isinstance(data["eligible"], bool), "Eligible should be boolean"
        assert isinstance(data["ars_level"], str), "ARS level should be string"
        assert data["ars_level"] in ["Non conforme", "Bronze", "Argent", "Or"], f"Invalid ARS level: {data['ars_level']}"
        
        print(f"✓ Premium calculation returned: score={data['score']}, eligible={data['eligible']}, ars_level={data['ars_level']}")
    
    def test_calculate_premium_high_score(self):
        """Test premium calculation with high-scoring farm (should be eligible)"""
        payload = {
            "hectares": 5,
            "arbres_grands": 100,
            "arbres_moyens": 50,
            "arbres_petits": 30,
            "culture": "cacao",
            "practices": ["agroforesterie", "compost", "zero_pesticides", "couverture_vegetale"]
        }
        response = requests.post(f"{BASE_URL}/api/ussd/calculate-premium", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # High tree count + good practices should result in high score
        assert data["score"] >= 5.0, f"Expected score >= 5.0 for high-scoring farm, got {data['score']}"
        assert data["eligible"] == True, "High-scoring farm should be eligible"
        
        print(f"✓ High-scoring farm: score={data['score']}, eligible={data['eligible']}, ars_level={data['ars_level']}")
    
    def test_calculate_premium_low_score(self):
        """Test premium calculation with low-scoring farm (may not be eligible)"""
        payload = {
            "hectares": 10,
            "arbres_grands": 5,
            "arbres_moyens": 3,
            "arbres_petits": 2,
            "culture": "cacao",
            "practices": []
        }
        response = requests.post(f"{BASE_URL}/api/ussd/calculate-premium", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Low tree count + no practices should result in lower score
        assert "score" in data
        assert "eligible" in data
        assert "ars_level" in data
        
        print(f"✓ Low-scoring farm: score={data['score']}, eligible={data['eligible']}, ars_level={data['ars_level']}")
    
    def test_calculate_premium_different_cultures(self):
        """Test premium calculation with different crop types"""
        cultures = ["cacao", "cafe", "anacarde"]
        
        for culture in cultures:
            payload = {
                "hectares": 5,
                "arbres_grands": 30,
                "arbres_moyens": 20,
                "arbres_petits": 10,
                "culture": culture,
                "practices": ["agroforesterie"]
            }
            response = requests.post(f"{BASE_URL}/api/ussd/calculate-premium", json=payload)
            
            assert response.status_code == 200, f"Failed for culture: {culture}"
            data = response.json()
            assert data["culture"] == culture, f"Culture mismatch: expected {culture}, got {data['culture']}"
            
            print(f"✓ Culture '{culture}': score={data['score']}, rendement={data['rendement_kg_ha']} kg/ha")


class TestUSSDCarbonCalculatorAPI:
    """Tests for POST /api/ussd/carbon-calculator endpoint (USSD simulator)"""
    
    def test_carbon_calculator_start_session(self):
        """Test starting a new USSD carbon calculator session"""
        payload = {
            "sessionId": "test_session_001",
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250700000000",
            "text": ""
        }
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should return first question
        assert "raw_response" in data or "text" in data, "Response should contain text"
        assert "continue_session" in data, "Response should indicate session status"
        
        response_text = data.get("raw_response", data.get("text", ""))
        assert "Question 1" in response_text or "hectares" in response_text.lower(), "Should show first question about hectares"
        
        print(f"✓ USSD session started, first question displayed")
    
    def test_carbon_calculator_answer_question(self):
        """Test answering questions in USSD carbon calculator"""
        # Start session
        session_id = "test_session_002"
        payload = {
            "sessionId": session_id,
            "serviceCode": "*144*99#",
            "phoneNumber": "+2250700000000",
            "text": ""
        }
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json=payload)
        assert response.status_code == 200
        
        # Answer first question (hectares)
        payload["text"] = "5"
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        response_text = data.get("raw_response", data.get("text", ""))
        assert "Question 2" in response_text or "arbres" in response_text.lower(), "Should progress to question 2"
        
        print(f"✓ USSD session progressed to question 2")


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        
        print(f"✓ Health check passed: {data}")


class TestFeaturesAPI:
    """Test features endpoint (used by FeaturesSection)"""
    
    def test_get_features(self):
        """Test GET /api/features endpoint"""
        response = requests.get(f"{BASE_URL}/api/features")
        
        # API may return empty array (which is fine - frontend uses mockFeatures as fallback)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Features should be a list"
        
        print(f"✓ Features API returned {len(data)} features")


class TestStepsAPI:
    """Test steps endpoint (used by HowItWorksSection)"""
    
    def test_get_steps(self):
        """Test GET /api/steps endpoint"""
        response = requests.get(f"{BASE_URL}/api/steps")
        
        # API may return empty array (which is fine - frontend uses mockSteps as fallback)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Steps should be a list"
        
        print(f"✓ Steps API returned {len(data)} steps")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
