"""
Iteration 57 - Carbon Premium Verification Tests
Tests for PUT /api/field-agent/parcels/{parcel_id}/verify with carbon premium fields:
- nombre_arbres (tree count)
- couverture_ombragee (shade cover %)
- pratiques_ecologiques (ecological practices checklist)

Also tests GET /api/greenlink/parcels/my-parcels returns these fields.

Carbon score calculation formula:
- Base: 3.0
- Tree density bonus (0-2 pts): >=100 arbres/ha -> +2, >=50 -> +1.5, >=20 -> +1, >=5 -> +0.5
- Shade cover bonus (0-2 pts): >=60% -> +2, >=40% -> +1.5, >=20% -> +1, >=10% -> +0.5
- Practices bonus (0-2.5 pts): 0.5 each for compostage, absence_pesticides, gestion_dechets, protection_cours_eau, agroforesterie
- Area bonus (0-0.5 pts): >=5ha -> +0.5
- Max: 10.0
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
FIELD_AGENT_CREDENTIALS = {
    "identifier": "test_agent@greenlink.ci",
    "password": "agent2024"
}

# Test parcel IDs from review request
TEST_PARCEL_IDS = [
    "69a22f4b8f9312b75348af4e",
    "69a22f4c8f9312b75348af4f"
]


class TestAuthentication:
    """Test authentication for field agent"""
    
    def test_field_agent_login(self):
        """Test field agent can login and get access token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=FIELD_AGENT_CREDENTIALS
        )
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.json()}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]


