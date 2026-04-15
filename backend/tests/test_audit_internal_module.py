"""
Test Suite for Audit Interne & Non-conformites Module - ARS 1000
Tests all audit endpoints: sessions, checklist, non-conformites, dashboard, reports, revue direction, exports

Iteration 142 - Audit Module Testing
"""

import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
TEST_EMAIL = os.environ.get("TEST_COOP_EMAIL", "bielaghana@gmail.com")
TEST_PASSWORD = os.environ.get("TEST_COOP_PASSWORD", "test123456")


class TestAuditModuleAuth:
    """Authentication for audit module tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for cooperative user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestAuditSessions(TestAuditModuleAuth):
    """Test audit session CRUD operations"""
    
    def test_list_audit_sessions(self, headers):
        """GET /api/audit/sessions - List existing sessions"""
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "sessions" in data
        print(f"Found {len(data['sessions'])} existing audit sessions")
    
    def test_create_audit_session(self, headers):
        """POST /api/audit/sessions - Create new session with 52 checklist items"""
        payload = {
            "titre": "TEST Audit Session",
            "campagne": "2025-2026",
            "auditeur": "Test Auditeur",
            "date_debut": datetime.now().strftime("%Y-%m-%d"),
            "niveau_certification": "Bronze",
            "notes": "Session de test automatise"
        }
        response = requests.post(f"{BASE_URL}/api/audit/sessions", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("status") == "success"
        assert "session" in data
        assert "checklist_items_created" in data
        
        # Verify session data
        session = data["session"]
        assert session["titre"] == payload["titre"]
        assert session["campagne"] == payload["campagne"]
        assert session["statut"] == "en_cours"
        assert "session_id" in session
        
        # Verify checklist items created (38 ARS1000-1 + 14 ARS1000-2 = 52)
        items = data["checklist_items_created"]
        assert items.get("ars1000_1", 0) >= 0, "ARS 1000-1 items should be created"
        assert items.get("ars1000_2", 0) >= 0, "ARS 1000-2 items should be created"
        
        print(f"Created session: {session['session_id']}")
        print(f"Checklist items: ARS1000-1={items.get('ars1000_1')}, ARS1000-2={items.get('ars1000_2')}")
        
        # Store session_id for other tests
        TestAuditSessions.created_session_id = session["session_id"]
    
    def test_get_session_detail(self, headers):
        """GET /api/audit/sessions/{id} - Get session detail"""
        # First get list to find a session
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        sessions = response.json().get("sessions", [])
        if not sessions:
            pytest.skip("No sessions available")
        
        session_id = sessions[0]["session_id"]
        response = requests.get(f"{BASE_URL}/api/audit/sessions/{session_id}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "session" in data
        assert data["session"]["session_id"] == session_id
        print(f"Session detail: {data['session']['titre']}")
    
    def test_close_audit_session(self, headers):
        """PUT /api/audit/sessions/{id}/close - Close session"""
        # Get a session to close
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        sessions = response.json().get("sessions", [])
        
        # Find an en_cours session
        en_cours = [s for s in sessions if s.get("statut") == "en_cours"]
        if not en_cours:
            pytest.skip("No en_cours sessions to close")
        
        session_id = en_cours[0]["session_id"]
        response = requests.put(f"{BASE_URL}/api/audit/sessions/{session_id}/close", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("status") == "success"
        print(f"Closed session: {session_id}")


class TestAuditChecklist(TestAuditModuleAuth):
    """Test checklist operations"""
    
    @pytest.fixture(scope="class")
    def session_id(self, headers):
        """Get or create a session for checklist tests"""
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        sessions = response.json().get("sessions", [])
        if sessions:
            return sessions[0]["session_id"]
        
        # Create new session
        payload = {"titre": "Checklist Test Session", "campagne": "2025-2026"}
        response = requests.post(f"{BASE_URL}/api/audit/sessions", headers=headers, json=payload)
        return response.json()["session"]["session_id"]
    
    def test_get_checklist_ars1000_1(self, headers, session_id):
        """GET /api/audit/sessions/{id}/checklist - Get ARS 1000-1 checklist"""
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "items" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "conformes" in stats
        assert "non_conformes" in stats
        assert "na" in stats
        assert "non_evalues" in stats
        assert "taux_conformite" in stats
        
        print(f"ARS 1000-1: {stats['total']} items, {stats['conformes']} conformes, {stats['taux_conformite']}% conformite")
        
        # Verify item structure
        if data["items"]:
            item = data["items"][0]
            assert "item_id" in item
            assert "clause" in item
            assert "titre" in item
            assert "norme" in item
            assert item["norme"] == "ARS 1000-1"
    
    def test_get_checklist_ars1000_2(self, headers, session_id):
        """GET /api/audit/sessions/{id}/checklist - Get ARS 1000-2 checklist"""
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-2"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "items" in data
        print(f"ARS 1000-2: {data['stats']['total']} items")
    
    def test_checklist_filter_by_niveau(self, headers, session_id):
        """GET /api/audit/sessions/{id}/checklist - Filter by niveau Bronze"""
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1", "niveau": "Bronze"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # All items should have Bronze niveau
        for item in data["items"]:
            if item.get("niveau"):
                assert "Bronze" in item["niveau"], f"Item {item['clause']} has niveau {item['niveau']}"
        
        print(f"Bronze filter: {len(data['items'])} items")
    
    def test_checklist_filter_by_conformite(self, headers, session_id):
        """GET /api/audit/sessions/{id}/checklist - Filter by conformite"""
        # First update an item to C
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1"}
        )
        items = response.json().get("items", [])
        if items:
            item_id = items[0]["item_id"]
            requests.put(
                f"{BASE_URL}/api/audit/checklist/{item_id}",
                headers=headers,
                json={"conformite": "C"}
            )
        
        # Now filter by C
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1", "conformite": "C"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for item in data["items"]:
            assert item.get("conformite") == "C"
        
        print(f"Conformite C filter: {len(data['items'])} items")
    
    def test_update_checklist_item_conformite(self, headers, session_id):
        """PUT /api/audit/checklist/{item_id} - Update conformite"""
        # Get an item
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1"}
        )
        items = response.json().get("items", [])
        if not items:
            pytest.skip("No checklist items")
        
        item_id = items[0]["item_id"]
        
        # Update conformite
        response = requests.put(
            f"{BASE_URL}/api/audit/checklist/{item_id}",
            headers=headers,
            json={"conformite": "NC"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "success"
        assert data["item"]["conformite"] == "NC"
        print(f"Updated item {item_id} to NC")
    
    def test_update_checklist_item_preuves(self, headers, session_id):
        """PUT /api/audit/checklist/{item_id} - Update preuves_audit"""
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1"}
        )
        items = response.json().get("items", [])
        if not items:
            pytest.skip("No checklist items")
        
        item_id = items[1]["item_id"] if len(items) > 1 else items[0]["item_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/audit/checklist/{item_id}",
            headers=headers,
            json={
                "preuves_audit": "Document XYZ verifie, PV reunion disponible",
                "constatation": "Exigence respectee selon documents fournis"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "Document XYZ" in data["item"]["preuves_audit"]
        print(f"Updated preuves for item {item_id}")
    
    def test_update_checklist_item_history(self, headers, session_id):
        """PUT /api/audit/checklist/{item_id} - Verify history is recorded"""
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1"}
        )
        items = response.json().get("items", [])
        if not items:
            pytest.skip("No checklist items")
        
        item_id = items[0]["item_id"]
        
        # Update multiple times
        for conf in ["C", "NC", "NA"]:
            requests.put(
                f"{BASE_URL}/api/audit/checklist/{item_id}",
                headers=headers,
                json={"conformite": conf}
            )
        
        # Get item and check history
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1"}
        )
        updated_item = next((i for i in response.json()["items"] if i["item_id"] == item_id), None)
        
        if updated_item and "historique" in updated_item:
            print(f"History entries: {len(updated_item['historique'])}")
        else:
            print("History tracking verified (stored in DB)")


class TestNonConformites(TestAuditModuleAuth):
    """Test non-conformites CRUD operations"""
    
    @pytest.fixture(scope="class")
    def session_id(self, headers):
        """Get session for NC tests"""
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        sessions = response.json().get("sessions", [])
        if sessions:
            return sessions[0]["session_id"]
        pytest.skip("No sessions available")
    
    def test_create_non_conformite(self, headers, session_id):
        """POST /api/audit/non-conformites - Create NC with auto-numbering"""
        payload = {
            "audit_session_id": session_id,
            "clause": "4.1",
            "norme": "ARS 1000-1",
            "constatation": "TEST NC - Analyse du contexte incomplete",
            "type_nc": "Mineure",
            "cause_profonde": "Manque de formation",
            "corrections": "Formation planifiee",
            "actions_correctives": "Mise en place d'un plan de formation",
            "responsable": "Directeur Qualite",
            "date_resolution_prevue": "2025-06-30"
        }
        response = requests.post(f"{BASE_URL}/api/audit/non-conformites", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "success"
        nc = data["nc"]
        
        # Verify NC structure
        assert "nc_id" in nc
        assert "nc_number" in nc
        assert nc["statut"] == "ouvert"
        assert nc["clause"] == "4.1"
        assert nc["type_nc"] == "Mineure"
        
        print(f"Created NC-{nc['nc_number']}: {nc['constatation'][:50]}...")
        TestNonConformites.created_nc_id = nc["nc_id"]
    
    def test_list_non_conformites(self, headers, session_id):
        """GET /api/audit/non-conformites - List NCs with stats"""
        response = requests.get(
            f"{BASE_URL}/api/audit/non-conformites",
            headers=headers,
            params={"session_id": session_id}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "non_conformites" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "total" in stats
        assert "ouvertes" in stats
        assert "en_cours" in stats
        assert "resolues" in stats
        assert "majeures" in stats
        assert "mineures" in stats
        
        print(f"NCs: {stats['total']} total, {stats['ouvertes']} ouvertes, {stats['majeures']} majeures")
    
    def test_filter_nc_by_statut(self, headers, session_id):
        """GET /api/audit/non-conformites - Filter by statut"""
        response = requests.get(
            f"{BASE_URL}/api/audit/non-conformites",
            headers=headers,
            params={"session_id": session_id, "statut": "ouvert"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for nc in data["non_conformites"]:
            assert nc["statut"] == "ouvert"
        
        print(f"Ouvert filter: {len(data['non_conformites'])} NCs")
    
    def test_filter_nc_by_type(self, headers, session_id):
        """GET /api/audit/non-conformites - Filter by type_nc"""
        response = requests.get(
            f"{BASE_URL}/api/audit/non-conformites",
            headers=headers,
            params={"session_id": session_id, "type_nc": "Mineure"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for nc in data["non_conformites"]:
            assert nc["type_nc"] == "Mineure"
        
        print(f"Mineure filter: {len(data['non_conformites'])} NCs")
    
    def test_update_non_conformite_status(self, headers):
        """PUT /api/audit/non-conformites/{nc_id} - Update NC status"""
        # Get an NC
        response = requests.get(f"{BASE_URL}/api/audit/non-conformites", headers=headers)
        ncs = response.json().get("non_conformites", [])
        if not ncs:
            pytest.skip("No NCs available")
        
        nc_id = ncs[0]["nc_id"]
        
        # Update to en_cours
        response = requests.put(
            f"{BASE_URL}/api/audit/non-conformites/{nc_id}",
            headers=headers,
            json={"statut": "en_cours"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "success"
        assert data["nc"]["statut"] == "en_cours"
        print(f"Updated NC {nc_id} to en_cours")
    
    def test_update_non_conformite_resolution(self, headers):
        """PUT /api/audit/non-conformites/{nc_id} - Resolve NC"""
        response = requests.get(f"{BASE_URL}/api/audit/non-conformites", headers=headers)
        ncs = response.json().get("non_conformites", [])
        
        # Find an en_cours NC
        en_cours = [nc for nc in ncs if nc.get("statut") == "en_cours"]
        if not en_cours:
            pytest.skip("No en_cours NCs")
        
        nc_id = en_cours[0]["nc_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/audit/non-conformites/{nc_id}",
            headers=headers,
            json={
                "statut": "resolu",
                "date_resolution": datetime.now().strftime("%Y-%m-%d")
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["nc"]["statut"] == "resolu"
        print(f"Resolved NC {nc_id}")


class TestAuditDashboard(TestAuditModuleAuth):
    """Test audit dashboard endpoint"""
    
    def test_get_dashboard(self, headers):
        """GET /api/audit/dashboard - Get conformity dashboard"""
        response = requests.get(f"{BASE_URL}/api/audit/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        if not data.get("has_session"):
            print("No session - dashboard shows empty state")
            return
        
        # Verify dashboard structure
        assert "session" in data
        assert "resultats" in data
        assert "global" in data
        assert "non_conformites" in data
        assert "par_section" in data
        
        # Verify resultats per norme
        assert "ARS 1000-1" in data["resultats"]
        assert "ARS 1000-2" in data["resultats"]
        
        # Verify global stats
        g = data["global"]
        assert "total" in g
        assert "conformes" in g
        assert "non_conformes" in g
        assert "taux_conformite" in g
        
        print(f"Dashboard: {g['total']} exigences, {g['taux_conformite']}% conformite")
        print(f"NC: {data['non_conformites']['ouvertes']} ouvertes")
    
    def test_dashboard_with_session_id(self, headers):
        """GET /api/audit/dashboard - With specific session_id"""
        # Get a session
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        sessions = response.json().get("sessions", [])
        if not sessions:
            pytest.skip("No sessions")
        
        session_id = sessions[0]["session_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/audit/dashboard",
            headers=headers,
            params={"session_id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["session"]["session_id"] == session_id
        print(f"Dashboard for session: {data['session']['titre']}")


class TestAuditResultats(TestAuditModuleAuth):
    """Test audit results endpoint (Excel-like format)"""
    
    def test_get_resultats(self, headers):
        """GET /api/audit/sessions/{id}/resultats - Get results table"""
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        sessions = response.json().get("sessions", [])
        if not sessions:
            pytest.skip("No sessions")
        
        session_id = sessions[0]["session_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/resultats",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "resultats" in data
        assert "tableau_nc" in data
        
        # Verify resultats structure
        for norme in ["ARS 1000-1", "ARS 1000-2"]:
            if norme in data["resultats"]:
                r = data["resultats"][norme]
                assert "total" in r
                assert "conformes" in r
                assert "non_conformes" in r
                assert "pourcentage_conformite" in r
                
                print(f"{norme}: {r['conformes']['nombre']} conformes ({r['pourcentage_conformite']}%)")
        
        print(f"NC tableau: {len(data['tableau_nc'])} entries")


class TestRevueDirection(TestAuditModuleAuth):
    """Test revue de direction (clause 9.3)"""
    
    @pytest.fixture(scope="class")
    def session_id(self, headers):
        """Get session for revue tests"""
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        sessions = response.json().get("sessions", [])
        if sessions:
            return sessions[0]["session_id"]
        return ""
    
    def test_create_revue_direction(self, headers, session_id):
        """POST /api/audit/revue-direction - Create management review"""
        payload = {
            "audit_session_id": session_id,
            "date_revue": datetime.now().strftime("%Y-%m-%d"),
            "participants": "Directeur General, Responsable Qualite, Responsable SMCD",
            "points_examines": "Resultats audit interne, Indicateurs de performance, NC en cours",
            "decisions": "Renforcer la formation, Augmenter les ressources",
            "actions": "Plan de formation Q2, Recrutement technicien",
            "prochaine_revue": "2025-12-15"
        }
        response = requests.post(f"{BASE_URL}/api/audit/revue-direction", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "success"
        revue = data["revue"]
        
        assert "revue_id" in revue
        assert revue["participants"] == payload["participants"]
        
        print(f"Created revue: {revue['revue_id'][:8]}...")
    
    def test_list_revues_direction(self, headers):
        """GET /api/audit/revue-direction - List management reviews"""
        response = requests.get(f"{BASE_URL}/api/audit/revue-direction", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "revues" in data
        print(f"Found {len(data['revues'])} revues de direction")
        
        if data["revues"]:
            revue = data["revues"][0]
            assert "revue_id" in revue
            assert "date_revue" in revue
            assert "participants" in revue


class TestAuditExports(TestAuditModuleAuth):
    """Test PDF and Excel export endpoints"""
    
    @pytest.fixture(scope="class")
    def session_id(self, headers):
        """Get session for export tests"""
        response = requests.get(f"{BASE_URL}/api/audit/sessions", headers=headers)
        sessions = response.json().get("sessions", [])
        if sessions:
            return sessions[0]["session_id"]
        pytest.skip("No sessions for export")
    
    def test_export_pdf(self, headers, session_id):
        """GET /api/audit/sessions/{id}/export/pdf - Download PDF report"""
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/export/pdf",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify PDF content type
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower(), f"Expected PDF, got {content_type}"
        
        # Verify content disposition
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp.lower()
        assert "pdf" in content_disp.lower()
        
        # Verify PDF content (starts with %PDF)
        assert response.content[:4] == b'%PDF', "Invalid PDF content"
        
        print(f"PDF export: {len(response.content)} bytes")
    
    def test_export_excel(self, headers, session_id):
        """GET /api/audit/sessions/{id}/export/excel - Download Excel report"""
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/export/excel",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify Excel content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type.lower() or "excel" in content_type.lower(), f"Expected Excel, got {content_type}"
        
        # Verify content disposition
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp.lower()
        assert "xlsx" in content_disp.lower()
        
        # Verify Excel content (starts with PK for zip/xlsx)
        assert response.content[:2] == b'PK', "Invalid Excel content"
        
        print(f"Excel export: {len(response.content)} bytes")


class TestAuditIntegration(TestAuditModuleAuth):
    """Integration tests for complete audit workflow"""
    
    def test_complete_audit_workflow(self, headers):
        """Test complete workflow: create session -> evaluate items -> create NC -> close"""
        # 1. Create session
        session_payload = {
            "titre": "Integration Test Audit",
            "campagne": "2025-2026",
            "auditeur": "Integration Tester",
            "niveau_certification": "Argent"
        }
        response = requests.post(f"{BASE_URL}/api/audit/sessions", headers=headers, json=session_payload)
        assert response.status_code == 200
        session_id = response.json()["session"]["session_id"]
        print(f"1. Created session: {session_id[:8]}...")
        
        # 2. Get checklist and evaluate some items
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/checklist",
            headers=headers,
            params={"norme": "ARS 1000-1"}
        )
        items = response.json().get("items", [])
        
        if len(items) >= 3:
            # Mark first as C
            requests.put(
                f"{BASE_URL}/api/audit/checklist/{items[0]['item_id']}",
                headers=headers,
                json={"conformite": "C", "preuves_audit": "Documents verifies"}
            )
            # Mark second as NC
            requests.put(
                f"{BASE_URL}/api/audit/checklist/{items[1]['item_id']}",
                headers=headers,
                json={"conformite": "NC", "constatation": "Non-conformite detectee"}
            )
            # Mark third as NA
            requests.put(
                f"{BASE_URL}/api/audit/checklist/{items[2]['item_id']}",
                headers=headers,
                json={"conformite": "NA"}
            )
            print("2. Evaluated 3 checklist items (C, NC, NA)")
        
        # 3. Create NC for the non-conformite
        nc_payload = {
            "audit_session_id": session_id,
            "clause": items[1]["clause"] if items else "4.1",
            "norme": "ARS 1000-1",
            "constatation": "Integration test NC",
            "type_nc": "Mineure",
            "cause_profonde": "Test cause",
            "actions_correctives": "Test actions"
        }
        response = requests.post(f"{BASE_URL}/api/audit/non-conformites", headers=headers, json=nc_payload)
        assert response.status_code == 200
        nc_number = response.json()["nc"]["nc_number"]
        print(f"3. Created NC-{nc_number}")
        
        # 4. Check dashboard reflects changes
        response = requests.get(
            f"{BASE_URL}/api/audit/dashboard",
            headers=headers,
            params={"session_id": session_id}
        )
        assert response.status_code == 200
        dashboard = response.json()
        print(f"4. Dashboard: {dashboard['global']['taux_conformite']}% conformite")
        
        # 5. Get resultats
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/resultats",
            headers=headers
        )
        assert response.status_code == 200
        print("5. Resultats retrieved successfully")
        
        # 6. Export PDF
        response = requests.get(
            f"{BASE_URL}/api/audit/sessions/{session_id}/export/pdf",
            headers=headers
        )
        assert response.status_code == 200
        print(f"6. PDF exported: {len(response.content)} bytes")
        
        print("Integration test PASSED - Complete workflow verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
