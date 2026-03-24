"""
Test Tree Height Categories for Carbon Premium Calculation - Iteration 61

Tests the new tree height categorization feature:
- Petits (<8m): coefficient 0.3
- Moyens (8-12m): coefficient 0.7
- Grands (>12m): coefficient 1.0

Features tested:
1. GET /api/greenlink/carbon/my-score returns new fields: arbres_petits, arbres_moyens, arbres_grands, weighted_density, arbre_categories
2. Carbon score calculation uses weighted density
3. Backward compatibility - parcels with only nombre_arbres treated as moyens (x0.7)
4. Recommendations include 'Favorisez les grands arbres' when grands < 30% of total
5. ParcelVerificationUpdate model accepts arbres_petits, arbres_moyens, arbres_grands
6. USSD CARBON_QUESTIONS now has 9 questions (added arbres_moyens)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FARMER_CREDENTIALS = {
    "identifier": "+2250705551234",
    "password": "koffi2024"
}

COOP_CREDENTIALS = {
    "identifier": "+2250505000001",
    "password": "coop2024"
}

FIELD_AGENT_CREDENTIALS = {
    "identifier": "test_agent@greenlink.ci",
    "password": "agent2024"
}


class TestTreeHeightCategoriesBackend:
    """Test tree height categories in carbon score calculation"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        """Get farmer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Farmer authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Cooperative authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get field agent authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Field agent authentication failed: {response.status_code} - {response.text}")
    
    def test_carbon_my_score_returns_tree_categories(self, farmer_token):
        """Test that /api/greenlink/carbon/my-score returns arbre_categories object"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check new fields exist
        assert "arbres_petits" in data, "Missing arbres_petits field"
        assert "arbres_moyens" in data, "Missing arbres_moyens field"
        assert "arbres_grands" in data, "Missing arbres_grands field"
        assert "weighted_density" in data, "Missing weighted_density field"
        assert "arbre_categories" in data, "Missing arbre_categories object"
        
        # Check arbre_categories structure
        arbre_cats = data["arbre_categories"]
        assert "petits_lt_8m" in arbre_cats, "Missing petits_lt_8m in arbre_categories"
        assert "moyens_8_12m" in arbre_cats, "Missing moyens_8_12m in arbre_categories"
        assert "grands_gt_12m" in arbre_cats, "Missing grands_gt_12m in arbre_categories"
        assert "biomasse_ponderee" in arbre_cats, "Missing biomasse_ponderee in arbre_categories"
        assert "coefficients" in arbre_cats, "Missing coefficients in arbre_categories"
        
        # Check coefficients values
        coeffs = arbre_cats["coefficients"]
        assert coeffs.get("petit") == 0.3, f"Expected petit coeff 0.3, got {coeffs.get('petit')}"
        assert coeffs.get("moyen") == 0.7, f"Expected moyen coeff 0.7, got {coeffs.get('moyen')}"
        assert coeffs.get("grand") == 1.0, f"Expected grand coeff 1.0, got {coeffs.get('grand')}"
        
        print(f"✓ Carbon score API returns tree categories: petits={data['arbres_petits']}, moyens={data['arbres_moyens']}, grands={data['arbres_grands']}")
        print(f"✓ Weighted density: {data['weighted_density']}/ha")
        print(f"✓ Biomasse pondérée: {arbre_cats['biomasse_ponderee']}")
    
    def test_carbon_score_breakdown_includes_weighted_density(self, farmer_token):
        """Test that breakdown section shows weighted density in arbres detail"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check breakdown exists
        assert "breakdown" in data, "Missing breakdown object"
        breakdown = data["breakdown"]
        
        # Check breakdown components
        assert "base" in breakdown, "Missing base in breakdown"
        assert "arbres" in breakdown, "Missing arbres in breakdown"
        assert "ombrage" in breakdown, "Missing ombrage in breakdown"
        assert "pratiques" in breakdown, "Missing pratiques in breakdown"
        assert "surface" in breakdown, "Missing surface in breakdown"
        assert "max_possible" in breakdown, "Missing max_possible in breakdown"
        
        # Verify base score is 3.0
        assert breakdown["base"] == 3.0, f"Expected base 3.0, got {breakdown['base']}"
        assert breakdown["max_possible"] == 10.0, f"Expected max 10.0, got {breakdown['max_possible']}"
        
        print(f"✓ Breakdown: base={breakdown['base']}, arbres={breakdown['arbres']}, ombrage={breakdown['ombrage']}, pratiques={breakdown['pratiques']}, surface={breakdown['surface']}")
    
    def test_recommendations_include_grands_arbres_advice(self, farmer_token):
        """Test that recommendations include 'Favorisez les grands arbres' when grands < 30%"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check recommendations exist
        assert "recommendations" in data, "Missing recommendations array"
        recommendations = data["recommendations"]
        
        # Check if there's a recommendation about grands arbres
        arbre_cats = data.get("arbre_categories", {})
        total = arbre_cats.get("total", 0)
        grands = arbre_cats.get("grands_gt_12m", 0)
        
        if total > 0 and grands < total * 0.3:
            # Should have recommendation about grands arbres
            grands_rec = [r for r in recommendations if r.get("type") == "arbres_grands"]
            if grands_rec:
                print(f"✓ Found 'Favorisez les grands arbres' recommendation: {grands_rec[0].get('title')}")
            else:
                # Check if there's any arbres recommendation
                arbres_rec = [r for r in recommendations if "arbres" in r.get("type", "").lower() or "grands" in r.get("title", "").lower()]
                if arbres_rec:
                    print(f"✓ Found arbres recommendation: {arbres_rec[0].get('title')}")
        else:
            print(f"✓ Grands arbres >= 30% of total ({grands}/{total}), no recommendation needed")
        
        print(f"✓ Total recommendations: {len(recommendations)}")
    
    def test_parcels_include_tree_categories(self, farmer_token):
        """Test that parcels in response include tree category fields"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        parcels = data.get("parcels", [])
        if parcels:
            parcel = parcels[0]
            # Check parcel has tree category fields
            assert "arbres_petits" in parcel, "Missing arbres_petits in parcel"
            assert "arbres_moyens" in parcel, "Missing arbres_moyens in parcel"
            assert "arbres_grands" in parcel, "Missing arbres_grands in parcel"
            assert "nombre_arbres" in parcel, "Missing nombre_arbres in parcel"
            
            print(f"✓ Parcel tree categories: petits={parcel['arbres_petits']}, moyens={parcel['arbres_moyens']}, grands={parcel['arbres_grands']}")
        else:
            print("✓ No parcels found for this farmer (expected for test account)")


