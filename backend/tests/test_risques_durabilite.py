"""
Test Suite for Risques & Durabilite Module (ARS 1000 Clauses 6.1, 6.2)
Tests: Risk registry CRUD, mitigation actions, indicators, dashboard, reference data
Uses session-scoped auth to avoid rate limiting
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "bielaghana@gmail.com"
TEST_PASSWORD = "test123456"


@pytest.fixture(scope="session")
def auth_token():
    """Session-scoped auth token to avoid rate limiting"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json().get("access_token")
    assert token, "No access_token in login response"
    return token


@pytest.fixture
def api_client(auth_token):
    """Authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestRisquesReferenceData:
    """Test reference data endpoints"""
    
    def test_get_categories_reference(self, api_client):
        """GET /api/risques/reference/categories - Returns 6 risk categories"""
        res = api_client.get(f"{BASE_URL}/api/risques/reference/categories")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        codes = [c["code"] for c in categories]
        expected_codes = ["ENVIRONNEMENT", "SOCIAL", "ECONOMIQUE", "CLIMATIQUE", "GOUVERNANCE", "TRACABILITE"]
        for code in expected_codes:
            assert code in codes, f"Missing category: {code}"
        
        for cat in categories:
            assert "code" in cat
            assert "label" in cat
            assert "exemples" in cat
        print(f"✓ Categories reference: {len(categories)} categories returned")

    def test_get_niveaux_reference(self, api_client):
        """GET /api/risques/reference/niveaux - Returns probabilite and impact levels"""
        res = api_client.get(f"{BASE_URL}/api/risques/reference/niveaux")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert "probabilite" in data
        assert "impact" in data
        assert len(data["probabilite"]) == 5
        assert len(data["impact"]) == 5
        
        expected_prob = ["Rare", "Peu probable", "Possible", "Probable", "Quasi certain"]
        expected_impact = ["Negligeable", "Mineur", "Modere", "Majeur", "Critique"]
        
        assert data["probabilite"] == expected_prob
        assert data["impact"] == expected_impact
        print(f"✓ Niveaux reference: 5 probabilite, 5 impact levels")


class TestRisquesCRUD:
    """Test risk CRUD operations"""
    
    def test_create_risque_critique(self, api_client):
        """POST /api/risques/registre - Score >= 16 = Critique"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "titre": f"TEST_Risque_Critique_{unique_id}",
            "categorie": "ENVIRONNEMENT",
            "description": "Test risk for automated testing",
            "probabilite": "Probable",  # 4
            "impact": "Majeur",  # 4 -> 16
            "zone": "Zone Test",
            "cause_racine": "Test cause"
        }
        
        res = api_client.post(f"{BASE_URL}/api/risques/registre", json=payload)
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert data.get("status") == "success"
        risque = data.get("risque")
        assert risque.get("score") == 16
        assert risque.get("niveau") == "Critique"
        assert risque.get("statut") == "ouvert"
        assert "risque_id" in risque
        print(f"✓ Created Critique risk: score={risque['score']}")

    def test_create_risque_eleve(self, api_client):
        """POST /api/risques/registre - Score 9-15 = Eleve"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "titre": f"TEST_Risque_Eleve_{unique_id}",
            "categorie": "SOCIAL",
            "probabilite": "Possible",  # 3
            "impact": "Modere"  # 3 -> 9
        }
        
        res = api_client.post(f"{BASE_URL}/api/risques/registre", json=payload)
        assert res.status_code == 200
        risque = res.json().get("risque")
        
        assert risque.get("score") == 9
        assert risque.get("niveau") == "Eleve"
        print(f"✓ Created Eleve risk: score={risque['score']}")

    def test_create_risque_moyen(self, api_client):
        """POST /api/risques/registre - Score 4-8 = Moyen"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "titre": f"TEST_Risque_Moyen_{unique_id}",
            "categorie": "ECONOMIQUE",
            "probabilite": "Peu probable",  # 2
            "impact": "Mineur"  # 2 -> 4
        }
        
        res = api_client.post(f"{BASE_URL}/api/risques/registre", json=payload)
        assert res.status_code == 200
        risque = res.json().get("risque")
        
        assert risque.get("score") == 4
        assert risque.get("niveau") == "Moyen"
        print(f"✓ Created Moyen risk: score={risque['score']}")

    def test_create_risque_faible(self, api_client):
        """POST /api/risques/registre - Score < 4 = Faible"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "titre": f"TEST_Risque_Faible_{unique_id}",
            "categorie": "CLIMATIQUE",
            "probabilite": "Rare",  # 1
            "impact": "Negligeable"  # 1 -> 1
        }
        
        res = api_client.post(f"{BASE_URL}/api/risques/registre", json=payload)
        assert res.status_code == 200
        risque = res.json().get("risque")
        
        assert risque.get("score") == 1
        assert risque.get("niveau") == "Faible"
        print(f"✓ Created Faible risk: score={risque['score']}")

    def test_get_risques_registre_with_stats(self, api_client):
        """GET /api/risques/registre - Returns risks with stats"""
        res = api_client.get(f"{BASE_URL}/api/risques/registre")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert "risques" in data
        assert "stats" in data
        
        stats = data["stats"]
        required_stats = ["total", "critiques", "eleves", "moyens", "faibles", "ouverts", "mitigees"]
        for stat in required_stats:
            assert stat in stats, f"Missing stat: {stat}"
        
        print(f"✓ Registre: {stats['total']} risks, {stats['critiques']} critiques, {stats['eleves']} eleves")

    def test_update_risque_recalculates_score(self, api_client):
        """PUT /api/risques/registre/{id} - Updates risk and recalculates score"""
        # Create a risk
        unique_id = str(uuid.uuid4())[:8]
        create_res = api_client.post(f"{BASE_URL}/api/risques/registre", json={
            "titre": f"TEST_Update_{unique_id}",
            "categorie": "GOUVERNANCE",
            "probabilite": "Possible",  # 3
            "impact": "Modere"  # 3 -> 9
        })
        assert create_res.status_code == 200
        risque_id = create_res.json()["risque"]["risque_id"]
        
        # Update to higher severity
        update_res = api_client.put(f"{BASE_URL}/api/risques/registre/{risque_id}", json={
            "probabilite": "Quasi certain",  # 5
            "impact": "Critique"  # 5 -> 25
        })
        assert update_res.status_code == 200
        updated = update_res.json().get("risque")
        
        assert updated.get("score") == 25
        assert updated.get("niveau") == "Critique"
        print(f"✓ Updated risk: score recalculated to {updated['score']}")


class TestMitigations:
    """Test mitigation actions"""
    
    def test_add_mitigation_action(self, api_client):
        """POST /api/risques/registre/{id}/mitigation - Adds mitigation action"""
        # Create a risk
        unique_id = str(uuid.uuid4())[:8]
        create_res = api_client.post(f"{BASE_URL}/api/risques/registre", json={
            "titre": f"TEST_Mitigation_{unique_id}",
            "categorie": "TRACABILITE",
            "probabilite": "Probable",
            "impact": "Majeur"
        })
        assert create_res.status_code == 200
        risque_id = create_res.json()["risque"]["risque_id"]
        
        # Add mitigation
        mit_res = api_client.post(f"{BASE_URL}/api/risques/registre/{risque_id}/mitigation", json={
            "risque_id": risque_id,
            "action": "Implement traceability system",
            "responsable": "Quality Manager",
            "echeance": "2026-03-01",
            "ressources": "Budget: 5000 FCFA"
        })
        assert mit_res.status_code == 200
        data = mit_res.json()
        
        assert data.get("status") == "success"
        mitigation = data.get("mitigation")
        assert mitigation.get("action") == "Implement traceability system"
        assert "mitigation_id" in mitigation
        
        # Verify risk status changed
        get_res = api_client.get(f"{BASE_URL}/api/risques/registre")
        risques = get_res.json().get("risques", [])
        updated_risk = next((r for r in risques if r.get("risque_id") == risque_id), None)
        assert updated_risk.get("statut") == "en_mitigation"
        print(f"✓ Added mitigation, status changed to en_mitigation")

    def test_mitigation_not_found(self, api_client):
        """POST /api/risques/registre/{id}/mitigation - 404 for non-existent risk"""
        fake_id = str(uuid.uuid4())
        res = api_client.post(f"{BASE_URL}/api/risques/registre/{fake_id}/mitigation", json={
            "risque_id": fake_id,
            "action": "Test action"
        })
        assert res.status_code == 404
        print("✓ Mitigation returns 404 for non-existent risk")


class TestIndicateurs:
    """Test environmental indicators"""
    
    def test_add_indicateur(self, api_client):
        """POST /api/risques/indicateurs - Adds environmental indicator"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "nom": f"TEST_Indicateur_{unique_id}",
            "categorie": "ENVIRONNEMENT",
            "valeur": 75.5,
            "unite": "%",
            "cible": 100,
            "periode": "2026-01"
        }
        
        res = api_client.post(f"{BASE_URL}/api/risques/indicateurs", json=payload)
        assert res.status_code == 200
        data = res.json()
        
        assert data.get("status") == "success"
        indicateur = data.get("indicateur")
        assert indicateur.get("nom") == payload["nom"]
        assert indicateur.get("valeur") == 75.5
        assert "indicateur_id" in indicateur
        print(f"✓ Added indicator: {indicateur['nom']}")

    def test_get_indicateurs(self, api_client):
        """GET /api/risques/indicateurs - Returns indicators list"""
        res = api_client.get(f"{BASE_URL}/api/risques/indicateurs")
        assert res.status_code == 200
        data = res.json()
        
        assert "indicateurs" in data
        print(f"✓ Indicateurs: {len(data['indicateurs'])} indicators")