class TestCarbonPremiumVerification:
    """Test PUT /api/field-agent/parcels/{parcel_id}/verify with carbon premium fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=FIELD_AGENT_CREDENTIALS
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Authentication failed: {response.text}")
    
    def test_verify_parcel_with_all_carbon_fields(self):
        """Test verification with nombre_arbres, couverture_ombragee, pratiques_ecologiques"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_carbon_premium_full_verification",
            "nombre_arbres": 150,  # High tree count
            "couverture_ombragee": 65,  # High shade cover
            "pratiques_ecologiques": [
                "compostage",
                "absence_pesticides",
                "gestion_dechets",
                "protection_cours_eau",
                "agroforesterie"
            ],
            "corrected_area_hectares": 2.0  # 2 hectares
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        print(f"Verify response status: {response.status_code}")
        print(f"Verify response: {response.json()}")
        
        assert response.status_code == 200, f"Verification failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "carbon_score" in data, "carbon_score not in response"
        assert "verification_status" in data, "verification_status not in response"
        assert data["verification_status"] == "verified"
        
        # Calculate expected score:
        # Base: 3.0
        # Tree density: 150/2 = 75 arbres/ha -> +1.5 (>=50)
        # Shade cover: 65% -> +2.0 (>=60)
        # Practices: 5 x 0.5 = +2.5
        # Area: 2ha < 5ha -> +0
        # Total: 3.0 + 1.5 + 2.0 + 2.5 = 9.0
        expected_score = 9.0
        assert data["carbon_score"] == expected_score, f"Expected score {expected_score}, got {data['carbon_score']}"
        
        print(f"Carbon score calculated correctly: {data['carbon_score']}")
    
    def test_verify_parcel_with_partial_carbon_fields(self):
        """Test verification with only some carbon fields"""
        parcel_id = TEST_PARCEL_IDS[1]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_carbon_premium_partial_verification",
            "nombre_arbres": 30,  # 30 trees
            "couverture_ombragee": 25,  # 25% shade
            "pratiques_ecologiques": ["compostage", "agroforesterie"],  # 2 practices
            "corrected_area_hectares": 1.5  # 1.5 hectares
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        print(f"Partial verify response status: {response.status_code}")
        print(f"Partial verify response: {response.json()}")
        
        assert response.status_code == 200, f"Verification failed: {response.text}"
        data = response.json()
        
        # Calculate expected score:
        # Base: 3.0
        # Tree density: 30/1.5 = 20 arbres/ha -> +1.0 (>=20)
        # Shade cover: 25% -> +1.0 (>=20)
        # Practices: 2 x 0.5 = +1.0
        # Area: 1.5ha < 5ha -> +0
        # Total: 3.0 + 1.0 + 1.0 + 1.0 = 6.0
        expected_score = 6.0
        assert data["carbon_score"] == expected_score, f"Expected score {expected_score}, got {data['carbon_score']}"
        
        print(f"Partial carbon score calculated correctly: {data['carbon_score']}")
    
    def test_verify_parcel_backward_compatibility(self):
        """Test verification without carbon fields still works (backward compatibility)"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_backward_compatibility_no_carbon_fields"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        print(f"Backward compat response status: {response.status_code}")
        print(f"Backward compat response: {response.json()}")
        
        assert response.status_code == 200, f"Verification failed: {response.text}"
        data = response.json()
        
        # Should still return carbon_score (base score 3.0)
        assert "carbon_score" in data, "carbon_score not in response"
        assert data["carbon_score"] >= 3.0, f"Base score should be at least 3.0, got {data['carbon_score']}"
        
        print(f"Backward compatibility works, score: {data['carbon_score']}")
    
    def test_verify_parcel_max_score_capped_at_10(self):
        """Test that carbon score is capped at 10.0"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_max_score_cap",
            "nombre_arbres": 1000,  # Very high tree count
            "couverture_ombragee": 100,  # 100% shade
            "pratiques_ecologiques": [
                "compostage",
                "absence_pesticides",
                "gestion_dechets",
                "protection_cours_eau",
                "agroforesterie"
            ],
            "corrected_area_hectares": 10.0  # Large area
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        print(f"Max score response status: {response.status_code}")
        print(f"Max score response: {response.json()}")
        
        assert response.status_code == 200, f"Verification failed: {response.text}"
        data = response.json()
        
        # Score should be capped at 10.0
        # Base: 3.0 + Tree: 2.0 + Shade: 2.0 + Practices: 2.5 + Area: 0.5 = 10.0
        assert data["carbon_score"] == 10.0, f"Score should be capped at 10.0, got {data['carbon_score']}"
        
        print(f"Max score correctly capped at: {data['carbon_score']}")
    
    def test_verify_parcel_tree_density_thresholds(self):
        """Test tree density bonus thresholds"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        # Test density >= 100 arbres/ha -> +2.0
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_tree_density_100",
            "nombre_arbres": 200,  # 200 trees on 2 ha = 100 arbres/ha
            "corrected_area_hectares": 2.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Base 3.0 + Tree density 2.0 = 5.0
        assert data["carbon_score"] == 5.0, f"Expected 5.0 for density>=100, got {data['carbon_score']}"
        print(f"Tree density >=100: score {data['carbon_score']} (expected 5.0)")
    
    def test_verify_parcel_shade_cover_thresholds(self):
        """Test shade cover bonus thresholds"""
        parcel_id = TEST_PARCEL_IDS[1]
        
        # Test shade >= 40% -> +1.5
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_shade_cover_40",
            "couverture_ombragee": 45,  # 45% shade
            "corrected_area_hectares": 1.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Base 3.0 + Shade 1.5 = 4.5
        assert data["carbon_score"] == 4.5, f"Expected 4.5 for shade>=40%, got {data['carbon_score']}"
        print(f"Shade cover >=40%: score {data['carbon_score']} (expected 4.5)")
    
    def test_verify_parcel_area_bonus(self):
        """Test area bonus for parcels >= 5 hectares"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_area_bonus",
            "corrected_area_hectares": 6.0  # 6 hectares >= 5
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Base 3.0 + Area 0.5 = 3.5
        assert data["carbon_score"] == 3.5, f"Expected 3.5 for area>=5ha, got {data['carbon_score']}"
        print(f"Area bonus >=5ha: score {data['carbon_score']} (expected 3.5)")


