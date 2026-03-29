"""
Test Dashboard KPIs Endpoint - Iteration 82
Tests REDD+, SSRTE, ICI KPIs gated by cooperative subscription plan
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_EMAIL = "klenakan.eric@gmail.com"
TEST_PASSWORD = "474Treckadzo"


class TestDashboardKPIs:
    """Test GET /api/cooperative/dashboard-kpis endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    def test_login_success(self):
        """Test login works with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        print(f"PASS: Login successful, got access_token")
    
    def test_dashboard_kpis_endpoint_returns_200(self):
        """Test dashboard-kpis endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: GET /api/cooperative/dashboard-kpis returns 200")
    
    def test_dashboard_kpis_has_subscription_info(self):
        """Test response contains subscription info"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        assert "subscription" in data, "Response should contain 'subscription' key"
        sub = data["subscription"]
        
        # Verify subscription structure
        assert "plan" in sub, "Subscription should have 'plan'"
        assert "plan_name" in sub, "Subscription should have 'plan_name'"
        assert "is_active" in sub, "Subscription should have 'is_active'"
        assert "is_trial" in sub, "Subscription should have 'is_trial'"
        assert "days_remaining" in sub, "Subscription should have 'days_remaining'"
        assert "status" in sub, "Subscription should have 'status'"
        
        print(f"PASS: Subscription info present - Plan: {sub['plan_name']}, Trial: {sub['is_trial']}, Days: {sub['days_remaining']}")
    
    def test_dashboard_kpis_has_features(self):
        """Test response contains features dict"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        assert "features" in data, "Response should contain 'features' key"
        features = data["features"]
        
        # Check key features exist
        assert isinstance(features, dict), "Features should be a dict"
        print(f"PASS: Features dict present with {len(features)} feature flags")
    
    def test_dashboard_kpis_redd_data_for_trial(self):
        """Test REDD+ data is present for trial/pro plans"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        # For trial plan, REDD+ should be available
        sub = data.get("subscription", {})
        features = data.get("features", {})
        redd = data.get("redd")
        
        if features.get("redd_avance") or features.get("redd_simplifie"):
            assert redd is not None, "REDD+ data should be present when feature is enabled"
            
            # Verify REDD+ structure
            assert "total_visits" in redd, "REDD+ should have 'total_visits'"
            assert "avg_score" in redd, "REDD+ should have 'avg_score'"
            assert "farmers_assessed" in redd, "REDD+ should have 'farmers_assessed'"
            assert "is_advanced" in redd, "REDD+ should have 'is_advanced'"
            
            print(f"PASS: REDD+ data present - Visits: {redd['total_visits']}, Score: {redd['avg_score']}, Farmers: {redd['farmers_assessed']}, Advanced: {redd['is_advanced']}")
        else:
            print(f"INFO: REDD+ feature not enabled for this plan")
    
    def test_dashboard_kpis_ssrte_data_for_trial(self):
        """Test SSRTE data is present for trial/pro plans"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", {})
        ssrte = data.get("ssrte")
        
        if features.get("alertes_ssrte"):
            assert ssrte is not None, "SSRTE data should be present when feature is enabled"
            
            # Verify SSRTE structure
            assert "total_visits" in ssrte, "SSRTE should have 'total_visits'"
            assert "risk_distribution" in ssrte, "SSRTE should have 'risk_distribution'"
            assert "children_identified" in ssrte, "SSRTE should have 'children_identified'"
            assert "coverage_rate" in ssrte, "SSRTE should have 'coverage_rate'"
            assert "unique_farmers_visited" in ssrte, "SSRTE should have 'unique_farmers_visited'"
            
            # Verify risk distribution structure
            risk = ssrte["risk_distribution"]
            assert "critique" in risk, "Risk distribution should have 'critique'"
            assert "eleve" in risk, "Risk distribution should have 'eleve'"
            assert "modere" in risk, "Risk distribution should have 'modere'"
            assert "faible" in risk, "Risk distribution should have 'faible'"
            
            print(f"PASS: SSRTE data present - Visits: {ssrte['total_visits']}, Coverage: {ssrte['coverage_rate']}%, Children: {ssrte['children_identified']}")
        else:
            print(f"INFO: SSRTE feature not enabled for this plan")
    
    def test_dashboard_kpis_ici_data_for_pro(self):
        """Test ICI remediation data is present for Pro+ plans"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", {})
        ici = data.get("ici")
        
        if features.get("rapports_ssrte_ici"):
            assert ici is not None, "ICI data should be present when feature is enabled"
            
            # Verify ICI structure
            assert "total_cases" in ici, "ICI should have 'total_cases'"
            assert "resolved" in ici, "ICI should have 'resolved'"
            assert "in_progress" in ici, "ICI should have 'in_progress'"
            assert "resolution_rate" in ici, "ICI should have 'resolution_rate'"
            
            print(f"PASS: ICI data present - Cases: {ici['total_cases']}, Resolved: {ici['resolved']}, In Progress: {ici['in_progress']}")
        else:
            print(f"INFO: ICI reports feature not enabled for this plan")
    
    def test_dashboard_kpis_trial_plan_name(self):
        """Test trial plan shows correct French name"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        sub = data.get("subscription", {})
        plan = sub.get("plan")
        plan_name = sub.get("plan_name")
        
        # Verify plan name mapping
        expected_names = {
            "coop_trial": "Essai Gratuit Pro",
            "coop_starter": "Starter",
            "coop_pro": "Pro",
            "coop_enterprise": "Enterprise"
        }
        
        if plan in expected_names:
            assert plan_name == expected_names[plan], f"Plan name should be '{expected_names[plan]}', got '{plan_name}'"
            print(f"PASS: Plan name correct - {plan} -> {plan_name}")
        else:
            print(f"INFO: Unknown plan type: {plan}")
    
    def test_dashboard_endpoint_still_works(self):
        """Test original dashboard endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "coop_info" in data, "Dashboard should have 'coop_info'"
        assert "members" in data, "Dashboard should have 'members'"
        assert "parcelles" in data, "Dashboard should have 'parcelles'"
        
        print(f"PASS: Original dashboard endpoint works - Members: {data['members']['total']}, Parcels: {data['parcelles']['total']}")


class TestDashboardKPIsDataValues:
    """Test actual data values in dashboard KPIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_redd_values_are_numeric(self):
        """Test REDD+ values are proper numeric types"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        redd = data.get("redd")
        if redd:
            assert isinstance(redd["total_visits"], int), "total_visits should be int"
            assert isinstance(redd["avg_score"], (int, float)), "avg_score should be numeric"
            assert isinstance(redd["farmers_assessed"], int), "farmers_assessed should be int"
            assert isinstance(redd["is_advanced"], bool), "is_advanced should be bool"
            print(f"PASS: REDD+ values have correct types")
        else:
            print(f"INFO: REDD+ not available for this plan")
    
    def test_ssrte_values_are_numeric(self):
        """Test SSRTE values are proper numeric types"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        ssrte = data.get("ssrte")
        if ssrte:
            assert isinstance(ssrte["total_visits"], int), "total_visits should be int"
            assert isinstance(ssrte["children_identified"], int), "children_identified should be int"
            assert isinstance(ssrte["coverage_rate"], (int, float)), "coverage_rate should be numeric"
            assert isinstance(ssrte["unique_farmers_visited"], int), "unique_farmers_visited should be int"
            
            risk = ssrte["risk_distribution"]
            for key in ["critique", "eleve", "modere", "faible"]:
                assert isinstance(risk[key], int), f"risk_distribution.{key} should be int"
            
            print(f"PASS: SSRTE values have correct types")
        else:
            print(f"INFO: SSRTE not available for this plan")
    
    def test_subscription_days_remaining_is_positive(self):
        """Test days_remaining is non-negative"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard-kpis")
        assert response.status_code == 200
        data = response.json()
        
        sub = data.get("subscription", {})
        days = sub.get("days_remaining", 0)
        
        assert isinstance(days, int), "days_remaining should be int"
        assert days >= 0, "days_remaining should be non-negative"
        print(f"PASS: days_remaining is valid: {days}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
