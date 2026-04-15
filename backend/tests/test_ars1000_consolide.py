"""
Test ARS 1000 Consolide Dashboard Module
Tests for the consolidated readiness dashboard that aggregates 6 modules:
- Membres (clauses 4.2, 4.3)
- Gouvernance (clauses 5.1, 5.2, 5.3, 9.3)
- Formation (clauses 7.3, 7.4, 12.x, 13.x)
- PDC (clauses 8.x, 11.x)
- Tracabilite (clauses ARS 1000-2: 11-16)
- Audit (clauses 9.2, 9.3)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestARS1000ConsolideDashboard:
    """Tests for GET /api/ars1000-consolide/dashboard"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for cooperative user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_dashboard_returns_200(self, auth_headers):
        """Test dashboard endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASSED: Dashboard returns 200")
    
    def test_dashboard_has_score_global(self, auth_headers):
        """Test dashboard returns score_global field"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "score_global" in data, "Missing score_global field"
        assert isinstance(data["score_global"], (int, float)), "score_global should be numeric"
        assert 0 <= data["score_global"] <= 100, "score_global should be 0-100"
        print(f"PASSED: score_global = {data['score_global']}%")
    
    def test_dashboard_has_readiness_level(self, auth_headers):
        """Test dashboard returns readiness level with correct labels"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "readiness" in data, "Missing readiness field"
        assert "readiness_color" in data, "Missing readiness_color field"
        
        score = data["score_global"]
        readiness = data["readiness"]
        
        # Verify readiness label matches score
        if score >= 80:
            assert readiness == "Pret pour l'audit", f"Score {score} should have 'Pret pour l'audit', got '{readiness}'"
        elif score >= 50:
            assert readiness == "En bonne voie", f"Score {score} should have 'En bonne voie', got '{readiness}'"
        else:
            assert readiness == "Actions requises", f"Score {score} should have 'Actions requises', got '{readiness}'"
        
        print(f"PASSED: readiness = '{readiness}' (score: {score}%)")
    
    def test_dashboard_has_6_modules(self, auth_headers):
        """Test dashboard returns exactly 6 modules"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "modules" in data, "Missing modules field"
        modules = data["modules"]
        
        expected_modules = ["membres", "gouvernance", "formation", "pdc", "tracabilite", "audit"]
        for mod_key in expected_modules:
            assert mod_key in modules, f"Missing module: {mod_key}"
        
        assert len(modules) == 6, f"Expected 6 modules, got {len(modules)}"
        print(f"PASSED: All 6 modules present: {list(modules.keys())}")
    
    def test_each_module_has_required_fields(self, auth_headers):
        """Test each module has titre, clauses, score, indicateurs, actions"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        modules = data["modules"]
        
        required_fields = ["titre", "clauses", "score", "indicateurs", "actions"]
        
        for mod_key, mod_data in modules.items():
            for field in required_fields:
                assert field in mod_data, f"Module '{mod_key}' missing field: {field}"
            
            # Validate score is 0-100
            assert isinstance(mod_data["score"], (int, float)), f"Module '{mod_key}' score should be numeric"
            assert 0 <= mod_data["score"] <= 100, f"Module '{mod_key}' score should be 0-100"
            
            # Validate indicateurs is array
            assert isinstance(mod_data["indicateurs"], list), f"Module '{mod_key}' indicateurs should be array"
            
            # Validate actions is array
            assert isinstance(mod_data["actions"], list), f"Module '{mod_key}' actions should be array"
            
            print(f"  - {mod_key}: {mod_data['titre']} ({mod_data['score']}%)")
        
        print("PASSED: All modules have required fields")
    
    def test_indicateurs_have_label_valeur_cible(self, auth_headers):
        """Test each indicateur has label, valeur, cible"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        modules = data["modules"]
        
        for mod_key, mod_data in modules.items():
            for ind in mod_data["indicateurs"]:
                assert "label" in ind, f"Module '{mod_key}' indicateur missing label"
                assert "valeur" in ind, f"Module '{mod_key}' indicateur missing valeur"
                assert "cible" in ind, f"Module '{mod_key}' indicateur missing cible"
        
        print("PASSED: All indicateurs have label, valeur, cible")
    
    def test_score_global_is_average_of_modules(self, auth_headers):
        """Test score_global is average of 6 module scores"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        modules = data["modules"]
        module_scores = [mod["score"] for mod in modules.values()]
        expected_avg = round(sum(module_scores) / len(module_scores))
        
        assert data["score_global"] == expected_avg, f"score_global {data['score_global']} != average {expected_avg}"
        print(f"PASSED: score_global ({data['score_global']}%) = average of {module_scores}")
    
    def test_actions_prioritaires_aggregated(self, auth_headers):
        """Test actions_prioritaires is aggregated from all modules"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "actions_prioritaires" in data, "Missing actions_prioritaires field"
        actions = data["actions_prioritaires"]
        assert isinstance(actions, list), "actions_prioritaires should be array"
        
        # Each action should have module, action, module_key
        for action in actions:
            assert "module" in action, "Action missing module field"
            assert "action" in action, "Action missing action field"
            assert "module_key" in action, "Action missing module_key field"
        
        print(f"PASSED: {len(actions)} actions prioritaires aggregated")
    
    def test_dashboard_has_date_calcul(self, auth_headers):
        """Test dashboard returns date_calcul timestamp"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "date_calcul" in data, "Missing date_calcul field"
        assert isinstance(data["date_calcul"], str), "date_calcul should be string"
        print(f"PASSED: date_calcul = {data['date_calcul']}")
    
    def test_membres_module_structure(self, auth_headers):
        """Test membres module has correct structure"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        membres = data["modules"]["membres"]
        assert membres["titre"] == "Membres & Enregistrement"
        assert "4.2" in membres["clauses"] or "4.3" in membres["clauses"]
        
        # Check indicateurs
        ind_labels = [i["label"] for i in membres["indicateurs"]]
        assert "Membres enregistres" in ind_labels
        assert "Membres valides" in ind_labels
        assert "Perimetre SM defini" in ind_labels
        
        print(f"PASSED: Membres module structure correct (score: {membres['score']}%)")
    
    def test_gouvernance_module_structure(self, auth_headers):
        """Test gouvernance module has correct structure"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        gouv = data["modules"]["gouvernance"]
        assert gouv["titre"] == "Gouvernance & Direction"
        assert "5.1" in gouv["clauses"] or "5.2" in gouv["clauses"]
        
        ind_labels = [i["label"] for i in gouv["indicateurs"]]
        assert "Postes pourvus" in ind_labels
        assert "Politique validee" in ind_labels
        assert "Revue direction" in ind_labels
        
        print(f"PASSED: Gouvernance module structure correct (score: {gouv['score']}%)")
    
    def test_formation_module_structure(self, auth_headers):
        """Test formation module has correct structure"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        form = data["modules"]["formation"]
        assert form["titre"] == "Formation & Sensibilisation"
        assert "7.3" in form["clauses"] or "7.4" in form["clauses"]
        
        ind_labels = [i["label"] for i in form["indicateurs"]]
        assert "Themes couverts" in ind_labels
        assert "Sessions completees" in ind_labels
        assert "Participants formes" in ind_labels
        
        print(f"PASSED: Formation module structure correct (score: {form['score']}%)")
    
    def test_pdc_module_structure(self, auth_headers):
        """Test PDC module has correct structure"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        pdc = data["modules"]["pdc"]
        assert pdc["titre"] == "PDC Digital"
        assert "8.1" in pdc["clauses"] or "11.1" in pdc["clauses"]
        
        ind_labels = [i["label"] for i in pdc["indicateurs"]]
        assert "PDC enregistres" in ind_labels
        
        print(f"PASSED: PDC module structure correct (score: {pdc['score']}%)")
    
    def test_tracabilite_module_structure(self, auth_headers):
        """Test tracabilite module has correct structure"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        trace = data["modules"]["tracabilite"]
        assert trace["titre"] == "Tracabilite"
        assert "ARS 1000-2" in trace["clauses"]
        
        ind_labels = [i["label"] for i in trace["indicateurs"]]
        assert "Lots traces" in ind_labels
        assert "Lots certifies" in ind_labels
        assert "Lots exportes" in ind_labels
        
        print(f"PASSED: Tracabilite module structure correct (score: {trace['score']}%)")
    
    def test_audit_module_structure(self, auth_headers):
        """Test audit module has correct structure"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        audit = data["modules"]["audit"]
        assert audit["titre"] == "Audit Interne & NC"
        assert "9.2" in audit["clauses"] or "9.3" in audit["clauses"]
        
        print(f"PASSED: Audit module structure correct (score: {audit['score']}%)")


class TestARS1000ConsolidePDFExport:
    """Tests for GET /api/ars1000-consolide/export/pdf"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for cooperative user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_pdf_export_returns_200(self, auth_headers):
        """Test PDF export endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/export/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASSED: PDF export returns 200")
    
    def test_pdf_export_content_type(self, auth_headers):
        """Test PDF export returns correct content type"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/export/pdf", headers=auth_headers)
        assert response.status_code == 200
        
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        print("PASSED: PDF export has correct content-type")
    
    def test_pdf_export_content_disposition(self, auth_headers):
        """Test PDF export has correct filename in Content-Disposition"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/export/pdf", headers=auth_headers)
        assert response.status_code == 200
        
        content_disp = response.headers.get("content-disposition", "")
        assert "readiness_ars1000.pdf" in content_disp, f"Expected filename readiness_ars1000.pdf, got {content_disp}"
        print("PASSED: PDF export has correct filename")
    
    def test_pdf_export_has_content(self, auth_headers):
        """Test PDF export returns non-empty content"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/export/pdf", headers=auth_headers)
        assert response.status_code == 200
        
        content = response.content
        assert len(content) > 1000, f"PDF content too small: {len(content)} bytes"
        
        # Check PDF magic bytes
        assert content[:4] == b'%PDF', "Content does not start with PDF magic bytes"
        print(f"PASSED: PDF export has valid content ({len(content)} bytes)")


class TestARS1000ConsolideAuth:
    """Tests for authentication requirements"""
    
    def test_dashboard_requires_auth(self):
        """Test dashboard endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASSED: Dashboard requires authentication")
    
    def test_pdf_export_requires_auth(self):
        """Test PDF export endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ars1000-consolide/export/pdf")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASSED: PDF export requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