class TestMyParcelsReturnsCarbonFields:
    """Test GET /api/greenlink/parcels/my-parcels returns carbon premium fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=FIELD_AGENT_CREDENTIALS
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Authentication failed: {response.text}")
    
    def test_my_parcels_returns_carbon_fields(self):
        """Test that my-parcels endpoint returns nombre_arbres, couverture_ombragee, pratiques_ecologiques"""
        response = requests.get(
            f"{BASE_URL}/api/greenlink/parcels/my-parcels",
            headers=self.headers
        )
        
        print(f"My parcels response status: {response.status_code}")
        
        assert response.status_code == 200, f"My parcels failed: {response.text}"
        parcels = response.json()
        
        print(f"Number of parcels: {len(parcels)}")
        
        if len(parcels) > 0:
            parcel = parcels[0]
            print(f"First parcel fields: {list(parcel.keys())}")
            
            # Check that carbon premium fields are present in response
            assert "nombre_arbres" in parcel, "nombre_arbres field missing from my-parcels response"
            assert "couverture_ombragee" in parcel, "couverture_ombragee field missing from my-parcels response"
            assert "pratiques_ecologiques" in parcel, "pratiques_ecologiques field missing from my-parcels response"
            
            print(f"Carbon fields present: nombre_arbres={parcel['nombre_arbres']}, couverture_ombragee={parcel['couverture_ombragee']}, pratiques_ecologiques={parcel['pratiques_ecologiques']}")
        else:
            print("No parcels found for this user - skipping field check")


class TestCarbonScoreCalculationEdgeCases:
    """Test edge cases in carbon score calculation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=FIELD_AGENT_CREDENTIALS
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Authentication failed: {response.text}")
    
    def test_zero_trees_no_bonus(self):
        """Test that 0 trees gives no tree density bonus"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_zero_trees",
            "nombre_arbres": 0,
            "corrected_area_hectares": 2.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Base 3.0 only (no tree bonus for 0 trees)
        assert data["carbon_score"] == 3.0, f"Expected 3.0 for 0 trees, got {data['carbon_score']}"
        print(f"Zero trees: score {data['carbon_score']} (expected 3.0)")
    
    def test_zero_shade_no_bonus(self):
        """Test that 0% shade gives no shade bonus"""
        parcel_id = TEST_PARCEL_IDS[1]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_zero_shade",
            "couverture_ombragee": 0,
            "corrected_area_hectares": 2.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Base 3.0 only (no shade bonus for 0%)
        assert data["carbon_score"] == 3.0, f"Expected 3.0 for 0% shade, got {data['carbon_score']}"
        print(f"Zero shade: score {data['carbon_score']} (expected 3.0)")
    
    def test_empty_practices_no_bonus(self):
        """Test that empty practices list gives no practices bonus"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_empty_practices",
            "pratiques_ecologiques": [],
            "corrected_area_hectares": 2.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Base 3.0 only
        assert data["carbon_score"] == 3.0, f"Expected 3.0 for empty practices, got {data['carbon_score']}"
        print(f"Empty practices: score {data['carbon_score']} (expected 3.0)")
    
    def test_invalid_practice_ignored(self):
        """Test that invalid practice names are ignored (no bonus)"""
        parcel_id = TEST_PARCEL_IDS[1]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_invalid_practice",
            "pratiques_ecologiques": ["invalid_practice", "another_invalid"],
            "corrected_area_hectares": 2.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Base 3.0 only (invalid practices give 0 bonus)
        assert data["carbon_score"] == 3.0, f"Expected 3.0 for invalid practices, got {data['carbon_score']}"
        print(f"Invalid practices: score {data['carbon_score']} (expected 3.0)")


class TestVerificationStatusValidation:
    """Test verification status validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=FIELD_AGENT_CREDENTIALS
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Authentication failed: {response.text}")
    
    def test_invalid_verification_status_rejected(self):
        """Test that invalid verification status returns 400"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "invalid_status",
            "verification_notes": "TEST_invalid_status"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        print(f"Invalid status response: {response.status_code}")
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print("Invalid verification status correctly rejected with 400")
    
    def test_valid_status_needs_correction(self):
        """Test that needs_correction status is accepted"""
        parcel_id = TEST_PARCEL_IDS[1]
        
        payload = {
            "verification_status": "needs_correction",
            "verification_notes": "TEST_needs_correction_status"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["verification_status"] == "needs_correction"
        print(f"needs_correction status accepted: {data['verification_status']}")
    
    def test_valid_status_rejected(self):
        """Test that rejected status is accepted"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "rejected",
            "verification_notes": "TEST_rejected_status"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["verification_status"] == "rejected"
        print(f"rejected status accepted: {data['verification_status']}")


class TestUnauthorizedAccess:
    """Test unauthorized access to verification endpoint"""
    
    def test_verify_without_token_returns_401_or_403(self):
        """Test that verification without token returns 401 or 403"""
        parcel_id = TEST_PARCEL_IDS[0]
        
        payload = {
            "verification_status": "verified",
            "verification_notes": "TEST_no_auth"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            json=payload
        )
        
        print(f"No auth response: {response.status_code}")
        assert response.status_code in [401, 403], f"Expected 401/403 without token, got {response.status_code}"
        print(f"Unauthorized access correctly rejected with {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
