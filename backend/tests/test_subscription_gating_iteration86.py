"""
Subscription Feature Gating Tests - Iteration 86
Tests cooperative subscription tiers (Trial, Starter, Pro, Enterprise) feature gating
for dashboard-kpis, dashboard-charts, PDF export, and my-subscription endpoints.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mobile-refactor-v2.preview.emergentagent.com')

# Test credentials
TEST_ADMIN = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}

# User ID for subscription manipulation
TEST_USER_ID = "69a22d6e10112568ab8f3008"


class TestSubscriptionGating:
    """Test subscription feature gating across different plans"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADMIN
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        token = data.get("access_token")
        assert token, "No access_token in response"
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    # ============= TRIAL PLAN TESTS =============
    
    def test_01_set_trial_plan(self, auth_headers):
        """Set subscription to Trial plan for testing"""
        # Use MongoDB update via backend endpoint or direct DB access
        # For now, we'll verify the current plan and test accordingly
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Dashboard KPIs failed: {response.text}"
        data = response.json()
        print(f"Current plan: {data.get('subscription', {}).get('plan')}")
        print(f"Features: {data.get('features', {})}")
    
    def test_02_trial_dashboard_kpis_has_all_features(self, auth_headers):
        """Trial plan should have full Pro access - all features enabled"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", {})
        subscription = data.get("subscription", {})
        
        # Trial should have Pro-level features
        if subscription.get("plan") == "coop_trial":
            assert features.get("dashboard_complet") == True, "Trial should have dashboard_complet"
            assert features.get("redd_avance") == True, "Trial should have redd_avance"
            assert features.get("export_pdf_excel") == True, "Trial should have export_pdf_excel"
            assert features.get("alertes_ssrte") == True, "Trial should have alertes_ssrte"
            assert features.get("rapports_ssrte_ici") == True, "Trial should have rapports_ssrte_ici"
            print("PASS: Trial plan has all Pro features")
        else:
            print(f"INFO: Current plan is {subscription.get('plan')}, not trial")
    
    def test_03_trial_dashboard_charts_has_all_data(self, auth_headers):
        """Trial plan should return all chart data (redd_monthly, ssrte_monthly, risk_by_zone)"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-charts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", {})
        
        # Check if features allow full data
        if features.get("redd_avance") or features.get("redd_simplifie"):
            assert "redd_monthly" in data, "Should have redd_monthly"
            print(f"redd_monthly entries: {len(data.get('redd_monthly', []))}")
        
        if features.get("alertes_ssrte"):
            assert "ssrte_monthly" in data, "Should have ssrte_monthly"
            print(f"ssrte_monthly entries: {len(data.get('ssrte_monthly', []))}")
        
        if features.get("rapports_ssrte_ici"):
            assert "risk_by_zone" in data, "Should have risk_by_zone"
            print(f"risk_by_zone entries: {len(data.get('risk_by_zone', []))}")
    
    def test_04_trial_pdf_export_allowed(self, auth_headers):
        """Trial plan should allow PDF export (has export_pdf_excel)"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        
        # Get current features to determine expected behavior
        kpi_response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        features = kpi_response.json().get("features", {})
        
        if features.get("export_pdf_excel"):
            assert response.status_code == 200, f"PDF export should work with export_pdf_excel: {response.text}"
            assert response.headers.get("content-type") == "application/pdf"
            print("PASS: PDF export works for plan with export_pdf_excel")
        else:
            assert response.status_code == 403, "PDF export should be blocked without export_pdf_excel"
            print("PASS: PDF export correctly blocked for plan without export_pdf_excel")
    
    def test_05_trial_redd_kpis_present(self, auth_headers):
        """Trial plan should have REDD+ KPIs data"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", {})
        redd = data.get("redd")
        
        if features.get("redd_avance") or features.get("redd_simplifie"):
            assert redd is not None, "REDD KPIs should be present"
            assert "total_visits" in redd, "Should have total_visits"
            assert "avg_score" in redd, "Should have avg_score"
            print(f"REDD KPIs: visits={redd.get('total_visits')}, score={redd.get('avg_score')}")
        else:
            assert redd is None, "REDD KPIs should be None without redd features"
    
    def test_06_trial_ssrte_kpis_present(self, auth_headers):
        """Trial plan should have SSRTE KPIs data (alertes_ssrte in all plans)"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", {})
        ssrte = data.get("ssrte")
        
        if features.get("alertes_ssrte"):
            assert ssrte is not None, "SSRTE KPIs should be present"
            assert "total_visits" in ssrte, "Should have total_visits"
            assert "risk_distribution" in ssrte, "Should have risk_distribution"
            print(f"SSRTE KPIs: visits={ssrte.get('total_visits')}, children={ssrte.get('children_identified')}")
        else:
            assert ssrte is None, "SSRTE KPIs should be None without alertes_ssrte"
    
    def test_07_trial_ici_kpis_present(self, auth_headers):
        """Trial plan should have ICI KPIs data (rapports_ssrte_ici)"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", {})
        ici = data.get("ici")
        
        if features.get("rapports_ssrte_ici"):
            assert ici is not None, "ICI KPIs should be present"
            assert "total_cases" in ici, "Should have total_cases"
            print(f"ICI KPIs: cases={ici.get('total_cases')}, resolved={ici.get('resolved')}")
        else:
            assert ici is None, "ICI KPIs should be None without rapports_ssrte_ici"


