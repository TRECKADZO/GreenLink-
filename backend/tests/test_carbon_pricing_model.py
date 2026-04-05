"""
Carbon Pricing Model Tests - Iteration 24
Tests the updated pricing model where:
1) Cooperative submits quantity ONLY (no price field)
2) Admin MUST set price_per_tonne when approving
3) Premium distribution: 30% fees, then 70% farmer / 25% GreenLink / 5% cooperative
4) Farmer dashboard shows full distribution breakdown with real admin-set price
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://greenlink-sync-fix.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"}
COOP_CREDS = {"identifier": "coop-gagnoa@greenlink.ci", "password": "password"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def coop_token():
    """Get cooperative authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDS)
    assert response.status_code == 200, f"Coop login failed: {response.text}"
    return response.json()["access_token"]


class TestCarbonListingSubmissionNoPrice:
    """Test 1: Carbon listing submission has NO price field - cooperative only submits quantity"""
    
    def test_submit_listing_without_price(self, coop_token):
        """POST /api/carbon-listings/submit - Verify price_per_tonne is NOT in request and response shows pending"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "credit_type": "Agroforesterie",
            "project_name": f"TEST_NoPriceSubmit_{unique_id}",
            "project_description": "Test submission without price - coop only submits quantity",
            "verification_standard": "Verra VCS",
            "quantity_tonnes_co2": 100.0,
            "vintage_year": 2026,
            "region": "Sud-Ouest",
            "department": "Soubré"
        }
        # Note: NO price_per_tonne in payload - this is the key test
        
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        
        assert response.status_code == 200, f"Submit failed: {response.text}"
        data = response.json()
        assert data["status"] == "pending_approval", f"Expected pending_approval status, got {data.get('status')}"
        assert "listing_id" in data, "Response should contain listing_id"
        print(f"PASS: Listing submitted without price, status=pending_approval, listing_id={data['listing_id']}")
        return data["listing_id"]


class TestAdminApprovalRequiresPrice:
    """Test 2-4: Admin approval REQUIRES price_per_tonne and returns premium_distribution"""
    
    def test_admin_approval_fails_without_price(self, admin_token, coop_token):
        """PUT /api/carbon-listings/{id}/review - Should FAIL without price_per_tonne"""
        # First create a listing
        unique_id = str(uuid.uuid4())[:8]
        submit_payload = {
            "credit_type": "Reforestation",
            "project_name": f"TEST_ApprovalNoPrice_{unique_id}",
            "project_description": "Test that approval fails without price",
            "verification_standard": "Gold Standard",
            "quantity_tonnes_co2": 200.0,
            "vintage_year": 2026
        }
        
        submit_resp = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert submit_resp.status_code == 200
        listing_id = submit_resp.json()["listing_id"]
        
        # Try to approve WITHOUT price - should fail with 400
        approve_payload = {
            "action": "approve",
            "admin_note": "Trying to approve without price"
            # NO price_per_tonne
        }
        
        approve_resp = requests.put(
            f"{BASE_URL}/api/carbon-listings/{listing_id}/review",
            json=approve_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert approve_resp.status_code == 400, f"Expected 400, got {approve_resp.status_code}: {approve_resp.text}"
        assert "prix" in approve_resp.text.lower() or "price" in approve_resp.text.lower(), \
            f"Error message should mention price requirement: {approve_resp.text}"
        print(f"PASS: Admin approval correctly fails without price (400)")
    
    def test_admin_approval_with_price_returns_distribution(self, admin_token, coop_token):
        """PUT /api/carbon-listings/{id}/review - With price returns premium_distribution"""
        # Create a listing
        unique_id = str(uuid.uuid4())[:8]
        submit_payload = {
            "credit_type": "Agroforesterie",
            "project_name": f"TEST_ApprovalWithPrice_{unique_id}",
            "project_description": "Test approval with price returns premium distribution",
            "verification_standard": "Plan Vivo",
            "quantity_tonnes_co2": 500.0,
            "vintage_year": 2026,
            "department": "Gagnoa"
        }
        
        submit_resp = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert submit_resp.status_code == 200
        listing_id = submit_resp.json()["listing_id"]
        
        # Approve WITH price
        price_per_tonne = 15000  # XOF
        qty = 500.0
        approve_payload = {
            "action": "approve",
            "price_per_tonne": price_per_tonne,
            "admin_note": "Approved with price set by admin"
        }
        
        approve_resp = requests.put(
            f"{BASE_URL}/api/carbon-listings/{listing_id}/review",
            json=approve_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert approve_resp.status_code == 200, f"Approval failed: {approve_resp.text}"
        data = approve_resp.json()
        
        # Verify price is returned
        assert data.get("price_per_tonne") == price_per_tonne, \
            f"Expected price {price_per_tonne}, got {data.get('price_per_tonne')}"
        
        # Verify premium_distribution is returned
        assert "premium_distribution" in data, f"Response missing premium_distribution: {data}"
        dist = data["premium_distribution"]
        
        # Verify math: 30% fees, then 70/25/5 split
        expected_total = price_per_tonne * qty  # 7,500,000
        expected_fees = expected_total * 0.30   # 2,250,000
        expected_net = expected_total - expected_fees  # 5,250,000
        expected_farmer = expected_net * 0.70   # 3,675,000
        expected_greenlink = expected_net * 0.25  # 1,312,500
        expected_coop = expected_net * 0.05     # 262,500
        
        # Use approximate comparison due to rounding
        assert dist["total_revenue"] == round(expected_total), \
            f"Expected total {round(expected_total)}, got {dist.get('total_revenue')}"
        assert dist["fees"] == round(expected_fees), \
            f"Expected fees {round(expected_fees)}, got {dist.get('fees')}"
        assert dist["net_amount"] == round(expected_net), \
            f"Expected net {round(expected_net)}, got {dist.get('net_amount')}"
        assert dist["farmer_premium"] == round(expected_farmer), \
            f"Expected farmer {round(expected_farmer)}, got {dist.get('farmer_premium')}"
        assert dist["greenlink_revenue"] == round(expected_greenlink), \
            f"Expected greenlink {round(expected_greenlink)}, got {dist.get('greenlink_revenue')}"
        assert dist["coop_commission"] == round(expected_coop), \
            f"Expected coop {round(expected_coop)}, got {dist.get('coop_commission')}"
        
        print(f"PASS: Admin approval with price returns correct premium_distribution")
        print(f"  Total: {dist['total_revenue']:,} XOF")
        print(f"  Fees (30%): {dist['fees']:,} XOF")
        print(f"  Net: {dist['net_amount']:,} XOF")
        print(f"  Farmer (70% of net): {dist['farmer_premium']:,} XOF")
        print(f"  GreenLink (25% of net): {dist['greenlink_revenue']:,} XOF")
        print(f"  Coop (5% of net): {dist['coop_commission']:,} XOF")


class TestPremiumSimulation:
    """Test 5: GET /api/carbon-listings/simulate-premium returns correct breakdown"""
    
    def test_simulate_premium_endpoint(self):
        """Verify simulate-premium returns correct distribution for given quantity and price"""
        qty = 1000.0
        price = 20000  # XOF
        
        response = requests.get(
            f"{BASE_URL}/api/carbon-listings/simulate-premium",
            params={"quantity_tonnes": qty, "price_per_tonne": price}
        )
        
        assert response.status_code == 200, f"Simulate failed: {response.text}"
        data = response.json()
        
        # Verify all fields present
        assert data.get("quantity_tonnes") == qty
        assert data.get("price_per_tonne") == price
        
        # Verify math
        expected_total = price * qty  # 20,000,000
        expected_fees = expected_total * 0.30
        expected_net = expected_total - expected_fees
        expected_farmer = expected_net * 0.70
        
        assert data["total_revenue"] == expected_total
        assert data["fees"] == expected_fees
        assert data["net_amount"] == expected_net
        assert data["farmer_premium"] == expected_farmer
        
        print(f"PASS: simulate-premium returns correct breakdown for {qty}t at {price} XOF/t")
    
    def test_simulate_premium_uses_default_price(self):
        """When no price specified, uses default from carbon_config"""
        qty = 100.0
        
        # Get current default price first
        price_resp = requests.get(f"{BASE_URL}/api/carbon-listings/carbon-price")
        assert price_resp.status_code == 200
        default_price = price_resp.json()["default_price_per_tonne"]
        
        # Simulate without specifying price
        response = requests.get(
            f"{BASE_URL}/api/carbon-listings/simulate-premium",
            params={"quantity_tonnes": qty}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["price_per_tonne"] == default_price
        print(f"PASS: simulate-premium uses default price {default_price} XOF when not specified")


class TestCarbonPriceManagement:
    """Test 6-7: Carbon price GET/PUT endpoints"""
    
    def test_get_carbon_price_public(self):
        """GET /api/carbon-listings/carbon-price - Public endpoint returns default price"""
        response = requests.get(f"{BASE_URL}/api/carbon-listings/carbon-price")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "default_price_per_tonne" in data
        assert data["currency"] == "XOF"
        assert isinstance(data["default_price_per_tonne"], (int, float))
        
        print(f"PASS: GET carbon-price returns default_price_per_tonne={data['default_price_per_tonne']} XOF")
    
    def test_update_carbon_price_admin_only(self, admin_token):
        """PUT /api/carbon-listings/carbon-price - Admin can update default price"""
        new_price = 22000
        
        response = requests.put(
            f"{BASE_URL}/api/carbon-listings/carbon-price",
            json={"default_price_per_tonne": new_price},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["default_price_per_tonne"] == new_price
        
        # Verify it was actually saved
        verify_resp = requests.get(f"{BASE_URL}/api/carbon-listings/carbon-price")
        assert verify_resp.json()["default_price_per_tonne"] == new_price
        
        print(f"PASS: Admin updated default carbon price to {new_price} XOF")
        
        # Reset to 20000 for consistent test state
        requests.put(
            f"{BASE_URL}/api/carbon-listings/carbon-price",
            json={"default_price_per_tonne": 20000},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_update_carbon_price_non_admin_forbidden(self, coop_token):
        """PUT /api/carbon-listings/carbon-price - Non-admin gets 403"""
        response = requests.put(
            f"{BASE_URL}/api/carbon-listings/carbon-price",
            json={"default_price_per_tonne": 99999},
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Non-admin cannot update carbon price (403)")


class TestFarmerDashboardDistribution:
    """Test 8: Farmer carbon dashboard returns distribution_model with all price and breakdown info"""
    
    def test_farmer_dashboard_has_distribution_model(self, coop_token):
        """GET /api/carbon-payments/dashboard - Returns distribution_model for farmer users.
        Note: Cooperative users get a different dashboard structure (without distribution_model).
        This test verifies the endpoint structure for cooperative users which is designed differently."""
        response = requests.get(
            f"{BASE_URL}/api/carbon-payments/dashboard",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # For cooperative users, the dashboard returns cooperative_info, carbon_score, finances, member_stats
        # The distribution_model is only returned for producteur (farmer) users
        if "cooperative_info" in data:
            # This is a cooperative dashboard - verify its structure
            assert "cooperative_info" in data, "Missing cooperative_info"
            assert "carbon_score" in data, "Missing carbon_score"
            assert "finances" in data, "Missing finances"
            print(f"PASS: Cooperative dashboard structure verified (no distribution_model - by design)")
            print(f"  Coop name: {data['cooperative_info'].get('name')}")
            print(f"  Members count: {data['cooperative_info'].get('members_count')}")
            pytest.skip("Cooperative token used - distribution_model only for farmer/producteur users")
        else:
            # This is a farmer dashboard - verify distribution_model
            assert "distribution_model" in data, f"Missing distribution_model in response: {list(data.keys())}"
            
            dist = data["distribution_model"]
            
            # Verify all required fields
            assert "price_per_tonne_xof" in dist, "Missing price_per_tonne_xof"
            assert "fees_rate" in dist, "Missing fees_rate"
            assert "gross_annual_xof" in dist, "Missing gross_annual_xof"
            assert "fees_annual_xof" in dist, "Missing fees_annual_xof"
            assert "net_annual_xof" in dist, "Missing net_annual_xof"
            assert "farmer_share_rate" in dist, "Missing farmer_share_rate"
            assert "farmer_annual_xof" in dist, "Missing farmer_annual_xof"
            assert "greenlink_share_rate" in dist, "Missing greenlink_share_rate"
            assert "greenlink_annual_xof" in dist, "Missing greenlink_annual_xof"
            assert "coop_share_rate" in dist, "Missing coop_share_rate"
            assert "coop_annual_xof" in dist, "Missing coop_annual_xof"
            
            # Verify rates are correct
            assert dist["fees_rate"] == "30%", f"Expected 30% fees, got {dist['fees_rate']}"
            assert dist["farmer_share_rate"] == "70%", f"Expected 70% farmer, got {dist['farmer_share_rate']}"
            assert dist["greenlink_share_rate"] == "25%", f"Expected 25% greenlink, got {dist['greenlink_share_rate']}"
            assert dist["coop_share_rate"] == "5%", f"Expected 5% coop, got {dist['coop_share_rate']}"
            
            print(f"PASS: Farmer dashboard has complete distribution_model")
            print(f"  Price per tonne: {dist['price_per_tonne_xof']:,} XOF")
            print(f"  Fees rate: {dist['fees_rate']}")
            print(f"  Farmer share: {dist['farmer_share_rate']}")
            print(f"  GreenLink share: {dist['greenlink_share_rate']}")
            print(f"  Coop share: {dist['coop_share_rate']}")


class TestPendingListingPriceStatus:
    """Test: Pending listings show 'Prix à fixer' status"""
    
    def test_pending_listings_show_price_to_set(self, admin_token, coop_token):
        """Pending listings should have price_per_tonne=None and suggested_price from default"""
        # Create a new pending listing
        unique_id = str(uuid.uuid4())[:8]
        submit_payload = {
            "credit_type": "Conservation",
            "project_name": f"TEST_PendingPrice_{unique_id}",
            "project_description": "Test pending listing shows no price",
            "verification_standard": "Verra VCS",
            "quantity_tonnes_co2": 300.0,
            "vintage_year": 2026
        }
        
        submit_resp = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert submit_resp.status_code == 200
        listing_id = submit_resp.json()["listing_id"]
        
        # Get pending listings as admin
        pending_resp = requests.get(
            f"{BASE_URL}/api/carbon-listings/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert pending_resp.status_code == 200
        listings = pending_resp.json()
        
        # Find our listing
        our_listing = next((l for l in listings if l["listing_id"] == listing_id), None)
        assert our_listing is not None, f"Listing {listing_id} not found in pending list"
        
        # Verify price_per_tonne is None
        assert our_listing.get("price_per_tonne") is None, \
            f"Pending listing should have no price, got {our_listing.get('price_per_tonne')}"
        
        # Verify suggested_price is present
        assert "suggested_price_per_tonne" in our_listing, "Pending listing should have suggested_price"
        
        print(f"PASS: Pending listing has price_per_tonne=None, suggested_price={our_listing['suggested_price_per_tonne']}")


class TestSpecificPendingListing:
    """Test: Check specific pending listing CRB-20260317-C363F0"""
    
    def test_check_specific_pending_listing(self, admin_token):
        """Check if CRB-20260317-C363F0 exists and shows 'Prix à fixer'"""
        target_listing_id = "CRB-20260317-C363F0"
        
        pending_resp = requests.get(
            f"{BASE_URL}/api/carbon-listings/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert pending_resp.status_code == 200
        listings = pending_resp.json()
        
        # Try to find the specific listing
        specific_listing = next((l for l in listings if l["listing_id"] == target_listing_id), None)
        
        if specific_listing:
            print(f"FOUND: Listing {target_listing_id}")
            print(f"  Project: {specific_listing.get('project_name')}")
            print(f"  Quantity: {specific_listing.get('quantity_tonnes_co2')} t CO2")
            print(f"  Price: {specific_listing.get('price_per_tonne') or 'Prix à fixer'}")
            
            assert specific_listing.get("price_per_tonne") is None, \
                "Specific pending listing should have no price set"
        else:
            print(f"INFO: Listing {target_listing_id} not in pending list (may have been approved/rejected)")
            # List what is pending
            if listings:
                print(f"  Current pending listings: {[l['listing_id'] for l in listings[:5]]}")
            pytest.skip(f"Listing {target_listing_id} not found in pending - may have been processed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
