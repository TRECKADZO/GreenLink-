"""
Test Formation & Sensibilisation Module - ARS 1000
Tests for Programme Annuel, Sessions, PV, Attestations, Dashboard
Clauses 7.3, 7.4, 12.2-12.10, 13.1-13.5
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
TEST_EMAIL = os.environ.get("TEST_COOP_EMAIL", "bielaghana@gmail.com")
TEST_PASSWORD = os.environ.get("TEST_COOP_PASSWORD", "test123456")


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
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestFormationThemes:
    """Test GET /api/formation/themes - 12 mandatory ARS 1000 themes"""
    
    def test_get_themes_returns_12_mandatory_themes(self, api_client):
        """Verify 12 mandatory themes are returned"""
        response = api_client.get(f"{BASE_URL}/api/formation/themes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "themes" in data
        themes = data["themes"]
        assert len(themes) == 12, f"Expected 12 themes, got {len(themes)}"
        
        # Verify expected theme codes
        expected_codes = [
            "POL_DURABILITE", "DROITS_HOMME", "DISCRIMINATION", "TRAVAIL_ENFANTS",
            "EGALITE_GENRE", "SST", "DECHETS_ECOSYSTEMES", "TRACABILITE_BPA",
            "RESILIENCE_CLIMAT", "LIBERTE_ASSOCIATION", "PROTECTION_EAU", "AGROCHIMIQUES"
        ]
        actual_codes = [t["code"] for t in themes]
        for code in expected_codes:
            assert code in actual_codes, f"Missing theme code: {code}"
    
    def test_themes_have_required_fields(self, api_client):
        """Verify each theme has required fields"""
        response = api_client.get(f"{BASE_URL}/api/formation/themes")
        assert response.status_code == 200
        
        themes = response.json()["themes"]
        for theme in themes:
            assert "code" in theme, "Theme missing 'code'"
            assert "titre" in theme, "Theme missing 'titre'"
            assert "clause" in theme, "Theme missing 'clause'"
            assert "description" in theme, "Theme missing 'description'"
            assert "public_cible" in theme, "Theme missing 'public_cible'"


class TestFormationProgrammes:
    """Test Programme CRUD operations"""
    
    def test_create_programme_with_12_themes(self, api_client):
        """POST /api/formation/programmes creates programme with 12 pre-filled themes"""
        response = api_client.post(f"{BASE_URL}/api/formation/programmes", json={
            "titre": f"TEST_Programme_{uuid.uuid4().hex[:8]}",
            "campagne": "2025-2026",
            "objectifs": "Former 100% des producteurs"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "programme" in data
        
        programme = data["programme"]
        assert "programme_id" in programme
        assert "themes" in programme
        assert len(programme["themes"]) == 12, f"Expected 12 themes, got {len(programme['themes'])}"
        
        # Verify each theme has initial status
        for theme in programme["themes"]:
            assert theme.get("statut") == "planifie"
            assert theme.get("sessions_count") == 0
            assert theme.get("participants_count") == 0
    
    def test_list_programmes(self, api_client):
        """GET /api/formation/programmes returns programmes list"""
        response = api_client.get(f"{BASE_URL}/api/formation/programmes")
        assert response.status_code == 200
        
        data = response.json()
        assert "programmes" in data
        assert isinstance(data["programmes"], list)
        
        # Should have at least one programme (created in previous test or existing)
        if len(data["programmes"]) > 0:
            prog = data["programmes"][0]
            assert "programme_id" in prog
            assert "titre" in prog
            assert "campagne" in prog
            assert "themes" in prog


class TestFormationSessions:
    """Test Session CRUD operations"""
    
    @pytest.fixture(scope="class")
    def programme_id(self, api_client):
        """Get or create a programme for session tests"""
        response = api_client.get(f"{BASE_URL}/api/formation/programmes")
        if response.status_code == 200 and response.json().get("programmes"):
            return response.json()["programmes"][0]["programme_id"]
        
        # Create new programme
        response = api_client.post(f"{BASE_URL}/api/formation/programmes", json={
            "titre": "TEST_Programme_Sessions",
            "campagne": "2025-2026"
        })
        return response.json()["programme"]["programme_id"]
    
    def test_create_session_with_theme_prefill(self, api_client, programme_id):
        """POST /api/formation/sessions creates session with theme data pre-filled"""
        response = api_client.post(f"{BASE_URL}/api/formation/sessions", json={
            "programme_id": programme_id,
            "theme_code": "DROITS_HOMME",
            "date_session": "2025-02-15",
            "lieu": "Salle de formation cooperative",
            "formateur": "M. Kouame Expert",
            "duree_heures": 3
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "session" in data
        
        session = data["session"]
        assert "session_id" in session
        assert session.get("theme_code") == "DROITS_HOMME"
        # Verify theme data was pre-filled
        assert "Droits de l'homme" in session.get("theme_titre", "")
        assert session.get("clause_ref") != ""
        assert session.get("public_cible") != ""
        assert session.get("contenu") != ""
        assert session.get("statut") == "planifiee"
    
    def test_list_sessions_with_stats(self, api_client):
        """GET /api/formation/sessions returns sessions with stats"""
        response = api_client.get(f"{BASE_URL}/api/formation/sessions")
        assert response.status_code == 200
        
        data = response.json()
        assert "sessions" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "total" in stats
        assert "planifiees" in stats
        assert "completees" in stats
        assert "en_retard" in stats
        assert "total_participants" in stats
    
    def test_filter_sessions_by_statut(self, api_client):
        """GET /api/formation/sessions with statut filter"""
        response = api_client.get(f"{BASE_URL}/api/formation/sessions?statut=planifiee")
        assert response.status_code == 200
        
        sessions = response.json().get("sessions", [])
        for s in sessions:
            assert s.get("statut") == "planifiee"
    
    def test_filter_sessions_by_theme(self, api_client):
        """GET /api/formation/sessions with theme_code filter"""
        response = api_client.get(f"{BASE_URL}/api/formation/sessions?theme_code=DROITS_HOMME")
        assert response.status_code == 200
        
        sessions = response.json().get("sessions", [])
        for s in sessions:
            assert s.get("theme_code") == "DROITS_HOMME"
    
    def test_update_session_status_to_completee(self, api_client):
        """PUT /api/formation/sessions/{id} updates session status"""
        # First get a session
        response = api_client.get(f"{BASE_URL}/api/formation/sessions")
        sessions = response.json().get("sessions", [])
        
        if not sessions:
            pytest.skip("No sessions available for update test")
        
        session_id = sessions[0]["session_id"]
        
        # Update to completee
        response = api_client.put(f"{BASE_URL}/api/formation/sessions/{session_id}", json={
            "statut": "completee"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert data["session"]["statut"] == "completee"
        
        # Verify with GET
        response = api_client.get(f"{BASE_URL}/api/formation/sessions/{session_id}")
        assert response.status_code == 200
        assert response.json()["session"]["statut"] == "completee"


class TestFormationParticipants:
    """Test Participant management"""
    
    @pytest.fixture(scope="class")
    def session_id(self, api_client):
        """Get or create a session for participant tests"""
        response = api_client.get(f"{BASE_URL}/api/formation/sessions")
        if response.status_code == 200 and response.json().get("sessions"):
            return response.json()["sessions"][0]["session_id"]
        pytest.skip("No sessions available for participant tests")
    
    def test_add_participants_to_session(self, api_client, session_id):
        """POST /api/formation/sessions/{id}/participants adds participants"""
        participants = [
            {"nom": "TEST_Kouassi", "prenom": "Jean", "role": "Producteur", "telephone": "+2250701010101", "signature": True},
            {"nom": "TEST_Yao", "prenom": "Marie", "role": "Travailleur", "telephone": "+2250702020202", "signature": True}
        ]
        
        response = api_client.post(f"{BASE_URL}/api/formation/sessions/{session_id}/participants", json=participants)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert data.get("added") == 2
    
    def test_get_participants_list(self, api_client, session_id):
        """GET /api/formation/sessions/{id}/participants returns participants"""
        response = api_client.get(f"{BASE_URL}/api/formation/sessions/{session_id}/participants")
        assert response.status_code == 200
        
        data = response.json()
        assert "participants" in data
        assert isinstance(data["participants"], list)
        
        # Verify participant structure
        if data["participants"]:
            p = data["participants"][0]
            assert "participant_id" in p
            assert "nom" in p
            assert "prenom" in p
            assert "role" in p


class TestFormationPVPDF:
    """Test PV PDF generation"""
    
    def test_generate_pv_pdf(self, api_client):
        """GET /api/formation/sessions/{id}/pv/pdf generates PDF"""
        # Get a session with participants
        response = api_client.get(f"{BASE_URL}/api/formation/sessions")
        sessions = response.json().get("sessions", [])
        
        if not sessions:
            pytest.skip("No sessions available for PV test")
        
        session_id = sessions[0]["session_id"]
        
        response = api_client.get(f"{BASE_URL}/api/formation/sessions/{session_id}/pv/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        assert "attachment" in response.headers.get("content-disposition", "")
        assert len(response.content) > 0


class TestFormationAttestations:
    """Test Attestation PDF generation"""
    
    def test_generate_attestation_pdf(self, api_client):
        """GET /api/formation/attestation/{session_id}/{participant_id}/pdf generates attestation"""
        # Get a session with participants
        response = api_client.get(f"{BASE_URL}/api/formation/sessions")
        sessions = response.json().get("sessions", [])
        
        session_with_participants = None
        for s in sessions:
            if s.get("participants") and len(s["participants"]) > 0:
                session_with_participants = s
                break
        
        if not session_with_participants:
            pytest.skip("No session with participants for attestation test")
        
        session_id = session_with_participants["session_id"]
        participant_id = session_with_participants["participants"][0]["participant_id"]
        
        response = api_client.get(f"{BASE_URL}/api/formation/attestation/{session_id}/{participant_id}/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0


class TestFormationDashboard:
    """Test Dashboard with KPIs, theme coverage, alerts"""
    
    def test_dashboard_returns_kpis(self, api_client):
        """GET /api/formation/dashboard returns dashboard with KPIs"""
        response = api_client.get(f"{BASE_URL}/api/formation/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "has_programme" in data
        assert "kpis" in data
        
        kpis = data["kpis"]
        assert "total_sessions" in kpis
        assert "completees" in kpis
        assert "planifiees" in kpis
        assert "en_retard" in kpis
        assert "total_participants" in kpis
        assert "total_pv" in kpis
        assert "taux_couverture" in kpis
        assert "themes_complets" in kpis
        assert "themes_total" in kpis
    
    def test_dashboard_returns_theme_coverage(self, api_client):
        """Dashboard includes theme coverage for all 12 themes"""
        response = api_client.get(f"{BASE_URL}/api/formation/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "theme_coverage" in data
        
        theme_coverage = data["theme_coverage"]
        assert len(theme_coverage) == 12, f"Expected 12 themes, got {len(theme_coverage)}"
        
        for t in theme_coverage:
            assert "code" in t
            assert "titre" in t
            assert "clause" in t
            assert "sessions" in t
            assert "participants" in t
            assert "statut" in t
            assert t["statut"] in ["complete", "planifie", "non_planifie"]
    
    def test_dashboard_returns_alerts(self, api_client):
        """Dashboard includes alerts for missing/overdue formations"""
        response = api_client.get(f"{BASE_URL}/api/formation/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "alertes" in data
        assert isinstance(data["alertes"], list)
        
        # Verify alert structure if any exist
        for alert in data["alertes"]:
            assert "type" in alert
            assert "severity" in alert
            assert "message" in alert


class TestFormationMemberHistory:
    """Test member training history"""
    
    def test_get_member_history(self, api_client):
        """GET /api/formation/member/{name}/history returns member training history"""
        # Use a name that might exist from previous tests
        response = api_client.get(f"{BASE_URL}/api/formation/member/Kouassi/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "formations" in data
        assert "member" in data
        assert data["member"] == "Kouassi"
        
        # Verify formation structure if any exist
        for f in data["formations"]:
            assert "session_id" in f
            assert "theme_titre" in f
            assert "date_session" in f


class TestFormationExcelExport:
    """Test Excel export"""
    
    def test_export_excel(self, api_client):
        """GET /api/formation/export/excel exports all data as Excel"""
        response = api_client.get(f"{BASE_URL}/api/formation/export/excel")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type.lower() or "openxmlformats" in content_type
        assert len(response.content) > 0


class TestFormationIntegration:
    """Integration tests for complete workflows"""
    
    def test_complete_formation_workflow(self, api_client):
        """Test complete workflow: create programme -> session -> participants -> complete -> dashboard update"""
        # 1. Create programme
        prog_response = api_client.post(f"{BASE_URL}/api/formation/programmes", json={
            "titre": f"TEST_Integration_{uuid.uuid4().hex[:8]}",
            "campagne": "2025-2026"
        })
        assert prog_response.status_code == 200
        programme_id = prog_response.json()["programme"]["programme_id"]
        
        # 2. Create session for SST theme
        session_response = api_client.post(f"{BASE_URL}/api/formation/sessions", json={
            "programme_id": programme_id,
            "theme_code": "SST",
            "date_session": "2025-02-20",
            "lieu": "Centre de formation",
            "formateur": "Dr. Safety Expert",
            "duree_heures": 4
        })
        assert session_response.status_code == 200
        session_id = session_response.json()["session"]["session_id"]
        
        # Verify theme data was pre-filled
        session = session_response.json()["session"]
        assert "Sante" in session.get("theme_titre", "") or "SST" in session.get("theme_titre", "")
        
        # 3. Add participants
        participants_response = api_client.post(f"{BASE_URL}/api/formation/sessions/{session_id}/participants", json=[
            {"nom": "TEST_Worker1", "prenom": "Alpha", "role": "Travailleur", "telephone": "+2250703030303", "signature": True},
            {"nom": "TEST_Worker2", "prenom": "Beta", "role": "Producteur", "telephone": "+2250704040404", "signature": True}
        ])
        assert participants_response.status_code == 200
        assert participants_response.json()["added"] == 2
        
        # 4. Mark session as completee
        complete_response = api_client.put(f"{BASE_URL}/api/formation/sessions/{session_id}", json={
            "statut": "completee"
        })
        assert complete_response.status_code == 200
        assert complete_response.json()["session"]["statut"] == "completee"
        
        # 5. Verify dashboard reflects the completion
        dashboard_response = api_client.get(f"{BASE_URL}/api/formation/dashboard")
        assert dashboard_response.status_code == 200
        
        dashboard = dashboard_response.json()
        assert dashboard["kpis"]["completees"] >= 1
        
        # Check SST theme coverage
        sst_coverage = next((t for t in dashboard["theme_coverage"] if t["code"] == "SST"), None)
        assert sst_coverage is not None
        assert sst_coverage["sessions"] >= 1
        
        print(f"Integration test completed successfully. Programme: {programme_id}, Session: {session_id}")
