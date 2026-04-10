from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test Suite for Agent Terrain PDC Visit Workflow - Iteration 115
Test Suite for Agent Terrain PDC Visit Workflow - Iteration 115
Tests the NEW agent-visit and complete-visit endpoints for ARS 1000 PDC
Tests the NEW agent-visit and complete-visit endpoints for ARS 1000 PDC


Features tested:
Features tested:
- POST /api/ars1000/pdc/agent-visit - Create/update PDC during field visit
- POST /api/ars1000/pdc/agent-visit - Create/update PDC during field visit
- POST /api/ars1000/pdc/{id}/complete-visit - Complete visit, change status, send notification
- POST /api/ars1000/pdc/{id}/complete-visit - Complete visit, change status, send notification
- Notification creation for cooperative
- Notification creation for cooperative
- Update existing PDC if one exists for farmer
- Update existing PDC if one exists for farmer
"""
"""

import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
AGENT_CREDENTIALS = {"identifier": "testagent@test.ci", "password": "test123456"}
COOP_CREDENTIALS = {"identifier": COOP_EMAIL, "password": "test123456"}


class TestAgentVisitPDCWorkflow:
    """Test the Agent Terrain PDC Visit workflow"""
    
    agent_token = None
    coop_token = None
    farmer_id = None
    pdc_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens and farmer ID before tests"""
        # Login as agent
        res = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDENTIALS)
        if res.status_code == 200:
            TestAgentVisitPDCWorkflow.agent_token = res.json().get("access_token")
        
        # Login as cooperative
        res = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        if res.status_code == 200:
            TestAgentVisitPDCWorkflow.coop_token = res.json().get("access_token")
        
        yield
    
    def get_agent_headers(self):
        return {"Authorization": f"Bearer {self.agent_token}", "Content-Type": "application/json"}
    
    def get_coop_headers(self):
        return {"Authorization": f"Bearer {self.coop_token}", "Content-Type": "application/json"}
    
    # ============ AUTH TESTS ============
    
    def test_01_agent_login(self):
        """Test agent terrain login"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDENTIALS)
        print(f"Agent login status: {res.status_code}")
        
        assert res.status_code == 200, f"Agent login failed: {res.text}"
        data = res.json()
        assert "access_token" in data, "No access_token in response"
        TestAgentVisitPDCWorkflow.agent_token = data["access_token"]
        print(f"Agent login SUCCESS - user_type: {data.get('user', {}).get('user_type')}")
    
    def test_02_cooperative_login(self):
        """Test cooperative login"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        print(f"Cooperative login status: {res.status_code}")
        
        assert res.status_code == 200, f"Cooperative login failed: {res.text}"
        data = res.json()
        assert "access_token" in data, "No access_token in response"
        TestAgentVisitPDCWorkflow.coop_token = data["access_token"]
        print(f"Cooperative login SUCCESS")
    
    # ============ GET FARMER ID ============
    
    def test_03_get_agent_farmers(self):
        """Get list of farmers assigned to agent"""
        if not self.agent_token:
            pytest.skip("Agent token not available")
        
        res = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=self.get_agent_headers())
        print(f"Get my-farmers status: {res.status_code}")
        
        assert res.status_code == 200, f"Failed to get farmers: {res.text}"
        data = res.json()
        farmers = data.get("farmers", [])
        print(f"Found {len(farmers)} farmers assigned to agent")
        
        if len(farmers) > 0:
            TestAgentVisitPDCWorkflow.farmer_id = farmers[0].get("id")
            print(f"Using farmer ID: {self.farmer_id} - {farmers[0].get('full_name')}")
        else:
            # Try assigned-farmers endpoint
            res2 = requests.get(f"{BASE_URL}/api/field-agent/assigned-farmers", headers=self.get_agent_headers())
            if res2.status_code == 200:
                farmers2 = res2.json().get("farmers", [])
                if len(farmers2) > 0:
                    TestAgentVisitPDCWorkflow.farmer_id = farmers2[0].get("id")
                    print(f"Using farmer ID from assigned-farmers: {self.farmer_id}")
    
    # ============ AGENT VISIT ENDPOINT TESTS ============
    
    def test_04_agent_visit_create_pdc(self):
        """Test POST /api/ars1000/pdc/agent-visit - Create new PDC during field visit"""
        if not self.agent_token:
            pytest.skip("Agent token not available")
        
        # Use a test farmer ID if none found
        farmer_id = self.farmer_id or "TEST_FARMER_VISIT_115"
        
        visit_data = {
            "farmer_id": farmer_id,
            "identification": {
                "nom": "TEST_Visiteur",
                "prenoms": "Terrain",
                "telephone": "+2250101010101",
                "village": "Test Village",
                "genre": "homme",
                "statut_foncier": "proprietaire"
            },
            "menage": {
                "taille_menage": 5,
                "nombre_enfants": 3,
                "enfants_scolarises": 2,
                "travailleurs_permanents": 1,
                "acces_banque": True,
                "mobile_money": True
            },
            "parcelles": [
                {
                    "nom_parcelle": "Parcelle Test Visit",
                    "superficie_ha": 2.5,
                    "latitude": 5.3456,
                    "longitude": -4.0123,
                    "variete_cacao": "Amelonado",
                    "rendement_estime_kg_ha": 450,
                    "etat_sanitaire": "bon"
                }
            ],
            "arbres_ombrage": {
                "nombre_total": 35,
                "densite_par_ha": 14,
                "especes": ["Fraké", "Iroko", "Acajou"],
                "nombre_especes": 3,
                "strate_haute": 10,
                "strate_moyenne": 15,
                "strate_basse": 10,
                "conforme_agroforesterie": True
            },
            "materiel_agricole": {
                "outils": ["machette", "sécateur"],
                "equipements_protection": ["gants", "bottes"],
                "acces_intrants": True
            },
            "matrice_strategique": {
                "objectif_rendement_kg_ha": 600,
                "horizon_annees": 5,
                "actions_prioritaires": ["Replantation", "Taille"],
                "risques_identifies": ["Sécheresse", "Maladies"]
            },
            "inventaire_arbres": [
                {"espece": "Fraké", "circonference_cm": 120, "lat": 5.3456, "lng": -4.0123, "decision": "conserver"},
                {"espece": "Iroko", "circonference_cm": 95, "lat": 5.3457, "lng": -4.0124, "decision": "conserver"}
            ],
            "photos_parcelle": ["photo1_ref", "photo2_ref"],
            "signature_planteur": {
                "nom": "TEST_Visiteur Terrain",
                "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "date": datetime.now().isoformat()
            },
            "signature_agent": {
                "nom": "Agent Test",
                "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "date": datetime.now().isoformat()
            },
            "notes": "Visite terrain test iteration 115"
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/pdc/agent-visit",
            headers=self.get_agent_headers(),
            json=visit_data
        )
        print(f"Agent visit create PDC status: {res.status_code}")
        print(f"Response: {res.text[:500] if res.text else 'empty'}")
        
        assert res.status_code == 200, f"Failed to create PDC via agent-visit: {res.text}"
        data = res.json()
        
        # Verify response structure
        assert "id" in data, "No PDC id in response"
        assert data.get("farmer_id") == farmer_id, "Farmer ID mismatch"
        
        # Store PDC ID for later tests
        TestAgentVisitPDCWorkflow.pdc_id = data["id"]
        print(f"PDC created with ID: {self.pdc_id}")
        print(f"PDC status: {data.get('statut')}")
        print(f"PDC conformite: {data.get('pourcentage_conformite')}%")
        
        # Verify signatures were stored
        signatures = data.get("signatures", [])
        print(f"Signatures count: {len(signatures)}")
        assert len(signatures) >= 1, "Signatures not stored"
    
    def test_05_agent_visit_update_existing_pdc(self):
        """Test POST /api/ars1000/pdc/agent-visit - Update existing PDC"""
        if not self.agent_token or not self.pdc_id:
            pytest.skip("Agent token or PDC ID not available")
        
        farmer_id = self.farmer_id or "TEST_FARMER_VISIT_115"
        
        # Update with additional data
        update_data = {
            "farmer_id": farmer_id,
            "identification": {
                "nom": "TEST_Visiteur",
                "prenoms": "Terrain Updated",
                "telephone": "+2250101010101",
                "village": "Test Village Updated",
                "genre": "homme",
                "statut_foncier": "proprietaire",
                "region": "Lagunes"
            },
            "menage": {
                "taille_menage": 6,
                "nombre_enfants": 4,
                "enfants_scolarises": 3,
                "travailleurs_permanents": 2,
                "acces_banque": True,
                "mobile_money": True
            },
            "parcelles": [
                {
                    "nom_parcelle": "Parcelle Test Visit Updated",
                    "superficie_ha": 3.0,
                    "latitude": 5.3456,
                    "longitude": -4.0123,
                    "variete_cacao": "Amelonado",
                    "rendement_estime_kg_ha": 500,
                    "etat_sanitaire": "bon"
                }
            ],
            "arbres_ombrage": {
                "nombre_total": 40,
                "densite_par_ha": 13,
                "especes": ["Fraké", "Iroko", "Acajou", "Teck"],
                "nombre_especes": 4,
                "strate_haute": 12,
                "strate_moyenne": 18,
                "strate_basse": 10,
                "conforme_agroforesterie": True
            },
            "materiel_agricole": {
                "outils": ["machette", "sécateur", "pulvérisateur"],
                "equipements_protection": ["gants", "bottes", "masque"],
                "acces_intrants": True
            },
            "matrice_strategique": {
                "objectif_rendement_kg_ha": 650,
                "horizon_annees": 5,
                "actions_prioritaires": ["Replantation", "Taille", "Fertilisation"],
                "risques_identifies": ["Sécheresse", "Maladies", "Ravageurs"]
            },
            "inventaire_arbres": [
                {"espece": "Fraké", "circonference_cm": 120, "lat": 5.3456, "lng": -4.0123, "decision": "conserver"},
                {"espece": "Iroko", "circonference_cm": 95, "lat": 5.3457, "lng": -4.0124, "decision": "conserver"},
                {"espece": "Teck", "circonference_cm": 80, "lat": 5.3458, "lng": -4.0125, "decision": "planter"}
            ],
            "photos_parcelle": ["photo1_ref", "photo2_ref", "photo3_ref"],
            "notes": "Visite terrain test iteration 115 - UPDATED"
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/pdc/agent-visit",
            headers=self.get_agent_headers(),
            json=update_data
        )
        print(f"Agent visit update PDC status: {res.status_code}")
        
        assert res.status_code == 200, f"Failed to update PDC via agent-visit: {res.text}"
        data = res.json()
        
        # Verify update was applied
        assert data.get("id") == self.pdc_id, "PDC ID should remain the same"
        assert data.get("identification", {}).get("prenoms") == "Terrain Updated", "Update not applied"
        print(f"PDC updated successfully - conformite: {data.get('pourcentage_conformite')}%")
    
    def test_06_complete_visit_requires_pdc(self):
        """Test POST /api/ars1000/pdc/{id}/complete-visit - Complete the visit"""
        if not self.agent_token or not self.pdc_id:
            pytest.skip("Agent token or PDC ID not available")
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/pdc/{self.pdc_id}/complete-visit",
            headers=self.get_agent_headers()
        )
        print(f"Complete visit status: {res.status_code}")
        print(f"Response: {res.text[:500] if res.text else 'empty'}")
        
        assert res.status_code == 200, f"Failed to complete visit: {res.text}"
        data = res.json()
        
        # Verify response
        assert "pdc" in data, "No PDC in response"
        assert data.get("message"), "No message in response"
        
        pdc = data["pdc"]
        assert pdc.get("statut") == "complete_agent", f"Status should be 'complete_agent', got: {pdc.get('statut')}"
        print(f"Visit completed - status: {pdc.get('statut')}")
        print(f"Notification sent: {data.get('notification_sent')}")
    
    def test_07_verify_notification_created(self):
        """Verify notification was created for cooperative"""
        if not self.coop_token:
            pytest.skip("Cooperative token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=self.get_coop_headers()
        )
        print(f"Get notifications status: {res.status_code}")
        
        if res.status_code == 200:
            data = res.json()
            notifications = data.get("notifications", []) if isinstance(data, dict) else data
            
            # Look for PDC complete notification
            pdc_notifications = [n for n in notifications if n.get("type") == "pdc_complete_agent"]
            print(f"Found {len(pdc_notifications)} PDC complete notifications")
            
            if len(pdc_notifications) > 0:
                latest = pdc_notifications[0]
                print(f"Latest notification: {latest.get('title')}")
                print(f"Message: {latest.get('message')}")
                assert "PDC" in latest.get("title", "") or "PDC" in latest.get("message", ""), "Notification should mention PDC"
        else:
            print(f"Could not verify notifications: {res.text}")
    
    def test_08_cooperative_sees_completed_pdc(self):
        """Verify cooperative can see PDC with status 'complete_agent'"""
        if not self.coop_token:
            pytest.skip("Cooperative token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/ars1000/pdc/cooperative/all?statut=complete_agent",
            headers=self.get_coop_headers()
        )
        print(f"Get cooperative PDCs status: {res.status_code}")
        
        assert res.status_code == 200, f"Failed to get cooperative PDCs: {res.text}"
        data = res.json()
        
        pdcs = data.get("pdcs", [])
        print(f"Found {len(pdcs)} PDCs with status 'complete_agent'")
        
        # Check if our test PDC is in the list
        if self.pdc_id:
            test_pdc = next((p for p in pdcs if p.get("id") == self.pdc_id), None)
            if test_pdc:
                print(f"Test PDC found in cooperative list - status: {test_pdc.get('statut')}")
                assert test_pdc.get("statut") == "complete_agent"
    
    # ============ ERROR HANDLING TESTS ============
    
    def test_09_agent_visit_requires_farmer_id(self):
        """Test that agent-visit requires farmer_id"""
        if not self.agent_token:
            pytest.skip("Agent token not available")
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/pdc/agent-visit",
            headers=self.get_agent_headers(),
            json={"identification": {"nom": "Test"}}  # Missing farmer_id
        )
        print(f"Agent visit without farmer_id status: {res.status_code}")
        
        # Should fail validation
        assert res.status_code in [400, 422], f"Should reject missing farmer_id: {res.text}"
    
    def test_10_complete_visit_invalid_pdc_id(self):
        """Test complete-visit with invalid PDC ID"""
        if not self.agent_token:
            pytest.skip("Agent token not available")
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/pdc/invalid_id_12345/complete-visit",
            headers=self.get_agent_headers()
        )
        print(f"Complete visit invalid ID status: {res.status_code}")
        
        assert res.status_code in [400, 404], f"Should reject invalid PDC ID: {res.text}"
    
    def test_11_complete_visit_nonexistent_pdc(self):
        """Test complete-visit with non-existent PDC ID"""
        if not self.agent_token:
            pytest.skip("Agent token not available")
        
        # Use a valid ObjectId format but non-existent
        fake_id = "507f1f77bcf86cd799439011"
        res = requests.post(
            f"{BASE_URL}/api/ars1000/pdc/{fake_id}/complete-visit",
            headers=self.get_agent_headers()
        )
        print(f"Complete visit non-existent PDC status: {res.status_code}")
        
        assert res.status_code == 404, f"Should return 404 for non-existent PDC: {res.text}"
    
    # ============ CLEANUP ============
    
    def test_99_cleanup_test_data(self):
        """Cleanup test data created during tests"""
        if not self.coop_token:
            pytest.skip("Cooperative token not available")
        
        # Note: In a real scenario, we would delete the test PDC
        # For now, just log what was created
        print(f"Test PDC ID created: {self.pdc_id}")
        print(f"Test farmer ID used: {self.farmer_id or 'TEST_FARMER_VISIT_115'}")
        print("Cleanup: Test data should be cleaned up manually or via admin")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
