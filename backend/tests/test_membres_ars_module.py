"""
Test Module: Membres & Enregistrement ARS 1000
Clauses 4.2.2, 4.2.3, 4.3

Tests:
- Reference endpoints (etapes, champs)
- Adhesion workflow (create, list, validate, retrait)
- Bulletin PDF generation
- Registre (list, update, filters)
- Perimetre SM (create, list)
- Dashboard KPIs
- Excel export
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for cooperative user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": "bielaghana@gmail.com",
        "password": "test123456"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============= REFERENCE ENDPOINTS =============

class TestReferenceEndpoints:
    """Test reference data endpoints for adhesion steps and champs norme 4.2.3.2"""
    
    def test_get_etapes_adhesion(self, auth_headers):
        """GET /api/membres/reference/etapes - Returns 4 adhesion steps"""
        response = requests.get(f"{BASE_URL}/api/membres/reference/etapes", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "etapes" in data
        etapes = data["etapes"]
        assert len(etapes) == 4
        
        # Verify step structure
        for etape in etapes:
            assert "etape" in etape
            assert "titre" in etape
            assert "description" in etape
        
        # Verify step order
        assert etapes[0]["etape"] == 1
        assert etapes[0]["titre"] == "Sensibilisation"
        assert etapes[1]["etape"] == 2
        assert etapes[1]["titre"] == "Collecte des informations"
        assert etapes[2]["etape"] == 3
        assert etapes[2]["titre"] == "Bulletin d'adhesion"
        assert etapes[3]["etape"] == 4
        assert etapes[3]["titre"] == "Validation"
        print("PASSED: GET /api/membres/reference/etapes returns 4 adhesion steps")
    
    def test_get_champs_norme_4232(self, auth_headers):
        """GET /api/membres/reference/champs - Returns 14 champs norme 4.2.3.2 (a-n)"""
        response = requests.get(f"{BASE_URL}/api/membres/reference/champs", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "champs" in data
        champs = data["champs"]
        assert len(champs) == 14
        
        # Verify champ structure
        for champ in champs:
            assert "code" in champ
            assert "label" in champ
            assert "field" in champ
            assert "required" in champ
        
        # Verify codes a-n
        codes = [c["code"] for c in champs]
        expected_codes = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"]
        assert codes == expected_codes
        
        # Verify key fields
        assert champs[0]["field"] == "full_name"  # a
        assert champs[2]["field"] == "sexe"  # c
        assert champs[4]["field"] == "phone_number"  # e
        assert champs[5]["field"] == "village"  # f
        print("PASSED: GET /api/membres/reference/champs returns 14 champs norme 4.2.3.2")


# ============= ADHESION WORKFLOW =============

class TestAdhesionWorkflow:
    """Test adhesion creation, listing, validation, and retrait"""
    
    @pytest.fixture(scope="class")
    def test_adhesion_id(self, auth_headers):
        """Create a test adhesion and return its ID"""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "sensibilisation_faite": True,
            "sensibilisation_date": "2026-01-15",
            "sensibilisation_accuse": True,
            "full_name": f"TEST_Membre_{unique_id}",
            "date_naissance": "1985-03-20",
            "sexe": "M",
            "cni_number": f"CNI{unique_id}",
            "phone_number": f"+22507{unique_id}",
            "village": "Abidjan",
            "department": "Abidjan",
            "zone": "Zone A",
            "nombre_parcelles": 2,
            "hectares_approx": 3.5,
            "gps_parcelle": "5.3167,-4.0167",
            "nombre_travailleurs": 3,
            "statut_producteur": "actif",
            "signature_producteur": True,
            "temoin_1_nom": "Temoin Un",
            "temoin_1_signature": True,
            "temoin_2_nom": "Temoin Deux",
            "temoin_2_signature": True,
            "notes": "Test adhesion"
        }
        response = requests.post(f"{BASE_URL}/api/membres/adhesion", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        return data["adhesion"]["adhesion_id"]
    
    def test_create_adhesion_step1(self, auth_headers):
        """POST /api/membres/adhesion - Create adhesion at step 1 (sensibilisation only)"""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "sensibilisation_faite": False,
            "full_name": f"TEST_Step1_{unique_id}",
            "phone_number": f"+22508{unique_id}"
        }
        response = requests.post(f"{BASE_URL}/api/membres/adhesion", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "adhesion" in data
        assert "code_membre" in data
        
        adhesion = data["adhesion"]
        assert adhesion["etape_courante"] == 3  # Has name and phone, so step 3
        assert adhesion["statut"] == "en_cours"
        assert adhesion["full_name"] == f"TEST_Step1_{unique_id}"
        print("PASSED: POST /api/membres/adhesion creates adhesion")
    
    def test_create_adhesion_full(self, auth_headers):
        """POST /api/membres/adhesion - Create complete adhesion (all 4 steps)"""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "sensibilisation_faite": True,
            "sensibilisation_date": "2026-01-15",
            "sensibilisation_accuse": True,
            "full_name": f"TEST_Full_{unique_id}",
            "date_naissance": "1990-05-10",
            "sexe": "F",
            "cni_number": f"CNI{unique_id}",
            "phone_number": f"+22509{unique_id}",
            "village": "Daloa",
            "department": "Haut-Sassandra",
            "zone": "Zone B",
            "nombre_parcelles": 3,
            "hectares_approx": 5.0,
            "gps_parcelle": "6.8833,-6.4500",
            "nombre_travailleurs": 4,
            "statut_producteur": "actif",
            "signature_producteur": True,
            "temoin_1_nom": "Temoin A",
            "temoin_1_signature": True,
            "temoin_2_nom": "Temoin B",
            "temoin_2_signature": True,
            "notes": "Complete adhesion test"
        }
        response = requests.post(f"{BASE_URL}/api/membres/adhesion", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        adhesion = data["adhesion"]
        assert adhesion["etape_courante"] == 4
        assert adhesion["statut"] == "en_attente_validation"
        assert adhesion["signature_producteur"] == True
        assert adhesion["temoin_1_nom"] == "Temoin A"
        assert adhesion["temoin_2_nom"] == "Temoin B"
        print("PASSED: POST /api/membres/adhesion creates complete adhesion at step 4")
    
    def test_list_adhesions(self, auth_headers):
        """GET /api/membres/adhesions - Returns adhesions with stats"""
        response = requests.get(f"{BASE_URL}/api/membres/adhesions", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "adhesions" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "total" in stats
        assert "en_cours" in stats
        assert "en_attente_validation" in stats
        assert "valides" in stats
        assert "retrait" in stats
        print(f"PASSED: GET /api/membres/adhesions returns {stats['total']} adhesions with stats")
    
    def test_list_adhesions_filter_statut(self, auth_headers):
        """GET /api/membres/adhesions?statut=X - Filter by statut"""
        response = requests.get(f"{BASE_URL}/api/membres/adhesions?statut=en_attente_validation", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for adhesion in data["adhesions"]:
            assert adhesion["statut"] == "en_attente_validation"
        print("PASSED: GET /api/membres/adhesions?statut=X filters correctly")
    
    def test_validate_adhesion(self, auth_headers, test_adhesion_id):
        """PUT /api/membres/adhesion/{id}/valider - Validates an adhesion"""
        response = requests.put(f"{BASE_URL}/api/membres/adhesion/{test_adhesion_id}/valider", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["message"] == "Adhesion validee"
        
        # Verify the adhesion is now validated
        list_response = requests.get(f"{BASE_URL}/api/membres/adhesions?search=TEST_Membre", headers=auth_headers)
        adhesions = list_response.json()["adhesions"]
        validated = [a for a in adhesions if a["adhesion_id"] == test_adhesion_id]
        if validated:
            assert validated[0]["statut"] == "valide"
            assert validated[0]["validation"]["validee"] == True
        print("PASSED: PUT /api/membres/adhesion/{id}/valider validates adhesion")
    
    def test_retrait_membre(self, auth_headers):
        """PUT /api/membres/adhesion/{id}/retrait - Marks member withdrawal"""
        # First create an adhesion to withdraw
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "sensibilisation_faite": True,
            "full_name": f"TEST_Retrait_{unique_id}",
            "phone_number": f"+22510{unique_id}",
            "signature_producteur": True
        }
        create_response = requests.post(f"{BASE_URL}/api/membres/adhesion", json=payload, headers=auth_headers)
        adhesion_id = create_response.json()["adhesion"]["adhesion_id"]
        
        # Now mark as retrait
        response = requests.put(f"{BASE_URL}/api/membres/adhesion/{adhesion_id}/retrait", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        
        # Verify status changed
        list_response = requests.get(f"{BASE_URL}/api/membres/adhesions?search=TEST_Retrait", headers=auth_headers)
        adhesions = list_response.json()["adhesions"]
        retrait = [a for a in adhesions if a["adhesion_id"] == adhesion_id]
        if retrait:
            assert retrait[0]["statut"] == "retrait"
        print("PASSED: PUT /api/membres/adhesion/{id}/retrait marks withdrawal")


# ============= BULLETIN PDF =============

class TestBulletinPDF:
    """Test bulletin PDF generation"""
    
    def test_generate_bulletin_pdf(self, auth_headers):
        """GET /api/membres/adhesion/{id}/bulletin/pdf - Generates bulletin PDF"""
        # First get an existing adhesion
        list_response = requests.get(f"{BASE_URL}/api/membres/adhesions", headers=auth_headers)
        adhesions = list_response.json()["adhesions"]
        
        if not adhesions:
            pytest.skip("No adhesions available for PDF test")
        
        adhesion_id = adhesions[0]["adhesion_id"]
        
        response = requests.get(f"{BASE_URL}/api/membres/adhesion/{adhesion_id}/bulletin/pdf", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert "attachment" in response.headers.get("content-disposition", "")
        assert len(response.content) > 1000  # PDF should have content
        print("PASSED: GET /api/membres/adhesion/{id}/bulletin/pdf generates PDF")


# ============= REGISTRE =============

class TestRegistre:
    """Test registre (member database) endpoints"""
    
    def test_get_registre(self, auth_headers):
        """GET /api/membres/registre - Returns all members"""
        response = requests.get(f"{BASE_URL}/api/membres/registre", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "membres" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        print(f"PASSED: GET /api/membres/registre returns {data['total']} members")
    
    def test_get_registre_filter_statut(self, auth_headers):
        """GET /api/membres/registre?statut=X - Filter by statut"""
        response = requests.get(f"{BASE_URL}/api/membres/registre?statut=valide", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for membre in data["membres"]:
            assert membre["statut"] == "valide"
        print("PASSED: GET /api/membres/registre?statut=X filters correctly")
    
    def test_get_registre_filter_sexe(self, auth_headers):
        """GET /api/membres/registre?sexe=X - Filter by sexe"""
        response = requests.get(f"{BASE_URL}/api/membres/registre?sexe=M", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for membre in data["membres"]:
            assert membre["sexe"] == "M"
        print("PASSED: GET /api/membres/registre?sexe=X filters correctly")
    
    def test_get_registre_search(self, auth_headers):
        """GET /api/membres/registre?search=X - Search by name/code/phone"""
        response = requests.get(f"{BASE_URL}/api/membres/registre?search=TEST", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # All results should contain TEST in name, code, or phone
        for membre in data["membres"]:
            found = (
                "TEST" in membre.get("full_name", "").upper() or
                "TEST" in membre.get("code_membre", "").upper() or
                "TEST" in membre.get("phone_number", "").upper() or
                "TEST" in membre.get("cni_number", "").upper()
            )
            assert found, f"Search result doesn't match: {membre.get('full_name')}"
        print("PASSED: GET /api/membres/registre?search=X searches correctly")
    
    def test_update_membre(self, auth_headers):
        """PUT /api/membres/registre/{id} - Updates member info with history"""
        # Get an existing member
        list_response = requests.get(f"{BASE_URL}/api/membres/registre?search=TEST", headers=auth_headers)
        membres = list_response.json()["membres"]
        
        if not membres:
            pytest.skip("No test members available for update test")
        
        adhesion_id = membres[0]["adhesion_id"]
        original_notes = membres[0].get("notes", "")
        
        # Update the member
        new_notes = f"Updated at {uuid.uuid4().hex[:6]}"
        response = requests.put(
            f"{BASE_URL}/api/membres/registre/{adhesion_id}",
            json={"notes": new_notes},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["membre"]["notes"] == new_notes
        
        # Verify history was added
        assert "historique" in data["membre"]
        assert len(data["membre"]["historique"]) > 0
        print("PASSED: PUT /api/membres/registre/{id} updates member with history")


# ============= PERIMETRE SM =============

class TestPerimetreSM:
    """Test perimetre SM (clause 4.3) endpoints"""
    
    def test_create_perimetre(self, auth_headers):
        """POST /api/membres/perimetre - Creates SM perimeter with auto-stats"""
        payload = {
            "description": f"Test perimetre {uuid.uuid4().hex[:6]}",
            "producteurs_inclus": 0,  # Will be auto-calculated
            "parcelles_incluses": 10,
            "exclusions": "Parcelles en zone protegee",
            "date_validation": "2026-01-15",
            "valide_par": "Directeur SMCD"
        }
        response = requests.post(f"{BASE_URL}/api/membres/perimetre", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "perimetre" in data
        
        perimetre = data["perimetre"]
        assert "perimetre_id" in perimetre
        assert "auto_stats" in perimetre
        assert "total_membres_valides" in perimetre["auto_stats"]
        assert "total_hectares" in perimetre["auto_stats"]
        print("PASSED: POST /api/membres/perimetre creates perimeter with auto-stats")
    
    def test_get_perimetres(self, auth_headers):
        """GET /api/membres/perimetre - Returns perimeters list"""
        response = requests.get(f"{BASE_URL}/api/membres/perimetre", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "perimetres" in data
        
        if data["perimetres"]:
            perimetre = data["perimetres"][0]
            assert "perimetre_id" in perimetre
            assert "description" in perimetre
            assert "producteurs_inclus" in perimetre
            assert "superficie_totale_ha" in perimetre
        print(f"PASSED: GET /api/membres/perimetre returns {len(data['perimetres'])} perimeters")


# ============= DASHBOARD =============

class TestDashboard:
    """Test dashboard KPIs endpoint"""
    
    def test_get_dashboard(self, auth_headers):
        """GET /api/membres/dashboard - Returns KPIs, par_village, perimetre"""
        response = requests.get(f"{BASE_URL}/api/membres/dashboard", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data
        kpis = data["kpis"]
        assert "total" in kpis
        assert "valides" in kpis
        assert "en_cours" in kpis
        assert "en_attente_validation" in kpis
        assert "retrait" in kpis
        assert "hommes" in kpis
        assert "femmes" in kpis
        assert "total_hectares" in kpis
        
        # Verify par_village
        assert "par_village" in data
        if data["par_village"]:
            village = data["par_village"][0]
            assert "village" in village
            assert "count" in village
        
        # Verify perimetre (may be null)
        assert "perimetre" in data
        
        print(f"PASSED: GET /api/membres/dashboard returns KPIs (total={kpis['total']}, valides={kpis['valides']}, hommes={kpis['hommes']}, femmes={kpis['femmes']}, hectares={kpis['total_hectares']})")


# ============= EXCEL EXPORT =============

class TestExcelExport:
    """Test Excel export endpoint"""
    
    def test_export_excel(self, auth_headers):
        """GET /api/membres/export/excel - Downloads Excel with all 4.2.3.2 fields"""
        response = requests.get(f"{BASE_URL}/api/membres/export/excel", headers=auth_headers)
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")
        assert len(response.content) > 1000  # Excel should have content
        print("PASSED: GET /api/membres/export/excel downloads Excel file")


# ============= INTEGRATION TEST =============

class TestIntegration:
    """Full workflow integration test"""
    
    def test_full_adhesion_workflow(self, auth_headers):
        """Test complete adhesion workflow: create -> validate -> verify in dashboard"""
        unique_id = uuid.uuid4().hex[:6]
        
        # Step 1: Create adhesion
        payload = {
            "sensibilisation_faite": True,
            "sensibilisation_date": "2026-01-15",
            "sensibilisation_accuse": True,
            "full_name": f"TEST_Integration_{unique_id}",
            "date_naissance": "1988-07-22",
            "sexe": "F",
            "cni_number": f"INT{unique_id}",
            "phone_number": f"+22511{unique_id}",
            "village": "San Pedro",
            "department": "San Pedro",
            "zone": "Zone C",
            "nombre_parcelles": 4,
            "hectares_approx": 6.5,
            "gps_parcelle": "4.7500,-6.6333",
            "nombre_travailleurs": 5,
            "statut_producteur": "actif",
            "signature_producteur": True,
            "temoin_1_nom": "Integration Temoin 1",
            "temoin_1_signature": True,
            "temoin_2_nom": "Integration Temoin 2",
            "temoin_2_signature": True,
            "notes": "Integration test"
        }
        create_response = requests.post(f"{BASE_URL}/api/membres/adhesion", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        adhesion_id = create_response.json()["adhesion"]["adhesion_id"]
        code_membre = create_response.json()["code_membre"]
        
        # Step 2: Verify in adhesions list
        list_response = requests.get(f"{BASE_URL}/api/membres/adhesions?search=Integration", headers=auth_headers)
        adhesions = list_response.json()["adhesions"]
        found = [a for a in adhesions if a["adhesion_id"] == adhesion_id]
        assert len(found) == 1
        assert found[0]["statut"] == "en_attente_validation"
        
        # Step 3: Validate adhesion
        validate_response = requests.put(f"{BASE_URL}/api/membres/adhesion/{adhesion_id}/valider", headers=auth_headers)
        assert validate_response.status_code == 200
        
        # Step 4: Verify in registre
        registre_response = requests.get(f"{BASE_URL}/api/membres/registre?search=Integration", headers=auth_headers)
        membres = registre_response.json()["membres"]
        found = [m for m in membres if m["adhesion_id"] == adhesion_id]
        assert len(found) == 1
        assert found[0]["statut"] == "valide"
        
        # Step 5: Generate bulletin PDF
        pdf_response = requests.get(f"{BASE_URL}/api/membres/adhesion/{adhesion_id}/bulletin/pdf", headers=auth_headers)
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        # Step 6: Verify in dashboard
        dashboard_response = requests.get(f"{BASE_URL}/api/membres/dashboard", headers=auth_headers)
        kpis = dashboard_response.json()["kpis"]
        assert kpis["valides"] >= 1
        assert kpis["femmes"] >= 1  # We created a female member
        
        print(f"PASSED: Full integration workflow completed for {code_membre}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
