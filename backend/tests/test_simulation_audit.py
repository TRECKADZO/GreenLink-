"""
Test Suite for Simulation Audit ARS 1000 Module
Tests all endpoints for the interactive audit simulation feature:
- GET /api/simulation-audit/clauses - List 17 clauses
- POST /api/simulation-audit/start - Create new simulation
- GET /api/simulation-audit/list - List simulations
- GET /api/simulation-audit/{id} - Get simulation detail
- PUT /api/simulation-audit/{id}/evaluate - Evaluate a clause
- PUT /api/simulation-audit/{id}/complete - Complete simulation and get verdict
- GET /api/simulation-audit/{id}/rapport/pdf - Export PDF report
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
COOP_EMAIL = os.environ.get("TEST_COOP_EMAIL", "bielaghana@gmail.com")
COOP_PASSWORD = os.environ.get("TEST_COOP_PASSWORD", "test123456")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for cooperative user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestSimulationAuditClauses:
    """Test GET /api/simulation-audit/clauses - List 17 clauses"""
    
    def test_get_clauses_returns_17_clauses(self, auth_headers):
        """Verify endpoint returns exactly 17 clauses"""
        response = requests.get(f"{BASE_URL}/api/simulation-audit/clauses", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "clauses" in data, "Response should contain 'clauses' key"
        assert "total" in data, "Response should contain 'total' key"
        assert data["total"] == 17, f"Expected 17 clauses, got {data['total']}"
        assert len(data["clauses"]) == 17, f"Expected 17 clauses in list, got {len(data['clauses'])}"
    
    def test_clauses_have_required_fields(self, auth_headers):
        """Verify each clause has required fields"""
        response = requests.get(f"{BASE_URL}/api/simulation-audit/clauses", headers=auth_headers)
        data = response.json()
        
        required_fields = ["id", "section", "titre", "type", "module", "recommandation_nc"]
        for clause in data["clauses"]:
            for field in required_fields:
                assert field in clause, f"Clause {clause.get('id', 'unknown')} missing field: {field}"
    
    def test_clauses_cover_all_sections(self, auth_headers):
        """Verify clauses cover all required sections"""
        response = requests.get(f"{BASE_URL}/api/simulation-audit/clauses", headers=auth_headers)
        data = response.json()
        
        sections = set(c["section"] for c in data["clauses"])
        expected_sections = {"Organisation", "Gouvernance", "Planification", "Formation", 
                           "Production", "Audit", "Tracabilite", "Social", "Environnement"}
        assert sections == expected_sections, f"Missing sections: {expected_sections - sections}"
    
    def test_clauses_have_majeure_and_mineure_types(self, auth_headers):
        """Verify clauses have both Majeure and Mineure types"""
        response = requests.get(f"{BASE_URL}/api/simulation-audit/clauses", headers=auth_headers)
        data = response.json()
        
        types = set(c["type"] for c in data["clauses"])
        assert "Majeure" in types, "Should have Majeure type clauses"
        assert "Mineure" in types, "Should have Mineure type clauses"


class TestSimulationAuditStart:
    """Test POST /api/simulation-audit/start - Create new simulation"""
    
    def test_start_simulation_creates_with_17_evaluations(self, auth_headers):
        """Verify starting simulation creates 17 empty evaluations"""
        response = requests.post(f"{BASE_URL}/api/simulation-audit/start", 
                                headers=auth_headers,
                                json={"titre": "TEST_Simulation pytest", "auditeur": "Test Agent"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "success"
        assert "simulation" in data
        
        sim = data["simulation"]
        assert sim["statut"] == "en_cours"
        assert len(sim["evaluations"]) == 17, f"Expected 17 evaluations, got {len(sim['evaluations'])}"
        
        # Verify all evaluations are empty
        for ev in sim["evaluations"]:
            assert ev["conformite"] == "", f"Evaluation {ev['clause_id']} should be empty"
    
    def test_start_simulation_returns_simulation_id(self, auth_headers):
        """Verify simulation has a unique ID"""
        response = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                headers=auth_headers,
                                json={"titre": "TEST_Simulation ID check"})
        data = response.json()
        
        assert "simulation_id" in data["simulation"]
        assert len(data["simulation"]["simulation_id"]) > 0


class TestSimulationAuditList:
    """Test GET /api/simulation-audit/list - List simulations"""
    
    def test_list_simulations_returns_array(self, auth_headers):
        """Verify list endpoint returns simulations array"""
        response = requests.get(f"{BASE_URL}/api/simulation-audit/list", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "simulations" in data
        assert isinstance(data["simulations"], list)
    
    def test_list_simulations_contains_created_simulation(self, auth_headers):
        """Verify created simulation appears in list"""
        # Create a simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_List verification"})
        sim_id = create_resp.json()["simulation"]["simulation_id"]
        
        # List simulations
        list_resp = requests.get(f"{BASE_URL}/api/simulation-audit/list", headers=auth_headers)
        data = list_resp.json()
        
        sim_ids = [s["simulation_id"] for s in data["simulations"]]
        assert sim_id in sim_ids, "Created simulation should appear in list"


class TestSimulationAuditDetail:
    """Test GET /api/simulation-audit/{id} - Get simulation detail"""
    
    def test_get_simulation_detail(self, auth_headers):
        """Verify getting simulation detail returns full data"""
        # Create a simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Detail check"})
        sim_id = create_resp.json()["simulation"]["simulation_id"]
        
        # Get detail
        detail_resp = requests.get(f"{BASE_URL}/api/simulation-audit/{sim_id}", headers=auth_headers)
        assert detail_resp.status_code == 200
        
        data = detail_resp.json()
        assert "simulation" in data
        assert data["simulation"]["simulation_id"] == sim_id
        assert len(data["simulation"]["evaluations"]) == 17
    
    def test_get_nonexistent_simulation_returns_404(self, auth_headers):
        """Verify 404 for non-existent simulation"""
        response = requests.get(f"{BASE_URL}/api/simulation-audit/nonexistent-id-12345", headers=auth_headers)
        assert response.status_code == 404


class TestSimulationAuditEvaluate:
    """Test PUT /api/simulation-audit/{id}/evaluate - Evaluate a clause"""
    
    def test_evaluate_clause_conforme(self, auth_headers):
        """Verify evaluating clause as Conforme updates score"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Evaluate Conforme"})
        sim_id = create_resp.json()["simulation"]["simulation_id"]
        
        # Evaluate first clause as Conforme
        eval_resp = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                                headers=auth_headers,
                                json={"clause_id": "4.2", "conformite": "C", "observations": "Test OK"})
        assert eval_resp.status_code == 200
        
        data = eval_resp.json()
        assert data["status"] == "success"
        assert data["score"] == 100, "1 conforme out of 1 evaluated = 100%"
        assert data["evaluated"] == 1
    
    def test_evaluate_clause_non_conforme(self, auth_headers):
        """Verify evaluating clause as NC updates score"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Evaluate NC"})
        sim_id = create_resp.json()["simulation"]["simulation_id"]
        
        # Evaluate first clause as NC
        eval_resp = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                                headers=auth_headers,
                                json={"clause_id": "4.2", "conformite": "NC", "observations": "Issue found"})
        assert eval_resp.status_code == 200
        
        data = eval_resp.json()
        assert data["score"] == 0, "1 NC out of 1 evaluated = 0%"
    
    def test_evaluate_clause_na_excluded_from_score(self, auth_headers):
        """Verify NA clauses are excluded from score calculation"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Evaluate NA"})
        sim_id = create_resp.json()["simulation"]["simulation_id"]
        
        # Evaluate first clause as C, second as NA
        requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                    headers=auth_headers,
                    json={"clause_id": "4.2", "conformite": "C"})
        
        eval_resp = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                                headers=auth_headers,
                                json={"clause_id": "4.3", "conformite": "NA"})
        
        data = eval_resp.json()
        # Score should still be 100% (1 C out of 1 non-NA)
        assert data["score"] == 100, "NA should be excluded from score calculation"
        assert data["evaluated"] == 2
    
    def test_evaluate_invalid_clause_returns_404(self, auth_headers):
        """Verify 404 for invalid clause ID"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Invalid clause"})
        sim_id = create_resp.json()["simulation"]["simulation_id"]
        
        # Try to evaluate non-existent clause
        eval_resp = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                                headers=auth_headers,
                                json={"clause_id": "99.99", "conformite": "C"})
        assert eval_resp.status_code == 404


class TestSimulationAuditComplete:
    """Test PUT /api/simulation-audit/{id}/complete - Complete simulation"""
    
    def test_complete_simulation_favorable(self, auth_headers):
        """Verify FAVORABLE verdict when score >= 80% and 0 NC majeures"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Verdict FAVORABLE"})
        sim = create_resp.json()["simulation"]
        sim_id = sim["simulation_id"]
        
        # Evaluate all 17 clauses as Conforme
        for ev in sim["evaluations"]:
            requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                        headers=auth_headers,
                        json={"clause_id": ev["clause_id"], "conformite": "C"})
        
        # Complete simulation
        complete_resp = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/complete",
                                    headers=auth_headers)
        assert complete_resp.status_code == 200
        
        data = complete_resp.json()
        assert data["status"] == "success"
        assert data["resultat"]["verdict"] == "FAVORABLE"
        assert data["resultat"]["score"] == 100
        assert data["resultat"]["nc_majeures"] == 0
    
    def test_complete_simulation_favorable_avec_reserves(self, auth_headers):
        """Verify FAVORABLE AVEC RESERVES when score >= 60% and <= 2 NC majeures"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Verdict RESERVES"})
        sim = create_resp.json()["simulation"]
        sim_id = sim["simulation_id"]
        
        # Evaluate: 14 C, 2 NC Majeure, 1 NC Mineure = ~82% but 2 NC majeures
        majeure_count = 0
        for ev in sim["evaluations"]:
            if ev["type"] == "Majeure" and majeure_count < 2:
                requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": ev["clause_id"], "conformite": "NC"})
                majeure_count += 1
            else:
                requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": ev["clause_id"], "conformite": "C"})
        
        # Complete simulation
        complete_resp = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/complete",
                                    headers=auth_headers)
        data = complete_resp.json()
        
        # With 2 NC majeures and score ~88%, should be FAVORABLE AVEC RESERVES
        assert data["resultat"]["verdict"] == "FAVORABLE AVEC RESERVES"
        assert data["resultat"]["nc_majeures"] == 2
    
    def test_complete_simulation_defavorable(self, auth_headers):
        """Verify DEFAVORABLE when score < 60% or > 2 NC majeures"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Verdict DEFAVORABLE"})
        sim = create_resp.json()["simulation"]
        sim_id = sim["simulation_id"]
        
        # Evaluate: 3 NC Majeures (more than 2)
        majeure_count = 0
        for ev in sim["evaluations"]:
            if ev["type"] == "Majeure" and majeure_count < 3:
                requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": ev["clause_id"], "conformite": "NC"})
                majeure_count += 1
            else:
                requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": ev["clause_id"], "conformite": "C"})
        
        # Complete simulation
        complete_resp = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/complete",
                                    headers=auth_headers)
        data = complete_resp.json()
        
        assert data["resultat"]["verdict"] == "DEFAVORABLE"
        assert data["resultat"]["nc_majeures"] >= 3
    
    def test_complete_generates_recommandations(self, auth_headers):
        """Verify recommandations are generated for each NC"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Recommandations"})
        sim = create_resp.json()["simulation"]
        sim_id = sim["simulation_id"]
        
        # Evaluate with 2 NC
        nc_clauses = []
        nc_count = 0
        for ev in sim["evaluations"]:
            if nc_count < 2:
                requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": ev["clause_id"], "conformite": "NC", "observations": f"Issue {nc_count+1}"})
                nc_clauses.append(ev["clause_id"])
                nc_count += 1
            else:
                requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": ev["clause_id"], "conformite": "C"})
        
        # Complete simulation
        complete_resp = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/complete",
                                    headers=auth_headers)
        data = complete_resp.json()
        
        recs = data["resultat"]["recommandations"]
        assert len(recs) == 2, f"Expected 2 recommandations, got {len(recs)}"
        
        # Verify recommandation structure
        for rec in recs:
            assert "clause" in rec
            assert "type" in rec
            assert "recommandation" in rec
            assert "priorite" in rec
            assert rec["clause"] in nc_clauses


class TestSimulationAuditPDF:
    """Test GET /api/simulation-audit/{id}/rapport/pdf - Export PDF"""
    
    def test_export_pdf_returns_pdf_content(self, auth_headers):
        """Verify PDF export returns valid PDF"""
        # Create and complete a simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_PDF Export"})
        sim = create_resp.json()["simulation"]
        sim_id = sim["simulation_id"]
        
        # Evaluate all clauses
        for ev in sim["evaluations"]:
            requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                        headers=auth_headers,
                        json={"clause_id": ev["clause_id"], "conformite": "C"})
        
        # Complete simulation
        requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/complete", headers=auth_headers)
        
        # Export PDF
        pdf_resp = requests.get(f"{BASE_URL}/api/simulation-audit/{sim_id}/rapport/pdf",
                               headers=auth_headers)
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers.get("content-type") == "application/pdf"
        assert "attachment" in pdf_resp.headers.get("content-disposition", "")
        
        # Verify PDF content starts with PDF magic bytes
        assert pdf_resp.content[:4] == b'%PDF', "Response should be valid PDF"
    
    def test_export_pdf_nonexistent_simulation_returns_404(self, auth_headers):
        """Verify 404 for non-existent simulation PDF"""
        response = requests.get(f"{BASE_URL}/api/simulation-audit/nonexistent-id/rapport/pdf",
                               headers=auth_headers)
        assert response.status_code == 404


class TestSimulationAuditScoreCalculation:
    """Test score calculation logic"""
    
    def test_score_recalculated_on_each_evaluation(self, auth_headers):
        """Verify score is recalculated after each evaluation"""
        # Create simulation
        create_resp = requests.post(f"{BASE_URL}/api/simulation-audit/start",
                                   headers=auth_headers,
                                   json={"titre": "TEST_Score recalculation"})
        sim = create_resp.json()["simulation"]
        sim_id = sim["simulation_id"]
        
        # First evaluation: 1 C = 100%
        eval1 = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": "4.2", "conformite": "C"})
        assert eval1.json()["score"] == 100
        
        # Second evaluation: 1 C + 1 NC = 50%
        eval2 = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": "4.3", "conformite": "NC"})
        assert eval2.json()["score"] == 50
        
        # Third evaluation: 2 C + 1 NC = 67%
        eval3 = requests.put(f"{BASE_URL}/api/simulation-audit/{sim_id}/evaluate",
                            headers=auth_headers,
                            json={"clause_id": "5.1", "conformite": "C"})
        assert eval3.json()["score"] == 67  # 2/3 = 66.67% rounded to 67%


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
