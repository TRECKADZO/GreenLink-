"""
Test Carbon Premiums Admin Workflow - Iteration 62
Tests the Super Admin carbon premium management flow:
- GET /api/admin/carbon-premiums/stats
- GET /api/admin/carbon-premiums/config
- GET /api/admin/carbon-premiums/requests
- GET /api/admin/carbon-premiums/requests/{id}
- PUT /api/admin/carbon-premiums/requests/{id}/validate
- PUT /api/admin/carbon-premiums/requests/{id}/pay
- POST /api/ussd/callback with text=2*1 (USSD payment request)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from review request
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"

# Test farmer phone for USSD
TEST_FARMER_PHONE = "+2250799999999"


class TestCarbonPremiumsAdminWorkflow:
    """Tests for Carbon Premiums Super Admin workflow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "user_type": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        # Token is in access_token field
        token = data.get("access_token")
        assert token, f"No access_token in response: {data}"
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    # ============= CONFIG ENDPOINT =============
    
    def test_get_carbon_premium_config(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/config returns configuration"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/config", headers=auth_headers)
        assert response.status_code == 200, f"Config endpoint failed: {response.text}"
        
        data = response.json()
        # Verify config fields
        assert "admissibility_threshold" in data, "Missing admissibility_threshold"
        assert "premium_rate_per_score_per_ha" in data, "Missing premium_rate_per_score_per_ha"
        assert "coop_commission_rate" in data, "Missing coop_commission_rate"
        assert "formula" in data, "Missing formula"
        
        # Verify expected values
        assert data["admissibility_threshold"] == 6.0, f"Expected threshold 6.0, got {data['admissibility_threshold']}"
        assert data["premium_rate_per_score_per_ha"] == 5000, f"Expected rate 5000, got {data['premium_rate_per_score_per_ha']}"
        assert data["coop_commission_rate"] == 0.10, f"Expected commission 0.10, got {data['coop_commission_rate']}"
        print(f"Config: threshold={data['admissibility_threshold']}, rate={data['premium_rate_per_score_per_ha']}, commission={data['coop_commission_rate']}")
    
    # ============= STATS ENDPOINT =============
    
    def test_get_carbon_premium_stats(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/stats returns dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        
        data = response.json()
        # Verify required stat fields
        required_fields = [
            "demandes_en_attente",
            "demandes_approuvees", 
            "demandes_payees",
            "demandes_rejetees",
            "total_paye_planteurs",
            "total_paye_cooperatives",
            "total_distribue",
            "parcelles_admissibles",
            "parcelles_non_admissibles"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # All values should be integers or floats >= 0
        for field in required_fields:
            assert isinstance(data[field], (int, float)), f"{field} should be numeric"
            assert data[field] >= 0, f"{field} should be >= 0"
        
        print(f"Stats: pending={data['demandes_en_attente']}, approved={data['demandes_approuvees']}, paid={data['demandes_payees']}, rejected={data['demandes_rejetees']}")
        print(f"Financial: total_distributed={data['total_distribue']}, farmers={data['total_paye_planteurs']}, coops={data['total_paye_cooperatives']}")
    
    # ============= REQUESTS LIST ENDPOINT =============
    
    def test_get_payment_requests_all(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/requests returns all requests"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests", headers=auth_headers)
        assert response.status_code == 200, f"Requests endpoint failed: {response.text}"
        
        data = response.json()
        assert "total" in data, "Missing total field"
        assert "requests" in data, "Missing requests field"
        assert isinstance(data["requests"], list), "requests should be a list"
        
        print(f"Total requests: {data['total']}, returned: {len(data['requests'])}")
        
        # If there are requests, verify structure
        if data["requests"]:
            req = data["requests"][0]
            required_fields = ["id", "farmer_name", "farmer_phone", "status", "farmer_amount", "total_premium"]
            for field in required_fields:
                assert field in req, f"Request missing field: {field}"
            print(f"First request: {req['farmer_name']} - {req['status']} - {req['farmer_amount']} XOF")
    
    def test_get_payment_requests_filtered_by_status(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/requests?status=pending filters correctly"""
        for status in ["pending", "approved", "paid", "rejected"]:
            response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests?status={status}", headers=auth_headers)
            assert response.status_code == 200, f"Filter by {status} failed: {response.text}"
            
            data = response.json()
            # All returned requests should have the filtered status
            for req in data["requests"]:
                assert req["status"] == status, f"Expected status {status}, got {req['status']}"
            
            print(f"Status '{status}': {data['total']} requests")
    
    # ============= REQUEST DETAIL ENDPOINT =============
    
    def test_get_payment_request_detail(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/requests/{id} returns detail"""
        # First get list to find an ID
        list_response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests", headers=auth_headers)
        assert list_response.status_code == 200
        
        data = list_response.json()
        if not data["requests"]:
            pytest.skip("No payment requests exist to test detail endpoint")
        
        request_id = data["requests"][0]["id"]
        
        # Get detail
        detail_response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests/{request_id}", headers=auth_headers)
        assert detail_response.status_code == 200, f"Detail endpoint failed: {detail_response.text}"
        
        detail = detail_response.json()
        required_fields = [
            "id", "farmer_name", "farmer_phone", "farmer_id",
            "parcels", "parcels_count", "total_area_hectares",
            "average_carbon_score", "total_premium", "coop_commission",
            "farmer_amount", "status", "requested_at"
        ]
        for field in required_fields:
            assert field in detail, f"Detail missing field: {field}"
        
        # Verify parcels is a list
        assert isinstance(detail["parcels"], list), "parcels should be a list"
        
        print(f"Request detail: {detail['farmer_name']}, {detail['parcels_count']} parcels, score={detail['average_carbon_score']}, amount={detail['farmer_amount']}")
    
    def test_get_payment_request_detail_not_found(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/requests/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests/000000000000000000000000", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ============= USSD PAYMENT REQUEST =============
    
    def test_ussd_callback_payment_request(self):
        """Test POST /api/ussd/callback with text=2*1 triggers payment request"""
        # This simulates a farmer navigating to menu 2 (carbon premiums) then option 1 (request payment)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": "test_session_carbon_premium_62",
            "serviceCode": "*123*45#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "2*1"
        })
        assert response.status_code == 200, f"USSD callback failed: {response.text}"
        
        data = response.json()
        assert "text" in data, "Missing text in USSD response"
        
        # The response should either be success or an error message
        # Based on context, farmer already has a paid request so should get "deja une demande"
        raw_response = data.get("raw_response", data.get("text", ""))
        print(f"USSD Response: {raw_response[:200]}...")
        
        # Either success or already has request
        assert any(keyword in raw_response.lower() for keyword in [
            "demande enregistree", "deja une demande", "aucune parcelle", "numero non reconnu"
        ]), f"Unexpected USSD response: {raw_response}"
    
    # ============= VALIDATE ENDPOINT =============
    
    def test_validate_request_approve(self, auth_headers):
        """Test PUT /api/admin/carbon-premiums/requests/{id}/validate with action=approve"""
        # Find a pending request
        list_response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests?status=pending", headers=auth_headers)
        assert list_response.status_code == 200
        
        data = list_response.json()
        if not data["requests"]:
            pytest.skip("No pending requests to test approve")
        
        request_id = data["requests"][0]["id"]
        
        # Approve it
        response = requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/requests/{request_id}/validate",
            headers=auth_headers,
            json={"action": "approve"}
        )
        
        # Should succeed or fail if already processed
        if response.status_code == 200:
            result = response.json()
            assert result.get("status") == "approved", f"Expected approved status: {result}"
            print(f"Request {request_id} approved successfully")
        elif response.status_code == 400:
            # Already processed
            print(f"Request {request_id} already processed: {response.json()}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_validate_request_reject_with_reason(self, auth_headers):
        """Test PUT /api/admin/carbon-premiums/requests/{id}/validate with action=reject"""
        # Find a pending request
        list_response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests?status=pending", headers=auth_headers)
        assert list_response.status_code == 200
        
        data = list_response.json()
        if not data["requests"]:
            pytest.skip("No pending requests to test reject")
        
        request_id = data["requests"][0]["id"]
        
        # Reject it with reason
        response = requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/requests/{request_id}/validate",
            headers=auth_headers,
            json={"action": "reject", "rejection_reason": "Test rejection - documents incomplets"}
        )
        
        if response.status_code == 200:
            result = response.json()
            assert result.get("status") == "rejected", f"Expected rejected status: {result}"
            print(f"Request {request_id} rejected successfully")
        elif response.status_code == 400:
            print(f"Request {request_id} already processed: {response.json()}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_validate_request_invalid_action(self, auth_headers):
        """Test PUT /api/admin/carbon-premiums/requests/{id}/validate with invalid action"""
        # Find any request
        list_response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests", headers=auth_headers)
        data = list_response.json()
        
        if not data["requests"]:
            pytest.skip("No requests to test invalid action")
        
        request_id = data["requests"][0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/requests/{request_id}/validate",
            headers=auth_headers,
            json={"action": "invalid_action"}
        )
        
        # Should return 400 for invalid action or 400 for already processed
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    # ============= PAY ENDPOINT =============
    
    def test_pay_request(self, auth_headers):
        """Test PUT /api/admin/carbon-premiums/requests/{id}/pay executes payment"""
        # Find an approved request
        list_response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests?status=approved", headers=auth_headers)
        assert list_response.status_code == 200
        
        data = list_response.json()
        if not data["requests"]:
            pytest.skip("No approved requests to test payment")
        
        request_id = data["requests"][0]["id"]
        
        # Execute payment
        response = requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/requests/{request_id}/pay",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            result = response.json()
            assert result.get("status") == "paid", f"Expected paid status: {result}"
            assert "farmer_payment" in result, "Missing farmer_payment in response"
            assert "transaction_id" in result["farmer_payment"], "Missing transaction_id"
            print(f"Payment executed: {result['farmer_payment']['amount']} XOF, tx={result['farmer_payment']['transaction_id']}")
        elif response.status_code == 400:
            # Not approved or already paid
            print(f"Payment not possible: {response.json()}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_pay_request_not_approved(self, auth_headers):
        """Test PUT /api/admin/carbon-premiums/requests/{id}/pay fails for non-approved"""
        # Find a pending request
        list_response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests?status=pending", headers=auth_headers)
        data = list_response.json()
        
        if not data["requests"]:
            # Try paid requests
            list_response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests?status=paid", headers=auth_headers)
            data = list_response.json()
            if not data["requests"]:
                pytest.skip("No non-approved requests to test")
        
        request_id = data["requests"][0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/requests/{request_id}/pay",
            headers=auth_headers
        )
        
        # Should fail because not approved
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"Correctly rejected payment for non-approved request")
    
    # ============= AUTH TESTS =============
    
    def test_endpoints_require_auth(self):
        """Test that all endpoints require authentication"""
        endpoints = [
            ("GET", "/api/admin/carbon-premiums/stats"),
            ("GET", "/api/admin/carbon-premiums/config"),
            ("GET", "/api/admin/carbon-premiums/requests"),
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}")
            else:
                response = requests.post(f"{BASE_URL}{endpoint}")
            
            assert response.status_code in [401, 403, 422], f"{endpoint} should require auth, got {response.status_code}"
        
        print("All endpoints correctly require authentication")
    
    def test_endpoints_require_admin_role(self):
        """Test that endpoints require admin role (not regular user)"""
        # Login as a farmer (non-admin)
        farmer_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "+2250705551234",
            "password": "koffi2024",
            "user_type": "producteur"
        })
        
        if farmer_login.status_code != 200:
            pytest.skip("Farmer login failed, cannot test role restriction")
        
        farmer_token = farmer_login.json().get("access_token")
        farmer_headers = {"Authorization": f"Bearer {farmer_token}", "Content-Type": "application/json"}
        
        # Try to access admin endpoint
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/stats", headers=farmer_headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("Correctly restricts access to admin role only")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
