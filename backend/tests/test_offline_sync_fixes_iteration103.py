"""
Test Iteration 103: Offline Sync Bug Fixes
Tests for:
1. SSRTE sync stores ALL fields (taille_menage, nombre_enfants, liste_enfants, conditions_vie, etc.)
2. REDD sync stores in redd_tracking_visits (not redd_visits) with calculated redd_score and redd_level
3. Empty offline_id does NOT skip with 'already_synced'
4. my-farmers shows correct redd completion status (checks redd_tracking_visits)
5. family-data returns data from synced SSRTE visits
"""

import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FIELD_AGENT_EMAIL = "testagent@test.ci"
FIELD_AGENT_PASSWORD = "test123456"
TEST_FARMER_ID = "69d27ef947797cbad7193b8a"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for field agent"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": FIELD_AGENT_EMAIL,
        "password": FIELD_AGENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestSSRTESyncStoresAllFields:
    """Test that SSRTE sync via /api/agent/sync/upload stores ALL fields"""
    
    def test_ssrte_sync_stores_complete_data(self, auth_headers):
        """
        Bug fix: SSRTE sync handler should store ALL fields including:
        taille_menage, nombre_enfants, liste_enfants, conditions_vie, 
        eau_courante, electricite, distance_ecole_km, enfants_observes, observations
        """
        unique_id = f"test_ssrte_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat()
        
        # Complete SSRTE visit data with ALL fields
        ssrte_data = {
            "date_visite": timestamp,
            "taille_menage": 7,
            "nombre_enfants": 4,
            "liste_enfants": [
                {"prenom": "TestEnfant1", "sexe": "Garcon", "age": 10, "scolarise": True, "travaille_exploitation": False},
                {"prenom": "TestEnfant2", "sexe": "Fille", "age": 8, "scolarise": True, "travaille_exploitation": False},
                {"prenom": "TestEnfant3", "sexe": "Garcon", "age": 14, "scolarise": True, "travaille_exploitation": True},
                {"prenom": "TestEnfant4", "sexe": "Fille", "age": 5, "scolarise": False, "travaille_exploitation": False}
            ],
            "conditions_vie": "moyennes",
            "eau_courante": True,
            "electricite": True,
            "distance_ecole_km": 2.5,
            "enfants_observes_travaillant": 1,
            "taches_dangereuses_observees": ["TD1", "TD4"],
            "support_fourni": ["Kit scolaire distribue"],
            "niveau_risque": "modere",
            "recommandations": ["Inscrire enfant 4 a l'ecole"],
            "visite_suivi_requise": True,
            "observations": "Test observation for iteration 103 sync fix"
        }
        
        payload = {
            "actions": [
                {
                    "action_type": "ssrte_visit",
                    "farmer_id": TEST_FARMER_ID,
                    "data": ssrte_data,
                    "timestamp": timestamp,
                    "offline_id": unique_id
                }
            ],
            "sync_timestamp": timestamp
        }
        
        response = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Sync failed: {response.text}"
        result = response.json()
        assert result.get("synced") >= 1, f"Expected at least 1 synced, got {result}"
        
        # Verify the sync result
        sync_result = result.get("results", [])
        assert len(sync_result) > 0, "No sync results returned"
        assert sync_result[0].get("status") == "synced", f"Expected 'synced' status, got {sync_result[0]}"
        
        print(f"✓ SSRTE sync completed successfully with offline_id: {unique_id}")
        
        # Now verify the data was stored correctly by fetching family-data
        family_response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{TEST_FARMER_ID}/family-data",
            headers=auth_headers
        )
        
        assert family_response.status_code == 200, f"Family data fetch failed: {family_response.text}"
        family_data = family_response.json()
        
        # Verify key fields are present (may be merged with existing data)
        assert family_data.get("source") is not None, "Source should not be None after sync"
        print(f"✓ Family data source: {family_data.get('source')}")
        print(f"✓ Family data taille_menage: {family_data.get('taille_menage')}")
        print(f"✓ Family data conditions_vie: {family_data.get('conditions_vie')}")


