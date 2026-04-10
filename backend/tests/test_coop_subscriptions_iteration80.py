from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

# Cooperative Subscription System Tests - Iteration 80
# Cooperative Subscription System Tests - Iteration 80
# Tests for: GET /api/coop-subscriptions/plans, /my-subscription, POST /choose-plan
# Tests for: GET /api/coop-subscriptions/plans, /my-subscription, POST /choose-plan

import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCoopSubscriptionPlans:
    """Test GET /api/coop-subscriptions/plans - Public endpoint"""
    
    def test_plans_endpoint_returns_200(self):
        """Plans endpoint should return 200 OK"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Plans endpoint returns 200")
    
    def test_plans_returns_3_plans(self):
        """Should return exactly 3 plans (Starter, Pro, Enterprise)"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        assert "plans" in data, "Response should contain 'plans' key"
        assert len(data["plans"]) == 3, f"Expected 3 plans, got {len(data['plans'])}"
        print("PASS: Returns exactly 3 plans")
    
    def test_plans_have_correct_ids(self):
        """Plans should have correct IDs: coop_starter, coop_pro, coop_enterprise"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        plan_ids = [p["id"] for p in data["plans"]]
        assert "coop_starter" in plan_ids, "Missing coop_starter plan"
        assert "coop_pro" in plan_ids, "Missing coop_pro plan"
        assert "coop_enterprise" in plan_ids, "Missing coop_enterprise plan"
        print("PASS: All plan IDs correct (coop_starter, coop_pro, coop_enterprise)")
    
    def test_starter_plan_pricing_50000(self):
        """Starter plan should have monthly price of 50000 FCFA"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        starter = next((p for p in data["plans"] if p["id"] == "coop_starter"), None)
        assert starter is not None, "Starter plan not found"
        assert starter["pricing"]["monthly"] == 50000, f"Expected 50000, got {starter['pricing']['monthly']}"
        print("PASS: Starter plan pricing is 50000 FCFA/month")
    
    def test_pro_plan_pricing_120000(self):
        """Pro plan should have monthly price of 120000 FCFA"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        pro = next((p for p in data["plans"] if p["id"] == "coop_pro"), None)
        assert pro is not None, "Pro plan not found"
        assert pro["pricing"]["monthly"] == 120000, f"Expected 120000, got {pro['pricing']['monthly']}"
        print("PASS: Pro plan pricing is 120000 FCFA/month")
    
    def test_enterprise_plan_pricing_250000(self):
        """Enterprise plan should have monthly price of 250000 FCFA"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        enterprise = next((p for p in data["plans"] if p["id"] == "coop_enterprise"), None)
        assert enterprise is not None, "Enterprise plan not found"
        assert enterprise["pricing"]["monthly"] == 250000, f"Expected 250000, got {enterprise['pricing']['monthly']}"
        print("PASS: Enterprise plan pricing is 250000 FCFA/month")
    
    def test_trial_info_present(self):
        """Response should include trial information"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        assert "trial" in data, "Response should contain 'trial' key"
        print("PASS: Trial info present in response")
    
    def test_trial_duration_6_months(self):
        """Trial should be 6 months (180 days)"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        trial = data.get("trial", {})
        assert trial.get("duration_months") == 6, f"Expected 6 months, got {trial.get('duration_months')}"
        assert trial.get("duration_days") == 180, f"Expected 180 days, got {trial.get('duration_days')}"
        print("PASS: Trial duration is 6 months (180 days)")
    
    def test_trial_access_level_pro(self):
        """Trial should provide Pro-level access"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        trial = data.get("trial", {})
        assert trial.get("access_level") == "Pro", f"Expected 'Pro', got {trial.get('access_level')}"
        print("PASS: Trial provides Pro-level access")
    
    def test_pro_plan_is_recommended(self):
        """Pro plan should be marked as recommended"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        pro = next((p for p in data["plans"] if p["id"] == "coop_pro"), None)
        assert pro is not None, "Pro plan not found"
        assert pro.get("recommended") == True, "Pro plan should be recommended"
        print("PASS: Pro plan is marked as recommended")