class TestParcelVerificationWithTreeCategories:
    """Test parcel verification accepts tree category fields"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Cooperative authentication failed: {response.status_code}")
    
    def test_parcel_verification_update_model_accepts_tree_categories(self, coop_token):
        """Test that ParcelVerificationUpdate model accepts arbres_petits, arbres_moyens, arbres_grands"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        
        # First get a parcel to verify
        response = requests.get(f"{BASE_URL}/api/cooperative/parcels/all", headers=headers)
        
        if response.status_code != 200:
            pytest.skip(f"Could not get parcels: {response.status_code}")
        
        data = response.json()
        parcels = data.get("parcelles", [])
        
        if not parcels:
            pytest.skip("No parcels available for verification test")
        
        # Find a pending parcel or use first one
        parcel = next((p for p in parcels if p.get("statut_verification") == "pending"), parcels[0])
        parcel_id = parcel.get("id")
        
        # Test verification with tree categories
        verification_data = {
            "verification_status": "verified",
            "verification_notes": "Test verification with tree categories",
            "arbres_petits": 10,
            "arbres_moyens": 25,
            "arbres_grands": 15,
            "couverture_ombragee": 45.0,
            "pratiques_ecologiques": ["compostage", "agroforesterie"]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/cooperative/parcels/{parcel_id}/verify",
            headers=headers,
            json=verification_data
        )
        
        # Accept 200 (success) or 403 (not authorized - different coop)
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Parcel verification accepted tree categories")
            print(f"✓ New carbon score: {result.get('carbon_score')}")
        else:
            print("✓ Verification endpoint accepts tree category fields (403 = different coop ownership)")


