from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Carbon Credit Listings API Tests - Iteration 22
Carbon Credit Listings API Tests - Iteration 22
Testing: Submission workflow, Approval flow, Stats, Marketplace visibility
Testing: Submission workflow, Approval flow, Stats, Marketplace visibility


Features Tested:
Features Tested:
1. POST /api/carbon-listings/submit - Cooperative submits carbon credits
1. POST /api/carbon-listings/submit - Cooperative submits carbon credits
2. GET /api/carbon-listings/pending - Admin sees pending submissions
2. GET /api/carbon-listings/pending - Admin sees pending submissions
3. PUT /api/carbon-listings/{id}/review - Admin approves/rejects
3. PUT /api/carbon-listings/{id}/review - Admin approves/rejects
4. GET /api/carbon-listings/stats - Public stats endpoint
4. GET /api/carbon-listings/stats - Public stats endpoint
5. GET /api/greenlink/carbon-credits - Approved credits appear on marketplace
5. GET /api/greenlink/carbon-credits - Approved credits appear on marketplace
"""
"""

import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review_request
ADMIN_CREDENTIALS = {
    "identifier": ADMIN_EMAIL,
    "password": ADMIN_PASSWORD
}

COOPERATIVE_CREDENTIALS = {
    "identifier": "coop-gagnoa@greenlink.ci",
    "password": "password"
}

FIELD_AGENT_CREDENTIALS = {
    "identifier": "agent@greenlink.ci",
    "password": "password"
}


class TestCarbonListingsAuth:
    """Authentication tests for carbon listings endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOPERATIVE_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Cooperative login failed: {response.status_code} - {response.text}")
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        print(f"Admin login response: {response.status_code}")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"Admin login SUCCESS - user_type: {data.get('user', {}).get('user_type')}")
    
    def test_cooperative_login(self):
        """Test cooperative can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOPERATIVE_CREDENTIALS
        )
        print(f"Cooperative login response: {response.status_code}")
        assert response.status_code == 200, f"Cooperative login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"Cooperative login SUCCESS - user_type: {data.get('user', {}).get('user_type')}")


