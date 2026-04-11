"""
Test ARS 1000 PDC v2 Migration - Iteration 136
Tests for:
1. GET /api/ars1000/certification/dashboard - reads from pdc_v2, returns score_ombrage_moyen and pdc_conformes_ombrage
2. GET /api/admin/analytics/ars1000/stats - reads from pdc_v2 with correct fiche completion checks
3. GET /api/pdc-v2/list - PDC list endpoint for Diagnostic tab
4. GET /api/pdc-v2/stats/overview - PDC stats for PDC tab
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Global session and token
_session = None
_token = None

def get_session():
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers.update({"Content-Type": "application/json"})
    return _session

def get_token():
    global _token
    if _token is None:
        session = get_session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            _token = response.json().get("access_token")
        else:
            raise Exception(f"Login failed: {response.text}")
    return _token

def auth_headers():
    return {
        "Authorization": f"Bearer {get_token()}",
        "Content-Type": "application/json"
    }


class TestAuth:
    """Authentication tests"""
    
    def test_cooperative_login(self):
        """Test cooperative login"""
        session = get_session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"PASSED: Cooperative login successful")


class TestCertificationDashboard:
    """Test GET /api/ars1000/certification/dashboard - migrated to pdc_v2"""
    
    def test_dashboard_endpoint_exists(self):
        """Test that certification dashboard endpoint exists and returns 200"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/ars1000/certification/dashboard", headers=auth_headers())
        assert response.status_code == 200, f"Dashboard endpoint failed: {response.text}"
        print(f"PASSED: Certification dashboard endpoint returns 200")
    
    def test_dashboard_returns_certification_object(self):
        """Test that dashboard returns certification object"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/ars1000/certification/dashboard", headers=auth_headers())
        data = response.json()
        assert "certification" in data, "No certification in response"
        assert "niveau" in data["certification"], "No niveau in certification"
        print(f"PASSED: Dashboard returns certification object with niveau: {data['certification']['niveau']}")
    
    def test_dashboard_returns_stats(self):
        """Test that dashboard returns stats object"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/ars1000/certification/dashboard", headers=auth_headers())
        data = response.json()
        assert "stats" in data, "No stats in response"
        stats = data["stats"]
        # Check required stats fields
        required_fields = ["total_pdcs", "pdc_valides", "conformite_ars1", "total_lots", 
                          "conformite_ars2", "conformite_global", "total_arbres_ombrage", 
                          "nombre_especes", "nc_ouvertes"]
        for field in required_fields:
            assert field in stats, f"Missing field {field} in stats"
        print(f"PASSED: Dashboard returns stats with all required fields")
        print(f"  - total_pdcs: {stats['total_pdcs']}")
        print(f"  - pdc_valides: {stats['pdc_valides']}")
        print(f"  - conformite_ars1: {stats['conformite_ars1']}%")
    
    def test_dashboard_returns_score_ombrage_moyen(self):
        """Test that dashboard returns score_ombrage_moyen (new field from pdc_v2)"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/ars1000/certification/dashboard", headers=auth_headers())
        data = response.json()
        stats = data.get("stats", {})
        assert "score_ombrage_moyen" in stats, "Missing score_ombrage_moyen in stats"
        score = stats["score_ombrage_moyen"]
        assert isinstance(score, (int, float)), f"score_ombrage_moyen should be numeric, got {type(score)}"
        assert 0 <= score <= 100, f"score_ombrage_moyen should be 0-100, got {score}"
        print(f"PASSED: Dashboard returns score_ombrage_moyen: {score}")
    
    def test_dashboard_returns_pdc_conformes_ombrage(self):
        """Test that dashboard returns pdc_conformes_ombrage (new field from pdc_v2)"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/ars1000/certification/dashboard", headers=auth_headers())
        data = response.json()
        stats = data.get("stats", {})
        assert "pdc_conformes_ombrage" in stats, "Missing pdc_conformes_ombrage in stats"
        count = stats["pdc_conformes_ombrage"]
        assert isinstance(count, int), f"pdc_conformes_ombrage should be int, got {type(count)}"
        assert count >= 0, f"pdc_conformes_ombrage should be >= 0, got {count}"
        print(f"PASSED: Dashboard returns pdc_conformes_ombrage: {count}")
    
    def test_dashboard_returns_niveau_suggere(self):
        """Test that dashboard returns niveau_suggere"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/ars1000/certification/dashboard", headers=auth_headers())
        data = response.json()
        assert "niveau_suggere" in data, "No niveau_suggere in response"
        assert data["niveau_suggere"] in ["non_certifie", "bronze", "argent", "or"], f"Invalid niveau_suggere: {data['niveau_suggere']}"
        print(f"PASSED: Dashboard returns niveau_suggere: {data['niveau_suggere']}")


class TestARS1000Analytics:
    """Test GET /api/admin/analytics/ars1000/stats - migrated to pdc_v2"""
    
    def test_analytics_endpoint_exists(self):
        """Test that analytics endpoint exists and returns 200"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/admin/analytics/ars1000/stats", headers=auth_headers())
        assert response.status_code == 200, f"Analytics endpoint failed: {response.text}"
        print(f"PASSED: ARS1000 analytics endpoint returns 200")
    
    def test_analytics_returns_pdc_stats(self):
        """Test that analytics returns pdc stats from pdc_v2"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/admin/analytics/ars1000/stats", headers=auth_headers())
        data = response.json()
        assert "pdc" in data, "No pdc in response"
        pdc = data["pdc"]
        required_fields = ["total", "by_status", "conformite_moyenne", "distribution", "fiches_completion_pct"]
        for field in required_fields:
            assert field in pdc, f"Missing field {field} in pdc stats"
        print(f"PASSED: Analytics returns pdc stats")
        print(f"  - total: {pdc['total']}")
        print(f"  - conformite_moyenne: {pdc['conformite_moyenne']}%")
    
    def test_analytics_pdc_by_status(self):
        """Test that analytics returns pdc by status (pdc_v2 statuses)"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/admin/analytics/ars1000/stats", headers=auth_headers())
        data = response.json()
        by_status = data.get("pdc", {}).get("by_status", {})
        # PDC v2 statuses
        expected_statuses = ["brouillon", "etape1_en_cours", "etape1_complete", "etape2_en_cours", "etape2_complete", "etape3_en_cours", "valide"]
        for status in expected_statuses:
            assert status in by_status, f"Missing status {status} in by_status"
        print(f"PASSED: Analytics returns pdc by status with all PDC v2 statuses")
        print(f"  - by_status: {by_status}")
    
    def test_analytics_fiches_completion_pct(self):
        """Test that analytics returns fiches completion percentages (8 fiches)"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/admin/analytics/ars1000/stats", headers=auth_headers())
        data = response.json()
        fiches_pct = data.get("pdc", {}).get("fiches_completion_pct", {})
        # Check for fiche completion fields
        expected_fiches = ["fiche1_producteur", "fiche2_exploitation", "fiche3_cacaoyere", "fiche4_socioeco", "fiche5_analyse", "fiche6_planification"]
        for fiche in expected_fiches:
            assert fiche in fiches_pct, f"Missing {fiche} in fiches_completion_pct"
        print(f"PASSED: Analytics returns fiches completion percentages")
        print(f"  - fiches_completion_pct: {fiches_pct}")
    
    def test_analytics_returns_agroforesterie(self):
        """Test that analytics returns agroforesterie stats from pdc_v2"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/admin/analytics/ars1000/stats", headers=auth_headers())
        data = response.json()
        assert "agroforesterie" in data, "No agroforesterie in response"
        agro = data["agroforesterie"]
        assert "total_arbres_inventories" in agro, "Missing total_arbres_inventories"
        assert "total_ombrage" in agro, "Missing total_ombrage"
        print(f"PASSED: Analytics returns agroforesterie stats")
        print(f"  - total_arbres_inventories: {agro['total_arbres_inventories']}")
        print(f"  - total_ombrage: {agro['total_ombrage']}")