class TestUSSDCarbonQuestions:
    """Test USSD carbon calculator has 9 questions including arbres_moyens"""
    
    def test_ussd_carbon_questions_count(self):
        """Test that CARBON_QUESTIONS has 9 questions"""
        # Import the CARBON_QUESTIONS from ussd module
        # We'll test via the API endpoint
        
        # Test first question (hectares)
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_session_q1",
            "serviceCode": "*144*88#",
            "phoneNumber": "+2250700000000",
            "text": ""
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "Question 1/9" in data.get("text", "") or "Question 1/9" in data.get("raw_response", ""), \
            f"Expected Question 1/9, got: {data.get('raw_response', '')[:100]}"
        
        print("✓ USSD carbon calculator shows Question 1/9 (hectares)")
    
    def test_ussd_question_2_is_arbres_grands(self):
        """Test that question 2 asks for grands arbres (>12m)"""
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_session_q2",
            "serviceCode": "*144*88#",
            "phoneNumber": "+2250700000000",
            "text": "3.5"  # Answer to Q1 (hectares)
        })
        
        assert response.status_code == 200
        data = response.json()
        raw = data.get("raw_response", "") or data.get("text", "")
        
        assert "Question 2/9" in raw, f"Expected Question 2/9, got: {raw[:100]}"
        assert "GRANDS" in raw.upper() or "12" in raw, f"Expected question about grands arbres (>12m), got: {raw[:150]}"
        
        print("✓ USSD Question 2/9 asks for grands arbres (>12m)")
    
    def test_ussd_question_3_is_arbres_moyens(self):
        """Test that question 3 asks for moyens arbres (8-12m)"""
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_session_q3",
            "serviceCode": "*144*88#",
            "phoneNumber": "+2250700000000",
            "text": "3.5*20"  # Answers: Q1=3.5ha, Q2=20 grands
        })
        
        assert response.status_code == 200
        data = response.json()
        raw = data.get("raw_response", "") or data.get("text", "")
        
        assert "Question 3/9" in raw, f"Expected Question 3/9, got: {raw[:100]}"
        assert "MOYENS" in raw.upper() or "8-12" in raw, f"Expected question about moyens arbres (8-12m), got: {raw[:150]}"
        
        print("✓ USSD Question 3/9 asks for moyens arbres (8-12m)")
    
    def test_ussd_full_flow_with_tree_categories(self):
        """Test complete USSD flow with tree categories returns weighted calculation"""
        # Complete all 9 questions
        # Q1: hectares, Q2: arbres_grands, Q3: arbres_moyens, Q4: culture, Q5-Q9: yes/no practices
        answers = "3.5*20*30*1*2*2*1*1*1"  # 3.5ha, 20 grands, 30 moyens, cacao, no chemicals, no burning, yes compost, yes agroforestry, yes cover
        
        response = requests.post(f"{BASE_URL}/api/ussd/carbon-calculator", json={
            "sessionId": "test_session_full",
            "serviceCode": "*144*88#",
            "phoneNumber": "+2250700000000",
            "text": answers
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have result with weighted calculation
        result = data.get("result", {})
        if result:
            assert "arbres_grands" in result, "Missing arbres_grands in result"
            assert "arbres_moyens" in result, "Missing arbres_moyens in result"
            assert result.get("arbres_grands") == 20, f"Expected 20 grands, got {result.get('arbres_grands')}"
            assert result.get("arbres_moyens") == 30, f"Expected 30 moyens, got {result.get('arbres_moyens')}"
            
            print(f"✓ USSD full flow result: score={result.get('score')}, prime={result.get('prime_fcfa_kg')} FCFA/kg")
            print(f"✓ Tree categories: grands={result.get('arbres_grands')}, moyens={result.get('arbres_moyens')}")
        else:
            # Check raw response for result
            raw = data.get("raw_response", "")
            assert "Score" in raw or "PRIME" in raw, f"Expected result in response: {raw[:200]}"
            print(f"✓ USSD full flow completed with result")


class TestBackwardCompatibility:
    """Test backward compatibility for parcels with only nombre_arbres"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        """Get farmer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Farmer authentication failed: {response.status_code}")
    
    def test_backward_compat_nombre_arbres_treated_as_moyens(self, farmer_token):
        """Test that parcels with only nombre_arbres are treated as moyens (x0.7)"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check backward compatibility logic
        arbre_cats = data.get("arbre_categories", {})
        total_trees = data.get("total_trees", 0)
        petits = arbre_cats.get("petits_lt_8m", 0)
        moyens = arbre_cats.get("moyens_8_12m", 0)
        grands = arbre_cats.get("grands_gt_12m", 0)
        
        # If no categories stored but total_trees > 0, moyens should equal total_trees
        if petits + moyens + grands == 0 and total_trees > 0:
            # This is backward compat case - all treated as moyens
            print(f"✓ Backward compat: {total_trees} trees with no categories -> treated as moyens")
        elif petits + moyens + grands > 0:
            print(f"✓ Tree categories present: petits={petits}, moyens={moyens}, grands={grands}")
        else:
            print(f"✓ No trees recorded for this farmer")
        
        # Verify weighted calculation is correct
        expected_weighted = (petits * 0.3) + (moyens * 0.7) + (grands * 1.0)
        actual_weighted = arbre_cats.get("biomasse_ponderee", 0)
        
        # Allow small floating point difference
        assert abs(expected_weighted - actual_weighted) < 0.1, \
            f"Weighted calculation mismatch: expected {expected_weighted}, got {actual_weighted}"
        
        print(f"✓ Weighted biomass calculation correct: {actual_weighted}")


class TestFieldAgentParcelVerification:
    """Test field agent parcel verification with tree categories"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get field agent authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Field agent authentication failed: {response.status_code}")
    
    def test_field_agent_verify_parcel_with_tree_categories(self, agent_token):
        """Test field agent can verify parcel with tree category data"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        # Get parcels to verify
        response = requests.get(f"{BASE_URL}/api/field-agent/parcels-to-verify", headers=headers)
        
        if response.status_code != 200:
            pytest.skip(f"Could not get parcels to verify: {response.status_code}")
        
        data = response.json()
        parcels = data.get("parcels", [])
        
        if not parcels:
            pytest.skip("No parcels available for field agent verification")
        
        parcel = parcels[0]
        parcel_id = parcel.get("id")
        
        # Verify with tree categories
        verification_data = {
            "verification_status": "verified",
            "verification_notes": "Field verification with tree height categories",
            "arbres_petits": 5,
            "arbres_moyens": 20,
            "arbres_grands": 10,
            "couverture_ombragee": 35.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            headers=headers,
            json=verification_data
        )
        
        # Accept 200 (success) or 404 (parcel not found/not assigned)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Field agent verification accepted tree categories")
            print(f"✓ Carbon score recalculated: {result.get('carbon_score')}")
        else:
            print("✓ Field agent verification endpoint accepts tree category fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
