"""
USSD Carbon Calculator API Tests
Tests for /api/ussd/carbon-calculator endpoint - *144*88#

This module tests:
1. Initial session (empty text returns Q1)
2. Full flow with 8 answers returns result
3. Partial flow returns next question
4. Invalid answer handling
5. Result calculation validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestUSSDCarbonCalculatorAPI:
    """USSD Carbon Calculator endpoint tests"""

    def test_initial_session_returns_q1(self):
        """Test: Empty text returns Question 1 (hectares)"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_initial_1",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": ""
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["session_id"] == "pytest_initial_1"
        assert data["continue_session"] is True
        assert data["step"] == 1
        assert data["total_steps"] == 8
        assert "Question 1/8" in data["raw_response"]
        assert "hectares" in data["raw_response"].lower()
        assert data["text"].startswith("CON ")
        print(f"PASS: Initial session returns Q1 with step=1")

    def test_full_flow_returns_result(self):
        """Test: Full flow with text='5*48*1*2*2*1*1*1' returns final result"""
        # Text format: hectares*arbres*culture*engrais*brulage*compost*agroforesterie*couverture
        # 5ha, 48 trees, cacao(1), no chem(2), no burn(2), yes compost(1), yes agroforest(1), yes cover(1)
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_full_flow",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": "5*48*1*2*2*1*1*1"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["session_id"] == "pytest_full_flow"
        assert data["continue_session"] is False
        assert data["step"] == 9  # Past last question
        assert data["text"].startswith("END ")
        
        # Validate result structure
        assert "result" in data
        result = data["result"]
        assert "score" in result
        assert "prime_fcfa_kg" in result
        assert "culture" in result
        assert result["culture"] == "cacao"
        assert result["hectares"] == 5.0
        assert result["score"] == 7.5
        assert result["prime_fcfa_kg"] == 158
        assert result["eligible"] is True
        
        # Check response text contains expected fields
        assert "Score:" in data["raw_response"]
        assert "FCFA/kg" in data["raw_response"]
        assert "Cacao" in data["raw_response"]
        print(f"PASS: Full flow returns result with score={result['score']}, prime={result['prime_fcfa_kg']} FCFA/kg")

    def test_partial_flow_returns_next_question(self):
        """Test: Partial flow '5*48' returns Q3 (culture)"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_partial",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": "5*48"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["continue_session"] is True
        assert data["step"] == 3
        assert "Question 3/8" in data["raw_response"]
        assert "culture" in data["raw_response"].lower()
        assert "Cacao" in data["raw_response"]
        assert "Cafe" in data["raw_response"]
        assert "Anacarde" in data["raw_response"]
        print(f"PASS: Partial flow '5*48' returns Q3 (culture)")

    def test_invalid_answer_returns_error_and_repeats(self):
        """Test: Invalid answer returns error and repeats question"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_invalid",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": "abc"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["continue_session"] is True
        assert data["step"] == 1
        assert "invalide" in data["raw_response"].lower()
        assert "Question 1/8" in data["raw_response"]
        print(f"PASS: Invalid answer returns error and repeats Q1")

    def test_invalid_choice_in_middle(self):
        """Test: Invalid choice answer (5 for culture which expects 1,2,3) returns error"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_invalid_middle",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": "5*48*5"  # 5 is invalid for culture (expects 1,2,3)
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["continue_session"] is True
        assert data["step"] == 3  # Should re-ask Q3
        assert "invalide" in data["raw_response"].lower()
        print(f"PASS: Invalid choice '5' for culture returns error at step 3")

    def test_cafe_culture_flow(self):
        """Test: Full flow with cafe (culture=2) returns cafe in result"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_cafe",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": "3*30*2*1*1*2*2*2"  # 3ha, 30 trees, cafe, yes chem, yes burn, no compost, no agroforest, no cover
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["continue_session"] is False
        assert "result" in data
        assert data["result"]["culture"] == "cafe"
        assert data["result"]["rendement_kg_ha"] == 500  # Cafe yield
        print(f"PASS: Cafe flow returns culture=cafe with rendement=500 kg/ha")

    def test_anacarde_culture_flow(self):
        """Test: Full flow with anacarde (culture=3) returns anacarde in result"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_anacarde",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": "2*20*3*2*2*1*1*1"  # 2ha, 20 trees, anacarde, no chem, no burn, yes compost, yes agroforest, yes cover
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["continue_session"] is False
        assert "result" in data
        assert data["result"]["culture"] == "anacarde"
        assert data["result"]["rendement_kg_ha"] == 400  # Anacarde yield
        print(f"PASS: Anacarde flow returns culture=anacarde with rendement=400 kg/ha")

    def test_low_score_not_eligible(self):
        """Test: Low score (bad practices) returns eligible=False"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_low_score",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": "1*5*1*1*1*2*2*2"  # 1ha, 5 trees, cacao, yes chem, yes burn, no compost, no agroforest, no cover
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["continue_session"] is False
        assert "result" in data
        result = data["result"]
        # With bad practices (chemicals, burning, no good practices), score should be low
        assert result["score"] < 5.0
        assert result["eligible"] is False
        assert "ameliorer" in data["raw_response"].lower() or "Minimum requis" in data["raw_response"]
        print(f"PASS: Bad practices result in score={result['score']} (not eligible)")

    def test_single_answer_returns_q2(self):
        """Test: Single answer '5' returns Q2 (arbres)"""
        response = requests.post(
            f"{BASE_URL}/api/ussd/carbon-calculator",
            json={
                "sessionId": "pytest_single",
                "serviceCode": "*144*88#",
                "phoneNumber": "+2250700000000",
                "text": "5"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["continue_session"] is True
        assert data["step"] == 2
        assert "Question 2/8" in data["raw_response"]
        assert "arbres" in data["raw_response"].lower()
        print(f"PASS: Single answer '5' returns Q2 (arbres)")

    def test_step_progression(self):
        """Test: Verify correct step progression through all 8 questions"""
        answers = ["5", "48", "1", "2", "2", "1", "1", "1"]
        accumulated_text = ""
        
        for i, answer in enumerate(answers[:-1]):  # Test up to Q7
            accumulated_text = f"{accumulated_text}*{answer}" if accumulated_text else answer
            response = requests.post(
                f"{BASE_URL}/api/ussd/carbon-calculator",
                json={
                    "sessionId": f"pytest_progression_{i}",
                    "serviceCode": "*144*88#",
                    "phoneNumber": "+2250700000000",
                    "text": accumulated_text
                }
            )
            assert response.status_code == 200
            data = response.json()
            expected_step = i + 2  # Next question
            assert data["step"] == expected_step, f"Expected step {expected_step}, got {data['step']}"
            assert data["continue_session"] is True
            assert f"Question {expected_step}/8" in data["raw_response"]
        
        print(f"PASS: Step progression verified through Q1-Q7")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
