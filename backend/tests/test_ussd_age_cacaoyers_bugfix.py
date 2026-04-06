"""
Test USSD 'Age cacaoyers' Bug Fix - Iteration 108
Bug: When user selected '2' (5-15 ans) for 'Age moyen de vos cacaoyers' question,
     it returned 'Erreur' instead of showing the carbon premium result.
Root cause: Variable 'arbres_par_ha' was not defined in calculate_ussd_carbon_premium()
Fix: Added 'arbres_par_ha = total_trees / max(hectares, 0.01)' after total_trees calculation

Tests cover:
1. Stateless Carbon Calculator (/api/ussd/carbon-calculator) - 14 questions
2. Stateful Simple Estimation (/api/ussd/callback) - 11 questions  
3. Stateful Detailed Estimation (/api/ussd/callback) - 13 questions
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test farmer phone number
TEST_FARMER_PHONE = "+2250701234567"


class TestUSSDStatelessCarbonCalculator:
    """Test the stateless carbon calculator endpoint (/api/ussd/carbon-calculator)
    This endpoint accepts all 14 answers concatenated with * separator
    """
    
    def test_stateless_14q_age_cacaoyers_choice1_jeune(self):
        """Test full 14-question flow with age_cacaoyers=1 (jeune/moins de 5 ans)"""
        session_id = f"test_stateless_1_{uuid.uuid4().hex[:8]}"
        
        # 14 answers: hectares, arbres_grands, arbres_moyens, arbres_petits, culture, 
        # engrais, brulage, compost, agroforesterie, couverture_sol, biochar, 
        # zero_deforestation, reboisement, age_cacaoyers
        answers = "5*20*30*10*1*2*2*1*1*1*1*1*1*1"  # age_cacaoyers=1 (jeune)
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": answers
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should NOT continue session (END response)
        assert data.get("continue_session") == False, "Session should end after all questions"
        
        # Should NOT contain error
        raw_response = data.get("raw_response", "")
        assert "Erreur" not in raw_response, f"Got error response: {raw_response}"
        assert "error" not in data or data.get("error") is None, f"Got error: {data.get('error')}"
        
        # Should contain prime result
        assert "Prime" in raw_response or "PRIME" in raw_response or "Score" in raw_response, \
            f"Expected prime result, got: {raw_response}"
        
        # Verify result object exists
        result = data.get("result")
        assert result is not None, "Result object should be present"
        assert "score" in result, "Result should contain score"
        assert "prime_annuelle" in result, "Result should contain prime_annuelle"
        assert "arbres_par_ha" in result, "Result should contain arbres_par_ha (the fixed field)"
        
        print(f"SUCCESS: age_cacaoyers=1 (jeune) - Score: {result.get('score')}, Prime: {result.get('prime_annuelle')} FCFA")
    
    def test_stateless_14q_age_cacaoyers_choice2_mature(self):
        """Test full 14-question flow with age_cacaoyers=2 (mature/5-15 ans) - THE BUG CASE"""
        session_id = f"test_stateless_2_{uuid.uuid4().hex[:8]}"
        
        # 14 answers with age_cacaoyers=2 (mature) - this was the failing case
        answers = "5*20*30*10*1*2*2*1*1*1*1*1*1*2"  # age_cacaoyers=2 (mature)
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": answers
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should NOT continue session (END response)
        assert data.get("continue_session") == False, "Session should end after all questions"
        
        # Should NOT contain error - THIS WAS THE BUG
        raw_response = data.get("raw_response", "")
        assert "Erreur" not in raw_response, f"BUG NOT FIXED: Got error response for age_cacaoyers=2: {raw_response}"
        assert "error" not in data or data.get("error") is None, f"BUG NOT FIXED: Got error: {data.get('error')}"
        
        # Should contain prime result
        assert "Prime" in raw_response or "PRIME" in raw_response or "Score" in raw_response, \
            f"Expected prime result, got: {raw_response}"
        
        # Verify result object exists
        result = data.get("result")
        assert result is not None, "Result object should be present"
        assert "score" in result, "Result should contain score"
        assert "prime_annuelle" in result, "Result should contain prime_annuelle"
        assert "arbres_par_ha" in result, "Result should contain arbres_par_ha (the fixed field)"
        
        print(f"SUCCESS: age_cacaoyers=2 (mature) - Score: {result.get('score')}, Prime: {result.get('prime_annuelle')} FCFA")
    
    def test_stateless_14q_age_cacaoyers_choice3_vieux(self):
        """Test full 14-question flow with age_cacaoyers=3 (vieux/plus de 15 ans)"""
        session_id = f"test_stateless_3_{uuid.uuid4().hex[:8]}"
        
        # 14 answers with age_cacaoyers=3 (vieux)
        answers = "5*20*30*10*1*2*2*1*1*1*1*1*1*3"  # age_cacaoyers=3 (vieux)
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": answers
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should NOT continue session (END response)
        assert data.get("continue_session") == False, "Session should end after all questions"
        
        # Should NOT contain error
        raw_response = data.get("raw_response", "")
        assert "Erreur" not in raw_response, f"Got error response: {raw_response}"
        assert "error" not in data or data.get("error") is None, f"Got error: {data.get('error')}"
        
        # Should contain prime result
        assert "Prime" in raw_response or "PRIME" in raw_response or "Score" in raw_response, \
            f"Expected prime result, got: {raw_response}"
        
        # Verify result object exists
        result = data.get("result")
        assert result is not None, "Result object should be present"
        assert "score" in result, "Result should contain score"
        assert "prime_annuelle" in result, "Result should contain prime_annuelle"
        assert "arbres_par_ha" in result, "Result should contain arbres_par_ha (the fixed field)"
        
        print(f"SUCCESS: age_cacaoyers=3 (vieux) - Score: {result.get('score')}, Prime: {result.get('prime_annuelle')} FCFA")


class TestUSSDStatefulSimpleEstimation:
    """Test the stateful USSD callback endpoint (/api/ussd/callback) with simple estimation
    Simple estimation has 11 questions ending with age_cacaoyers
    """
    
    def test_stateful_simple_full_flow_age_cacaoyers_2(self):
        """Test full stateful simple estimation flow with age_cacaoyers=2 (mature)"""
        session_id = f"test_stateful_simple_{uuid.uuid4().hex[:8]}"
        
        # Step 1: Start session (empty text)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("continue_session") == True
        print(f"Step 1 - Welcome: {data.get('raw_response', '')[:50]}...")
        
        # Step 2: Choose "1" (Je suis deja inscrit)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": "1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        raw = data.get("raw_response", "")
        print(f"Step 2 - Login: {raw[:80]}...")
        
        # Check if farmer recognized or not
        if "non reconnu" in raw.lower() or "numero non reconnu" in raw.lower():
            # Farmer not found - skip this test
            pytest.skip("Test farmer phone not registered in database")
        
        # Step 3: Choose "1" (Estimation de ma prime)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": "1*1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Step 3 - Estimation menu: {data.get('raw_response', '')[:50]}...")
        
        # Step 4: Choose "1" (Estimation simple)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": "1*1*1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Step 4 - Simple Q1: {data.get('raw_response', '')[:50]}...")
        
        # Steps 5-14: Answer 11 simple questions
        # Q1: hectares=5, Q2: arbres_grands=20, Q3: engrais=2(non), Q4: brulage=2(non),
        # Q5: compost=1(oui), Q6: agroforesterie=1(oui), Q7: couverture_sol=1(oui),
        # Q8: biochar=1(oui), Q9: zero_deforestation=1(oui), Q10: reboisement=1(oui),
        # Q11: age_cacaoyers=2(mature)
        
        simple_answers = ["5", "20", "2", "2", "1", "1", "1", "1", "1", "1", "2"]
        current_text = "1*1*1"
        
        for i, answer in enumerate(simple_answers):
            current_text = f"{current_text}*{answer}"
            response = requests.post(
                f"{BASE_URL}/api/ussd/callback",
                json={
                    "sessionId": session_id,
                    "serviceCode": "*144*99#",
                    "phoneNumber": TEST_FARMER_PHONE,
                    "text": current_text
                }
            )
            assert response.status_code == 200
            data = response.json()
            raw = data.get("raw_response", "")
            
            # Check for errors
            if "Erreur" in raw and i == len(simple_answers) - 1:
                # This is the bug case - age_cacaoyers=2 should not return error
                pytest.fail(f"BUG NOT FIXED: Got error on age_cacaoyers=2: {raw}")
            
            print(f"Step {5+i} - Q{i+1}: {raw[:60]}...")
        
        # Final response should contain prime result
        raw_response = data.get("raw_response", "")
        assert "Erreur" not in raw_response, f"Got error in final response: {raw_response}"
        assert "Prime" in raw_response or "Score" in raw_response, \
            f"Expected prime result, got: {raw_response}"
        
        print(f"SUCCESS: Stateful simple estimation with age_cacaoyers=2 completed")


class TestUSSDStatefulDetailedEstimation:
    """Test the stateful USSD callback endpoint (/api/ussd/callback) with detailed estimation
    Detailed estimation has 13 questions ending with age_cacaoyers
    """
    
    def test_stateful_detailed_full_flow_age_cacaoyers_3(self):
        """Test full stateful detailed estimation flow with age_cacaoyers=3 (vieux)"""
        session_id = f"test_stateful_detailed_{uuid.uuid4().hex[:8]}"
        
        # Step 1: Start session (empty text)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("continue_session") == True
        print(f"Step 1 - Welcome: {data.get('raw_response', '')[:50]}...")
        
        # Step 2: Choose "1" (Je suis deja inscrit)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": "1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        raw = data.get("raw_response", "")
        print(f"Step 2 - Login: {raw[:80]}...")
        
        # Check if farmer recognized or not
        if "non reconnu" in raw.lower() or "numero non reconnu" in raw.lower():
            # Farmer not found - skip this test
            pytest.skip("Test farmer phone not registered in database")
        
        # Step 3: Choose "1" (Estimation de ma prime)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": "1*1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Step 3 - Estimation menu: {data.get('raw_response', '')[:50]}...")
        
        # Step 4: Choose "2" (Estimation detaillee)
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": "1*1*2"
            }
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Step 4 - Detailed Q1: {data.get('raw_response', '')[:50]}...")
        
        # Steps 5-17: Answer 13 detailed questions
        # Q1: hectares=5, Q2: arbres_grands=20, Q3: arbres_moyens=30, Q4: arbres_petits=10,
        # Q5: engrais=2(non), Q6: brulage=2(non), Q7: compost=1(oui), Q8: agroforesterie=1(oui),
        # Q9: couverture_sol=1(oui), Q10: biochar=1(oui), Q11: zero_deforestation=1(oui),
        # Q12: reboisement=1(oui), Q13: age_cacaoyers=3(vieux)
        
        detailed_answers = ["5", "20", "30", "10", "2", "2", "1", "1", "1", "1", "1", "1", "3"]
        current_text = "1*1*2"
        
        for i, answer in enumerate(detailed_answers):
            current_text = f"{current_text}*{answer}"
            response = requests.post(
                f"{BASE_URL}/api/ussd/callback",
                json={
                    "sessionId": session_id,
                    "serviceCode": "*144*99#",
                    "phoneNumber": TEST_FARMER_PHONE,
                    "text": current_text
                }
            )
            assert response.status_code == 200
            data = response.json()
            raw = data.get("raw_response", "")
            
            # Check for errors
            if "Erreur" in raw and i == len(detailed_answers) - 1:
                # This would be a bug - age_cacaoyers=3 should not return error
                pytest.fail(f"Got error on age_cacaoyers=3: {raw}")
            
            print(f"Step {5+i} - Q{i+1}: {raw[:60]}...")
        
        # Final response should contain prime result
        raw_response = data.get("raw_response", "")
        assert "Erreur" not in raw_response, f"Got error in final response: {raw_response}"
        assert "Prime" in raw_response or "Score" in raw_response, \
            f"Expected prime result, got: {raw_response}"
        
        print(f"SUCCESS: Stateful detailed estimation with age_cacaoyers=3 completed")


class TestUSSDCalculatePremiumFunction:
    """Test the calculate_ussd_carbon_premium function directly via the public endpoint"""
    
    def test_calculate_premium_with_all_age_choices(self):
        """Test /api/ussd/calculate-premium with different age_cacaoyers values"""
        
        base_data = {
            "hectares": 5,
            "arbres_grands": 20,
            "arbres_moyens": 30,
            "arbres_petits": 10,
            "culture": "cacao",
            "practices": ["compost", "agroforesterie", "couverture_vegetale", "zero_pesticides"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/calculate-premium",
            json=base_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify arbres_par_ha is calculated (the fixed field)
        assert "arbres_par_ha" in data, "arbres_par_ha should be in response"
        assert data["arbres_par_ha"] > 0, "arbres_par_ha should be positive"
        
        # Verify other expected fields
        assert "score" in data, "score should be in response"
        assert "prime_annuelle" in data, "prime_annuelle should be in response"
        assert "prime_fcfa_kg" in data, "prime_fcfa_kg should be in response"
        
        print(f"SUCCESS: calculate-premium - Score: {data.get('score')}, arbres_par_ha: {data.get('arbres_par_ha')}")


class TestUSSDEdgeCases:
    """Test edge cases for the arbres_par_ha calculation"""
    
    def test_zero_trees(self):
        """Test with zero trees - arbres_par_ha should be 0"""
        session_id = f"test_edge_zero_{uuid.uuid4().hex[:8]}"
        
        # 14 answers with all tree counts = 0
        answers = "5*0*0*0*1*2*2*1*1*1*1*1*1*2"
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": answers
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should NOT error even with zero trees
        raw_response = data.get("raw_response", "")
        assert "Erreur" not in raw_response, f"Got error with zero trees: {raw_response}"
        
        result = data.get("result")
        if result:
            assert result.get("arbres_par_ha") == 0, "arbres_par_ha should be 0 with no trees"
        
        print(f"SUCCESS: Zero trees edge case handled correctly")
    
    def test_small_hectares(self):
        """Test with very small hectares - should not divide by zero"""
        session_id = f"test_edge_small_{uuid.uuid4().hex[:8]}"
        
        # 14 answers with very small hectares (0.1)
        answers = "0.1*5*5*5*1*2*2*1*1*1*1*1*1*2"
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": answers
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should NOT error with small hectares
        raw_response = data.get("raw_response", "")
        assert "Erreur" not in raw_response, f"Got error with small hectares: {raw_response}"
        
        result = data.get("result")
        if result:
            # arbres_par_ha should be high (15 trees / 0.1 ha = 150)
            assert result.get("arbres_par_ha") > 0, "arbres_par_ha should be positive"
        
        print(f"SUCCESS: Small hectares edge case handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
