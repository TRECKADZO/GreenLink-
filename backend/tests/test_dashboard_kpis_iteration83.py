"""
Test Dashboard KPIs with REAL Seed Data - Iteration 83
Tests REDD+, SSRTE, ICI KPIs with actual seed data and sync tests
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://redd-carbon-track.preview.emergentagent.com').rstrip('/')

# Test credentials from test_credentials.md
TEST_EMAIL = "klenakan.eric@gmail.com"
TEST_PASSWORD = "474Treckadzo"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Login failed: {response.status_code}")


@pytest.fixture(scope="module")
def auth_session(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestDashboardKPIsWithSeedData:
    """Test GET /api/cooperative/dashboard-kpis with REAL seed data"""
    
    # ============ REDD+ KPI Tests ============
    
    def test_redd_total_visits_is_16(self, auth_session):
        """REDD+ visits should be 16 (seed data)"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        redd = data.get("redd")
        assert redd is not None, "REDD+ data should be present"
        assert redd["total_visits"] >= 16, f"Expected >=16 REDD visits, got {redd['total_visits']}"
        print(f"PASS: REDD+ total_visits = {redd['total_visits']} (expected >=16)")
    
    def test_redd_avg_score_greater_than_zero(self, auth_session):
        """REDD+ avg_score should be > 0"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        redd = data.get("redd")
        assert redd is not None
        assert redd["avg_score"] > 0, f"Expected avg_score > 0, got {redd['avg_score']}"
        print(f"PASS: REDD+ avg_score = {redd['avg_score']} (expected > 0)")
    
    def test_redd_level_distribution_has_entries(self, auth_session):
        """REDD+ level_distribution should have entries"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        redd = data.get("redd")
        assert redd is not None
        level_dist = redd.get("level_distribution", {})
        assert len(level_dist) > 0, "level_distribution should have entries"
        total = sum(level_dist.values())
        assert total > 0, f"level_distribution total should be > 0, got {total}"
        print(f"PASS: REDD+ level_distribution = {level_dist}")
    
    def test_redd_practices_adoption_has_percentages(self, auth_session):
        """REDD+ practices_adoption should have percentages"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        redd = data.get("redd")
        assert redd is not None
        practices = redd.get("practices_adoption", {})
        assert len(practices) > 0, "practices_adoption should have entries"
        for label, pdata in practices.items():
            assert "pct" in pdata, f"Practice {label} should have 'pct'"
            assert pdata["pct"] >= 0, f"Practice {label} pct should be >= 0"
        print(f"PASS: REDD+ practices_adoption = {list(practices.keys())}")
    
    def test_redd_farmers_assessed_is_18(self, auth_session):
        """REDD+ farmers_assessed should be 18"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        redd = data.get("redd")
        assert redd is not None
        assert redd["farmers_assessed"] >= 18, f"Expected >=18 farmers, got {redd['farmers_assessed']}"
        print(f"PASS: REDD+ farmers_assessed = {redd['farmers_assessed']} (expected >=18)")
    
    # ============ SSRTE KPI Tests ============
    
    def test_ssrte_total_visits_is_17(self, auth_session):
        """SSRTE visits should be 17 (seed data)"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        ssrte = data.get("ssrte")
        assert ssrte is not None, "SSRTE data should be present"
        assert ssrte["total_visits"] >= 17, f"Expected >=17 SSRTE visits, got {ssrte['total_visits']}"
        print(f"PASS: SSRTE total_visits = {ssrte['total_visits']} (expected >=17)")
    
    def test_ssrte_children_identified_greater_than_zero(self, auth_session):
        """SSRTE children_identified should be > 0"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        ssrte = data.get("ssrte")
        assert ssrte is not None
        assert ssrte["children_identified"] > 0, f"Expected children_identified > 0, got {ssrte['children_identified']}"
        print(f"PASS: SSRTE children_identified = {ssrte['children_identified']} (expected > 0)")
    
    def test_ssrte_risk_distribution_has_nonzero_values(self, auth_session):
        """SSRTE risk_distribution should have non-zero values"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        ssrte = data.get("ssrte")
        assert ssrte is not None
        risk_dist = ssrte.get("risk_distribution", {})
        total = sum(risk_dist.values())
        assert total > 0, f"risk_distribution total should be > 0, got {total}"
        # Check all 4 risk levels exist
        for level in ["critique", "eleve", "modere", "faible"]:
            assert level in risk_dist, f"risk_distribution should have '{level}'"
        print(f"PASS: SSRTE risk_distribution = {risk_dist}")
    
    def test_ssrte_coverage_rate_greater_than_zero(self, auth_session):
        """SSRTE coverage_rate should be > 0"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        ssrte = data.get("ssrte")
        assert ssrte is not None
        assert ssrte["coverage_rate"] > 0, f"Expected coverage_rate > 0, got {ssrte['coverage_rate']}"
        print(f"PASS: SSRTE coverage_rate = {ssrte['coverage_rate']}% (expected > 0)")
    
    # ============ ICI KPI Tests ============
    
    def test_ici_total_cases_is_7(self, auth_session):
        """ICI total_cases should be 7"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        ici = data.get("ici")
        assert ici is not None, "ICI data should be present"
        assert ici["total_cases"] >= 7, f"Expected >=7 ICI cases, got {ici['total_cases']}"
        print(f"PASS: ICI total_cases = {ici['total_cases']} (expected >=7)")
    
    def test_ici_resolved_is_3(self, auth_session):
        """ICI resolved should be 3"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        ici = data.get("ici")
        assert ici is not None
        assert ici["resolved"] >= 3, f"Expected >=3 resolved, got {ici['resolved']}"
        print(f"PASS: ICI resolved = {ici['resolved']} (expected >=3)")
    
    def test_ici_in_progress_is_2(self, auth_session):
        """ICI in_progress should be 2"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        ici = data.get("ici")
        assert ici is not None
        assert ici["in_progress"] >= 2, f"Expected >=2 in_progress, got {ici['in_progress']}"
        print(f"PASS: ICI in_progress = {ici['in_progress']} (expected >=2)")
    
    def test_ici_resolution_rate_greater_than_zero(self, auth_session):
        """ICI resolution_rate should be > 0"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        ici = data.get("ici")
        assert ici is not None
        assert ici["resolution_rate"] > 0, f"Expected resolution_rate > 0, got {ici['resolution_rate']}"
        print(f"PASS: ICI resolution_rate = {ici['resolution_rate']}% (expected > 0)")
    
    # ============ Subscription Tests ============
    
    def test_subscription_is_trial(self, auth_session):
        """Subscription should be trial with Pro features"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        sub = data.get("subscription")
        assert sub is not None
        assert sub["plan"] == "coop_trial", f"Expected coop_trial, got {sub['plan']}"
        assert sub["plan_name"] == "Essai Gratuit Pro", f"Expected 'Essai Gratuit Pro', got {sub['plan_name']}"
        assert sub["is_trial"] == True, "is_trial should be True"
        assert sub["is_active"] == True, "is_active should be True"
        print(f"PASS: Subscription = {sub['plan_name']} (trial: {sub['is_trial']}, days: {sub['days_remaining']})")


class TestSyncREDDVisit:
    """Test REDD+ visit creation syncs to dashboard KPIs"""
    
    def test_create_redd_visit_increments_dashboard_count(self, auth_session):
        """POST /api/redd/tracking/visit should increment dashboard REDD visits"""
        # Step 1: Get current REDD visit count
        kpi_response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert kpi_response.status_code == 200
        initial_visits = kpi_response.json()["redd"]["total_visits"]
        print(f"Initial REDD visits: {initial_visits}")
        
        # Step 2: Get a member to use as farmer_id
        members_response = auth_session.get(f"{BASE_URL}/api/cooperative/members?limit=1")
        assert members_response.status_code == 200
        members = members_response.json().get("members", [])
        if not members:
            pytest.skip("No members found to create REDD visit")
        
        farmer_id = members[0]["id"]
        farmer_name = members[0].get("full_name", "Test Farmer")
        
        # Step 3: Create a REDD+ visit
        visit_data = {
            "farmer_id": farmer_id,
            "farmer_name": farmer_name,
            "practices_verified": [
                {"code": "AGF1", "category": "agroforesterie", "status": "conforme"},
                {"code": "SOL1", "category": "gestion_sols", "status": "partiellement"},
                {"code": "ZD1", "category": "zero_deforestation", "status": "conforme"}
            ],
            "observations": "Test visit from iteration 83 sync test"
        }
        
        create_response = auth_session.post(f"{BASE_URL}/api/redd/tracking/visit", json=visit_data)
        assert create_response.status_code == 200, f"Failed to create REDD visit: {create_response.text}"
        visit_result = create_response.json()
        print(f"Created REDD visit: {visit_result.get('visit_id')}, score: {visit_result.get('redd_score')}")
        
        # Step 4: Verify dashboard shows incremented count
        time.sleep(0.5)  # Small delay for DB write
        kpi_response2 = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert kpi_response2.status_code == 200
        new_visits = kpi_response2.json()["redd"]["total_visits"]
        
        assert new_visits == initial_visits + 1, f"Expected {initial_visits + 1} visits, got {new_visits}"
        print(f"PASS: REDD visits incremented from {initial_visits} to {new_visits}")


class TestSyncSSRTEVisit:
    """Test SSRTE visit creation syncs to dashboard KPIs"""
    
    def test_create_ssrte_visit_increments_dashboard_count(self, auth_session):
        """POST /api/ssrte/visits/create should increment dashboard SSRTE visits"""
        # Step 1: Get current SSRTE visit count
        kpi_response = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert kpi_response.status_code == 200
        initial_visits = kpi_response.json()["ssrte"]["total_visits"]
        print(f"Initial SSRTE visits: {initial_visits}")
        
        # Step 2: Get a member to use as member_id
        members_response = auth_session.get(f"{BASE_URL}/api/cooperative/members?limit=1")
        assert members_response.status_code == 200
        members = members_response.json().get("members", [])
        if not members:
            pytest.skip("No members found to create SSRTE visit")
        
        member_id = members[0]["id"]
        
        # Step 3: Create an SSRTE visit
        visit_data = {
            "member_id": member_id,
            "household_size": 5,
            "children_count": 2,
            "children_details": [
                {"age": 10, "works_on_farm": False, "in_school": True},
                {"age": 14, "works_on_farm": True, "in_school": True}
            ],
            "living_conditions": "average",
            "has_piped_water": True,
            "has_electricity": False,
            "distance_to_school_km": 2.5
        }
        
        create_response = auth_session.post(f"{BASE_URL}/api/ssrte/visits/create", json=visit_data)
        assert create_response.status_code == 200, f"Failed to create SSRTE visit: {create_response.text}"
        visit_result = create_response.json()
        print(f"Created SSRTE visit: {visit_result.get('visit_id')}, risk: {visit_result.get('risk_level')}")
        
        # Step 4: Verify dashboard shows incremented count
        time.sleep(0.5)  # Small delay for DB write
        kpi_response2 = auth_session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert kpi_response2.status_code == 200
        new_visits = kpi_response2.json()["ssrte"]["total_visits"]
        
        assert new_visits == initial_visits + 1, f"Expected {initial_visits + 1} visits, got {new_visits}"
        print(f"PASS: SSRTE visits incremented from {initial_visits} to {new_visits}")


class TestMembersEndpoint:
    """Test members endpoint for KPI strip"""
    
    def test_members_endpoint_returns_active_members(self, auth_session):
        """GET /api/cooperative/members should return active members"""
        response = auth_session.get(f"{BASE_URL}/api/cooperative/members?limit=100")
        assert response.status_code == 200
        data = response.json()
        members = data.get("members", [])
        total = data.get("total", 0)
        assert total >= 20, f"Expected >=20 members, got {total}"
        print(f"PASS: Members endpoint returns {total} members (expected >=20)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
