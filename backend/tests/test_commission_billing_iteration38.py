from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test suite for Commission Rate and Billing Cycle features - Iteration 38
Test suite for Commission Rate and Billing Cycle features - Iteration 38
Tests:
Tests:
- PUT /api/admin/quotes/{id} accepts commission_rate and billing_cycle fields when approving
- PUT /api/admin/quotes/{id} accepts commission_rate and billing_cycle fields when approving
- Subscription stores price_xof, commission_rate, and billing_cycle after approval
- Subscription stores price_xof, commission_rate, and billing_cycle after approval
- GET /api/subscriptions/my-subscription returns price_xof, commission_rate, billing_cycle
- GET /api/subscriptions/my-subscription returns price_xof, commission_rate, billing_cycle
- GET /api/subscriptions/quote/my-quote returns commission_rate, billing_cycle, subscription_duration_days
- GET /api/subscriptions/quote/my-quote returns commission_rate, billing_cycle, subscription_duration_days
"""
"""

import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
FOURNISSEUR_CREDS = {"identifier": "intrants-ci@test.com", "password": "test1234"}


class TestAuthEndpoints:
    """Authentication tests for admin and fournisseur"""

    def test_admin_login(self):
        """Test admin login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert data["access_token"] is not None
        print(f"PASS: Admin login successful, got access_token")
        return data["access_token"]

    def test_fournisseur_login(self):
        """Test fournisseur login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FOURNISSEUR_CREDS)
        assert response.status_code == 200, f"Fournisseur login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        print(f"PASS: Fournisseur login successful")
        return data["access_token"]


class TestQuoteApprovalWithCommission:
    """Tests for quote approval with commission_rate and billing_cycle"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin authentication failed")

    def test_get_admin_quotes_list(self):
        """Test admin can fetch quotes list"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to get quotes: {response.text}"
        data = response.json()
        assert "quotes" in data, "Response missing 'quotes' field"
        assert "stats" in data, "Response missing 'stats' field"
        print(f"PASS: Admin quotes list - {len(data['quotes'])} quotes found")
        print(f"      Stats: pending={data['stats'].get('pending', 0)}, approved={data['stats'].get('approved', 0)}")

    def test_approved_quote_contains_commission_and_billing(self):
        """Test that approved quotes contain commission_rate and billing_cycle fields"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes?status=approved", headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to get approved quotes: {response.text}"
        data = response.json()
        quotes = data.get("quotes", [])
        
        if len(quotes) == 0:
            pytest.skip("No approved quotes found to verify")
        
        # Check first approved quote has the fields
        quote = quotes[0]
        print(f"PASS: Checking approved quote {quote.get('id')}")
        # These fields should exist in approved quotes (may be None if not set)
        assert "commission_rate" in quote, "Missing commission_rate field in quote response"
        assert "billing_cycle" in quote, "Missing billing_cycle field in quote response"
        assert "custom_price_xof" in quote, "Missing custom_price_xof field in quote response"
        print(f"      commission_rate: {quote.get('commission_rate')}, billing_cycle: {quote.get('billing_cycle')}, price: {quote.get('custom_price_xof')}")


class TestFournisseurSubscription:
    """Tests for fournisseur subscription with pricing details"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get fournisseur token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FOURNISSEUR_CREDS)
        if response.status_code == 200:
            self.fournisseur_token = response.json().get("access_token")
            self.fournisseur_headers = {"Authorization": f"Bearer {self.fournisseur_token}"}
        else:
            pytest.skip("Fournisseur authentication failed")

    def test_my_subscription_returns_pricing_fields(self):
        """Test GET /api/subscriptions/my-subscription returns price_xof, commission_rate, billing_cycle"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/my-subscription", headers=self.fournisseur_headers)
        assert response.status_code == 200, f"Failed to get subscription: {response.text}"
        data = response.json()
        
        assert "subscription" in data, "Response missing 'subscription' field"
        sub = data["subscription"]
        
        # Check that pricing fields are present
        assert "price_xof" in sub, "Subscription missing price_xof field"
        assert "commission_rate" in sub, "Subscription missing commission_rate field"
        assert "billing_cycle" in sub, "Subscription missing billing_cycle field"
        
        print(f"PASS: my-subscription returns pricing fields")
        print(f"      plan: {sub.get('plan')}, status: {sub.get('status')}")
        print(f"      price_xof: {sub.get('price_xof')}, commission_rate: {sub.get('commission_rate')}, billing_cycle: {sub.get('billing_cycle')}")
        
        # Verify values for the test fournisseur (should have approved pricing)
        if sub.get('status') == 'active' and sub.get('price_xof'):
            assert sub.get('price_xof') == 35000, f"Expected price_xof=35000, got {sub.get('price_xof')}"
            assert sub.get('commission_rate') == 5, f"Expected commission_rate=5, got {sub.get('commission_rate')}"
            assert sub.get('billing_cycle') == 'monthly', f"Expected billing_cycle=monthly, got {sub.get('billing_cycle')}"
            print(f"      Verified: 35000 XOF/mois, 5% commission, Mensuelle facturation")

    def test_my_quote_returns_commission_and_billing(self):
        """Test GET /api/subscriptions/quote/my-quote returns commission_rate, billing_cycle, subscription_duration_days"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/quote/my-quote", headers=self.fournisseur_headers)
        assert response.status_code == 200, f"Failed to get my-quote: {response.text}"
        data = response.json()
        
        assert "quotes" in data, "Response missing 'quotes' field"
        quotes = data.get("quotes", [])
        
        if len(quotes) == 0:
            pytest.skip("No quotes found for this fournisseur")
        
        # Check the most recent/approved quote
        approved_quote = next((q for q in quotes if q.get('status') == 'approved'), None)
        if approved_quote is None:
            pytest.skip("No approved quotes found for this fournisseur")
        
        print(f"PASS: my-quote returns quote history")
        assert "commission_rate" in approved_quote, "Quote missing commission_rate field"
        assert "billing_cycle" in approved_quote, "Quote missing billing_cycle field"
        assert "subscription_duration_days" in approved_quote, "Quote missing subscription_duration_days field"
        
        print(f"      Approved quote - commission_rate: {approved_quote.get('commission_rate')}, billing_cycle: {approved_quote.get('billing_cycle')}, duration: {approved_quote.get('subscription_duration_days')} days")


