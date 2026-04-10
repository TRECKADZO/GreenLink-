"""
PDC v2 Workflow Tests - Iteration 129
Tests for the PDC v2 workflow permissions:
1. Cooperative CANNOT modify Step 1 after agent has submitted (PUT /api/pdc-v2/{id}/step1 returns 403 when current_step >= 2)
2. Cooperative CAN read a PDC at any step (GET /api/pdc-v2/{id})
3. Cooperative CAN save Step 2 (PUT /api/pdc-v2/{id}/step2)
4. Cooperative CAN save Step 3 (PUT /api/pdc-v2/{id}/step3)
5. Farmer CANNOT see PDC before validation (GET /api/pdc-v2/{id} returns 403 when statut != valide)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
COOPERATIVE_EMAIL = "bielaghana@gmail.com"
COOPERATIVE_PASSWORD = "test123456"
AGENT_EMAIL = "testagent@test.ci"
AGENT_PASSWORD = "test123456"
PLANTEUR_EMAIL = "testplanteur@test.ci"
PLANTEUR_PASSWORD = "test123456"

# PDC ID with etape1_complete (current_step >= 2)
PDC_ID_STEP2 = "69d97a7ff2a45f9a4e690268"


class TestPDCv2WorkflowPermissions:
    """Test PDC v2 workflow permissions for cooperative, agent, and farmer"""
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOPERATIVE_EMAIL,
            "password": COOPERATIVE_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        pytest.skip(f"Cooperative login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent terrain authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        pytest.skip(f"Agent login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def planteur_token(self):
        """Get planteur authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": PLANTEUR_EMAIL,
            "password": PLANTEUR_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        pytest.skip(f"Planteur login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def cooperative_headers(self, cooperative_token):
        """Headers with cooperative auth"""
        return {
            "Authorization": f"Bearer {cooperative_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def agent_headers(self, agent_token):
        """Headers with agent auth"""
        return {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def planteur_headers(self, planteur_token):
        """Headers with planteur auth"""
        return {
            "Authorization": f"Bearer {planteur_token}",
            "Content-Type": "application/json"
        }
    
    # ============= TEST 1: Cooperative CANNOT modify Step 1 after agent submitted =============
    def test_cooperative_cannot_modify_step1_after_submission(self, cooperative_headers):
        """
        Test 1: Cooperative CANNOT modify Step 1 after agent has submitted
        PUT /api/pdc-v2/{id}/step1 should return 403 when current_step >= 2
        """
        # First, get the PDC to verify its current_step
        get_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/{PDC_ID_STEP2}",
            headers=cooperative_headers
        )
        
        if get_response.status_code != 200:
            pytest.skip(f"Cannot access PDC {PDC_ID_STEP2}: {get_response.status_code}")
        
        pdc_data = get_response.json()
        current_step = pdc_data.get("current_step", 1)
        print(f"PDC current_step: {current_step}, statut: {pdc_data.get('statut')}")
        
        # Only test if current_step >= 2 (step 1 was submitted)
        if current_step < 2:
            pytest.skip(f"PDC {PDC_ID_STEP2} is still at step 1, cannot test step1 lock")
        
        # Try to modify step 1 as cooperative - should fail with 403
        step1_data = {
            "fiche1": {
                "enqueteur": {"nom": "Test Modification"},
                "producteur": {},
                "membres_menage": []
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pdc-v2/{PDC_ID_STEP2}/step1",
            headers=cooperative_headers,
            json=step1_data
        )
        
        # Should return 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        error_data = response.json()
        assert "detail" in error_data
        assert "lecture seule" in error_data["detail"].lower() or "soumise" in error_data["detail"].lower()
        print(f"TEST 1 PASSED: Cooperative blocked from modifying step1 - {error_data['detail']}")
    
    # ============= TEST 2: Cooperative CAN read PDC at any step =============
    def test_cooperative_can_read_pdc_any_step(self, cooperative_headers):
        """
        Test 2: Cooperative CAN read a PDC at any step
        GET /api/pdc-v2/{id} should return 200 for cooperative
        """
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/{PDC_ID_STEP2}",
            headers=cooperative_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        pdc_data = response.json()
        assert "id" in pdc_data
        assert "current_step" in pdc_data
        assert "step1" in pdc_data
        assert "step2" in pdc_data
        assert "step3" in pdc_data
        
        print(f"TEST 2 PASSED: Cooperative can read PDC - id={pdc_data['id']}, step={pdc_data['current_step']}")
    
    # ============= TEST 3: Cooperative CAN save Step 2 =============
    def test_cooperative_can_save_step2(self, cooperative_headers):
        """
        Test 3: Cooperative CAN save Step 2
        PUT /api/pdc-v2/{id}/step2 should return 200
        """
        # First check PDC status
        get_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/{PDC_ID_STEP2}",
            headers=cooperative_headers
        )
        
        if get_response.status_code != 200:
            pytest.skip(f"Cannot access PDC: {get_response.status_code}")
        
        pdc_data = get_response.json()
        if pdc_data.get("statut") == "valide":
            pytest.skip("PDC is already validated, cannot modify step2")
        
        # Save step 2 data
        step2_data = {
            "fiche5": {
                "analyses": [
                    {
                        "theme": "Test Theme - Iteration 129",
                        "problemes": "Test probleme",
                        "causes": "Test cause",
                        "consequences": "Test consequence",
                        "solutions": "Test solution"
                    }
                ]
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pdc-v2/{PDC_ID_STEP2}/step2",
            headers=cooperative_headers,
            json=step2_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated_pdc = response.json()
        assert updated_pdc.get("step2", {}).get("fiche5", {}).get("analyses") is not None
        print(f"TEST 3 PASSED: Cooperative saved step2 - statut={updated_pdc.get('statut')}")
    
    # ============= TEST 4: Cooperative CAN save Step 3 =============
    def test_cooperative_can_save_step3(self, cooperative_headers):
        """
        Test 4: Cooperative CAN save Step 3
        PUT /api/pdc-v2/{id}/step3 should return 200
        """
        # First check PDC status
        get_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/{PDC_ID_STEP2}",
            headers=cooperative_headers
        )
        
        if get_response.status_code != 200:
            pytest.skip(f"Cannot access PDC: {get_response.status_code}")
        
        pdc_data = get_response.json()
        if pdc_data.get("statut") == "valide":
            pytest.skip("PDC is already validated, cannot modify step3")
        
        # Save step 3 data
        step3_data = {
            "fiche6": {
                "axes": [
                    {
                        "axe": "Test Axe - Iteration 129",
                        "objectifs": "Test objectif",
                        "activites": "Test activite",
                        "cout": 10000
                    }
                ]
            },
            "fiche7": {
                "actions": []
            },
            "fiche8": {
                "moyens": []
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pdc-v2/{PDC_ID_STEP2}/step3",
            headers=cooperative_headers,
            json=step3_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated_pdc = response.json()
        assert updated_pdc.get("step3", {}).get("fiche6", {}).get("axes") is not None
        print(f"TEST 4 PASSED: Cooperative saved step3 - statut={updated_pdc.get('statut')}")
    
    # ============= TEST 5: Farmer CANNOT see PDC before validation =============
    def test_farmer_cannot_see_pdc_before_validation(self, planteur_headers):
        """
        Test 5: Farmer CANNOT see PDC before validation
        GET /api/pdc-v2/{id} should return 403 when statut != valide
        """
        # First, we need to find a PDC that belongs to the test planteur and is not validated
        # Get the list of PDCs for the planteur
        list_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=planteur_headers
        )
        
        if list_response.status_code != 200:
            pytest.skip(f"Cannot list PDCs for planteur: {list_response.status_code}")
        
        pdcs = list_response.json().get("pdcs", [])
        
        # Find a non-validated PDC
        non_validated_pdc = None
        for pdc in pdcs:
            if pdc.get("statut") != "valide":
                non_validated_pdc = pdc
                break
        
        if not non_validated_pdc:
            # Try to access the test PDC directly - it should fail if not validated
            response = requests.get(
                f"{BASE_URL}/api/pdc-v2/{PDC_ID_STEP2}",
                headers=planteur_headers
            )
            
            # If the PDC doesn't belong to this farmer, we'll get 403 for access denied
            # If it does belong but is not validated, we should also get 403
            if response.status_code == 403:
                error_data = response.json()
                print(f"TEST 5 PASSED: Farmer blocked from viewing PDC - {error_data.get('detail', 'Access denied')}")
                return
            elif response.status_code == 200:
                pdc_data = response.json()
                if pdc_data.get("statut") == "valide":
                    pytest.skip("PDC is validated, farmer can see it")
                else:
                    pytest.fail(f"Farmer should not be able to see non-validated PDC, got 200")
            else:
                pytest.skip(f"Unexpected response: {response.status_code}")
        else:
            # Try to access the non-validated PDC
            pdc_id = non_validated_pdc.get("id")
            response = requests.get(
                f"{BASE_URL}/api/pdc-v2/{pdc_id}",
                headers=planteur_headers
            )
            
            # Should return 403 because PDC is not validated
            assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
            
            error_data = response.json()
            assert "detail" in error_data
            print(f"TEST 5 PASSED: Farmer blocked from viewing non-validated PDC - {error_data['detail']}")


class TestPDCv2WorkflowIntegration:
    """Integration tests for the full PDC v2 workflow"""
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOPERATIVE_EMAIL,
            "password": COOPERATIVE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Cooperative login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def cooperative_headers(self, cooperative_token):
        return {
            "Authorization": f"Bearer {cooperative_token}",
            "Content-Type": "application/json"
        }
    
    def test_pdc_list_endpoint(self, cooperative_headers):
        """Test that PDC list endpoint works for cooperative"""
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=cooperative_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "pdcs" in data
        assert "total" in data
        print(f"PDC List: {data['total']} PDCs found")
    
    def test_pdc_stats_endpoint(self, cooperative_headers):
        """Test that PDC stats endpoint works for cooperative"""
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/stats/overview",
            headers=cooperative_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total" in data
        assert "valides" in data
        print(f"PDC Stats: total={data['total']}, valides={data['valides']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
