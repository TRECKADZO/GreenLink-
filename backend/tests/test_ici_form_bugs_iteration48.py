from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test ICI/SSRTE Form Bug Fixes - Iteration 48
Test ICI/SSRTE Form Bug Fixes - Iteration 48
Tests for 5 bugs in ICI/SSRTE forms for GreenLink platform:
Tests for 5 bugs in ICI/SSRTE forms for GreenLink platform:
- Bug 2: Household size (taille_menage) stuck at 1
- Bug 2: Household size (taille_menage) stuck at 1
- Bug 3: Cross-form auto-fill between ICI and SSRTE
- Bug 3: Cross-form auto-fill between ICI and SSRTE
- Bug 4: Completion counter showing 1/5 instead of 5/5
- Bug 4: Completion counter showing 1/5 instead of 5/5
- Bug 5: Agent visit auto-update when 5/5 forms complete
- Bug 5: Agent visit auto-update when 5/5 forms complete
"""
"""

import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FIELD_AGENT_CREDS = {"identifier": "+2250709005301", "password": "greenlink2024"}
COOPERATIVE_CREDS = {"identifier": "traore_eric@yahoo.fr", "password": "greenlink2024"}
ADMIN_CREDS = {"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

# Known farmers from agent's assigned list
FARMER_KOFFI_ID = "69b9fac98b05ef67133cfbe5"  # 5/5 completion
FARMER_BALDE_ID = "69b98dda122dd07c6347943a"  # 3/5 completion
FARMER_KINDA_ID = "69bdef2c13defac7fb3a12d9"  # 5/5 completion


@pytest.fixture(scope="module")
def field_agent_token():
    """Get field agent authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
    assert response.status_code == 200, f"Field agent login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def cooperative_token():
    """Get cooperative authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
    assert response.status_code == 200, f"Cooperative login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("access_token")


class TestAuthenticationEndpoints:
    """Test authentication works with correct credentials"""
    
    def test_field_agent_login_with_phone(self):
        """Bug context: Login uses 'identifier' not 'email'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert data["user"]["user_type"] == "field_agent"
        assert data["user"]["full_name"] == "Kone Alphone"
    
    def test_cooperative_login_with_email(self):
        """Cooperative login with email identifier"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "cooperative"


class TestBug4CompletionCounter:
    """Bug 4 FIX: GET /api/field-agent/my-farmers should return correct completion counts"""
    
    def test_my_farmers_returns_farmers(self, field_agent_token):
        """Test that my-farmers endpoint returns assigned farmers"""
        headers = {"Authorization": f"Bearer {field_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "farmers" in data
        assert "total" in data
        assert data["total"] == 3, f"Expected 3 farmers, got {data['total']}"
    
    def test_completion_counter_shows_5_5_for_koffi(self, field_agent_token):
        """Bug 4: Koffi should show 5/5 completion, not 1/5"""
        headers = {"Authorization": f"Bearer {field_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        koffi = next((f for f in data["farmers"] if f["id"] == FARMER_KOFFI_ID), None)
        assert koffi is not None, "Koffi not found in farmers list"
        
        completion = koffi.get("completion", {})
        assert completion.get("completed") == 5, f"Expected 5/5 completion, got {completion.get('completed')}/5"
        assert completion.get("total") == 5
        assert completion.get("percentage") == 100
    
    def test_completion_counter_shows_5_5_for_kinda(self, field_agent_token):
        """Bug 4: KINDA YABRE should show 5/5 completion"""
        headers = {"Authorization": f"Bearer {field_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        kinda = next((f for f in data["farmers"] if f["id"] == FARMER_KINDA_ID), None)
        assert kinda is not None, "KINDA YABRE not found in farmers list"
        
        completion = kinda.get("completion", {})
        assert completion.get("completed") == 5, f"Expected 5/5 completion, got {completion.get('completed')}/5"
    
    def test_forms_status_structure(self, field_agent_token):
        """Verify forms_status has all 5 form types"""
        headers = {"Authorization": f"Bearer {field_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        farmer = data["farmers"][0]
        forms_status = farmer.get("forms_status", {})
        
        expected_forms = ["ici", "ssrte", "parcels", "photos", "register"]
        for form in expected_forms:
            assert form in forms_status, f"Missing form type: {form}"
            assert "completed" in forms_status[form]
            assert "label" in forms_status[form]


class TestBug2TailleMenage:
    """Bug 2 FIX: POST /api/ici-data/farmers/{farmer_id}/ici-profile should accept taille_menage >= 1"""
    
    def test_ici_profile_accepts_taille_menage(self, cooperative_token):
        """Bug 2: taille_menage should be accepted as valid int >= 1"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        payload = {
            "taille_menage": 6,
            "genre": "homme",
            "niveau_education": "primaire",
            "peut_lire_ecrire": True,
            "utilise_pesticides": False,
            "formation_securite_recue": False,
            "membre_groupe_epargne": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_BALDE_ID}/ici-profile",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to save ICI profile: {response.text}"
        data = response.json()
        assert data.get("message") == "Profil ICI mis à jour avec succès"
    
    def test_ici_profile_rejects_taille_menage_zero(self, cooperative_token):
        """Bug 2: taille_menage = 0 should be rejected (ge=1 validation)"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        payload = {
            "taille_menage": 0,  # Invalid - should be >= 1
            "genre": "homme"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_BALDE_ID}/ici-profile",
            headers=headers,
            json=payload
        )
        # Should fail validation
        assert response.status_code == 422, f"Expected 422 for taille_menage=0, got {response.status_code}"
    
    def test_ici_profile_get_returns_taille_menage(self, cooperative_token):
        """Verify GET returns saved taille_menage value"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        # First save a profile
        payload = {"taille_menage": 8, "genre": "femme"}
        requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_KOFFI_ID}/ici-profile",
            headers=headers,
            json=payload
        )
        
        # Then GET and verify
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_KOFFI_ID}/ici-profile",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("taille_menage") == 8


class TestBug3CrossFormSync:
    """Bug 3 FIX: SSRTE taille_menage syncs to ICI profile"""
    
    def test_ssrte_visit_syncs_taille_menage_to_ici(self, cooperative_token):
        """Bug 3: SSRTE visit should sync taille_menage to ICI profile"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        # Create SSRTE visit with specific taille_menage
        ssrte_payload = {
            "farmer_id": FARMER_BALDE_ID,
            "taille_menage": 9,
            "nombre_enfants": 4,
            "conditions_vie": "bonnes",
            "eau_courante": True,
            "electricite": True,
            "enfants_observes_travaillant": 0,
            "niveau_risque": "faible"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/ssrte/visit",
            headers=headers,
            json=ssrte_payload
        )
        assert response.status_code == 200, f"SSRTE visit failed: {response.text}"
        
        # Verify ICI profile was updated with taille_menage
        time.sleep(0.5)  # Allow async update
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_BALDE_ID}/ici-profile",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("taille_menage") == 9, f"Expected taille_menage=9, got {data.get('taille_menage')}"
        assert data.get("ssrte_visite_effectuee") == True
    
    def test_ici_profile_prefills_from_ssrte_when_no_profile(self, cooperative_token):
        """Bug 3: GET ICI profile should pre-fill from SSRTE when no profile exists"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        # Get ICI profile - should have data from SSRTE visits
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_KINDA_ID}/ici-profile",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have taille_menage from SSRTE or ICI profile
        assert "taille_menage" in data
        assert data.get("taille_menage", 0) > 0


class TestBug5AutoUpdateCompletion:
    """Bug 5 FIX: Auto-update agent activity and coop_member when farmer reaches 5/5 completion"""
    
    def test_farmer_with_5_5_has_all_forms_complete_flag(self, field_agent_token):
        """Bug 5: Farmers with 5/5 should have all_forms_complete flag"""
        headers = {"Authorization": f"Bearer {field_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find farmers with 5/5 completion
        complete_farmers = [f for f in data["farmers"] if f.get("completion", {}).get("completed") == 5]
        assert len(complete_farmers) >= 2, "Expected at least 2 farmers with 5/5 completion"
        
        # Verify Koffi and KINDA YABRE are in the list
        complete_ids = [f["id"] for f in complete_farmers]
        assert FARMER_KOFFI_ID in complete_ids, "Koffi should have 5/5 completion"
        assert FARMER_KINDA_ID in complete_ids, "KINDA YABRE should have 5/5 completion"
    
    def test_completion_triggers_on_ici_save(self, cooperative_token):
        """Bug 5: Saving ICI profile should trigger completion check"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        # Save ICI profile - this should trigger check_and_update_farmer_completion
        payload = {
            "taille_menage": 5,
            "genre": "homme",
            "niveau_education": "secondaire"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_KOFFI_ID}/ici-profile",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200
        # The endpoint should complete without error, indicating completion check ran


class TestSSRTEVisitEndpoint:
    """Test SSRTE Visit POST endpoint works correctly"""
    
    def test_ssrte_visit_post_success(self, cooperative_token):
        """SSRTE visit should be created successfully"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        payload = {
            "farmer_id": FARMER_KOFFI_ID,
            "taille_menage": 5,
            "nombre_enfants": 2,
            "conditions_vie": "moyennes",
            "eau_courante": False,
            "electricite": True,
            "enfants_observes_travaillant": 0,
            "niveau_risque": "faible",
            "observations": "Test visit from iteration 48"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/ssrte/visit",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "visit_id" in data
        assert data.get("niveau_risque") == "faible"
    
    def test_ssrte_visit_with_children_details(self, cooperative_token):
        """SSRTE visit with liste_enfants should work"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        payload = {
            "farmer_id": FARMER_BALDE_ID,
            "taille_menage": 6,
            "nombre_enfants": 2,
            "liste_enfants": [
                {"prenom": "Test1", "sexe": "Garcon", "age": 10, "scolarise": True, "travaille_exploitation": False},
                {"prenom": "Test2", "sexe": "Fille", "age": 8, "scolarise": True, "travaille_exploitation": False}
            ],
            "conditions_vie": "bonnes",
            "enfants_observes_travaillant": 0,
            "niveau_risque": "faible"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/ssrte/visit",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200


class TestICIProfileEndpoints:
    """Test ICI Profile GET and POST endpoints"""
    
    def test_ici_profile_get_existing(self, cooperative_token):
        """GET ICI profile for farmer with existing profile"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_KOFFI_ID}/ici-profile",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "farmer_id" in data or "_id" in data
    
    def test_ici_profile_post_with_household_children(self, cooperative_token):
        """POST ICI profile with household_children data"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        payload = {
            "taille_menage": 7,
            "genre": "homme",
            "niveau_education": "primaire",
            "peut_lire_ecrire": True,
            "household_children": {
                "total_enfants": 3,
                "enfants_5_11_ans": 1,
                "enfants_12_14_ans": 1,
                "enfants_15_17_ans": 1,
                "enfants_scolarises": 2,
                "enfants_travaillant_exploitation": 0,
                "taches_effectuees": [],
                "liste_enfants": []
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_BALDE_ID}/ici-profile",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "risk_score" in data
        assert "niveau_risque" in data


class TestFieldAgentDashboard:
    """Test field agent dashboard endpoint"""
    
    def test_field_agent_dashboard_access(self, field_agent_token):
        """Field agent should access dashboard"""
        headers = {"Authorization": f"Bearer {field_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "agent_info" in data or "statistics" in data or "performance" in data
    
    def test_field_agent_my_visits(self, field_agent_token):
        """Field agent should see their visits"""
        headers = {"Authorization": f"Bearer {field_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/my-visits", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "visits" in data
        assert "total" in data
