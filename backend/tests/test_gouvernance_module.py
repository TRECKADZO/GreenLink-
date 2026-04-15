"""
Test Gouvernance & Revue de Direction Module - ARS 1000
Tests for clauses 5.1, 5.2, 5.3, 9.3

Endpoints tested:
- GET /api/gouvernance/postes - 7 ARS 1000 required positions
- GET /api/gouvernance/organigramme - Positions with assignment status
- PUT /api/gouvernance/organigramme/{code} - Assign person to position
- POST /api/gouvernance/politique - Create management policy
- GET /api/gouvernance/politique - List policies
- PUT /api/gouvernance/politique/{id} - Update policy
- PUT /api/gouvernance/politique/{id}/diffuser - Mark policy as diffused
- POST /api/gouvernance/revue-direction - Create management review
- GET /api/gouvernance/revue-direction - List reviews
- GET /api/gouvernance/revue-direction/{id} - Review detail
- PUT /api/gouvernance/revue-direction/{id}/valider - Validate review
- GET /api/gouvernance/dashboard - KPIs, alerts, module data
- GET /api/gouvernance/revue-direction/{id}/pdf - Export review as PDF
- GET /api/gouvernance/organigramme/pdf - Export org chart as PDF
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "bielaghana@gmail.com"
TEST_PASSWORD = "test123456"

# 7 ARS 1000 required positions
ARS1000_POSITIONS = [
    "RESP_SMCD", "COACH_FORMATEUR", "CHARGE_RISQUES_TE", 
    "CHARGE_ENCADREMENT", "CHARGE_DURABILITE", "DIRECTION", "RESP_TRACABILITE"
]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for cooperative user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestPostesReference:
    """Test GET /api/gouvernance/postes - 7 ARS 1000 required positions"""
    
    def test_get_postes_returns_7_positions(self, api_client):
        """Verify 7 ARS 1000 positions are returned"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/postes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "postes" in data
        postes = data["postes"]
        assert len(postes) == 7, f"Expected 7 positions, got {len(postes)}"
        
        # Verify all required position codes exist
        codes = [p["code"] for p in postes]
        for code in ARS1000_POSITIONS:
            assert code in codes, f"Missing position code: {code}"
    
    def test_postes_have_required_fields(self, api_client):
        """Verify each position has required fields"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/postes")
        assert response.status_code == 200
        
        postes = response.json()["postes"]
        required_fields = ["code", "titre", "clause", "description", "responsabilites", "competences", "niveau"]
        
        for poste in postes:
            for field in required_fields:
                assert field in poste, f"Position {poste.get('code')} missing field: {field}"
            
            # Verify niveau is Direction or Operationnel
            assert poste["niveau"] in ["Direction", "Operationnel"], f"Invalid niveau: {poste['niveau']}"


class TestOrganigramme:
    """Test organigramme endpoints"""
    
    def test_get_organigramme(self, api_client):
        """GET /api/gouvernance/organigramme returns positions with assignment status"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/organigramme")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "organigramme" in data
        assert "stats" in data
        
        organigramme = data["organigramme"]
        assert len(organigramme) == 7, f"Expected 7 positions, got {len(organigramme)}"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "pourvus" in stats
        assert "vacants" in stats
        assert stats["total"] == 7
        assert stats["pourvus"] + stats["vacants"] == 7
    
    def test_organigramme_positions_have_pourvu_field(self, api_client):
        """Each position should have pourvu boolean field"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/organigramme")
        assert response.status_code == 200
        
        for poste in response.json()["organigramme"]:
            assert "pourvu" in poste, f"Position {poste.get('code')} missing 'pourvu' field"
            assert isinstance(poste["pourvu"], bool)
    
    def test_assign_poste(self, api_client):
        """PUT /api/gouvernance/organigramme/{code} assigns person to position"""
        test_code = "COACH_FORMATEUR"
        test_data = {
            "code_poste": test_code,
            "titulaire_nom": f"TEST_Coach_{uuid.uuid4().hex[:6]}",
            "titulaire_email": "coach@test.ci",
            "titulaire_telephone": "+2250700000001",
            "date_prise_poste": "2025-01-15",
            "notes": "Test assignment"
        }
        
        response = api_client.put(f"{BASE_URL}/api/gouvernance/organigramme/{test_code}", json=test_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "poste" in data
        assert data["poste"]["titulaire_nom"] == test_data["titulaire_nom"]
        
        # Verify assignment persisted
        verify_response = api_client.get(f"{BASE_URL}/api/gouvernance/organigramme")
        assert verify_response.status_code == 200
        
        organigramme = verify_response.json()["organigramme"]
        coach_poste = next((p for p in organigramme if p["code"] == test_code), None)
        assert coach_poste is not None
        assert coach_poste["pourvu"] == True
        assert coach_poste["titulaire_nom"] == test_data["titulaire_nom"]
    
    def test_assign_invalid_poste_code(self, api_client):
        """Assigning to invalid position code should fail"""
        response = api_client.put(f"{BASE_URL}/api/gouvernance/organigramme/INVALID_CODE", json={
            "code_poste": "INVALID_CODE",
            "titulaire_nom": "Test"
        })
        assert response.status_code == 400


class TestPolitique:
    """Test politique de management endpoints"""
    
    @pytest.fixture
    def created_politique_id(self, api_client):
        """Create a politique for testing"""
        response = api_client.post(f"{BASE_URL}/api/gouvernance/politique", json={
            "titre": f"TEST_Politique_{uuid.uuid4().hex[:6]}",
            "contenu": "La cooperative s'engage a produire un cacao durable conforme a l'ARS 1000.",
            "date_validation": "2025-01-10",
            "validee_par": "Direction",
            "pv_ag_reference": "PV-AG-2025-001"
        })
        assert response.status_code == 200
        return response.json()["politique"]["politique_id"]
    
    def test_create_politique(self, api_client):
        """POST /api/gouvernance/politique creates management policy"""
        response = api_client.post(f"{BASE_URL}/api/gouvernance/politique", json={
            "titre": f"TEST_Politique_Create_{uuid.uuid4().hex[:6]}",
            "contenu": "Contenu de la politique de management.",
            "date_validation": "2025-01-15",
            "validee_par": "AG",
            "pv_ag_reference": "PV-AG-2025-002"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "politique" in data
        
        politique = data["politique"]
        assert "politique_id" in politique
        assert politique["statut"] == "brouillon"
        assert politique["diffusee"] == False
    
    def test_get_politiques(self, api_client, created_politique_id):
        """GET /api/gouvernance/politique returns policies list"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/politique")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "politiques" in data
        assert isinstance(data["politiques"], list)
        
        # Verify created politique exists
        politique_ids = [p["politique_id"] for p in data["politiques"]]
        assert created_politique_id in politique_ids
    
    def test_update_politique(self, api_client, created_politique_id):
        """PUT /api/gouvernance/politique/{id} updates policy"""
        response = api_client.put(f"{BASE_URL}/api/gouvernance/politique/{created_politique_id}", json={
            "contenu": "Contenu mis a jour de la politique.",
            "statut": "validee"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert data["politique"]["statut"] == "validee"
        assert "historique" in data["politique"]
    
    def test_diffuser_politique(self, api_client, created_politique_id):
        """PUT /api/gouvernance/politique/{id}/diffuser marks policy as diffused"""
        # First validate the politique
        api_client.put(f"{BASE_URL}/api/gouvernance/politique/{created_politique_id}", json={
            "statut": "validee"
        })
        
        # Then diffuse
        response = api_client.put(f"{BASE_URL}/api/gouvernance/politique/{created_politique_id}/diffuser")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        
        # Verify diffusion
        verify_response = api_client.get(f"{BASE_URL}/api/gouvernance/politique")
        politiques = verify_response.json()["politiques"]
        politique = next((p for p in politiques if p["politique_id"] == created_politique_id), None)
        assert politique is not None
        assert politique["diffusee"] == True
        assert politique["statut"] == "validee"
    
    def test_update_nonexistent_politique(self, api_client):
        """Updating non-existent politique should return 404"""
        response = api_client.put(f"{BASE_URL}/api/gouvernance/politique/nonexistent-id", json={
            "contenu": "Test"
        })
        assert response.status_code == 404


class TestRevueDirection:
    """Test revue de direction endpoints (clause 9.3)"""
    
    @pytest.fixture
    def created_revue_id(self, api_client):
        """Create a revue for testing"""
        response = api_client.post(f"{BASE_URL}/api/gouvernance/revue-direction", json={
            "titre": f"TEST_Revue_{uuid.uuid4().hex[:6]}",
            "date_revue": "2025-01-15",
            "participants": "Direction, RESP_SMCD, COACH_FORMATEUR",
            "actions_precedentes": "Actions de la revue precedente",
            "resultats_audit": "",  # Will be auto-filled
            "retour_parties_prenantes": "Retours positifs",
            "performance_processus": "Bonne performance",
            "non_conformites": "",  # Will be auto-filled
            "resultats_surveillance": "Surveillance OK",
            "changements_contexte": "Aucun changement majeur",
            "opportunites_amelioration": "Ameliorer la formation",
            "decisions": "Continuer les efforts",
            "actions_correctives": "Renforcer le suivi",
            "besoins_ressources": "Budget formation",
            "objectifs_prochaine_periode": "100% conformite",
            "plan_actions": "Plan detaille",
            "prochaine_revue": "2026-01-15"
        })
        assert response.status_code == 200
        return response.json()["revue"]["revue_id"]
    
    def test_create_revue_direction(self, api_client):
        """POST /api/gouvernance/revue-direction creates management review"""
        response = api_client.post(f"{BASE_URL}/api/gouvernance/revue-direction", json={
            "titre": f"TEST_Revue_Create_{uuid.uuid4().hex[:6]}",
            "date_revue": "2025-01-20",
            "participants": "Direction, RESP_SMCD",
            "actions_precedentes": "Actions precedentes",
            "decisions": "Decisions prises",
            "prochaine_revue": "2026-01-20"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "revue" in data
        
        revue = data["revue"]
        assert "revue_id" in revue
        assert revue["statut"] == "brouillon"
        assert "entrees" in revue
        assert "donnees_modules" in revue
        assert "sorties" in revue
    
    def test_revue_auto_populates_module_data(self, api_client):
        """Revue should auto-populate data from PDC, Tracabilite, Formation, Audit modules"""
        response = api_client.post(f"{BASE_URL}/api/gouvernance/revue-direction", json={
            "titre": f"TEST_Revue_AutoPop_{uuid.uuid4().hex[:6]}",
            "date_revue": "2025-01-21",
            "participants": "Direction"
        })
        assert response.status_code == 200
        
        revue = response.json()["revue"]
        donnees_modules = revue.get("donnees_modules", {})
        
        # Verify structure exists (values may be empty if no data in modules)
        assert "pdc" in donnees_modules
        assert "tracabilite" in donnees_modules
        assert "formation" in donnees_modules
        assert "audit" in donnees_modules
    
    def test_get_revues_list(self, api_client, created_revue_id):
        """GET /api/gouvernance/revue-direction returns reviews list"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/revue-direction")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "revues" in data
        assert isinstance(data["revues"], list)
        
        # Verify created revue exists
        revue_ids = [r["revue_id"] for r in data["revues"]]
        assert created_revue_id in revue_ids
    
    def test_get_revue_detail(self, api_client, created_revue_id):
        """GET /api/gouvernance/revue-direction/{id} returns review detail"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/revue-direction/{created_revue_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "revue" in data
        
        revue = data["revue"]
        assert revue["revue_id"] == created_revue_id
        assert "entrees" in revue
        assert "donnees_modules" in revue
        assert "sorties" in revue
    
    def test_valider_revue(self, api_client, created_revue_id):
        """PUT /api/gouvernance/revue-direction/{id}/valider validates review"""
        response = api_client.put(f"{BASE_URL}/api/gouvernance/revue-direction/{created_revue_id}/valider")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        
        # Verify validation persisted
        verify_response = api_client.get(f"{BASE_URL}/api/gouvernance/revue-direction/{created_revue_id}")
        revue = verify_response.json()["revue"]
        assert revue["statut"] == "validee"
        assert "date_validation" in revue
    
    def test_get_nonexistent_revue(self, api_client):
        """Getting non-existent revue should return 404"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/revue-direction/nonexistent-id")
        assert response.status_code == 404


class TestDashboard:
    """Test gouvernance dashboard endpoint"""
    
    def test_get_dashboard(self, api_client):
        """GET /api/gouvernance/dashboard returns KPIs, alerts, module data"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data
        kpis = data["kpis"]
        assert "postes_pourvus" in kpis
        assert "postes_total" in kpis
        assert kpis["postes_total"] == 7
        assert "taux_postes" in kpis
        assert "politiques" in kpis
        assert "politiques_validees" in kpis
        assert "politiques_diffusees" in kpis
        assert "revues" in kpis
        assert "revues_validees" in kpis
        assert "conformite_globale" in kpis
        
        # Verify module_data structure
        assert "module_data" in data
        module_data = data["module_data"]
        # These may be empty strings if no data, but keys should exist
        
        # Verify alertes structure
        assert "alertes" in data
        assert isinstance(data["alertes"], list)
    
    def test_dashboard_alerts_for_vacant_positions(self, api_client):
        """Dashboard should show alerts for vacant positions"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        kpis = data["kpis"]
        alertes = data["alertes"]
        
        # If there are vacant positions, there should be alerts
        if kpis["postes_pourvus"] < kpis["postes_total"]:
            vacant_alerts = [a for a in alertes if "vacant" in a.get("message", "").lower()]
            assert len(vacant_alerts) > 0, "Expected alerts for vacant positions"


class TestPDFExports:
    """Test PDF export endpoints"""
    
    @pytest.fixture
    def revue_id_for_pdf(self, api_client):
        """Create a revue for PDF export testing"""
        response = api_client.post(f"{BASE_URL}/api/gouvernance/revue-direction", json={
            "titre": f"TEST_Revue_PDF_{uuid.uuid4().hex[:6]}",
            "date_revue": "2025-01-22",
            "participants": "Direction, RESP_SMCD",
            "actions_precedentes": "Actions precedentes pour PDF",
            "decisions": "Decisions pour PDF",
            "prochaine_revue": "2026-01-22"
        })
        assert response.status_code == 200
        return response.json()["revue"]["revue_id"]
    
    def test_export_revue_pdf(self, api_client, revue_id_for_pdf):
        """GET /api/gouvernance/revue-direction/{id}/pdf exports review as PDF"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/revue-direction/{revue_id_for_pdf}/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify PDF content type
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Verify content disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp
        assert "revue_direction" in content_disp
        
        # Verify PDF content starts with PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
    
    def test_export_organigramme_pdf(self, api_client):
        """GET /api/gouvernance/organigramme/pdf exports org chart as PDF"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/organigramme/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify PDF content type
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Verify content disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp
        assert "organigramme" in content_disp
        
        # Verify PDF content starts with PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
    
    def test_export_nonexistent_revue_pdf(self, api_client):
        """Exporting PDF for non-existent revue should return 404"""
        response = api_client.get(f"{BASE_URL}/api/gouvernance/revue-direction/nonexistent-id/pdf")
        assert response.status_code == 404


class TestIntegration:
    """Integration tests for full workflows"""
    
    def test_full_gouvernance_workflow(self, api_client):
        """Test complete gouvernance workflow: assign position, create politique, create revue"""
        unique_id = uuid.uuid4().hex[:6]
        
        # 1. Assign a position
        assign_response = api_client.put(f"{BASE_URL}/api/gouvernance/organigramme/CHARGE_DURABILITE", json={
            "code_poste": "CHARGE_DURABILITE",
            "titulaire_nom": f"TEST_Durabilite_{unique_id}",
            "titulaire_email": f"durabilite_{unique_id}@test.ci",
            "titulaire_telephone": "+2250700000002",
            "date_prise_poste": "2025-01-15"
        })
        assert assign_response.status_code == 200
        
        # 2. Create a politique
        politique_response = api_client.post(f"{BASE_URL}/api/gouvernance/politique", json={
            "titre": f"TEST_Politique_Integration_{unique_id}",
            "contenu": "Politique de management integree.",
            "date_validation": "2025-01-15",
            "validee_par": "AG"
        })
        assert politique_response.status_code == 200
        politique_id = politique_response.json()["politique"]["politique_id"]
        
        # 3. Validate and diffuse politique
        api_client.put(f"{BASE_URL}/api/gouvernance/politique/{politique_id}", json={"statut": "validee"})
        diffuse_response = api_client.put(f"{BASE_URL}/api/gouvernance/politique/{politique_id}/diffuser")
        assert diffuse_response.status_code == 200
        
        # 4. Create a revue de direction
        revue_response = api_client.post(f"{BASE_URL}/api/gouvernance/revue-direction", json={
            "titre": f"TEST_Revue_Integration_{unique_id}",
            "date_revue": "2025-01-20",
            "participants": "Direction, RESP_SMCD, CHARGE_DURABILITE",
            "actions_precedentes": "Actions de la revue precedente",
            "decisions": "Continuer les efforts de conformite",
            "prochaine_revue": "2026-01-20"
        })
        assert revue_response.status_code == 200
        revue_id = revue_response.json()["revue"]["revue_id"]
        
        # 5. Validate the revue
        valider_response = api_client.put(f"{BASE_URL}/api/gouvernance/revue-direction/{revue_id}/valider")
        assert valider_response.status_code == 200
        
        # 6. Verify dashboard reflects changes
        dashboard_response = api_client.get(f"{BASE_URL}/api/gouvernance/dashboard")
        assert dashboard_response.status_code == 200
        
        dashboard = dashboard_response.json()
        assert dashboard["kpis"]["politiques"] >= 1
        assert dashboard["kpis"]["politiques_diffusees"] >= 1
        assert dashboard["kpis"]["revues"] >= 1
        assert dashboard["kpis"]["revues_validees"] >= 1
        
        # 7. Export PDFs
        revue_pdf = api_client.get(f"{BASE_URL}/api/gouvernance/revue-direction/{revue_id}/pdf")
        assert revue_pdf.status_code == 200
        assert revue_pdf.content[:4] == b'%PDF'
        
        org_pdf = api_client.get(f"{BASE_URL}/api/gouvernance/organigramme/pdf")
        assert org_pdf.status_code == 200
        assert org_pdf.content[:4] == b'%PDF'
