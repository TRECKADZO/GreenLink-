"""
PDC v2 Module Tests - Plan de Developpement de la Cacaoyere (Stepper 3 etapes / 8 fiches)
Tests for all PDC v2 API endpoints with RBAC verification

Uses cached tokens to avoid rate limiting issues.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_EMAIL = "bielaghana@gmail.com"
COOP_PASSWORD = "test123456"
AGENT_EMAIL = "testagent@test.ci"
AGENT_PASSWORD = "test123456"
PLANTEUR_EMAIL = "testplanteur@test.ci"
PLANTEUR_PASSWORD = "test123456"
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"

# Token cache to avoid rate limiting
_token_cache = {}


def get_token(email, password):
    """Helper to get auth token with caching"""
    cache_key = email
    if cache_key in _token_cache:
        return _token_cache[cache_key]
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": email,
        "password": password
    })
    if response.status_code == 200:
        token = response.json().get("access_token")
        _token_cache[cache_key] = token
        return token
    print(f"Login failed for {email}: {response.status_code} - {response.text}")
    return None


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# Get all tokens at module load time to avoid rate limiting
@pytest.fixture(scope="module", autouse=True)
def setup_tokens():
    """Pre-fetch all tokens at the start of the test module"""
    print("\n=== Pre-fetching tokens ===")
    coop_token = get_token(COOP_EMAIL, COOP_PASSWORD)
    agent_token = get_token(AGENT_EMAIL, AGENT_PASSWORD)
    planteur_token = get_token(PLANTEUR_EMAIL, PLANTEUR_PASSWORD)
    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    print(f"Cooperative token: {'OK' if coop_token else 'FAILED'}")
    print(f"Agent token: {'OK' if agent_token else 'FAILED'}")
    print(f"Planteur token: {'OK' if planteur_token else 'FAILED'}")
    print(f"Admin token: {'OK' if admin_token else 'FAILED'}")
    
    yield
    
    # Cleanup
    _token_cache.clear()


class TestPDCV2Authentication:
    """Test authentication for different user roles"""
    
    def test_cooperative_login(self):
        """Test cooperative user can login"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, f"Cooperative login failed"
        print(f"✓ Cooperative login successful")
    
    def test_agent_login(self):
        """Test agent terrain can login"""
        token = get_token(AGENT_EMAIL, AGENT_PASSWORD)
        assert token, f"Agent login failed"
        print(f"✓ Agent terrain login successful")
    
    def test_planteur_login(self):
        """Test planteur can login"""
        token = get_token(PLANTEUR_EMAIL, PLANTEUR_PASSWORD)
        assert token, f"Planteur login failed"
        print(f"✓ Planteur login successful")


class TestPDCV2Stats:
    """Test PDC v2 statistics endpoint"""
    
    def test_stats_overview_cooperative(self):
        """Cooperative can get PDC stats"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/stats/overview",
            headers=auth_headers(token)
        )
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "brouillons" in data
        assert "valides" in data
        print(f"✓ PDC stats: total={data['total']}, valides={data['valides']}")
    
    def test_stats_overview_admin(self):
        """Admin can get PDC stats"""
        token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/stats/overview",
            headers=auth_headers(token)
        )
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        data = response.json()
        assert "total" in data
        print(f"✓ Admin PDC stats: total={data['total']}")


class TestPDCV2List:
    """Test PDC v2 list endpoint"""
    
    def test_list_pdcs_cooperative(self):
        """Cooperative can list PDCs"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=auth_headers(token)
        )
        assert response.status_code == 200, f"List failed: {response.text}"
        data = response.json()
        assert "pdcs" in data
        assert "total" in data
        assert isinstance(data["pdcs"], list)
        print(f"✓ PDC list: {data['total']} PDCs found")
    
    def test_list_pdcs_with_search(self):
        """Cooperative can search PDCs by name"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list?search=Koffi",
            headers=auth_headers(token)
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "pdcs" in data
        print(f"✓ PDC search 'Koffi': {data['total']} results")
    
    def test_list_pdcs_planteur(self):
        """Planteur can list their own PDCs"""
        token = get_token(PLANTEUR_EMAIL, PLANTEUR_PASSWORD)
        assert token, "Failed to get planteur token"
        
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=auth_headers(token)
        )
        assert response.status_code == 200, f"Planteur list failed: {response.text}"
        data = response.json()
        assert "pdcs" in data
        print(f"✓ Planteur PDC list: {data['total']} PDCs")


class TestPDCV2AvailableMembers:
    """Test available members endpoint"""
    
    def test_available_members_cooperative(self):
        """Cooperative can get available members without active PDC"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/members/available",
            headers=auth_headers(token)
        )
        assert response.status_code == 200, f"Available members failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Available members: {len(data)} members without active PDC")
        if len(data) > 0:
            member = data[0]
            assert "id" in member
            assert "full_name" in member
            print(f"  First available: {member.get('full_name', 'N/A')}")