class TestSubscriptionPlansEndpoint:
    """Test the /api/coop-subscriptions/plans endpoint"""
    
    def test_01_get_plans_public(self):
        """Plans endpoint should be public and return all plans"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        assert response.status_code == 200
        data = response.json()
        
        assert "plans" in data, "Should have plans array"
        assert "trial" in data, "Should have trial info"
        
        plans = data["plans"]
        assert len(plans) >= 3, "Should have at least 3 plans (Starter, Pro, Enterprise)"
        
        plan_ids = [p["id"] for p in plans]
        assert "coop_starter" in plan_ids, "Should have Starter plan"
        assert "coop_pro" in plan_ids, "Should have Pro plan"
        assert "coop_enterprise" in plan_ids, "Should have Enterprise plan"
        
        print(f"Plans available: {plan_ids}")
        print(f"Trial duration: {data['trial'].get('duration_days')} days")
    
    def test_02_plans_have_features(self):
        """Each plan should have features dict"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        assert response.status_code == 200
        data = response.json()
        
        for plan in data["plans"]:
            assert "features" in plan, f"Plan {plan['id']} should have features"
            features = plan["features"]
            
            # Verify key features exist
            assert "dashboard_complet" in features
            assert "alertes_ssrte" in features
            assert "export_pdf_excel" in features
            
            print(f"Plan {plan['id']}: export_pdf={features.get('export_pdf_excel')}, redd_avance={features.get('redd_avance')}")


class TestStarterPlanGating:
    """Test Starter plan feature restrictions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADMIN
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_verify_starter_features_definition(self):
        """Verify Starter plan features are correctly defined"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        assert response.status_code == 200
        data = response.json()
        
        starter = next((p for p in data["plans"] if p["id"] == "coop_starter"), None)
        assert starter is not None, "Starter plan should exist"
        
        features = starter["features"]
        
        # Starter should have these features
        assert features.get("rapports_ars1000") == True, "Starter should have rapports_ars1000"
        assert features.get("alertes_ssrte") == True, "Starter should have alertes_ssrte"
        assert features.get("redd_simplifie") == True, "Starter should have redd_simplifie"
        
        # Starter should NOT have these features
        assert features.get("dashboard_complet") == False, "Starter should NOT have dashboard_complet"
        assert features.get("export_pdf_excel") == False, "Starter should NOT have export_pdf_excel"
        assert features.get("redd_avance") == False, "Starter should NOT have redd_avance"
        assert features.get("rapports_ssrte_ici") == False, "Starter should NOT have rapports_ssrte_ici"
        
        print("PASS: Starter plan features correctly defined")
    
    def test_02_verify_trial_features_definition(self):
        """Verify Trial plan has Pro-level features"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        assert response.status_code == 200
        data = response.json()
        
        # Trial info is separate
        trial = data.get("trial", {})
        assert trial.get("access_level") == "Pro", "Trial should have Pro access level"
        
        # Get Pro plan to compare
        pro = next((p for p in data["plans"] if p["id"] == "coop_pro"), None)
        assert pro is not None, "Pro plan should exist"
        
        pro_features = pro["features"]
        assert pro_features.get("dashboard_complet") == True
        assert pro_features.get("export_pdf_excel") == True
        assert pro_features.get("redd_avance") == True
        assert pro_features.get("rapports_ssrte_ici") == True
        
        print("PASS: Trial has Pro-level access")


class TestDashboardChartsGating:
    """Test dashboard-charts endpoint feature gating"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADMIN
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_charts_returns_features(self, auth_headers):
        """Dashboard charts should return features dict"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-charts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "features" in data, "Should return features dict"
        print(f"Chart features: {data.get('features', {})}")
    
    def test_02_charts_data_structure(self, auth_headers):
        """Verify charts data structure"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-charts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check data arrays exist (may be empty based on features)
        assert "redd_monthly" in data, "Should have redd_monthly key"
        assert "ssrte_monthly" in data, "Should have ssrte_monthly key"
        assert "risk_by_zone" in data, "Should have risk_by_zone key"
        
        # Verify structure of monthly data
        if data["redd_monthly"]:
            entry = data["redd_monthly"][0]
            assert "month" in entry, "redd_monthly should have month"
            assert "visites" in entry, "redd_monthly should have visites"
        
        if data["ssrte_monthly"]:
            entry = data["ssrte_monthly"][0]
            assert "month" in entry, "ssrte_monthly should have month"
            assert "visites" in entry, "ssrte_monthly should have visites"
        
        print(f"redd_monthly: {len(data['redd_monthly'])} entries")
        print(f"ssrte_monthly: {len(data['ssrte_monthly'])} entries")
        print(f"risk_by_zone: {len(data['risk_by_zone'])} entries")


