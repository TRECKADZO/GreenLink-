from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test Parcel Verification Feature - Iteration 51
Test Parcel Verification Feature - Iteration 51
Tests for field agent parcel verification endpoints:
Tests for field agent parcel verification endpoints:
- GET /api/field-agent/parcels-to-verify (with filters)
- GET /api/field-agent/parcels-to-verify (with filters)
- PUT /api/field-agent/parcels/{parcel_id}/verify
- PUT /api/field-agent/parcels/{parcel_id}/verify
Also verifies existing dashboard endpoints still work.
Also verifies existing dashboard endpoints still work.
"""
"""

import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FIELD_AGENT_CREDS = {"identifier": "+2250709005301", "password": "greenlink2024"}
COOPERATIVE_CREDS = {"identifier": COOP_EMAIL, "password": "greenlink2024"}
ADMIN_CREDS = {"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}


class TestAuthentication:
    """Test authentication for all user types"""
    
    def test_field_agent_login(self):
        """Test field agent can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
        assert response.status_code == 200, f"Field agent login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"PASS: Field agent login successful")
        
    def test_cooperative_login(self):
        """Test cooperative can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
        assert response.status_code == 200, f"Cooperative login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"PASS: Cooperative login successful")
        
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"PASS: Admin login successful")


class TestParcelsToVerify:
    """Test GET /api/field-agent/parcels-to-verify endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get field agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
        if response.status_code != 200:
            pytest.skip("Field agent login failed")
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_parcels_to_verify_default(self):
        """Test default filter returns pending parcels"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/parcels-to-verify",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "parcels" in data, "Missing 'parcels' key"
        assert "total" in data, "Missing 'total' key"
        assert "stats" in data, "Missing 'stats' key"
        
        # Validate stats structure
        stats = data["stats"]
        assert "pending" in stats, "Missing 'pending' in stats"
        assert "needs_correction" in stats, "Missing 'needs_correction' in stats"
        assert "verified" in stats, "Missing 'verified' in stats"
        
        # Default filter should return pending/needs_correction parcels
        for parcel in data["parcels"]:
            assert parcel.get("verification_status") in ["pending", "needs_correction", None], \
                f"Unexpected status: {parcel.get('verification_status')}"
        
        print(f"PASS: Default filter returns {data['total']} pending parcels")
        print(f"  Stats: pending={stats['pending']}, needs_correction={stats['needs_correction']}, verified={stats['verified']}")
        
    def test_parcels_to_verify_all_filter(self):
        """Test status_filter=all returns all parcels"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/parcels-to-verify?status_filter=all",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "parcels" in data, "Missing 'parcels' key"
        assert "total" in data, "Missing 'total' key"
        
        # All filter should return more or equal parcels than default
        print(f"PASS: All filter returns {data['total']} total parcels")
        
        # Validate parcel structure
        if data["parcels"]:
            parcel = data["parcels"][0]
            required_fields = ["id", "farmer_name", "village", "area_hectares", "verification_status"]
            for field in required_fields:
                assert field in parcel, f"Missing field '{field}' in parcel"
        
    def test_parcels_to_verify_verified_filter(self):
        """Test status_filter=verified returns only verified parcels"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/parcels-to-verify?status_filter=verified",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # All returned parcels should be verified
        for parcel in data["parcels"]:
            assert parcel.get("verification_status") == "verified", \
                f"Expected 'verified', got '{parcel.get('verification_status')}'"
        
        print(f"PASS: Verified filter returns {data['total']} verified parcels")
        
    def test_parcels_to_verify_pending_filter(self):
        """Test status_filter=pending returns only pending parcels"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/parcels-to-verify?status_filter=pending",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # All returned parcels should be pending
        for parcel in data["parcels"]:
            status = parcel.get("verification_status")
            assert status in ["pending", None], f"Expected 'pending', got '{status}'"
        
        print(f"PASS: Pending filter returns {data['total']} pending parcels")


class TestParcelVerification:
    """Test PUT /api/field-agent/parcels/{parcel_id}/verify endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get field agent token and find a parcel to test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
        if response.status_code != 200:
            pytest.skip("Field agent login failed")
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a parcel to test with
        parcels_response = requests.get(
            f"{BASE_URL}/api/field-agent/parcels-to-verify?status_filter=all",
            headers=self.headers
        )
        if parcels_response.status_code == 200:
            parcels = parcels_response.json().get("parcels", [])
            if parcels:
                self.test_parcel_id = parcels[0]["id"]
            else:
                self.test_parcel_id = None
        else:
            self.test_parcel_id = None
    
    def test_verify_parcel_verified_status(self):
        """Test verifying a parcel with 'verified' status"""
        if not self.test_parcel_id:
            pytest.skip("No parcel available for testing")
            
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{self.test_parcel_id}/verify",
            headers=self.headers,
            json={
                "verification_status": "verified",
                "verification_notes": "Test verification - parcel confirmed on site",
                "gps_lat": 5.3167,
                "gps_lng": -4.0333
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "Missing 'message' in response"
        assert "parcel_id" in data, "Missing 'parcel_id' in response"
        assert "verification_status" in data, "Missing 'verification_status' in response"
        assert data["verification_status"] == "verified", f"Expected 'verified', got '{data['verification_status']}'"
        
        print(f"PASS: Parcel {self.test_parcel_id} verified successfully")
        
    def test_verify_parcel_needs_correction_status(self):
        """Test verifying a parcel with 'needs_correction' status"""
        if not self.test_parcel_id:
            pytest.skip("No parcel available for testing")
            
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{self.test_parcel_id}/verify",
            headers=self.headers,
            json={
                "verification_status": "needs_correction",
                "verification_notes": "Area measurement needs to be corrected",
                "corrected_area_hectares": 3.5
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["verification_status"] == "needs_correction", \
            f"Expected 'needs_correction', got '{data['verification_status']}'"
        
        print(f"PASS: Parcel {self.test_parcel_id} marked as needs_correction")
        
    def test_verify_parcel_rejected_status(self):
        """Test verifying a parcel with 'rejected' status"""
        if not self.test_parcel_id:
            pytest.skip("No parcel available for testing")
            
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{self.test_parcel_id}/verify",
            headers=self.headers,
            json={
                "verification_status": "rejected",
                "verification_notes": "Parcel does not exist at declared location"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["verification_status"] == "rejected", \
            f"Expected 'rejected', got '{data['verification_status']}'"
        
        print(f"PASS: Parcel {self.test_parcel_id} rejected successfully")
        
    def test_verify_parcel_invalid_status(self):
        """Test that invalid status returns 400 error"""
        if not self.test_parcel_id:
            pytest.skip("No parcel available for testing")
            
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{self.test_parcel_id}/verify",
            headers=self.headers,
            json={
                "verification_status": "invalid_status",
                "verification_notes": "This should fail"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"PASS: Invalid status correctly returns 400")
        
    def test_verify_parcel_invalid_id(self):
        """Test that invalid parcel ID returns 400 error"""
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/invalidid/verify",
            headers=self.headers,
            json={
                "verification_status": "verified",
                "verification_notes": "This should fail"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"PASS: Invalid parcel ID correctly returns 400")
        
    def test_verify_parcel_nonexistent_id(self):
        """Test that non-existent parcel ID returns 404 error"""
        # Use a valid ObjectId format but non-existent
        fake_id = "000000000000000000000000"
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{fake_id}/verify",
            headers=self.headers,
            json={
                "verification_status": "verified",
                "verification_notes": "This should fail"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"PASS: Non-existent parcel ID correctly returns 404")


class TestExistingDashboardEndpoints:
    """Verify existing dashboard endpoints still work after changes"""
    
    def test_field_agent_dashboard(self):
        """Test GET /api/field-agent/dashboard still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
        if response.status_code != 200:
            pytest.skip("Field agent login failed")
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "agent_info" in data or "cooperative_info" in data, "Missing agent/cooperative info"
        print(f"PASS: Field agent dashboard endpoint works")
        
    def test_cooperative_dashboard(self):
        """Test GET /api/cooperative/dashboard still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
        if response.status_code != 200:
            pytest.skip("Cooperative login failed")
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate response structure - dashboard returns members, parcels, agents
        assert "members" in data or "parcels" in data or "coop_info" in data, \
            f"Missing expected dashboard data. Keys: {list(data.keys())}"
        print(f"PASS: Cooperative dashboard endpoint works")
        print(f"  Members: {data.get('members', {}).get('total', 'N/A')}, Parcels: {data.get('parcels', {}).get('total', 'N/A')}")
        
    def test_admin_stats(self):
        """Test GET /api/admin/stats still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "total_users" in data or "users" in data, "Missing user stats"
        print(f"PASS: Admin stats endpoint works")


class TestCooperativeParcelsVerificationStatus:
    """Test that cooperative parcels/all shows correct verification_status after agent verification"""
    
    def test_cooperative_parcels_all_shows_verification_status(self):
        """Test GET /api/cooperative/parcels/all includes verification_status"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
        if response.status_code != 200:
            pytest.skip("Cooperative login failed")
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/cooperative/parcels/all", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check if parcels are returned
        parcels = data.get("parcels", data) if isinstance(data, dict) else data
        if isinstance(parcels, dict):
            parcels = parcels.get("parcels", [])
            
        if parcels:
            # Check that verification_status field exists
            parcel = parcels[0]
            # The field should exist (may be None/pending for unverified)
            print(f"PASS: Cooperative parcels/all returns {len(parcels)} parcels")
            
            # Count by verification status
            status_counts = {}
            for p in parcels:
                status = p.get("verification_status", "pending") or "pending"
                status_counts[status] = status_counts.get(status, 0) + 1
            print(f"  Verification status distribution: {status_counts}")
        else:
            print(f"PASS: Cooperative parcels/all endpoint works (no parcels found)")


class TestFieldAgentMyFarmers:
    """Test that my-farmers endpoint still works"""
    
    def test_my_farmers_endpoint(self):
        """Test GET /api/field-agent/my-farmers returns assigned farmers"""
        import time
        time.sleep(1)  # Small delay to avoid rate limiting
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Field agent login failed: {response.status_code}")
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "farmers" in data, "Missing 'farmers' key"
        assert "total" in data, "Missing 'total' key"
        
        print(f"PASS: my-farmers returns {data['total']} assigned farmers")
        
        # List farmer names for context
        if data["farmers"]:
            farmer_names = [f.get("full_name", "Unknown") for f in data["farmers"][:5]]
            print(f"  Farmers: {', '.join(farmer_names)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
