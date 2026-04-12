"""
Test ARS 1000 Shade Score Integration
=====================================
Tests for:
1. GET /api/pdc-v2/{pdc_id}/shade-score - ARS 1000 shade score calculation
2. POST /api/carbon-score/simulate - shade_score_ars1000 parameter integration
3. GET /api/carbon-score/decomposition - Bonus Ombrage ARS 1000 criterion
4. GET /api/cooperative/agents-progress - 7/7 form completion tracking
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
COOP_EMAIL = os.environ.get("TEST_COOP_EMAIL", "bielaghana@gmail.com")
COOP_PASSWORD = os.environ.get("TEST_COOP_PASSWORD", "test123456")
AGENT_EMAIL = os.environ.get("TEST_AGENT_EMAIL", "testagent@test.ci")
AGENT_PASSWORD = os.environ.get("TEST_AGENT_PASSWORD", "test123456")

# Test PDC ID with full tree data
TEST_PDC_ID = "69da80390d8a87a393fd1ede"


class TestAuth:
    """Authentication tests"""
    
    def test_cooperative_login(self, api_client):
        """Test cooperative login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Cooperative login successful")


class TestShadeScoreEndpoint:
    """Tests for GET /api/pdc-v2/{pdc_id}/shade-score"""
    
    def test_shade_score_endpoint_exists(self, authenticated_client):
        """Test that shade-score endpoint exists and returns 200"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        print(f"✓ Shade score endpoint exists and returns 200")
    
    def test_shade_score_returns_score(self, authenticated_client):
        """Test that shade-score returns score field"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert isinstance(data["score"], (int, float))
        assert 0 <= data["score"] <= 100
        print(f"✓ Shade score returned: {data['score']}/100")
    
    def test_shade_score_returns_conformity(self, authenticated_client):
        """Test that shade-score returns conforme_ars1000 field"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        data = response.json()
        assert "conforme_ars1000" in data
        assert isinstance(data["conforme_ars1000"], bool)
        print(f"✓ Conformity ARS 1000: {data['conforme_ars1000']}")
    
    def test_shade_score_returns_density(self, authenticated_client):
        """Test that shade-score returns densite_arbres_ha"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        data = response.json()
        assert "densite_arbres_ha" in data
        assert isinstance(data["densite_arbres_ha"], (int, float))
        print(f"✓ Density: {data['densite_arbres_ha']} arbres/ha")
    
    def test_shade_score_returns_species_count(self, authenticated_client):
        """Test that shade-score returns nombre_especes"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        data = response.json()
        assert "nombre_especes" in data
        assert isinstance(data["nombre_especes"], int)
        print(f"✓ Species count: {data['nombre_especes']}")
    
    def test_shade_score_returns_strata(self, authenticated_client):
        """Test that shade-score returns has_strate3"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        data = response.json()
        assert "has_strate3" in data
        assert isinstance(data["has_strate3"], bool)
        print(f"✓ Has strate 3: {data['has_strate3']}")
    
    def test_shade_score_returns_details(self, authenticated_client):
        """Test that shade-score returns details breakdown"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        data = response.json()
        assert "details" in data
        details = data["details"]
        assert "densite_score" in details
        assert "diversite_score" in details
        assert "strate_score" in details
        print(f"✓ Details: density={details['densite_score']}/40, diversity={details['diversite_score']}/30, strata={details['strate_score']}/30")
    
    def test_shade_score_returns_prime_impact(self, authenticated_client):
        """Test that shade-score returns impact_prime (FCFA bonus)"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        data = response.json()
        assert "impact_prime" in data
        impact = data["impact_prime"]
        assert "bonus_score_carbone" in impact
        assert "prime_supplementaire_fcfa" in impact
        assert "message" in impact
        print(f"✓ Prime impact: +{impact['prime_supplementaire_fcfa']} FCFA")
    
    def test_shade_score_test_pdc_is_conforme(self, authenticated_client):
        """Test that test PDC (Bamba Ibrahim) is ARS 1000 conforme"""
        response = authenticated_client.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/shade-score")
        assert response.status_code == 200
        data = response.json()
        # Test PDC should be conforme with score ~100
        assert data["conforme_ars1000"] == True
        assert data["score"] >= 80  # Should be excellent
        print(f"✓ Test PDC is ARS 1000 conforme with score {data['score']}/100")


