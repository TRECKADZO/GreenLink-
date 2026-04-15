"""
Test Traceability Module - ARS 1000-2 (Clauses 11-16)
Tests all endpoints for lot management, segregation, QR codes, reports, and objectives.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
COOP_EMAIL = "bielaghana@gmail.com"
COOP_PASSWORD = "test123456"

# Existing test lots from context
EXISTING_LOT_CERTIFIE = "LOT-D29F82F8"
EXISTING_LOT_NON_CERTIFIE = "LOT-F6D9B92F"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for cooperative user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"identifier": COOP_EMAIL, "password": COOP_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    data = response.json()
    token = data.get("access_token")
    if not token:
        pytest.skip("No access_token in response")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestTraceabilityDashboard:
    """Test GET /api/traceability/dashboard"""
    
    def test_dashboard_returns_kpis(self, auth_headers):
        """Dashboard should return KPIs, par_etape, recent_events, alertes"""
        response = requests.get(f"{BASE_URL}/api/traceability/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify KPIs structure
        assert "kpis" in data, "Response should contain 'kpis'"
        kpis = data["kpis"]
        assert "total_lots" in kpis
        assert "lots_certifies" in kpis
        assert "lots_non_certifies" in kpis
        assert "lots_conformes" in kpis
        assert "lots_non_conformes" in kpis
        assert "lots_en_cours" in kpis
        assert "volume_total_kg" in kpis
        assert "taux_conformite" in kpis
        assert "taux_certification" in kpis
        
        # Verify par_etape structure
        assert "par_etape" in data, "Response should contain 'par_etape'"
        assert isinstance(data["par_etape"], list)
        
        # Verify recent_events structure
        assert "recent_events" in data, "Response should contain 'recent_events'"
        assert isinstance(data["recent_events"], list)
        
        # Verify alertes structure
        assert "alertes" in data, "Response should contain 'alertes'"
        assert isinstance(data["alertes"], list)
        
        print(f"Dashboard KPIs: total_lots={kpis['total_lots']}, certifies={kpis['lots_certifies']}, volume={kpis['volume_total_kg']}kg")


class TestLotCRUD:
    """Test lot creation, listing, and detail endpoints"""
    
    created_lot_code = None
    
    def test_create_lot(self, auth_headers):
        """POST /api/traceability/lots - Create a new lot"""
        payload = {
            "farmer_id": "TEST_FARMER_001",
            "farmer_name": "TEST Producteur Tracabilite",
            "parcelle_id": "TEST_PARCELLE_001",
            "parcelle_name": "Parcelle Test Tracabilite",
            "quantite_kg": 250.5,
            "date_recolte": "2025-01-15",
            "campagne": "2025-2026",
            "grade_qualite": "en_attente",
            "certifie_ars1000": True,
            "notes": "Lot de test pour tracabilite"
        }
        
        response = requests.post(f"{BASE_URL}/api/traceability/lots", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "lot_code" in data, "Response should contain lot_code"
        assert data["lot_code"].startswith("LOT-"), "Lot code should start with LOT-"
        
        # Store for later tests
        TestLotCRUD.created_lot_code = data["lot_code"]
        
        # Verify lot data
        lot = data.get("lot")
        assert lot is not None
        assert lot["farmer_name"] == payload["farmer_name"]
        assert lot["quantite_initiale_kg"] == payload["quantite_kg"]
        assert lot["certifie_ars1000"] == True
        assert lot["segregation"] == "certifie"  # Should be auto-set based on certifie_ars1000
        assert lot["etape_courante"] == "recolte"  # Initial step
        
        print(f"Created lot: {data['lot_code']}")
    
    def test_list_lots(self, auth_headers):
        """GET /api/traceability/lots - List lots with filters"""
        response = requests.get(f"{BASE_URL}/api/traceability/lots", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lots" in data
        assert "total" in data
        assert isinstance(data["lots"], list)
        
        print(f"Total lots: {data['total']}")
    
    def test_list_lots_with_search_filter(self, auth_headers):
        """GET /api/traceability/lots?search=TEST - Filter by search"""
        response = requests.get(f"{BASE_URL}/api/traceability/lots?search=TEST", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "lots" in data
        # Should find our test lot
        if data["total"] > 0:
            print(f"Found {data['total']} lots matching 'TEST'")
    
    def test_list_lots_with_etape_filter(self, auth_headers):
        """GET /api/traceability/lots?etape=recolte - Filter by etape"""
        response = requests.get(f"{BASE_URL}/api/traceability/lots?etape=recolte", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "lots" in data
        # All returned lots should be at recolte stage
        for lot in data["lots"]:
            assert lot["etape_courante"] == "recolte"
        
        print(f"Found {data['total']} lots at 'recolte' stage")
    
    def test_list_lots_with_certifie_filter(self, auth_headers):
        """GET /api/traceability/lots?certifie=true - Filter by certification"""
        response = requests.get(f"{BASE_URL}/api/traceability/lots?certifie=true", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "lots" in data
        # All returned lots should be certified
        for lot in data["lots"]:
            assert lot["certifie_ars1000"] == True
        
        print(f"Found {data['total']} certified lots")
    
    def test_get_lot_detail(self, auth_headers):
        """GET /api/traceability/lots/{lot_code} - Get lot detail"""
        if not TestLotCRUD.created_lot_code:
            pytest.skip("No lot created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/traceability/lots/{TestLotCRUD.created_lot_code}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lot" in data
        lot = data["lot"]
        assert lot["lot_code"] == TestLotCRUD.created_lot_code
        assert lot["farmer_name"] == "TEST Producteur Tracabilite"
        
        print(f"Got detail for lot: {lot['lot_code']}")
    
    def test_get_lot_detail_not_found(self, auth_headers):
        """GET /api/traceability/lots/{lot_code} - 404 for non-existent lot"""
        response = requests.get(
            f"{BASE_URL}/api/traceability/lots/LOT-NONEXISTENT",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestLotEvents:
    """Test adding events to lots and timeline"""
    
    def test_add_event_to_lot(self, auth_headers):
        """POST /api/traceability/lots/{lot_code}/events - Add event"""
        if not TestLotCRUD.created_lot_code:
            pytest.skip("No lot created in previous test")
        
        payload = {
            "etape": "fermentation",
            "date_evenement": "2025-01-16",
            "quantite_kg": 245.0,
            "lieu": "Centre de fermentation Abidjan",
            "responsable": "Jean Kouassi",
            "temperature": 45.5,
            "humidite": 75.0,
            "duree_heures": 72,
            "observations": "Fermentation normale, bonne odeur",
            "conforme": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/traceability/lots/{TestLotCRUD.created_lot_code}/events",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "event" in data
        event = data["event"]
        assert event["etape"] == "fermentation"
        assert event["etape_label"] == "Fermentation"
        assert event["quantite_kg"] == 245.0
        assert event["conforme"] == True
        assert "event_id" in event
        
        print(f"Added event: {event['etape_label']} to lot {TestLotCRUD.created_lot_code}")
    
    def test_add_event_invalid_etape(self, auth_headers):
        """POST /api/traceability/lots/{lot_code}/events - Invalid etape should fail"""
        if not TestLotCRUD.created_lot_code:
            pytest.skip("No lot created in previous test")
        
        payload = {
            "etape": "invalid_etape",
            "quantite_kg": 100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/traceability/lots/{TestLotCRUD.created_lot_code}/events",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 400, "Invalid etape should return 400"
    
    def test_get_lot_timeline(self, auth_headers):
        """GET /api/traceability/lots/{lot_code}/timeline - Get complete timeline"""
        if not TestLotCRUD.created_lot_code:
            pytest.skip("No lot created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/traceability/lots/{TestLotCRUD.created_lot_code}/timeline",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lot_code" in data
        assert "timeline" in data
        assert isinstance(data["timeline"], list)
        
        # Timeline should have all 7 stages
        assert len(data["timeline"]) == 7
        
        # Check timeline structure
        for step in data["timeline"]:
            assert "etape" in step
            assert "label" in step
            assert "completed" in step
            assert "current" in step
            assert "events" in step
        
        # Verify fermentation step has our event
        fermentation_step = next((s for s in data["timeline"] if s["etape"] == "fermentation"), None)
        assert fermentation_step is not None
        assert fermentation_step["completed"] == True
        assert len(fermentation_step["events"]) > 0
        
        print(f"Timeline for {data['lot_code']}: {len(data['timeline'])} stages")


class TestSegregation:
    """Test segregation endpoints"""
    
    def test_get_segregation_status(self, auth_headers):
        """GET /api/traceability/segregation - Get warehouse status"""
        response = requests.get(f"{BASE_URL}/api/traceability/segregation", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "certifie" in data
        assert "non_certifie" in data
        
        # Check certifie warehouse structure
        certifie = data["certifie"]
        assert "label" in certifie
        assert "items" in certifie
        assert "total_kg" in certifie
        assert "total_lots" in certifie
        
        # Check non_certifie warehouse structure
        non_certifie = data["non_certifie"]
        assert "label" in non_certifie
        assert "items" in non_certifie
        assert "total_kg" in non_certifie
        assert "total_lots" in non_certifie
        
        print(f"Segregation: Certifie={certifie['total_lots']} lots, Non-certifie={non_certifie['total_lots']} lots")
    
    def test_segregation_check_allowed(self, auth_headers):
        """POST /api/traceability/segregation/check - Same type lots allowed"""
        # Use our created lot (certifie) with another certifie lot if exists
        if not TestLotCRUD.created_lot_code:
            pytest.skip("No lot created in previous test")
        
        # Check with single lot - should be allowed
        payload = {"lot_ids": [TestLotCRUD.created_lot_code]}
        response = requests.post(
            f"{BASE_URL}/api/traceability/segregation/check",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["allowed"] == True
        print(f"Single lot check: allowed={data['allowed']}")
    
    def test_segregation_check_blocked(self, auth_headers):
        """POST /api/traceability/segregation/check - Mixed lots blocked"""
        # Use existing lots: one certifie, one non-certifie
        payload = {
            "lot_ids": [EXISTING_LOT_CERTIFIE, EXISTING_LOT_NON_CERTIFIE],
            "action": "melange"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/traceability/segregation/check",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should be blocked because mixing certifie and non-certifie
        assert data["allowed"] == False, "Mixing certified and non-certified should be blocked"
        assert "alerte" in data or "message" in data
        
        print(f"Mixed lots check: allowed={data['allowed']}, message={data.get('message', '')}")


class TestQRCode:
    """Test QR code generation"""
    
    def test_get_qrcode_base64(self, auth_headers):
        """GET /api/traceability/lots/{lot_code}/qrcode-base64 - Get QR code"""
        if not TestLotCRUD.created_lot_code:
            pytest.skip("No lot created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/traceability/lots/{TestLotCRUD.created_lot_code}/qrcode-base64",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "qr_base64" in data
        assert "lot_code" in data
        assert data["lot_code"] == TestLotCRUD.created_lot_code
        assert data["qr_base64"].startswith("data:image/png;base64,")
        
        print(f"QR code generated for {data['lot_code']}, length={len(data['qr_base64'])}")


class TestObjectives:
    """Test ARS 1000 objectives endpoint"""
    
    def test_get_objectives(self, auth_headers):
        """GET /api/traceability/objectives - Get ARS 1000 objectives"""
        response = requests.get(f"{BASE_URL}/api/traceability/objectives", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "objectives" in data
        assert "score_global" in data
        assert "total_lots" in data
        
        objectives = data["objectives"]
        assert isinstance(objectives, list)
        assert len(objectives) == 6  # Clauses 11-16
        
        # Check each objective structure
        for obj in objectives:
            assert "clause" in obj
            assert "titre" in obj
            assert "description" in obj
            assert "valeur" in obj
            assert "cible" in obj
            assert "unite" in obj
            assert "progression" in obj
            assert "statut" in obj
            assert obj["statut"] in ["conforme", "en_cours", "en_attente"]
        
        # Verify clauses 11-16
        clauses = [obj["clause"] for obj in objectives]
        assert "11" in clauses
        assert "12" in clauses
        assert "13" in clauses
        assert "14" in clauses
        assert "15" in clauses
        assert "16" in clauses
        
        print(f"Objectives: score_global={data['score_global']}%, total_lots={data['total_lots']}")


class TestReports:
    """Test reports and export endpoints"""
    
    def test_get_audit_data(self, auth_headers):
        """GET /api/traceability/reports/audit-data - Get audit report data"""
        response = requests.get(f"{BASE_URL}/api/traceability/reports/audit-data", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "resume" in data
        assert "par_producteur" in data
        assert "par_etape" in data
        assert "lots" in data
        
        # Check resume structure
        resume = data["resume"]
        assert "total_lots" in resume
        assert "lots_certifies" in resume
        assert "lots_conformes" in resume
        assert "lots_non_conformes" in resume
        assert "volume_total_kg" in resume
        assert "taux_conformite" in resume
        
        print(f"Audit data: {resume['total_lots']} lots, {resume['volume_total_kg']}kg, {resume['taux_conformite']}% conformite")
    
    def test_export_excel(self, auth_headers):
        """GET /api/traceability/reports/export/excel - Download Excel file"""
        response = requests.get(
            f"{BASE_URL}/api/traceability/reports/export/excel",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type
        
        # Check content disposition
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp
        assert ".xlsx" in content_disp
        
        # Check file size
        assert len(response.content) > 0
        
        print(f"Excel export: {len(response.content)} bytes")
    
    def test_export_pdf(self, auth_headers):
        """GET /api/traceability/reports/export/pdf - Download PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/traceability/reports/export/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "pdf" in content_type or "octet-stream" in content_type
        
        # Check content disposition
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp
        assert ".pdf" in content_disp
        
        # Check file size
        assert len(response.content) > 0
        
        print(f"PDF export: {len(response.content)} bytes")


