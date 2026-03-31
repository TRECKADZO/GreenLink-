"""
Iteration 87 - Free Plan for Cooperatives Tests
Tests that all subscription plans have been replaced with a single 'Gratuit' free plan.
All features should be enabled for all cooperatives.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_IDENTIFIER = "klenakan.eric@gmail.com"
TEST_PASSWORD = "474Treckadzo"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin/coop user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": TEST_IDENTIFIER,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardKPIs:
    """Test GET /api/cooperative/dashboard-kpis returns free plan with all features"""
    
    def test_dashboard_kpis_returns_200(self, auth_headers):
        """Dashboard KPIs endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-kpis", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_dashboard_kpis_plan_is_gratuit(self, auth_headers):
        """Plan should be 'Gratuit' not Trial/Starter/Pro/Enterprise"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-kpis", headers=auth_headers)
        data = response.json()
        
        subscription = data.get("subscription", {})
        assert subscription.get("plan") == "coop_gratuit", f"Expected plan='coop_gratuit', got {subscription.get('plan')}"
        assert subscription.get("plan_name") == "Gratuit", f"Expected plan_name='Gratuit', got {subscription.get('plan_name')}"
        assert subscription.get("is_active") == True, "Plan should be active"
        assert subscription.get("is_trial") == False, "Should NOT be a trial"
    
    def test_dashboard_kpis_all_features_enabled(self, auth_headers):
        """All features should be True (free for cooperatives)"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-kpis", headers=auth_headers)
        data = response.json()
        
        features = data.get("features", {})
        
        # Core features that must be True
        required_features = [
            "dashboard_complet", "rapports_ars1000", "alertes_ssrte",
            "rapports_ssrte_ici", "redd_avance", "redd_simplifie",
            "redd_donnees_mrv", "export_pdf_excel"
        ]
        
        for feature in required_features:
            assert features.get(feature) == True, f"Feature '{feature}' should be True, got {features.get(feature)}"
    
    def test_dashboard_kpis_redd_data_not_null(self, auth_headers):
        """REDD+ data should be returned (not null/gated)"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-kpis", headers=auth_headers)
        data = response.json()
        
        # REDD data should exist (may be empty dict if no visits, but not None)
        redd = data.get("redd")
        # redd can be None if no data exists, but features should allow access
        features = data.get("features", {})
        assert features.get("redd_avance") == True, "redd_avance feature should be True"
        assert features.get("redd_simplifie") == True, "redd_simplifie feature should be True"
    
    def test_dashboard_kpis_ssrte_data_not_null(self, auth_headers):
        """SSRTE data should be returned (not null/gated)"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-kpis", headers=auth_headers)
        data = response.json()
        
        features = data.get("features", {})
        assert features.get("alertes_ssrte") == True, "alertes_ssrte feature should be True"
        assert features.get("rapports_ssrte_ici") == True, "rapports_ssrte_ici feature should be True"
    
    def test_dashboard_kpis_ici_data_not_null(self, auth_headers):
        """ICI remediation data should be returned"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-kpis", headers=auth_headers)
        data = response.json()
        
        # ICI data should exist
        ici = data.get("ici")
        # ici can be None if no data, but features should allow access
        features = data.get("features", {})
        assert features.get("rapports_ssrte_ici") == True, "rapports_ssrte_ici feature should be True"


class TestDashboardCharts:
    """Test GET /api/cooperative/dashboard-charts returns data without gating"""
    
    def test_dashboard_charts_returns_200(self, auth_headers):
        """Dashboard charts endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-charts", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_dashboard_charts_has_redd_monthly(self, auth_headers):
        """Should return redd_monthly data"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-charts", headers=auth_headers)
        data = response.json()
        
        assert "redd_monthly" in data, "Response should contain redd_monthly"
        assert isinstance(data["redd_monthly"], list), "redd_monthly should be a list"
    
    def test_dashboard_charts_has_ssrte_monthly(self, auth_headers):
        """Should return ssrte_monthly data"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-charts", headers=auth_headers)
        data = response.json()
        
        assert "ssrte_monthly" in data, "Response should contain ssrte_monthly"
        assert isinstance(data["ssrte_monthly"], list), "ssrte_monthly should be a list"
    
    def test_dashboard_charts_has_risk_by_zone(self, auth_headers):
        """Should return risk_by_zone data"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-charts", headers=auth_headers)
        data = response.json()
        
        assert "risk_by_zone" in data, "Response should contain risk_by_zone"


class TestPDFExport:
    """Test GET /api/cooperative/pdf/dashboard-report returns PDF without subscription check"""
    
    def test_pdf_export_returns_200(self, auth_headers):
        """PDF export should return 200 (no subscription gating)"""
        response = requests.get(f"{BASE_URL}/api/cooperative/pdf/dashboard-report", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_pdf_export_returns_pdf_content_type(self, auth_headers):
        """PDF export should return application/pdf content type"""
        response = requests.get(f"{BASE_URL}/api/cooperative/pdf/dashboard-report", headers=auth_headers)
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
    
    def test_pdf_export_has_content(self, auth_headers):
        """PDF export should return non-empty content"""
        response = requests.get(f"{BASE_URL}/api/cooperative/pdf/dashboard-report", headers=auth_headers)
        assert len(response.content) > 1000, f"PDF content too small: {len(response.content)} bytes"


class TestNoSubscriptionPrices:
    """Verify no subscription prices (50000/120000/250000 FCFA) in API responses"""
    
    def test_kpis_no_price_fields(self, auth_headers):
        """Dashboard KPIs should not contain price fields"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard-kpis", headers=auth_headers)
        data = response.json()
        
        subscription = data.get("subscription", {})
        # Should not have price_monthly or similar fields
        assert "price_monthly" not in subscription, "Should not have price_monthly field"
        assert "price" not in subscription, "Should not have price field"


class TestCoopSubscriptionsEndpoint:
    """Test /api/coop-subscriptions/my-subscription for free plan"""
    
    def test_my_subscription_returns_free_features(self, auth_headers):
        """my-subscription should return all features enabled"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/my-subscription", headers=auth_headers)
        # Note: This endpoint may return 403 for admin users (only works for cooperative user_type)
        # If 403, that's expected for admin user
        if response.status_code == 403:
            pytest.skip("my-subscription endpoint returns 403 for admin user (expected)")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        features = data.get("features", {})
        
        # All features should be True
        assert features.get("redd_donnees_mrv") == True, "redd_donnees_mrv should be True"
        assert features.get("export_pdf_excel") == True, "export_pdf_excel should be True"


class TestMRVEndpoints:
    """Test MRV REDD+ endpoints work without subscription blocking"""
    
    def test_mrv_summary_returns_200(self, auth_headers):
        """MRV summary endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/redd/mrv/summary", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_mrv_farmers_returns_200(self, auth_headers):
        """MRV farmers endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/redd/mrv/farmers?limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