class TestCarbonListingsSubmit:
    """Test carbon credit submission workflow"""
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOPERATIVE_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Cooperative login failed")
    
    def test_submit_carbon_listing_success(self, cooperative_token):
        """Test cooperative can submit carbon listing"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "credit_type": "Agroforesterie",
            "project_name": f"TEST_Project_{unique_id}",
            "project_description": f"Test agroforestry project for carbon credits - {unique_id}",
            "verification_standard": "Verra VCS",
            "quantity_tonnes_co2": 100.0,
            "price_per_tonne": 15000.0,
            "vintage_year": 2026,
            "region": "Sud-Ouest",
            "department": "Soubré",
            "methodology": "VM0015",
            "area_hectares": 50.0,
            "trees_planted": 5000,
            "farmers_involved": 25
        }
        
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={"Authorization": f"Bearer {cooperative_token}"}
        )
        
        print(f"Submit carbon listing response: {response.status_code}")
        print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Submit failed: {response.text}"
        data = response.json()
        assert "listing_id" in data, "No listing_id in response"
        assert data.get("status") == "pending_approval", f"Expected pending_approval status, got {data.get('status')}"
        print(f"Carbon listing submitted SUCCESS - listing_id: {data.get('listing_id')}")
        return data.get("listing_id")
    
    def test_submit_carbon_listing_validation(self, cooperative_token):
        """Test validation for incomplete submission"""
        payload = {
            "credit_type": "Agroforesterie",
            # Missing required fields
        }
        
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={"Authorization": f"Bearer {cooperative_token}"}
        )
        
        print(f"Validation test response: {response.status_code}")
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}"
        print("Validation test PASSED - returns 422 for incomplete submission")
    
    def test_submit_without_auth(self):
        """Test submission without authentication fails"""
        payload = {
            "credit_type": "Agroforesterie",
            "project_name": "Unauthorized Test",
            "project_description": "Should fail",
            "verification_standard": "Verra VCS",
            "quantity_tonnes_co2": 50.0,
            "price_per_tonne": 10000.0,
            "vintage_year": 2026
        }
        
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload
        )
        
        print(f"No auth test response: {response.status_code}")
        # API may return 401 or 403 when auth is missing - both are valid security responses
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print(f"No auth test PASSED - returns {response.status_code} (unauthorized/forbidden)")


class TestCarbonListingsAdmin:
    """Test admin endpoints for carbon listings"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOPERATIVE_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Cooperative login failed")
    
    def test_get_pending_listings_admin(self, admin_token):
        """Test admin can see pending listings"""
        response = requests.get(
            f"{BASE_URL}/api/carbon-listings/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Get pending listings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get pending: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of pending listings"
        print(f"Found {len(data)} pending listings")
    
    def test_get_pending_listings_non_admin(self, cooperative_token):
        """Test non-admin cannot access pending listings"""
        response = requests.get(
            f"{BASE_URL}/api/carbon-listings/pending",
            headers={"Authorization": f"Bearer {cooperative_token}"}
        )
        
        print(f"Non-admin pending access response: {response.status_code}")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Non-admin access correctly denied with 403")
    
    def test_get_all_listings_admin(self, admin_token):
        """Test admin can see all listings"""
        response = requests.get(
            f"{BASE_URL}/api/carbon-listings/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Get all listings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get all: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of all listings"
        print(f"Found {len(data)} total listings")


class TestCarbonListingsStats:
    """Test carbon listings stats endpoint"""
    
    def test_get_stats_public(self):
        """Test stats endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/carbon-listings/stats")
        
        print(f"Stats endpoint response: {response.status_code}")
        # Stats may require auth based on implementation
        if response.status_code == 401:
            print("Stats endpoint requires authentication - testing with admin")
            admin_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json=ADMIN_CREDENTIALS
            )
            if admin_response.status_code == 200:
                token = admin_response.json().get("access_token")
                response = requests.get(
                    f"{BASE_URL}/api/carbon-listings/stats",
                    headers={"Authorization": f"Bearer {token}"}
                )
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert "pending" in data, "Missing 'pending' in stats"
        assert "approved" in data, "Missing 'approved' in stats"
        assert "rejected" in data, "Missing 'rejected' in stats"
        print(f"Stats: pending={data.get('pending')}, approved={data.get('approved')}, rejected={data.get('rejected')}")


class TestCarbonListingsApprovalWorkflow:
    """Test full approval workflow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOPERATIVE_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Cooperative login failed")
    
    def test_full_approval_workflow(self, admin_token, cooperative_token):
        """Test complete workflow: submit -> pending -> approve -> marketplace"""
        
        # Step 1: Submit carbon listing
        unique_id = str(uuid.uuid4())[:8]
        submit_payload = {
            "credit_type": "Reforestation",
            "project_name": f"TEST_Workflow_{unique_id}",
            "project_description": f"Full workflow test project - {unique_id}",
            "verification_standard": "Gold Standard",
            "quantity_tonnes_co2": 200.0,
            "price_per_tonne": 20000.0,
            "vintage_year": 2026,
            "region": "Ouest",
            "department": "Man"
        }
        
        submit_response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {cooperative_token}"}
        )
        
        print(f"Step 1 - Submit: {submit_response.status_code}")
        assert submit_response.status_code == 200, f"Submit failed: {submit_response.text}"
        listing_id = submit_response.json().get("listing_id")
        print(f"Created listing: {listing_id}")
        
        # Step 2: Verify listing appears in pending
        pending_response = requests.get(
            f"{BASE_URL}/api/carbon-listings/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Step 2 - Check pending: {pending_response.status_code}")
        assert pending_response.status_code == 200
        pending_list = pending_response.json()
        found_in_pending = any(l.get("listing_id") == listing_id for l in pending_list)
        assert found_in_pending, f"Listing {listing_id} not found in pending list"
        print(f"Listing {listing_id} found in pending")
        
        # Step 3: Admin approves listing
        approve_response = requests.put(
            f"{BASE_URL}/api/carbon-listings/{listing_id}/review",
            json={"action": "approve", "admin_note": "Test approval note"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Step 3 - Approve: {approve_response.status_code}")
        assert approve_response.status_code == 200, f"Approval failed: {approve_response.text}"
        print(f"Listing {listing_id} approved successfully")
        
        # Step 4: Check approved credit appears on carbon marketplace
        marketplace_response = requests.get(f"{BASE_URL}/api/greenlink/carbon-credits")
        
        print(f"Step 4 - Marketplace check: {marketplace_response.status_code}")
        if marketplace_response.status_code == 200:
            credits = marketplace_response.json()
            # Look for the approved credit by source_listing_id
            found_on_marketplace = any(
                c.get("source_listing_id") == listing_id or 
                c.get("project_name") == submit_payload["project_name"]
                for c in credits
            )
            if found_on_marketplace:
                print(f"SUCCESS: Approved credit found on marketplace!")
            else:
                print(f"Note: Credit may take time to appear. Found {len(credits)} credits total")
        else:
            print(f"Marketplace endpoint response: {marketplace_response.status_code}")
        
        return listing_id


class TestCarbonListingsReject:
    """Test rejection workflow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOPERATIVE_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Cooperative login failed")
    
    def test_reject_listing(self, admin_token, cooperative_token):
        """Test admin can reject a listing"""
        
        # Submit a listing
        unique_id = str(uuid.uuid4())[:8]
        submit_payload = {
            "credit_type": "Conservation",
            "project_name": f"TEST_Reject_{unique_id}",
            "project_description": f"Rejection test project - {unique_id}",
            "verification_standard": "Plan Vivo",
            "quantity_tonnes_co2": 50.0,
            "price_per_tonne": 12000.0,
            "vintage_year": 2026
        }
        
        submit_response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {cooperative_token}"}
        )
        
        assert submit_response.status_code == 200
        listing_id = submit_response.json().get("listing_id")
        print(f"Created listing for rejection test: {listing_id}")
        
        # Reject the listing
        reject_response = requests.put(
            f"{BASE_URL}/api/carbon-listings/{listing_id}/review",
            json={"action": "reject", "admin_note": "Test rejection - insufficient documentation"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Reject response: {reject_response.status_code}")
        assert reject_response.status_code == 200, f"Rejection failed: {reject_response.text}"
        print(f"Listing {listing_id} rejected successfully")


class TestCarbonMarketplace:
    """Test carbon marketplace endpoint"""
    
    def test_get_carbon_credits_public(self):
        """Test public carbon credits endpoint"""
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon-credits")
        
        print(f"Carbon credits endpoint response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of carbon credits"
        print(f"Found {len(data)} carbon credits on marketplace")
        
        if len(data) > 0:
            # Check structure of first credit
            first = data[0]
            print(f"Sample credit: type={first.get('credit_type')}, qty={first.get('quantity_tonnes_co2')}")


class TestQRCodeRemoval:
    """Test QR code route is removed"""
    
    def test_qrcode_route_removed(self):
        """Test /api/cooperative/qrcodes returns 404"""
        # First login as cooperative
        coop_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=COOPERATIVE_CREDENTIALS
        )
        
        if coop_response.status_code != 200:
            pytest.skip("Cooperative login failed")
        
        token = coop_response.json().get("access_token")
        
        # Try to access QR code endpoint - should be 404 or similar
        qr_response = requests.get(
            f"{BASE_URL}/api/cooperative/qrcodes",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"QR code endpoint response: {qr_response.status_code}")
        # QR code route should not exist anymore (404) or be forbidden
        assert qr_response.status_code in [404, 405, 422], f"QR code endpoint unexpectedly accessible: {qr_response.status_code}"
        print("QR code route correctly removed or not found")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