class TestRisquesDashboard:
    """Test dashboard endpoints"""
    
    def test_get_risques_dashboard(self, api_client):
        """GET /api/risques/dashboard - Returns KPIs, par_categorie, top_risques"""
        res = api_client.get(f"{BASE_URL}/api/risques/dashboard")
        assert res.status_code == 200
        data = res.json()
        
        # Verify KPIs
        assert "kpis" in data
        kpis = data["kpis"]
        required_kpis = ["total", "critiques", "eleves", "ouverts", "mitigees", "indicateurs"]
        for kpi in required_kpis:
            assert kpi in kpis, f"Missing KPI: {kpi}"
        
        # Verify par_categorie
        assert "par_categorie" in data
        
        # Verify categories_reference
        assert "categories_reference" in data
        assert len(data["categories_reference"]) == 6
        
        # Verify top_risques
        assert "top_risques" in data
        
        print(f"✓ Dashboard: total={kpis['total']}, critiques={kpis['critiques']}")


class TestARS1000Integration:
    """Test integration with ARS1000 Consolide"""
    
    def test_ars1000_consolide_includes_risques(self, api_client):
        """GET /api/ars1000-consolide/dashboard - Includes risques module"""
        res = api_client.get(f"{BASE_URL}/api/ars1000-consolide/dashboard")
        assert res.status_code == 200
        data = res.json()
        
        assert "modules" in data
        modules = data["modules"]
        
        # Verify 7 modules
        expected_modules = ["membres", "gouvernance", "formation", "pdc", "tracabilite", "risques", "audit"]
        for mod_key in expected_modules:
            assert mod_key in modules, f"Missing module: {mod_key}"
        
        # Verify risques module structure
        risques_mod = modules.get("risques")
        assert risques_mod.get("titre") == "Risques & Durabilite"
        assert risques_mod.get("clauses") == "6.1, 6.2"
        assert "score" in risques_mod
        assert "indicateurs" in risques_mod
        
        print(f"✓ ARS1000 Consolide includes risques module: score={risques_mod['score']}%")

    def test_ars1000_consolide_score_global(self, api_client):
        """GET /api/ars1000-consolide/dashboard - Score global from 7 modules"""
        res = api_client.get(f"{BASE_URL}/api/ars1000-consolide/dashboard")
        assert res.status_code == 200
        data = res.json()
        
        assert "score_global" in data
        assert "readiness" in data
        assert "readiness_color" in data
        
        # Verify score is average of 7 modules
        modules = data["modules"]
        scores = [m["score"] for m in modules.values()]
        expected_avg = round(sum(scores) / len(scores))
        assert data["score_global"] == expected_avg
        
        print(f"✓ Score global: {data['score_global']}% ({data['readiness']})")


