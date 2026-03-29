"""
Test Dashboard Charts API - Iteration 84
Tests for the 4 interactive charts: REDD Evolution, SSRTE Trends, Risk by Zone, Practices Donut
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CREDENTIALS = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=TEST_CREDENTIALS,
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestDashboardChartsEndpoint:
    """Tests for GET /api/cooperative/dashboard-charts"""

    def test_dashboard_charts_returns_200(self, api_client):
        """Test that dashboard-charts endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_dashboard_charts_has_redd_monthly(self, api_client):
        """Test that response contains redd_monthly array"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        assert "redd_monthly" in data, "Missing redd_monthly in response"
        assert isinstance(data["redd_monthly"], list), "redd_monthly should be a list"

    def test_redd_monthly_has_6_months(self, api_client):
        """Test that redd_monthly contains 6 months of data"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        assert len(data["redd_monthly"]) == 6, f"Expected 6 months, got {len(data['redd_monthly'])}"

    def test_redd_monthly_structure(self, api_client):
        """Test that each redd_monthly entry has required fields"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        for entry in data["redd_monthly"]:
            assert "month" in entry, "Missing 'month' field"
            assert "visites" in entry, "Missing 'visites' field"
            assert "score_moyen" in entry, "Missing 'score_moyen' field"
            assert "co2_tonnes" in entry, "Missing 'co2_tonnes' field"

    def test_redd_monthly_has_activity(self, api_client):
        """Test that redd_monthly has some activity (Feb-Mar 2026)"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        total_visits = sum(m["visites"] for m in data["redd_monthly"])
        assert total_visits > 0, "Expected some REDD+ visits in the data"

    def test_dashboard_charts_has_ssrte_monthly(self, api_client):
        """Test that response contains ssrte_monthly array"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        assert "ssrte_monthly" in data, "Missing ssrte_monthly in response"
        assert isinstance(data["ssrte_monthly"], list), "ssrte_monthly should be a list"

    def test_ssrte_monthly_has_6_months(self, api_client):
        """Test that ssrte_monthly contains 6 months of data"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        assert len(data["ssrte_monthly"]) == 6, f"Expected 6 months, got {len(data['ssrte_monthly'])}"

    def test_ssrte_monthly_structure(self, api_client):
        """Test that each ssrte_monthly entry has required fields"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        required_fields = ["month", "visites", "enfants", "critique", "eleve", "modere", "faible"]
        for entry in data["ssrte_monthly"]:
            for field in required_fields:
                assert field in entry, f"Missing '{field}' field in ssrte_monthly entry"

    def test_ssrte_monthly_has_activity(self, api_client):
        """Test that ssrte_monthly has some activity"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        total_visits = sum(m["visites"] for m in data["ssrte_monthly"])
        assert total_visits > 0, "Expected some SSRTE visits in the data"

    def test_dashboard_charts_has_risk_by_zone(self, api_client):
        """Test that response contains risk_by_zone array"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        assert "risk_by_zone" in data, "Missing risk_by_zone in response"
        assert isinstance(data["risk_by_zone"], list), "risk_by_zone should be a list"

    def test_risk_by_zone_structure(self, api_client):
        """Test that each risk_by_zone entry has required fields"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        if len(data["risk_by_zone"]) > 0:
            required_fields = ["zone", "total", "critique", "eleve", "modere", "faible"]
            for entry in data["risk_by_zone"]:
                for field in required_fields:
                    assert field in entry, f"Missing '{field}' field in risk_by_zone entry"

    def test_risk_by_zone_max_10_zones(self, api_client):
        """Test that risk_by_zone returns at most 10 zones"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        data = response.json()
        assert len(data["risk_by_zone"]) <= 10, f"Expected max 10 zones, got {len(data['risk_by_zone'])}"


class TestDashboardKPIsPracticesAdoption:
    """Tests for practices_adoption data used by Donut Chart"""

    def test_dashboard_kpis_returns_200(self, api_client):
        """Test that dashboard-kpis endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_kpis_has_redd_practices_adoption(self, api_client):
        """Test that redd.practices_adoption exists"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        data = response.json()
        assert "redd" in data, "Missing 'redd' in response"
        assert data["redd"] is not None, "redd is None"
        assert "practices_adoption" in data["redd"], "Missing 'practices_adoption' in redd"

    def test_practices_adoption_has_4_practices(self, api_client):
        """Test that practices_adoption has 4 practice labels"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        data = response.json()
        practices = data["redd"]["practices_adoption"]
        expected_practices = ["Agroforesterie", "Compostage", "Couverture sol", "Zero brulage"]
        for practice in expected_practices:
            assert practice in practices, f"Missing practice: {practice}"

    def test_practices_adoption_structure(self, api_client):
        """Test that each practice has count and pct fields"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        data = response.json()
        practices = data["redd"]["practices_adoption"]
        for name, info in practices.items():
            assert "count" in info, f"Missing 'count' in {name}"
            assert "pct" in info, f"Missing 'pct' in {name}"
            assert isinstance(info["pct"], (int, float)), f"pct should be numeric for {name}"

    def test_practices_adoption_average_calculation(self, api_client):
        """Test that average adoption can be calculated (for 71% display)"""
        response = api_client.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        data = response.json()
        practices = data["redd"]["practices_adoption"]
        total_pct = sum(info["pct"] for info in practices.values())
        avg = total_pct / len(practices)
        # Average should be around 71% based on seed data
        assert 50 <= avg <= 100, f"Average adoption {avg}% seems off"


class TestDashboardChartsAuth:
    """Test authentication requirements for charts endpoint"""

    def test_charts_requires_auth(self):
        """Test that dashboard-charts requires authentication"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-charts")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"

    def test_charts_rejects_invalid_token(self):
        """Test that invalid token is rejected"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-charts",
            headers={"Authorization": "Bearer invalid_token_123"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 with invalid token, got {response.status_code}"