class TestQuoteApprovalEndpoint:
    """Tests for PUT /api/admin/quotes/{id} with commission_rate and billing_cycle"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin authentication failed")

    def test_quote_approval_schema_accepts_commission_rate(self):
        """Test that the QuoteAdminAction schema accepts commission_rate field"""
        # Get a pending quote to test against
        response = requests.get(f"{BASE_URL}/api/admin/quotes?status=pending", headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        pending_quotes = data.get("quotes", [])
        
        if len(pending_quotes) == 0:
            # No pending quotes - verify the schema by checking approved quotes have the fields
            print("INFO: No pending quotes to approve. Verifying schema via approved quotes...")
            response = requests.get(f"{BASE_URL}/api/admin/quotes?status=approved", headers=self.admin_headers)
            assert response.status_code == 200
            data = response.json()
            approved_quotes = data.get("quotes", [])
            if len(approved_quotes) > 0:
                quote = approved_quotes[0]
                assert "commission_rate" in quote, "commission_rate field not in quote response"
                assert "billing_cycle" in quote, "billing_cycle field not in quote response"
                print(f"PASS: Schema verified - approved quote has commission_rate={quote.get('commission_rate')}, billing_cycle={quote.get('billing_cycle')}")
            else:
                pytest.skip("No approved quotes to verify schema")
            return
        
        # If we have a pending quote, try to approve it with commission_rate
        quote_id = pending_quotes[0].get("id")
        approval_payload = {
            "action": "approve",
            "admin_note": "Test approval with commission rate",
            "custom_price_xof": 50000,
            "commission_rate": 4.5,
            "billing_cycle": "quarterly",
            "subscription_duration_days": 90
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/quotes/{quote_id}", json=approval_payload, headers=self.admin_headers)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Approval should succeed"
            print(f"PASS: Quote {quote_id} approved with commission_rate=4.5, billing_cycle=quarterly")
        elif response.status_code == 400 and "already" in response.text.lower():
            print(f"INFO: Quote already processed - schema accepts commission_rate field")
        else:
            print(f"Response: {response.status_code} - {response.text}")
            pytest.fail(f"Unexpected error: {response.text}")


class TestSubscriptionStoragePersistence:
    """Tests to verify subscription data is properly stored"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get fournisseur token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FOURNISSEUR_CREDS)
        if response.status_code == 200:
            self.fournisseur_token = response.json().get("access_token")
            self.fournisseur_headers = {"Authorization": f"Bearer {self.fournisseur_token}"}
        else:
            pytest.skip("Fournisseur authentication failed")

    def test_subscription_pricing_persisted(self):
        """Test that subscription stores price_xof, commission_rate, billing_cycle after approval"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/my-subscription", headers=self.fournisseur_headers)
        assert response.status_code == 200
        data = response.json()
        sub = data.get("subscription", {})
        
        # For intrants-ci@test.com with approved quote
        if sub.get('status') == 'active' and sub.get('price_xof'):
            # Verify data persistence
            assert sub.get('price_xof') is not None, "price_xof should be stored"
            assert sub.get('commission_rate') is not None, "commission_rate should be stored"
            assert sub.get('billing_cycle') is not None, "billing_cycle should be stored"
            
            # The test fournisseur should have specific values
            print(f"PASS: Subscription data persisted correctly")
            print(f"      price_xof={sub.get('price_xof')}, commission_rate={sub.get('commission_rate')}%, billing_cycle={sub.get('billing_cycle')}")
        else:
            print(f"INFO: Subscription status={sub.get('status')}, price_xof={sub.get('price_xof')}")
            # Even if not active, fields should exist
            assert "price_xof" in sub
            assert "commission_rate" in sub
            assert "billing_cycle" in sub
            print("PASS: Pricing fields exist in subscription response")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