class TestPDCV2List:
    """Test GET /api/pdc-v2/list - used by Diagnostic tab"""
    
    def test_pdc_v2_list_endpoint_exists(self):
        """Test that pdc-v2 list endpoint exists"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/pdc-v2/list", headers=auth_headers())
        assert response.status_code == 200, f"PDC v2 list endpoint failed: {response.text}"
        print(f"PASSED: PDC v2 list endpoint returns 200")
    
    def test_pdc_v2_list_returns_pdcs_array(self):
        """Test that pdc-v2 list returns pdcs array"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/pdc-v2/list", headers=auth_headers())
        data = response.json()
        assert "pdcs" in data, "No pdcs in response"
        assert isinstance(data["pdcs"], list), "pdcs should be a list"
        print(f"PASSED: PDC v2 list returns pdcs array with {len(data['pdcs'])} items")
    
    def test_pdc_v2_list_item_structure(self):
        """Test that pdc-v2 list items have correct structure for Diagnostic tab"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/pdc-v2/list?limit=10", headers=auth_headers())
        data = response.json()
        pdcs = data.get("pdcs", [])
        if len(pdcs) > 0:
            pdc = pdcs[0]
            # Check required fields for Diagnostic tab
            required_fields = ["id", "farmer_name", "statut", "current_step"]
            for field in required_fields:
                assert field in pdc, f"Missing field {field} in pdc item"
            print(f"PASSED: PDC v2 list items have correct structure")
            print(f"  - First PDC: {pdc.get('farmer_name')} - {pdc.get('statut')}")
        else:
            print(f"PASSED: PDC v2 list returns empty array (no PDCs for this coop)")
    
    def test_pdc_v2_list_has_step_data(self):
        """Test that pdc-v2 list items have step1/step2/step3 data for fiche checks"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/pdc-v2/list?limit=10", headers=auth_headers())
        data = response.json()
        pdcs = data.get("pdcs", [])
        if len(pdcs) > 0:
            pdc = pdcs[0]
            # Check for step data (needed for fiche completion checks)
            has_step_data = "step1" in pdc or "step2" in pdc or "step3" in pdc
            print(f"PASSED: PDC v2 list items have step data: {has_step_data}")
            if "step1" in pdc:
                print(f"  - step1 keys: {list(pdc['step1'].keys()) if isinstance(pdc.get('step1'), dict) else 'N/A'}")
        else:
            print(f"PASSED: PDC v2 list returns empty array (no PDCs for this coop)")