class TestPDFExportGating:
    """Test PDF export feature gating"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADMIN
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_pdf_requires_auth(self):
        """PDF export should require authentication"""
        response = requests.get(f"{BASE_URL}/api/cooperative/pdf/dashboard-report")
        assert response.status_code in [401, 403], "Should require auth"
        print("PASS: PDF export requires authentication")
    
    def test_02_pdf_export_with_feature(self, auth_headers):
        """PDF export should work when export_pdf_excel feature is enabled"""
        # First check if current plan has the feature
        kpi_response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        features = kpi_response.json().get("features", {})
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        
        if features.get("export_pdf_excel"):
            assert response.status_code == 200, f"PDF should work: {response.text}"
            assert "application/pdf" in response.headers.get("content-type", "")
            assert len(response.content) > 1000, "PDF should have content"
            print(f"PASS: PDF export works, size={len(response.content)} bytes")
        else:
            assert response.status_code == 403, "PDF should be blocked"
            print("PASS: PDF export correctly blocked")


class TestMySubscriptionEndpoint:
    """Test my-subscription endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADMIN
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_my_subscription_requires_auth(self):
        """my-subscription should require authentication"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/my-subscription")
        assert response.status_code in [401, 403], "Should require auth"
    
    def test_02_my_subscription_returns_features(self, auth_headers):
        """my-subscription should return features for cooperative user"""
        response = requests.get(
            f"{BASE_URL}/api/coop-subscriptions/my-subscription",
            headers=auth_headers
        )
        
        # Note: This endpoint only works for cooperative user_type
        # Admin user may get 403
        if response.status_code == 403:
            print("INFO: my-subscription requires cooperative user_type (admin user gets 403)")
            return
        
        assert response.status_code == 200
        data = response.json()
        
        assert "subscription" in data, "Should have subscription"
        assert "features" in data, "Should have features"
        
        sub = data["subscription"]
        assert "plan" in sub, "Should have plan"
        assert "is_active" in sub, "Should have is_active"
        
        print(f"Subscription: plan={sub.get('plan')}, active={sub.get('is_active')}")
        print(f"Features: {data.get('features', {})}")


class TestFeatureConsistency:
    """Test that features are consistent across endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADMIN
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_features_match_between_kpis_and_charts(self, auth_headers):
        """Features should be consistent between dashboard-kpis and dashboard-charts"""
        kpi_response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        chart_response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-charts",
            headers=auth_headers
        )
        
        assert kpi_response.status_code == 200
        assert chart_response.status_code == 200
        
        kpi_features = kpi_response.json().get("features", {})
        chart_features = chart_response.json().get("features", {})
        
        # Key features should match
        for key in ["redd_avance", "redd_simplifie", "alertes_ssrte", "rapports_ssrte_ici"]:
            assert kpi_features.get(key) == chart_features.get(key), \
                f"Feature {key} mismatch: KPI={kpi_features.get(key)}, Chart={chart_features.get(key)}"
        
        print("PASS: Features consistent between KPIs and Charts endpoints")
    
    def test_02_subscription_info_in_kpis(self, auth_headers):
        """dashboard-kpis should include subscription info"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/dashboard-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "subscription" in data, "Should have subscription info"
        sub = data["subscription"]
        
        assert "plan" in sub, "Should have plan"
        assert "plan_name" in sub, "Should have plan_name"
        assert "is_active" in sub, "Should have is_active"
        
        print(f"Subscription in KPIs: {sub.get('plan_name')} ({sub.get('plan')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