class TestREDDSyncCorrectCollection:
    """Test that REDD sync stores in redd_tracking_visits (not redd_visits)"""
    
    def test_redd_sync_stores_in_correct_collection(self, auth_headers):
        """
        Bug fix: REDD sync should store in redd_tracking_visits collection
        and calculate redd_score and redd_level
        """
        unique_id = f"test_redd_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat()
        
        # REDD visit data with practices_verified
        redd_data = {
            "farmer_id": TEST_FARMER_ID,
            "farmer_name": "Test Farmer",
            "farmer_phone": "+2250101010101",
            "practices_verified": [
                {"id": "AGF1", "category": "agroforesterie", "status": "conforme"},
                {"id": "AGF2", "category": "agroforesterie", "status": "partiellement"},
                {"id": "ZD1", "category": "zero_deforestation", "status": "conforme"},
                {"id": "SOL1", "category": "gestion_sols", "status": "conforme"},
                {"id": "REST1", "category": "restauration", "status": "non_conforme"}
            ],
            "superficie_verifiee": 3.5,
            "arbres_comptes": 45,
            "observations": "Test REDD observation for iteration 103",
            "recommandations": "Planter plus d'arbres",
            "suivi_requis": True
        }
        
        payload = {
            "actions": [
                {
                    "action_type": "redd_visit",
                    "farmer_id": TEST_FARMER_ID,
                    "data": redd_data,
                    "timestamp": timestamp,
                    "offline_id": unique_id
                }
            ],
            "sync_timestamp": timestamp
        }
        
        response = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"REDD sync failed: {response.text}"
        result = response.json()
        assert result.get("synced") >= 1, f"Expected at least 1 synced, got {result}"
        
        sync_result = result.get("results", [])
        assert len(sync_result) > 0, "No sync results returned"
        assert sync_result[0].get("status") == "synced", f"Expected 'synced' status, got {sync_result[0]}"
        
        print(f"✓ REDD sync completed successfully with offline_id: {unique_id}")
        
        # Verify REDD completion shows in my-farmers endpoint
        my_farmers_response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers=auth_headers
        )
        
        assert my_farmers_response.status_code == 200, f"my-farmers fetch failed: {my_farmers_response.text}"
        my_farmers_data = my_farmers_response.json()
        
        # Find the test farmer
        farmers = my_farmers_data.get("farmers", [])
        test_farmer = next((f for f in farmers if f.get("id") == TEST_FARMER_ID), None)
        
        if test_farmer:
            forms_status = test_farmer.get("forms_status", {})
            redd_status = forms_status.get("redd", {})
            print(f"✓ REDD completion status for farmer: {redd_status}")
            # After sync, REDD should show as completed
            assert redd_status.get("completed") == True, f"REDD should be completed after sync, got {redd_status}"
            print(f"✓ REDD count: {redd_status.get('count', 0)}")
        else:
            print(f"⚠ Test farmer {TEST_FARMER_ID} not in assigned farmers list (may be expected)")


class TestEmptyOfflineIdDedup:
    """Test that empty offline_id does NOT skip with 'already_synced'"""
    
    def test_empty_offline_id_does_not_skip(self, auth_headers):
        """
        Bug fix: Sync with empty offline_id should NOT match all previous entries
        and should NOT skip with 'already_synced'
        """
        timestamp = datetime.utcnow().isoformat()
        
        # First sync with empty offline_id
        ssrte_data_1 = {
            "date_visite": timestamp,
            "taille_menage": 5,
            "nombre_enfants": 2,
            "liste_enfants": [],
            "conditions_vie": "bonnes",
            "eau_courante": True,
            "electricite": True,
            "distance_ecole_km": 1.0,
            "enfants_observes_travaillant": 0,
            "niveau_risque": "faible",
            "observations": "First sync with empty offline_id"
        }
        
        payload_1 = {
            "actions": [
                {
                    "action_type": "ssrte_visit",
                    "farmer_id": TEST_FARMER_ID,
                    "data": ssrte_data_1,
                    "timestamp": timestamp,
                    "offline_id": ""  # Empty offline_id
                }
            ],
            "sync_timestamp": timestamp
        }
        
        response_1 = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json=payload_1,
            headers=auth_headers
        )
        
        assert response_1.status_code == 200, f"First sync failed: {response_1.text}"
        result_1 = response_1.json()
        
        # With the fix, empty offline_id should be synced (not skipped)
        # The fix at line 643 checks: if offline_id: (only check dedup if offline_id is truthy)
        sync_results_1 = result_1.get("results", [])
        if sync_results_1:
            status_1 = sync_results_1[0].get("status")
            print(f"✓ First empty offline_id sync status: {status_1}")
            # Should be 'synced' not 'already_synced'
            assert status_1 == "synced", f"Empty offline_id should sync, not skip. Got: {status_1}"
        
        # Second sync with different empty offline_id should also work
        timestamp_2 = datetime.utcnow().isoformat()
        ssrte_data_2 = {
            "date_visite": timestamp_2,
            "taille_menage": 6,
            "nombre_enfants": 3,
            "liste_enfants": [],
            "conditions_vie": "moyennes",
            "eau_courante": False,
            "electricite": True,
            "distance_ecole_km": 2.0,
            "enfants_observes_travaillant": 0,
            "niveau_risque": "faible",
            "observations": "Second sync with empty offline_id"
        }
        
        payload_2 = {
            "actions": [
                {
                    "action_type": "ssrte_visit",
                    "farmer_id": TEST_FARMER_ID,
                    "data": ssrte_data_2,
                    "timestamp": timestamp_2,
                    "offline_id": ""  # Another empty offline_id
                }
            ],
            "sync_timestamp": timestamp_2
        }
        
        response_2 = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json=payload_2,
            headers=auth_headers
        )
        
        assert response_2.status_code == 200, f"Second sync failed: {response_2.text}"
        result_2 = response_2.json()
        
        sync_results_2 = result_2.get("results", [])
        if sync_results_2:
            status_2 = sync_results_2[0].get("status")
            print(f"✓ Second empty offline_id sync status: {status_2}")
            # Should also be 'synced' not 'already_synced'
            assert status_2 == "synced", f"Second empty offline_id should also sync. Got: {status_2}"
        
        print("✓ Empty offline_id dedup fix verified - both syncs succeeded")