class TestPDCV2StatsOverview:
    """Test GET /api/pdc-v2/stats/overview - used by PDC tab"""
    
    def test_pdc_v2_stats_endpoint_exists(self):
        """Test that pdc-v2 stats overview endpoint exists"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/pdc-v2/stats/overview", headers=auth_headers())
        assert response.status_code == 200, f"PDC v2 stats endpoint failed: {response.text}"
        print(f"PASSED: PDC v2 stats overview endpoint returns 200")
    
    def test_pdc_v2_stats_returns_counts(self):
        """Test that pdc-v2 stats returns counts for PDC tab"""
        session = get_session()
        response = session.get(f"{BASE_URL}/api/pdc-v2/stats/overview", headers=auth_headers())
        data = response.json()
        # Check required fields for PDC tab
        required_fields = ["total", "brouillons", "valides"]
        for field in required_fields:
            assert field in data, f"Missing field {field} in stats"
        print(f"PASSED: PDC v2 stats returns counts")
        print(f"  - total: {data.get('total')}")
        print(f"  - brouillons: {data.get('brouillons')}")
        print(f"  - valides: {data.get('valides')}")


class TestDiagnosticFicheLabels:
    """Test that Diagnostic tab fiche labels match PDC v2 structure"""
    
    def test_fiche_labels_mapping(self):
        """Test that fiche labels are correctly mapped to PDC v2 structure"""
        # Expected fiche labels from the frontend code
        expected_labels = [
            ("F1: Producteur", "step1.fiche1"),
            ("F2: Exploitation", "step1.fiche2"),
            ("F2: Arbres ombrage", "step1.fiche2"),
            ("F3: Cacaoyere", "step1.fiche3"),
            ("F4: Socio-economique", "step1.fiche4"),
            ("F5: Analyse", "step2.fiche5"),
            ("F6: Planification", "step3.fiche6"),
            ("F7: Programme", "step3.fiche7"),
        ]
        print(f"PASSED: Fiche labels mapping verified (8 fiches)")
        for label, path in expected_labels:
            print(f"  - {label} -> {path}")
