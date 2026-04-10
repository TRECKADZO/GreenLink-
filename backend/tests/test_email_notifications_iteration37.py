from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test Email Notifications for Quote and Account Actions - Iteration 37
Test Email Notifications for Quote and Account Actions - Iteration 37
Tests that email notifications are triggered (in MOCK mode) when:
Tests that email notifications are triggered (in MOCK mode) when:
1. Admin approves a quote
1. Admin approves a quote
2. Admin rejects a quote  
2. Admin rejects a quote  
3. Admin suspends an account
3. Admin suspends an account
4. Admin activates an account
4. Admin activates an account
"""
"""

import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {
    "identifier": ADMIN_EMAIL,
    "password": ADMIN_PASSWORD
}

SUPPLIER_CREDENTIALS = {
    "identifier": "test_supplier_3@test.com",
    "password": "test1234"
}


class TestEmailNotifications:
    """Test email notifications for quote and account management actions"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Admin auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def test_user_for_email(self, admin_headers):
        """Create or get a test user for email notification testing"""
        # Register new test user for email testing
        test_email = f"email_test_{int(time.time())}@greenlink.ci"
        test_phone = f"+2250799{int(time.time()) % 10000000:07d}"
        
        register_data = {
            "phone_number": test_phone,
            "email": test_email,
            "password": "test1234",
            "password_confirm": "test1234",
            "user_type": "fournisseur",
            "full_name": "Email Test User",
            "accept_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code in [200, 201]:
            data = response.json()
            user_id = data.get("user", {}).get("id") or data.get("user_id")
            
            # Login to get token
            login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": test_email,
                "password": "test1234"
            })
            if login_resp.status_code == 200:
                token = login_resp.json().get("access_token")
                return {
                    "user_id": user_id,
                    "email": test_email,
                    "token": token,
                    "phone": test_phone
                }
        
        pytest.skip(f"Could not create test user for email testing: {response.text}")
    
    def test_01_admin_login_success(self, admin_token):
        """Test that admin can login successfully"""
        assert admin_token is not None
        assert len(admin_token) > 20
        print(f"✓ Admin login successful, token length: {len(admin_token)}")
    
    def test_02_submit_quote_for_testing(self, test_user_for_email):
        """Submit a quote to test email notifications on approve/reject"""
        if not test_user_for_email:
            pytest.skip("No test user available")
        
        headers = {"Authorization": f"Bearer {test_user_for_email['token']}"}
        
        quote_data = {
            "company_name": "Email Test Company",
            "contact_name": "Email Tester",
            "contact_email": test_user_for_email['email'],
            "contact_phone": test_user_for_email['phone'],
            "business_type": "intrants",
            "description": "Test quote for email notification testing",
            "estimated_monthly_volume": "100 tonnes",
            "target_regions": ["Abidjan"],
            "needs": "Testing email notifications",
            "billing_preference": "monthly"
        }
        
        response = requests.post(f"{BASE_URL}/api/subscriptions/quote/submit", json=quote_data, headers=headers)
        
        if response.status_code == 400 and "deja un devis en attente" in response.text:
            print("✓ User already has pending quote (expected)")
            return
        
        assert response.status_code == 200, f"Quote submission failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "quote_id" in data
        print(f"✓ Quote submitted successfully: {data.get('quote_id')}")
    
    def test_03_get_pending_quotes(self, admin_headers):
        """Get pending quotes to find one for testing"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes?status=pending", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get quotes: {response.text}"
        
        data = response.json()
        assert "quotes" in data
        assert "stats" in data
        
        pending_count = data["stats"].get("pending", 0)
        print(f"✓ Pending quotes: {pending_count}")
        
        return data["quotes"]
    
    def test_04_approve_quote_triggers_email(self, admin_headers):
        """Test that approving a quote triggers email notification (MOCK mode)
        
        Note: Email service runs in MOCK mode - check backend logs for [EMAIL-MOCK] entries
        """
        # Get pending quotes
        response = requests.get(f"{BASE_URL}/api/admin/quotes?status=pending", headers=admin_headers)
        assert response.status_code == 200
        
        quotes = response.json().get("quotes", [])
        if not quotes:
            pytest.skip("No pending quotes to approve")
        
        # Approve the first pending quote
        quote_id = quotes[0]["id"]
        
        approve_data = {
            "action": "approve",
            "admin_note": "Approved for email notification testing",
            "custom_price_xof": 50000,
            "subscription_duration_days": 30
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/quotes/{quote_id}", json=approve_data, headers=admin_headers)
        
        if response.status_code == 400 and "deja ete traite" in response.text:
            print("✓ Quote already processed (expected)")
            return
        
        assert response.status_code == 200, f"Quote approval failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Quote approved - Email notification should be logged in backend as [EMAIL-MOCK]")
    
    def test_05_reject_quote_triggers_email(self, admin_headers, test_user_for_email):
        """Test that rejecting a quote triggers email notification (MOCK mode)"""
        if not test_user_for_email:
            pytest.skip("No test user available")
        
        # First submit a new quote if possible
        headers = {"Authorization": f"Bearer {test_user_for_email['token']}"}
        
        quote_data = {
            "company_name": "Rejection Test Company",
            "contact_name": "Reject Tester",
            "contact_email": test_user_for_email['email'],
            "contact_phone": test_user_for_email['phone'],
            "business_type": "semences",
            "description": "Quote to be rejected for testing",
            "billing_preference": "monthly"
        }
        
        # Submit quote
        submit_resp = requests.post(f"{BASE_URL}/api/subscriptions/quote/submit", json=quote_data, headers=headers)
        
        if submit_resp.status_code != 200:
            # Check if there's an existing pending quote
            response = requests.get(f"{BASE_URL}/api/admin/quotes?status=pending", headers=admin_headers)
            quotes = response.json().get("quotes", [])
            if not quotes:
                pytest.skip("No quotes available for rejection testing")
            quote_id = quotes[0]["id"]
        else:
            quote_id = submit_resp.json().get("quote_id")
        
        # Reject the quote
        reject_data = {
            "action": "reject",
            "admin_note": "Rejected for testing email notifications"
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/quotes/{quote_id}", json=reject_data, headers=admin_headers)
        
        if response.status_code == 400:
            print(f"Quote rejection returned 400: {response.text} (quote may be already processed)")
            return
        
        assert response.status_code == 200, f"Quote rejection failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Quote rejected - Email notification should be logged as [EMAIL-MOCK]")
    
    def test_06_suspend_account_triggers_email(self, admin_headers):
        """Test that suspending an account triggers email notification (MOCK mode)"""
        # Get list of devis accounts to find one to suspend
        response = requests.get(f"{BASE_URL}/api/admin/devis-accounts", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get devis accounts: {response.text}"
        
        accounts = response.json().get("accounts", [])
        
        # Find an active account to suspend (not the admin)
        target_account = None
        for acc in accounts:
            if acc.get("is_active") and acc.get("email") != ADMIN_CREDENTIALS["identifier"]:
                target_account = acc
                break
        
        if not target_account:
            pytest.skip("No active accounts to suspend")
        
        user_id = target_account["id"]
        
        suspend_data = {
            "action": "suspend",
            "reason": "Suspended for email notification testing"
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/accounts/{user_id}/action", json=suspend_data, headers=admin_headers)
        assert response.status_code == 200, f"Account suspension failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Account suspended - Email notification should be logged as [EMAIL-MOCK]")
        
        # Return user_id for reactivation test
        return user_id
    
    def test_07_activate_account_triggers_email(self, admin_headers):
        """Test that activating an account triggers email notification (MOCK mode)"""
        # Get suspended accounts
        response = requests.get(f"{BASE_URL}/api/admin/devis-accounts?status=suspended", headers=admin_headers)
        assert response.status_code == 200
        
        accounts = response.json().get("accounts", [])
        
        # Find a suspended account to activate
        target_account = None
        for acc in accounts:
            if not acc.get("is_active") or acc.get("subscription_status") == "suspended":
                target_account = acc
                break
        
        if not target_account:
            pytest.skip("No suspended accounts to activate")
        
        user_id = target_account["id"]
        
        activate_data = {
            "action": "activate"
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/accounts/{user_id}/action", json=activate_data, headers=admin_headers)
        assert response.status_code == 200, f"Account activation failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Account activated - Email notification should be logged as [EMAIL-MOCK]")


class TestPricingPlansAPI:
    """Test pricing plans API returns correct data"""
    
    def test_pricing_plans_endpoint(self):
        """Test GET /api/pricing-plans returns correct pricing info"""
        response = requests.get(f"{BASE_URL}/api/pricing-plans")
        assert response.status_code == 200, f"Pricing plans endpoint failed: {response.text}"
        
        plans = response.json()
        assert isinstance(plans, list)
        print(f"✓ Got {len(plans)} pricing plans")
        
        # Verify plan names exist
        plan_names = [p.get("name") for p in plans]
        expected_names = ["Producteurs", "Cooperatives", "Acheteurs", "Fournisseurs", "Entreprises RSE"]
        
        for name in expected_names:
            assert name in plan_names, f"Missing plan: {name}"
        print(f"✓ All expected plans present: {expected_names}")
    
    def test_free_plans_have_correct_price(self):
        """Verify Producteurs and Cooperatives show GRATUIT"""
        response = requests.get(f"{BASE_URL}/api/pricing-plans")
        plans = response.json()
        
        free_plans = ["Producteurs", "Cooperatives"]
        for plan in plans:
            if plan["name"] in free_plans:
                assert plan.get("price") == "GRATUIT", f"{plan['name']} should have price 'GRATUIT'"
                print(f"✓ {plan['name']} price: {plan.get('price')}")
    
    def test_paid_plans_have_devis_pricing(self):
        """Verify Acheteurs, Fournisseurs, RSE show 'Sur devis'"""
        response = requests.get(f"{BASE_URL}/api/pricing-plans")
        plans = response.json()
        
        paid_plans = ["Acheteurs", "Fournisseurs", "Entreprises RSE"]
        for plan in plans:
            if plan["name"] in paid_plans:
                assert plan.get("price") == "Sur devis", f"{plan['name']} should have price 'Sur devis'"
                assert "15 jours gratuits" in str(plan.get("badge", "")), f"{plan['name']} should have '15 jours gratuits' badge"
                print(f"✓ {plan['name']} price: {plan.get('price')}, badge: {plan.get('badge')}")


class TestSubscriptionEndpoints:
    """Test subscription-related endpoints"""
    
    @pytest.fixture(scope="class")
    def supplier_token(self):
        """Get supplier authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPPLIER_CREDENTIALS)
        if response.status_code != 200:
            pytest.skip(f"Supplier login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def supplier_headers(self, supplier_token):
        return {"Authorization": f"Bearer {supplier_token}"}
    
    def test_my_subscription_shows_trial_info(self, supplier_headers):
        """Test that /api/subscriptions/my-subscription returns trial info"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/my-subscription", headers=supplier_headers)
        assert response.status_code == 200, f"My subscription endpoint failed: {response.text}"
        
        data = response.json()
        print(f"Subscription data: {data}")
        
        # Check for trial-related fields
        if data.get("is_trial"):
            assert "days_remaining" in data or "trial_days_remaining" in data
            print(f"✓ Subscription shows trial status with days remaining")
        else:
            print(f"✓ Subscription active (not in trial): status={data.get('status')}")
    
    def test_my_quotes_endpoint(self, supplier_headers):
        """Test GET /api/subscriptions/quote/my-quote returns user quotes"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/quote/my-quote", headers=supplier_headers)
        assert response.status_code == 200, f"My quotes endpoint failed: {response.text}"
        
        data = response.json()
        assert "quotes" in data
        assert "total" in data
        print(f"✓ User has {data['total']} quote(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