class TestScoreCalculationMatrix:
    """Test score calculation: probabilite * impact"""
    
    @pytest.mark.parametrize("prob,impact,expected_score,expected_niveau", [
        ("Rare", "Negligeable", 1, "Faible"),
        ("Rare", "Mineur", 2, "Faible"),
        ("Rare", "Modere", 3, "Faible"),
        ("Peu probable", "Mineur", 4, "Moyen"),
        ("Possible", "Mineur", 6, "Moyen"),
        ("Peu probable", "Majeur", 8, "Moyen"),
        ("Possible", "Modere", 9, "Eleve"),
        ("Probable", "Modere", 12, "Eleve"),
        ("Possible", "Critique", 15, "Eleve"),
        ("Probable", "Majeur", 16, "Critique"),
        ("Quasi certain", "Majeur", 20, "Critique"),
        ("Quasi certain", "Critique", 25, "Critique"),
    ])
    def test_score_calculation(self, api_client, prob, impact, expected_score, expected_niveau):
        """Test score calculation matrix"""
        unique_id = str(uuid.uuid4())[:8]
        res = api_client.post(f"{BASE_URL}/api/risques/registre", json={
            "titre": f"TEST_Score_{unique_id}",
            "categorie": "ENVIRONNEMENT",
            "probabilite": prob,
            "impact": impact
        })
        assert res.status_code == 200
        risque = res.json().get("risque")
        
        assert risque.get("score") == expected_score, f"Score mismatch for {prob}*{impact}"
        assert risque.get("niveau") == expected_niveau, f"Niveau mismatch for score {expected_score}"
        print(f"✓ {prob} x {impact} = {expected_score} ({expected_niveau})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