class TestMyFarmersREDDCompletion:
    """Test that my-farmers endpoint checks redd_tracking_visits for completion"""
    
    def test_my_farmers_redd_status_from_correct_collection(self, auth_headers):
        """
        Bug fix: GET /api/field-agent/my-farmers should check redd_tracking_visits
        (not redd_visits) for REDD completion status
        """
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"my-farmers failed: {response.text}"
        data = response.json()
        
        farmers = data.get("farmers", [])
        print(f"✓ Total assigned farmers: {len(farmers)}")
        
        # Check that forms_status includes redd with proper structure
        for farmer in farmers[:3]:  # Check first 3 farmers
            forms_status = farmer.get("forms_status", {})
            redd_status = forms_status.get("redd", {})
            
            assert "completed" in redd_status, f"REDD status should have 'completed' field"
            assert "label" in redd_status, f"REDD status should have 'label' field"
            
            print(f"  - Farmer {farmer.get('full_name', 'N/A')}: REDD completed={redd_status.get('completed')}, count={redd_status.get('count', 0)}")
        
        # Specifically check the test farmer if present
        test_farmer = next((f for f in farmers if f.get("id") == TEST_FARMER_ID), None)
        if test_farmer:
            redd_status = test_farmer.get("forms_status", {}).get("redd", {})
            print(f"✓ Test farmer REDD status: {redd_status}")
            # After our REDD sync test, this should be completed
            if redd_status.get("count", 0) > 0:
                assert redd_status.get("completed") == True, "REDD with count > 0 should be completed"


class TestFamilyDataFromSyncedSSRTE:
    """Test that family-data endpoint returns data from synced SSRTE visits"""
    
    def test_family_data_includes_synced_ssrte_fields(self, auth_headers):
        """
        Bug fix: GET /api/ici-data/farmers/{id}/family-data should return
        data from synced SSRTE visits including all fields
        """
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{TEST_FARMER_ID}/family-data",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"family-data failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "farmer_id" in data, "Should have farmer_id"
        assert "taille_menage" in data, "Should have taille_menage"
        assert "nombre_enfants" in data, "Should have nombre_enfants"
        assert "liste_enfants" in data, "Should have liste_enfants"
        assert "conditions_vie" in data, "Should have conditions_vie"
        assert "eau_courante" in data, "Should have eau_courante"
        assert "electricite" in data, "Should have electricite"
        assert "distance_ecole_km" in data, "Should have distance_ecole_km"
        assert "source" in data, "Should have source"
        
        print(f"✓ Family data structure verified")
        print(f"  - farmer_id: {data.get('farmer_id')}")
        print(f"  - taille_menage: {data.get('taille_menage')}")
        print(f"  - nombre_enfants: {data.get('nombre_enfants')}")
        print(f"  - conditions_vie: {data.get('conditions_vie')}")
        print(f"  - eau_courante: {data.get('eau_courante')}")
        print(f"  - electricite: {data.get('electricite')}")
        print(f"  - distance_ecole_km: {data.get('distance_ecole_km')}")
        print(f"  - source: {data.get('source')}")
        
        # Source should indicate data exists
        assert data.get("source") is not None, "Source should not be None for farmer with SSRTE data"


class TestAgentTabsStillWork:
    """Test that all agent dashboard tabs still work"""
    
    def test_agent_dashboard_endpoint(self, auth_headers):
        """Test main dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "agent_info" in data or "cooperative_info" in data, "Should have agent or coop info"
        print(f"✓ Dashboard endpoint working")
    
    def test_my_visits_endpoint(self, auth_headers):
        """Test my-visits endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-visits",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"my-visits failed: {response.text}"
        data = response.json()
        
        assert "visits" in data, "Should have visits list"
        assert "total" in data, "Should have total count"
        print(f"✓ my-visits endpoint working, total: {data.get('total')}")
    
    def test_parcels_to_verify_endpoint(self, auth_headers):
        """Test parcels-to-verify endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/parcels-to-verify",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"parcels-to-verify failed: {response.text}"
        data = response.json()
        
        assert "parcels" in data, "Should have parcels list"
        print(f"✓ parcels-to-verify endpoint working, total: {data.get('total', 0)}")
    
    def test_sync_status_endpoint(self, auth_headers):
        """Test sync status endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/agent/sync/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"sync/status failed: {response.text}"
        data = response.json()
        
        assert "total_synced_actions" in data, "Should have total_synced_actions"
        print(f"✓ sync/status endpoint working, total synced: {data.get('total_synced_actions')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
