"""
Iteration 119 - ARS 1000 Harvest Declarations & Registres Testing
Tests for:
1. Harvest declaration flow (farmer creates -> coop validates/rejects)
2. Enhanced registres (status management, delete, impartiality)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_CREDS = {"identifier": "bielaghana@gmail.com", "password": "test123456"}
FARMER_CREDS = {"identifier": "testplanteur@test.ci", "password": "test123456"}
ADMIN_CREDS = {"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"}


class TestAuth:
    """Authentication helpers"""
    
    @staticmethod
    def get_token(creds):
        """Get auth token for given credentials"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if res.status_code == 200:
            return res.json().get("access_token")
        return None
    
    @staticmethod
    def auth_headers(token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


class TestHarvestDeclarations:
    """Test harvest declaration endpoints (ARS 1000-2)"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        token = TestAuth.get_token(FARMER_CREDS)
        if not token:
            pytest.skip("Farmer authentication failed")
        return token
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        token = TestAuth.get_token(COOP_CREDS)
        if not token:
            pytest.skip("Cooperative authentication failed")
        return token
    
    def test_farmer_create_declaration(self, farmer_token):
        """Farmer creates a harvest declaration with quality checks"""
        payload = {
            "parcelle_nom": "TEST_Parcelle_Nord",
            "campagne": "2025-2026",
            "quantite_kg": 150,
            "unite": "kg",
            "type_cacao": "feves_sechees",
            "methode_sechage": "soleil",
            "duree_fermentation_jours": 6,
            "date_recolte": datetime.now().strftime("%Y-%m-%d"),
            "controle_qualite": {
                "humidite_estimee": "normale",
                "fermentation": "bonne",
                "corps_etrangers": False,
                "feves_moisies": False,
                "feves_germees": False,
                "aspect_visuel": "bon",
                "odeur": "normale",
                "observations": "Test declaration"
            },
            "notes": "Test harvest declaration"
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/recoltes/declaration",
            headers=TestAuth.auth_headers(farmer_token),
            json=payload
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain id"
        assert "grade_ferme" in data, "Response should contain grade_ferme"
        assert data["statut"] == "en_attente", "Initial status should be en_attente"
        assert data["parcelle_nom"] == "TEST_Parcelle_Nord"
        assert data["quantite_kg"] == 150
        
        # Verify grade calculation
        grade = data["grade_ferme"]
        assert "grade" in grade, "Grade should have grade field"
        assert grade["grade"] in ["A", "B", "C", "D"], f"Grade should be A/B/C/D, got {grade['grade']}"
        assert "pourcentage" in grade, "Grade should have pourcentage"
        
        # Store for later tests
        TestHarvestDeclarations.created_declaration_id = data["id"]
        print(f"Created declaration: {data['id']} with grade {grade['grade']}")
    
    def test_farmer_list_declarations(self, farmer_token):
        """Farmer lists their declarations with stats"""
        res = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/declarations",
            headers=TestAuth.auth_headers(farmer_token)
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert "declarations" in data, "Response should contain declarations"
        assert "stats" in data, "Response should contain stats"
        assert "total" in data, "Response should contain total"
        
        # Verify stats structure
        stats = data["stats"]
        assert "en_attente" in stats
        assert "validee" in stats
        assert "rejetee" in stats
        assert "total_kg" in stats
        
        print(f"Farmer has {data['total']} declarations, stats: {stats}")
    
    def test_coop_list_declarations(self, coop_token):
        """Cooperative lists all declarations from their farmers"""
        res = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/declarations",
            headers=TestAuth.auth_headers(coop_token)
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert "declarations" in data
        assert "stats" in data
        print(f"Coop sees {data['total']} declarations")
    
    def test_coop_validate_declaration(self, coop_token, farmer_token):
        """Cooperative validates a harvest declaration"""
        # First create a new declaration to validate
        payload = {
            "parcelle_nom": "TEST_Parcelle_Validation",
            "campagne": "2025-2026",
            "quantite_kg": 100,
            "unite": "kg",
            "type_cacao": "feves_sechees",
            "methode_sechage": "soleil",
            "duree_fermentation_jours": 5,
            "controle_qualite": {
                "humidite_estimee": "seche",
                "fermentation": "bonne",
                "corps_etrangers": False,
                "feves_moisies": False,
                "feves_germees": False,
                "aspect_visuel": "bon",
                "odeur": "normale"
            }
        }
        
        create_res = requests.post(
            f"{BASE_URL}/api/ars1000/recoltes/declaration",
            headers=TestAuth.auth_headers(farmer_token),
            json=payload
        )
        assert create_res.status_code == 200
        decl_id = create_res.json()["id"]
        
        # Now validate it
        validate_res = requests.put(
            f"{BASE_URL}/api/ars1000/recoltes/declarations/{decl_id}/validate",
            headers=TestAuth.auth_headers(coop_token),
            json={"controle_coop": {"notes": "Validated by coop"}}
        )
        
        assert validate_res.status_code == 200, f"Expected 200, got {validate_res.status_code}: {validate_res.text}"
        data = validate_res.json()
        assert "message" in data
        assert "validée" in data["message"].lower() or "validee" in data["message"].lower()
        
        # Verify the declaration is now validated
        get_res = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/declarations/{decl_id}",
            headers=TestAuth.auth_headers(coop_token)
        )
        assert get_res.status_code == 200
        assert get_res.json()["statut"] == "validee"
        
        print(f"Declaration {decl_id} validated successfully")
    
    def test_coop_reject_declaration(self, coop_token, farmer_token):
        """Cooperative rejects a harvest declaration with motif"""
        # Create a new declaration to reject
        payload = {
            "parcelle_nom": "TEST_Parcelle_Rejet",
            "campagne": "2025-2026",
            "quantite_kg": 50,
            "unite": "kg",
            "type_cacao": "feves_sechees",
            "methode_sechage": "soleil",
            "duree_fermentation_jours": 2,
            "controle_qualite": {
                "humidite_estimee": "humide",
                "fermentation": "mauvaise",
                "corps_etrangers": True,
                "feves_moisies": True,
                "feves_germees": False,
                "aspect_visuel": "mauvais",
                "odeur": "moisie"
            }
        }
        
        create_res = requests.post(
            f"{BASE_URL}/api/ars1000/recoltes/declaration",
            headers=TestAuth.auth_headers(farmer_token),
            json=payload
        )
        assert create_res.status_code == 200
        decl_id = create_res.json()["id"]
        
        # Reject it
        reject_res = requests.put(
            f"{BASE_URL}/api/ars1000/recoltes/declarations/{decl_id}/reject",
            headers=TestAuth.auth_headers(coop_token),
            json={"motif": "Qualité insuffisante - trop humide et moisissures détectées"}
        )
        
        assert reject_res.status_code == 200, f"Expected 200, got {reject_res.status_code}: {reject_res.text}"
        data = reject_res.json()
        assert "message" in data
        
        # Verify the declaration is now rejected
        get_res = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/declarations/{decl_id}",
            headers=TestAuth.auth_headers(coop_token)
        )
        assert get_res.status_code == 200
        decl = get_res.json()
        assert decl["statut"] == "rejetee"
        assert "motif_rejet" in decl
        
        print(f"Declaration {decl_id} rejected with motif")
    
    def test_cannot_validate_already_processed(self, coop_token, farmer_token):
        """Cannot validate/reject an already processed declaration"""
        # Create and validate a declaration
        payload = {
            "parcelle_nom": "TEST_Parcelle_Double",
            "campagne": "2025-2026",
            "quantite_kg": 75,
            "unite": "kg",
            "type_cacao": "feves_sechees",
            "controle_qualite": {"humidite_estimee": "normale", "fermentation": "bonne"}
        }
        
        create_res = requests.post(
            f"{BASE_URL}/api/ars1000/recoltes/declaration",
            headers=TestAuth.auth_headers(farmer_token),
            json=payload
        )
        decl_id = create_res.json()["id"]
        
        # Validate it first
        requests.put(
            f"{BASE_URL}/api/ars1000/recoltes/declarations/{decl_id}/validate",
            headers=TestAuth.auth_headers(coop_token)
        )
        
        # Try to validate again - should fail
        res = requests.put(
            f"{BASE_URL}/api/ars1000/recoltes/declarations/{decl_id}/validate",
            headers=TestAuth.auth_headers(coop_token)
        )
        assert res.status_code == 400, f"Expected 400 for already processed, got {res.status_code}"
        
        print("Correctly prevented double validation")
    
    def test_farmer_cannot_validate(self, farmer_token):
        """Farmer cannot validate declarations (only coop can)"""
        # Try to validate with farmer token
        res = requests.put(
            f"{BASE_URL}/api/ars1000/recoltes/declarations/some_id/validate",
            headers=TestAuth.auth_headers(farmer_token)
        )
        assert res.status_code == 403, f"Expected 403 for farmer, got {res.status_code}"
        print("Correctly prevented farmer from validating")


class TestReclamationStatusManagement:
    """Test reclamation status update and delete endpoints"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        token = TestAuth.get_token(COOP_CREDS)
        if not token:
            pytest.skip("Cooperative authentication failed")
        return token
    
    def test_add_reclamation(self, coop_token):
        """Add a reclamation for testing"""
        payload = {
            "objet": "TEST_Reclamation_Status",
            "description": "Test reclamation for status management",
            "plaignant": "Test Plaignant",
            "priorite": "haute"
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/certification/reclamation",
            headers=TestAuth.auth_headers(coop_token),
            json=payload
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "reclamation" in data
        assert "id" in data["reclamation"]
        
        TestReclamationStatusManagement.rec_id = data["reclamation"]["id"]
        print(f"Created reclamation: {TestReclamationStatusManagement.rec_id}")
    
    def test_update_reclamation_status_en_cours(self, coop_token):
        """Update reclamation status to en_cours"""
        rec_id = getattr(TestReclamationStatusManagement, 'rec_id', None)
        if not rec_id:
            pytest.skip("No reclamation ID available")
        
        res = requests.put(
            f"{BASE_URL}/api/ars1000/certification/reclamation/{rec_id}/status",
            headers=TestAuth.auth_headers(coop_token),
            json={"statut": "en_cours", "actions_prises": "Investigation en cours"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "en_cours" in data["message"]
        print(f"Reclamation status updated to en_cours")
    
    def test_update_reclamation_status_resolue(self, coop_token):
        """Update reclamation status to resolue"""
        rec_id = getattr(TestReclamationStatusManagement, 'rec_id', None)
        if not rec_id:
            pytest.skip("No reclamation ID available")
        
        res = requests.put(
            f"{BASE_URL}/api/ars1000/certification/reclamation/{rec_id}/status",
            headers=TestAuth.auth_headers(coop_token),
            json={"statut": "resolue", "actions_prises": "Problème résolu"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print(f"Reclamation status updated to resolue")
    
    def test_update_reclamation_invalid_status(self, coop_token):
        """Invalid status should return 400"""
        rec_id = getattr(TestReclamationStatusManagement, 'rec_id', None)
        if not rec_id:
            pytest.skip("No reclamation ID available")
        
        res = requests.put(
            f"{BASE_URL}/api/ars1000/certification/reclamation/{rec_id}/status",
            headers=TestAuth.auth_headers(coop_token),
            json={"statut": "invalid_status"}
        )
        
        assert res.status_code == 400, f"Expected 400 for invalid status, got {res.status_code}"
        print("Correctly rejected invalid status")
    
    def test_delete_reclamation(self, coop_token):
        """Delete a reclamation"""
        # Create a new one to delete
        payload = {
            "objet": "TEST_Reclamation_Delete",
            "description": "To be deleted",
            "plaignant": "Test",
            "priorite": "basse"
        }
        
        create_res = requests.post(
            f"{BASE_URL}/api/ars1000/certification/reclamation",
            headers=TestAuth.auth_headers(coop_token),
            json=payload
        )
        rec_id = create_res.json()["reclamation"]["id"]
        
        # Delete it
        delete_res = requests.delete(
            f"{BASE_URL}/api/ars1000/certification/reclamation/{rec_id}",
            headers=TestAuth.auth_headers(coop_token)
        )
        
        assert delete_res.status_code == 200, f"Expected 200, got {delete_res.status_code}: {delete_res.text}"
        print(f"Reclamation {rec_id} deleted successfully")


class TestRisqueStatusManagement:
    """Test risque status update and delete endpoints"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        token = TestAuth.get_token(COOP_CREDS)
        if not token:
            pytest.skip("Cooperative authentication failed")
        return token
    
    def test_add_risque(self, coop_token):
        """Add a risque for testing"""
        payload = {
            "activite": "TEST_Activite_Risque",
            "risque_identifie": "Risque de test",
            "causes": "Causes de test",
            "consequences": "Conséquences de test",
            "probabilite": 3,
            "gravite": 4,
            "mesures_attenuation": "Mesures de test"
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/certification/risque",
            headers=TestAuth.auth_headers(coop_token),
            json=payload
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "risque" in data
        assert "id" in data["risque"]
        assert data["risque"]["score"] == 12  # 3 * 4
        
        TestRisqueStatusManagement.risque_id = data["risque"]["id"]
        print(f"Created risque: {TestRisqueStatusManagement.risque_id} with score 12")
    
    def test_update_risque_status_en_traitement(self, coop_token):
        """Update risque status to en_traitement"""
        risque_id = getattr(TestRisqueStatusManagement, 'risque_id', None)
        if not risque_id:
            pytest.skip("No risque ID available")
        
        res = requests.put(
            f"{BASE_URL}/api/ars1000/certification/risque/{risque_id}/status",
            headers=TestAuth.auth_headers(coop_token),
            json={"statut": "en_traitement"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print(f"Risque status updated to en_traitement")
    
    def test_update_risque_status_attenue(self, coop_token):
        """Update risque status to attenue"""
        risque_id = getattr(TestRisqueStatusManagement, 'risque_id', None)
        if not risque_id:
            pytest.skip("No risque ID available")
        
        res = requests.put(
            f"{BASE_URL}/api/ars1000/certification/risque/{risque_id}/status",
            headers=TestAuth.auth_headers(coop_token),
            json={"statut": "attenue"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print(f"Risque status updated to attenue")
    
    def test_update_risque_invalid_status(self, coop_token):
        """Invalid status should return 400"""
        risque_id = getattr(TestRisqueStatusManagement, 'risque_id', None)
        if not risque_id:
            pytest.skip("No risque ID available")
        
        res = requests.put(
            f"{BASE_URL}/api/ars1000/certification/risque/{risque_id}/status",
            headers=TestAuth.auth_headers(coop_token),
            json={"statut": "invalid_status"}
        )
        
        assert res.status_code == 400, f"Expected 400 for invalid status, got {res.status_code}"
        print("Correctly rejected invalid risque status")
    
    def test_delete_risque(self, coop_token):
        """Delete a risque"""
        # Create a new one to delete
        payload = {
            "activite": "TEST_Activite_Delete",
            "risque_identifie": "To be deleted",
            "probabilite": 1,
            "gravite": 1
        }
        
        create_res = requests.post(
            f"{BASE_URL}/api/ars1000/certification/risque",
            headers=TestAuth.auth_headers(coop_token),
            json=payload
        )
        risque_id = create_res.json()["risque"]["id"]
        
        # Delete it
        delete_res = requests.delete(
            f"{BASE_URL}/api/ars1000/certification/risque/{risque_id}",
            headers=TestAuth.auth_headers(coop_token)
        )
        
        assert delete_res.status_code == 200, f"Expected 200, got {delete_res.status_code}: {delete_res.text}"
        print(f"Risque {risque_id} deleted successfully")


class TestImpartialiteDeclarations:
    """Test impartiality declaration endpoints"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        token = TestAuth.get_token(COOP_CREDS)
        if not token:
            pytest.skip("Cooperative authentication failed")
        return token
    
    def test_add_impartialite_declaration(self, coop_token):
        """Add an impartiality declaration"""
        payload = {
            "signataire_nom": "TEST_Signataire",
            "signataire_fonction": "Directeur",
            "conflits_interets": "Aucun",
            "mesures_preventives": "Formation continue sur l'éthique"
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/certification/impartialite",
            headers=TestAuth.auth_headers(coop_token),
            json=payload
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "declaration" in data
        assert "id" in data["declaration"]
        assert data["declaration"]["signataire_nom"] == "TEST_Signataire"
        assert "date_signature" in data["declaration"]
        
        print(f"Created impartiality declaration: {data['declaration']['id']}")
    
    def test_list_impartialite_declarations(self, coop_token):
        """List impartiality declarations"""
        res = requests.get(
            f"{BASE_URL}/api/ars1000/certification/impartialite",
            headers=TestAuth.auth_headers(coop_token)
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert "declarations" in data
        assert isinstance(data["declarations"], list)
        
        print(f"Found {len(data['declarations'])} impartiality declarations")
    
    def test_farmer_cannot_add_impartialite(self):
        """Farmer cannot add impartiality declarations"""
        farmer_token = TestAuth.get_token(FARMER_CREDS)
        if not farmer_token:
            pytest.skip("Farmer authentication failed")
        
        payload = {
            "signataire_nom": "Farmer Test",
            "signataire_fonction": "Planteur"
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/certification/impartialite",
            headers=TestAuth.auth_headers(farmer_token),
            json=payload
        )
        
        assert res.status_code == 403, f"Expected 403 for farmer, got {res.status_code}"
        print("Correctly prevented farmer from adding impartiality declaration")


class TestGradeCalculation:
    """Test grade calculation logic"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        token = TestAuth.get_token(FARMER_CREDS)
        if not token:
            pytest.skip("Farmer authentication failed")
        return token
    
    def test_grade_a_excellent_quality(self, farmer_token):
        """Test Grade A for excellent quality"""
        payload = {
            "parcelle_nom": "TEST_Grade_A",
            "quantite_kg": 100,
            "controle_qualite": {
                "humidite_estimee": "seche",
                "fermentation": "bonne",
                "corps_etrangers": False,
                "feves_moisies": False,
                "feves_germees": False,
                "aspect_visuel": "bon",
                "odeur": "normale"
            }
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/recoltes/declaration",
            headers=TestAuth.auth_headers(farmer_token),
            json=payload
        )
        
        assert res.status_code == 200
        grade = res.json()["grade_ferme"]
        assert grade["grade"] == "A", f"Expected Grade A, got {grade['grade']}"
        assert grade["pourcentage"] >= 80
        print(f"Grade A confirmed: {grade['pourcentage']}%")
    
    def test_grade_d_poor_quality(self, farmer_token):
        """Test Grade D for poor quality"""
        payload = {
            "parcelle_nom": "TEST_Grade_D",
            "quantite_kg": 50,
            "controle_qualite": {
                "humidite_estimee": "humide",
                "fermentation": "mauvaise",
                "corps_etrangers": True,
                "feves_moisies": True,
                "feves_germees": True,
                "aspect_visuel": "mauvais",
                "odeur": "moisie"
            }
        }
        
        res = requests.post(
            f"{BASE_URL}/api/ars1000/recoltes/declaration",
            headers=TestAuth.auth_headers(farmer_token),
            json=payload
        )
        
        assert res.status_code == 200
        grade = res.json()["grade_ferme"]
        assert grade["grade"] == "D", f"Expected Grade D, got {grade['grade']}"
        assert grade["pourcentage"] < 40
        print(f"Grade D confirmed: {grade['pourcentage']}%")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