class TestPDCV2GetExisting:
    """Test getting existing PDC"""
    
    def test_get_existing_pdc_cooperative(self):
        """Cooperative can get existing PDC details"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        # First list to find an existing PDC
        list_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=auth_headers(token)
        )
        assert list_response.status_code == 200
        pdcs = list_response.json().get("pdcs", [])
        
        if len(pdcs) == 0:
            pytest.skip("No existing PDCs to test")
        
        pdc_id = pdcs[0]["id"]
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/{pdc_id}",
            headers=auth_headers(token)
        )
        assert response.status_code == 200, f"Get PDC failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "farmer_name" in data
        assert "current_step" in data
        assert "statut" in data
        assert "step1" in data
        assert "step2" in data
        assert "step3" in data
        print(f"✓ Got PDC: {data['farmer_name']}, step {data['current_step']}, status: {data['statut']}")


class TestPDCV2RBAC:
    """Test RBAC - Planteur cannot see non-validated PDC"""
    
    def test_planteur_cannot_see_non_validated_pdc(self):
        """Planteur should get 403 when trying to access non-validated PDC"""
        coop_token = get_token(COOP_EMAIL, COOP_PASSWORD)
        planteur_token = get_token(PLANTEUR_EMAIL, PLANTEUR_PASSWORD)
        assert coop_token, "Failed to get cooperative token"
        assert planteur_token, "Failed to get planteur token"
        
        # First get a non-validated PDC as cooperative
        list_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=auth_headers(coop_token)
        )
        assert list_response.status_code == 200
        pdcs = list_response.json().get("pdcs", [])
        
        # Find a non-validated PDC
        non_validated_pdc = None
        for pdc in pdcs:
            if pdc.get("statut") != "valide":
                non_validated_pdc = pdc
                break
        
        if non_validated_pdc is None:
            pytest.skip("No non-validated PDC found to test RBAC")
        
        pdc_id = non_validated_pdc["id"]
        
        # Try to access as planteur - should fail with 403
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/{pdc_id}",
            headers=auth_headers(planteur_token)
        )
        # Planteur should get 403 (access denied) because PDC is not validated
        # OR 403 because it's not their PDC
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ RBAC: Planteur correctly denied access to non-validated PDC")


class TestPDCV2StepOperations:
    """Test step save and submit operations"""
    
    def test_save_step1_cooperative(self):
        """Cooperative can save step 1 data"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        # Get an existing PDC
        list_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=auth_headers(token)
        )
        pdcs = list_response.json().get("pdcs", [])
        
        # Find a non-validated PDC
        target_pdc = None
        for pdc in pdcs:
            if pdc.get("statut") != "valide":
                target_pdc = pdc
                break
        
        if target_pdc is None:
            pytest.skip("No non-validated PDC to test step operations")
        
        pdc_id = target_pdc["id"]
        
        # Save step 1 data
        step1_data = {
            "fiche1": {
                "enqueteur": {"nom": "Test Enqueteur", "date": "2026-01-15"},
                "producteur": {"nom": "Test Producteur", "village": "Test Village"},
                "membres_menage": []
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1",
            headers=auth_headers(token),
            json=step1_data
        )
        assert response.status_code == 200, f"Save step1 failed: {response.text}"
        data = response.json()
        assert "step1" in data
        print(f"✓ Step 1 saved successfully for PDC {pdc_id}")
    
    def test_save_step2_cooperative(self):
        """Cooperative can save step 2 data"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        # Get a PDC at step 2 or higher
        list_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=auth_headers(token)
        )
        pdcs = list_response.json().get("pdcs", [])
        
        # Find a PDC at step 2 or higher
        target_pdc = None
        for pdc in pdcs:
            if pdc.get("current_step", 1) >= 2 and pdc.get("statut") != "valide":
                target_pdc = pdc
                break
        
        if target_pdc is None:
            pytest.skip("No PDC at step 2+ to test step2 operations")
        
        pdc_id = target_pdc["id"]
        
        # Save step 2 data
        step2_data = {
            "fiche5": {
                "analyses": [
                    {"theme": "Peuplement du verger", "problemes": "Test probleme", "causes": "Test cause", "consequences": "Test consequence", "solutions": "Test solution"}
                ]
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pdc-v2/{pdc_id}/step2",
            headers=auth_headers(token),
            json=step2_data
        )
        assert response.status_code == 200, f"Save step2 failed: {response.text}"
        data = response.json()
        assert "step2" in data
        print(f"✓ Step 2 saved successfully for PDC {pdc_id}")
    
    def test_agent_cannot_save_step2(self):
        """Agent terrain cannot save step 2 (only cooperative can)"""
        coop_token = get_token(COOP_EMAIL, COOP_PASSWORD)
        agent_token = get_token(AGENT_EMAIL, AGENT_PASSWORD)
        assert coop_token, "Failed to get cooperative token"
        assert agent_token, "Failed to get agent token"
        
        # Get a PDC at step 2
        list_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list",
            headers=auth_headers(coop_token)
        )
        pdcs = list_response.json().get("pdcs", [])
        
        target_pdc = None
        for pdc in pdcs:
            if pdc.get("current_step", 1) >= 2 and pdc.get("statut") != "valide":
                target_pdc = pdc
                break
        
        if target_pdc is None:
            pytest.skip("No PDC at step 2+ to test agent RBAC")
        
        pdc_id = target_pdc["id"]
        
        # Try to save step 2 as agent - should fail
        step2_data = {"fiche5": {"analyses": []}}
        response = requests.put(
            f"{BASE_URL}/api/pdc-v2/{pdc_id}/step2",
            headers=auth_headers(agent_token),
            json=step2_data
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ RBAC: Agent correctly denied from saving step 2")


class TestPDCV2Delete:
    """Test PDC delete/archive operations"""
    
    def test_cannot_delete_validated_pdc(self):
        """Cannot delete a validated PDC"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        # Get a validated PDC
        list_response = requests.get(
            f"{BASE_URL}/api/pdc-v2/list?statut=valide",
            headers=auth_headers(token)
        )
        pdcs = list_response.json().get("pdcs", [])
        
        if len(pdcs) == 0:
            pytest.skip("No validated PDC to test delete restriction")
        
        pdc_id = pdcs[0]["id"]
        
        response = requests.delete(
            f"{BASE_URL}/api/pdc-v2/{pdc_id}",
            headers=auth_headers(token)
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ Cannot delete validated PDC - correctly rejected")


class TestPDCV2InvalidRequests:
    """Test error handling for invalid requests"""
    
    def test_create_pdc_without_farmer_id(self):
        """Creating PDC without farmer_id should fail"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        response = requests.post(
            f"{BASE_URL}/api/pdc-v2",
            headers=auth_headers(token),
            json={}
        )
        # Should fail with 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print(f"✓ Create PDC without farmer_id correctly rejected")
    
    def test_get_invalid_pdc_id(self):
        """Getting PDC with invalid ID should fail"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/invalid_id_123",
            headers=auth_headers(token)
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Invalid PDC ID correctly rejected")
    
    def test_get_nonexistent_pdc(self):
        """Getting non-existent PDC should return 404"""
        token = get_token(COOP_EMAIL, COOP_PASSWORD)
        assert token, "Failed to get cooperative token"
        
        response = requests.get(
            f"{BASE_URL}/api/pdc-v2/000000000000000000000000",
            headers=auth_headers(token)
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent PDC correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