class TestCarbonScoreSimulate:
    """Tests for POST /api/carbon-score/simulate with shade_score_ars1000"""
    
    def test_simulate_accepts_shade_score(self, api_client):
        """Test that simulate endpoint accepts shade_score_ars1000 parameter"""
        response = api_client.post(f"{BASE_URL}/api/carbon-score/simulate", json={
            "area_hectares": 2,
            "arbres_moyens": 10,
            "shade_score_ars1000": 80
        })
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        print(f"✓ Simulate accepts shade_score_ars1000, returned score: {data['score']}")
    
    def test_simulate_shade_bonus_in_details(self, api_client):
        """Test that shade bonus appears in details"""
        response = api_client.post(f"{BASE_URL}/api/carbon-score/simulate", json={
            "area_hectares": 2,
            "arbres_moyens": 10,
            "shade_score_ars1000": 85
        })
        assert response.status_code == 200
        data = response.json()
        assert "details" in data
        assert "bonus_ombrage_ars1000" in data["details"]
        bonus = data["details"]["bonus_ombrage_ars1000"]
        assert "score_ombrage_ars1000" in bonus
        assert bonus["score_ombrage_ars1000"] == 85
        print(f"✓ Shade bonus in details: {bonus}")
    
    def test_simulate_shade_coefficient_030(self, api_client):
        """Test that shade coefficient is 0.30"""
        response = api_client.post(f"{BASE_URL}/api/carbon-score/simulate", json={
            "area_hectares": 1,
            "shade_score_ars1000": 100
        })
        assert response.status_code == 200
        data = response.json()
        bonus = data["details"]["bonus_ombrage_ars1000"]
        assert "coefficient" in bonus
        assert bonus["coefficient"] == 0.30
        print(f"✓ Shade coefficient is 0.30")
    
    def test_simulate_shade_max_bonus_1pt(self, api_client):
        """Test that max shade bonus is 1.0 points"""
        response = api_client.post(f"{BASE_URL}/api/carbon-score/simulate", json={
            "area_hectares": 1,
            "shade_score_ars1000": 100
        })
        assert response.status_code == 200
        data = response.json()
        bonus = data["details"]["bonus_ombrage_ars1000"]
        assert "bonus_points" in bonus
        assert bonus["bonus_points"] <= 1.0
        print(f"✓ Max shade bonus is {bonus['bonus_points']} points (max 1.0)")
    
    def test_simulate_accepts_nombre_especes_ombrage(self, api_client):
        """Test that simulate accepts nombre_especes_ombrage parameter"""
        response = api_client.post(f"{BASE_URL}/api/carbon-score/simulate", json={
            "area_hectares": 2,
            "arbres_moyens": 20,
            "nombre_especes_ombrage": 5,
            "evaluation_agent_ombrage": "dense"
        })
        assert response.status_code == 200
        data = response.json()
        # Should auto-calculate shade score
        bonus = data["details"]["bonus_ombrage_ars1000"]
        assert "auto_calculated" in bonus or "score_ombrage_ars1000" in bonus
        print(f"✓ Simulate accepts nombre_especes_ombrage and evaluation_agent_ombrage")


class TestCarbonScoreDecomposition:
    """Tests for GET /api/carbon-score/decomposition"""
    
    def test_decomposition_includes_shade_criterion(self, api_client):
        """Test that decomposition includes Bonus Ombrage ARS 1000 criterion"""
        response = api_client.get(f"{BASE_URL}/api/carbon-score/decomposition")
        assert response.status_code == 200
        data = response.json()
        assert "criteres" in data
        
        # Find the shade criterion
        shade_criterion = None
        for c in data["criteres"]:
            if "Ombrage ARS 1000" in c.get("nom", ""):
                shade_criterion = c
                break
        
        assert shade_criterion is not None, "Bonus Ombrage ARS 1000 criterion not found"
        assert shade_criterion["max"] == 1.0
        assert "coefficient 0.30" in shade_criterion.get("description", "").lower() or "0.30" in shade_criterion.get("description", "")
        print(f"✓ Decomposition includes 'Bonus Ombrage ARS 1000' criterion with max 1.0")


class TestAgentsProgress7Forms:
    """Tests for 7/7 form completion tracking"""
    
    def test_agents_progress_returns_7_forms(self, authenticated_client):
        """Test that agents-progress returns 7 form types"""
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/agents-progress")
        assert response.status_code == 200
        data = response.json()
        
        # Check that farmers have 7 forms
        if data.get("agents") and len(data["agents"]) > 0:
            agent = data["agents"][0]
            if agent.get("farmers") and len(agent["farmers"]) > 0:
                farmer = agent["farmers"][0]
                forms = farmer.get("forms", {})
                expected_forms = ["register", "ici", "ssrte", "parcels", "photos", "pdc", "redd"]
                for form in expected_forms:
                    assert form in forms, f"Form '{form}' not found in farmer forms"
                print(f"✓ Agents progress returns 7 forms: {list(forms.keys())}")
            else:
                print("⚠ No farmers assigned to agents, skipping form check")
        else:
            print("⚠ No agents found, skipping form check")
    
    def test_agents_progress_total_is_7(self, authenticated_client):
        """Test that farmer total is 7"""
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/agents-progress")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("agents") and len(data["agents"]) > 0:
            agent = data["agents"][0]
            if agent.get("farmers") and len(agent["farmers"]) > 0:
                farmer = agent["farmers"][0]
                total = farmer.get("total", 0)
                assert total == 7, f"Expected total=7, got {total}"
                print(f"✓ Farmer total is 7")
            else:
                print("⚠ No farmers assigned, skipping total check")
        else:
            print("⚠ No agents found, skipping total check")


class TestFarmerCompletionCheck:
    """Tests for check_and_update_farmer_completion (7/7)"""
    
    def test_completion_check_includes_pdc(self, authenticated_client):
        """Test that completion check includes PDC form"""
        # This is tested indirectly via agents-progress
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/agents-progress")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("agents"):
            for agent in data["agents"]:
                for farmer in agent.get("farmers", []):
                    forms = farmer.get("forms", {})
                    assert "pdc" in forms, "PDC form not in completion check"
        print(f"✓ Completion check includes PDC form")
    
    def test_completion_check_includes_redd(self, authenticated_client):
        """Test that completion check includes REDD form"""
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/agents-progress")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("agents"):
            for agent in data["agents"]:
                for farmer in agent.get("farmers", []):
                    forms = farmer.get("forms", {})
                    assert "redd" in forms, "REDD form not in completion check"
        print(f"✓ Completion check includes REDD form")


# ============= FIXTURES =============

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for cooperative"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client