class TestMySubscription:
    """Test GET /api/coop-subscriptions/my-subscription - Requires auth"""
    
    def test_my_subscription_requires_auth(self):
        """Should return 401/403 without authentication"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/my-subscription")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: my-subscription requires authentication")
    
    def test_my_subscription_non_cooperative_user(self):
        """Should return 403 for non-cooperative users"""
        # Login as admin (not a cooperative)
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Could not login as admin")
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/my-subscription", headers=headers)
        # Admin is not a cooperative, should get 403
        assert response.status_code == 403, f"Expected 403 for non-cooperative user, got {response.status_code}"
        print("PASS: Non-cooperative user gets 403")


class TestChoosePlan:
    """Test POST /api/coop-subscriptions/choose-plan - Requires auth"""
    
    def test_choose_plan_requires_auth(self):
        """Should return 401/403 without authentication"""
        response = requests.post(f"{BASE_URL}/api/coop-subscriptions/choose-plan", json={
            "plan": "coop_pro"
        })
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print("PASS: choose-plan requires authentication")
    
    def test_choose_plan_validates_plan_parameter(self):
        """Should validate plan parameter"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Could not login as admin")
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try invalid plan
        response = requests.post(f"{BASE_URL}/api/coop-subscriptions/choose-plan", 
            headers=headers,
            json={"plan": "invalid_plan"}
        )
        # Should return 400 for invalid plan
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print("PASS: Invalid plan returns 400")
    
    def test_choose_plan_rejects_trial_plan(self):
        """Should reject choosing trial plan"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Could not login as admin")
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to choose trial plan
        response = requests.post(f"{BASE_URL}/api/coop-subscriptions/choose-plan", 
            headers=headers,
            json={"plan": "coop_trial"}
        )
        # Should return 400 for trial plan
        assert response.status_code == 400, f"Expected 400 for trial plan, got {response.status_code}"
        print("PASS: Trial plan selection rejected with 400")


class TestPlanFeatures:
    """Test plan features are correctly returned"""
    
    def test_starter_has_limited_features(self):
        """Starter plan should have limited features"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        starter = next((p for p in data["plans"] if p["id"] == "coop_starter"), None)
        features = starter.get("features", {})
        
        # Starter should NOT have dashboard_complet
        assert features.get("dashboard_complet") == False, "Starter should not have dashboard_complet"
        # Starter should have rapports_ars1000
        assert features.get("rapports_ars1000") == True, "Starter should have rapports_ars1000"
        # Starter should have redd_simplifie
        assert features.get("redd_simplifie") == True, "Starter should have redd_simplifie"
        print("PASS: Starter plan has correct limited features")
    
    def test_pro_has_full_features(self):
        """Pro plan should have full features except enterprise-only"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        pro = next((p for p in data["plans"] if p["id"] == "coop_pro"), None)
        features = pro.get("features", {})
        
        # Pro should have dashboard_complet
        assert features.get("dashboard_complet") == True, "Pro should have dashboard_complet"
        # Pro should have redd_avance
        assert features.get("redd_avance") == True, "Pro should have redd_avance"
        # Pro should NOT have api_personnalisee
        assert features.get("api_personnalisee") == False, "Pro should not have api_personnalisee"
        print("PASS: Pro plan has correct features")
    
    def test_enterprise_has_all_features(self):
        """Enterprise plan should have all features"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        enterprise = next((p for p in data["plans"] if p["id"] == "coop_enterprise"), None)
        features = enterprise.get("features", {})
        
        # Enterprise should have all features
        assert features.get("dashboard_complet") == True, "Enterprise should have dashboard_complet"
        assert features.get("api_personnalisee") == True, "Enterprise should have api_personnalisee"
        assert features.get("formation_agents_redd") == True, "Enterprise should have formation_agents_redd"
        assert features.get("co_branding") == True, "Enterprise should have co_branding"
        assert features.get("analyse_carbone_agregee") == True, "Enterprise should have analyse_carbone_agregee"
        print("PASS: Enterprise plan has all features")


class TestYearlyPricing:
    """Test yearly pricing with discount"""
    
    def test_starter_yearly_pricing(self):
        """Starter yearly should be 500000 FCFA (10 months)"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        starter = next((p for p in data["plans"] if p["id"] == "coop_starter"), None)
        assert starter["pricing"]["yearly"] == 500000, f"Expected 500000, got {starter['pricing']['yearly']}"
        print("PASS: Starter yearly pricing is 500000 FCFA")
    
    def test_pro_yearly_pricing(self):
        """Pro yearly should be 1200000 FCFA (10 months)"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        pro = next((p for p in data["plans"] if p["id"] == "coop_pro"), None)
        assert pro["pricing"]["yearly"] == 1200000, f"Expected 1200000, got {pro['pricing']['yearly']}"
        print("PASS: Pro yearly pricing is 1200000 FCFA")
    
    def test_enterprise_yearly_pricing(self):
        """Enterprise yearly should be 2500000 FCFA (10 months)"""
        response = requests.get(f"{BASE_URL}/api/coop-subscriptions/plans")
        data = response.json()
        enterprise = next((p for p in data["plans"] if p["id"] == "coop_enterprise"), None)
        assert enterprise["pricing"]["yearly"] == 2500000, f"Expected 2500000, got {enterprise['pricing']['yearly']}"
        print("PASS: Enterprise yearly pricing is 2500000 FCFA")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