class TestUSSDTrace:
    """Test USSD traceability endpoint"""
    
    def test_ussd_trace_lot(self, auth_headers):
        """POST /api/traceability/ussd/trace - USSD lot trace"""
        if not TestLotCRUD.created_lot_code:
            pytest.skip("No lot created in previous test")
        
        payload = {"lot_code": TestLotCRUD.created_lot_code}
        
        response = requests.post(
            f"{BASE_URL}/api/traceability/ussd/trace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "lot_code" in data
        assert TestLotCRUD.created_lot_code in data["message"]
        
        print(f"USSD trace response: {data['message'][:100]}...")
    
    def test_ussd_trace_not_found(self, auth_headers):
        """POST /api/traceability/ussd/trace - Non-existent lot"""
        payload = {"lot_code": "LOT-NONEXISTENT"}
        
        response = requests.post(
            f"{BASE_URL}/api/traceability/ussd/trace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200  # Returns 200 with error message
        
        data = response.json()
        assert "introuvable" in data["message"].lower() or "not found" in data["message"].lower()
    
    def test_ussd_trace_empty_code(self, auth_headers):
        """POST /api/traceability/ussd/trace - Empty lot code"""
        payload = {"lot_code": ""}
        
        response = requests.post(
            f"{BASE_URL}/api/traceability/ussd/trace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data


class TestExistingLots:
    """Test with existing lots mentioned in context"""
    
    def test_existing_lot_certifie(self, auth_headers):
        """Verify existing certified lot LOT-D29F82F8"""
        response = requests.get(
            f"{BASE_URL}/api/traceability/lots/{EXISTING_LOT_CERTIFIE}",
            headers=auth_headers
        )
        
        if response.status_code == 404:
            pytest.skip(f"Existing lot {EXISTING_LOT_CERTIFIE} not found - may have been deleted")
        
        assert response.status_code == 200
        data = response.json()
        lot = data.get("lot", {})
        
        print(f"Existing lot {EXISTING_LOT_CERTIFIE}: certifie={lot.get('certifie_ars1000')}, etape={lot.get('etape_courante')}")
    
    def test_existing_lot_non_certifie(self, auth_headers):
        """Verify existing non-certified lot LOT-F6D9B92F"""
        response = requests.get(
            f"{BASE_URL}/api/traceability/lots/{EXISTING_LOT_NON_CERTIFIE}",
            headers=auth_headers
        )
        
        if response.status_code == 404:
            pytest.skip(f"Existing lot {EXISTING_LOT_NON_CERTIFIE} not found - may have been deleted")
        
        assert response.status_code == 200
        data = response.json()
        lot = data.get("lot", {})
        
        print(f"Existing lot {EXISTING_LOT_NON_CERTIFIE}: certifie={lot.get('certifie_ars1000')}, etape={lot.get('etape_courante')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
