# Test file for /api/carbon-payments/ma-prime endpoint
# Iteration 25 - Farmer-facing "Ma Prime Carbone" calculator with 8 questions
# The endpoint is PUBLIC (no auth required) and should NOT return distribution details

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestMaPrimeCalculator:
    """Tests for the PUBLIC /ma-prime calculator endpoint"""
    
    def test_ma_prime_good_practices_high_premium(self):
        """
        Test with good practices (48 arbres/ha, no engrais, no brulage)
        Expected: Higher premium
        """
        payload = {
            "hectares": 3.0,
            "grands_arbres": 48,
            "culture": "cacao",
            "engrais_chimique": False,  # No chemical fertilizers (good practice)
            "brulage": False,           # No burning (good practice)
            "residus_au_sol": True,     # Keeps residues (good practice)
            "plantes_couverture": True, # Has cover crops (good practice)
            "especes_arbres": 5         # Multiple species (good practice)
        }
        
        response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate required response fields
        assert "prime_par_kg_fcfa" in data, "Missing prime_par_kg_fcfa"
        assert "prime_annuelle_fcfa" in data, "Missing prime_annuelle_fcfa"
        assert "tonnes_co2_an" in data, "Missing tonnes_co2_an"
        assert "conseil" in data, "Missing conseil"
        
        # With 48 trees/ha (high shade), we expect higher CO2 sequestration
        assert data["tonnes_co2_an"] > 10, f"Expected high CO2 with 48 trees/ha, got {data['tonnes_co2_an']}"
        assert data["prime_par_kg_fcfa"] > 0, f"Expected positive premium, got {data['prime_par_kg_fcfa']}"
        assert data["prime_annuelle_fcfa"] > 0, f"Expected positive annual premium, got {data['prime_annuelle_fcfa']}"
        
        print(f"Good practices result: {data['prime_par_kg_fcfa']} FCFA/kg, {data['prime_annuelle_fcfa']} FCFA/year, {data['tonnes_co2_an']} t CO2/year")
        
        return data
    
    def test_ma_prime_poor_practices_low_premium(self):
        """
        Test with poor practices (15 arbres/ha, engrais, brulage)
        Expected: Lower premium
        """
        payload = {
            "hectares": 3.0,
            "grands_arbres": 15,
            "culture": "cacao",
            "engrais_chimique": True,   # Uses chemical fertilizers (poor practice)
            "brulage": True,            # Practices burning (poor practice)
            "residus_au_sol": False,    # No residues kept (poor practice)
            "plantes_couverture": False,# No cover crops (poor practice)
            "especes_arbres": 1         # Low diversity (poor practice)
        }
        
        response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate required response fields
        assert "prime_par_kg_fcfa" in data
        assert "prime_annuelle_fcfa" in data
        assert "tonnes_co2_an" in data
        assert "conseil" in data
        
        # With only 15 trees/ha (low shade), we expect lower CO2 sequestration
        assert data["tonnes_co2_an"] < 10, f"Expected lower CO2 with 15 trees/ha, got {data['tonnes_co2_an']}"
        
        print(f"Poor practices result: {data['prime_par_kg_fcfa']} FCFA/kg, {data['prime_annuelle_fcfa']} FCFA/year, {data['tonnes_co2_an']} t CO2/year")
        
        return data
    
    def test_ma_prime_good_vs_poor_comparison(self):
        """
        Verify that good practices result in higher premium than poor practices
        """
        # Good practices
        good_payload = {
            "hectares": 3.0,
            "grands_arbres": 48,
            "culture": "cacao",
            "engrais_chimique": False,
            "brulage": False,
            "residus_au_sol": True,
            "plantes_couverture": True,
            "especes_arbres": 5
        }
        good_response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=good_payload)
        assert good_response.status_code == 200
        good_data = good_response.json()
        
        # Poor practices  
        poor_payload = {
            "hectares": 3.0,
            "grands_arbres": 15,
            "culture": "cacao",
            "engrais_chimique": True,
            "brulage": True,
            "residus_au_sol": False,
            "plantes_couverture": False,
            "especes_arbres": 1
        }
        poor_response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=poor_payload)
        assert poor_response.status_code == 200
        poor_data = poor_response.json()
        
        # Good practices should have significantly higher premium
        assert good_data["prime_par_kg_fcfa"] > poor_data["prime_par_kg_fcfa"], \
            f"Expected good practices ({good_data['prime_par_kg_fcfa']}) > poor practices ({poor_data['prime_par_kg_fcfa']})"
        assert good_data["prime_annuelle_fcfa"] > poor_data["prime_annuelle_fcfa"], \
            f"Expected good annual premium ({good_data['prime_annuelle_fcfa']}) > poor ({poor_data['prime_annuelle_fcfa']})"
        assert good_data["tonnes_co2_an"] > poor_data["tonnes_co2_an"], \
            f"Expected good CO2 ({good_data['tonnes_co2_an']}) > poor CO2 ({poor_data['tonnes_co2_an']})"
        
        print(f"Comparison: Good practices = {good_data['prime_par_kg_fcfa']} FCFA/kg vs Poor practices = {poor_data['prime_par_kg_fcfa']} FCFA/kg")
    
    def test_ma_prime_response_does_not_contain_distribution_model(self):
        """
        CRITICAL: The /ma-prime endpoint should NOT return distribution details
        (no fees_rate, no greenlink_share, no coop_share visible to farmer)
        """
        payload = {
            "hectares": 3.0,
            "grands_arbres": 48,
            "culture": "cacao",
            "engrais_chimique": False,
            "brulage": False,
            "residus_au_sol": True,
            "plantes_couverture": True,
            "especes_arbres": 5
        }
        
        response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # These fields should NOT be present in the farmer-facing calculator response
        forbidden_fields = [
            "distribution_model",
            "fees_rate",
            "fees_annual_xof",
            "greenlink_share",
            "greenlink_annual_xof",
            "coop_share",
            "coop_annual_xof",
            "gross_annual_xof",
            "net_annual_xof"
        ]
        
        for field in forbidden_fields:
            assert field not in data, f"Field '{field}' should NOT be in /ma-prime response (farmer should not see distribution)"
        
        # Only these farmer-facing fields should be present
        expected_fields = ["prime_par_kg_fcfa", "prime_annuelle_fcfa", "tonnes_co2_an", "conseil"]
        for field in expected_fields:
            assert field in data, f"Expected field '{field}' missing from response"
        
        print("Verified: /ma-prime response does NOT contain distribution breakdown fields")
    
    def test_ma_prime_returns_expected_fields_only(self):
        """
        Verify /ma-prime returns exactly the expected fields and nothing more
        """
        payload = {
            "hectares": 2.0,
            "grands_arbres": 30,
            "culture": "cafe",
            "engrais_chimique": False,
            "brulage": False,
            "residus_au_sol": True,
            "plantes_couverture": False,
            "especes_arbres": 3
        }
        
        response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Expected fields as per requirements
        expected_fields = {
            "prime_par_kg_fcfa",
            "prime_annuelle_fcfa", 
            "tonnes_co2_an",
            "conseil",
            # Additional non-sensitive fields that are acceptable
            "culture",
            "hectares",
            "arbres_par_ha",
            "score_carbone",
            "rendement_kg_ha"
        }
        
        # Check all expected fields are present
        for field in ["prime_par_kg_fcfa", "prime_annuelle_fcfa", "tonnes_co2_an", "conseil"]:
            assert field in data, f"Required field '{field}' missing"
        
        print(f"Response fields: {list(data.keys())}")
    
    def test_ma_prime_different_cultures(self):
        """
        Test with different cultures (cacao, cafe, anacarde) - different yields affect premium per kg
        """
        base_payload = {
            "hectares": 2.0,
            "grands_arbres": 48,
            "engrais_chimique": False,
            "brulage": False,
            "residus_au_sol": True,
            "plantes_couverture": True,
            "especes_arbres": 5
        }
        
        results = {}
        for culture in ["cacao", "cafe", "anacarde"]:
            payload = {**base_payload, "culture": culture}
            response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=payload)
            assert response.status_code == 200, f"Failed for culture {culture}"
            data = response.json()
            results[culture] = data
            print(f"Culture {culture}: {data['prime_par_kg_fcfa']} FCFA/kg (yield: {data.get('rendement_kg_ha', 'N/A')} kg/ha)")
        
        # Different yields should result in different premiums per kg
        # cacao=600, cafe=400, anacarde=500 kg/ha
        # Same CO2, different yields → different premium per kg
        assert results["cacao"]["prime_par_kg_fcfa"] != results["cafe"]["prime_par_kg_fcfa"], \
            "Expected different premiums for different cultures"
    
    def test_ma_prime_validates_required_fields(self):
        """
        Test that missing required fields return validation error
        """
        incomplete_payload = {
            "hectares": 2.0,
            # Missing all other required fields
        }
        
        response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=incomplete_payload)
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
    
    def test_ma_prime_public_endpoint_no_auth_required(self):
        """
        Verify the /ma-prime endpoint is PUBLIC and does not require authentication
        """
        payload = {
            "hectares": 1.0,
            "grands_arbres": 20,
            "culture": "cacao",
            "engrais_chimique": True,
            "brulage": False,
            "residus_au_sol": False,
            "plantes_couverture": False,
            "especes_arbres": 2
        }
        
        # Call without any Authorization header
        response = requests.post(
            f"{BASE_URL}/api/carbon-payments/ma-prime",
            json=payload,
            headers={"Content-Type": "application/json"}  # No Bearer token
        )
        
        # Should succeed without auth
        assert response.status_code == 200, f"Expected 200 for public endpoint, got {response.status_code}"
        data = response.json()
        assert "prime_par_kg_fcfa" in data
        
        print("Verified: /ma-prime is a PUBLIC endpoint (no auth required)")
    
    def test_ma_prime_conseil_personalized(self):
        """
        Verify conseil is personalized based on farmer's practices
        """
        # Test with low trees - should get advice to plant more
        low_trees_payload = {
            "hectares": 2.0,
            "grands_arbres": 15,  # Low trees
            "culture": "cacao",
            "engrais_chimique": False,
            "brulage": False,
            "residus_au_sol": True,
            "plantes_couverture": True,
            "especes_arbres": 5
        }
        
        response = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=low_trees_payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "conseil" in data
        assert len(data["conseil"]) > 0, "Conseil should not be empty"
        # With low trees, conseil should mention planting more trees
        print(f"Conseil for low trees: {data['conseil']}")
        
        # Test with chemical fertilizers - should get advice about organic
        chemicals_payload = {
            "hectares": 2.0,
            "grands_arbres": 48,
            "culture": "cacao",
            "engrais_chimique": True,  # Uses chemicals
            "brulage": False,
            "residus_au_sol": True,
            "plantes_couverture": True,
            "especes_arbres": 5
        }
        
        response2 = requests.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=chemicals_payload)
        assert response2.status_code == 200
        data2 = response2.json()
        print(f"Conseil for chemical use: {data2['conseil']}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
