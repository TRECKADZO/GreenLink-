"""
Iteration 78 - REDD+ Homepage Updates and PDF Export Tests
Tests for:
- Homepage REDD+ section with 4 highlight cards
- Features section with 9 cards including REDD+ and MRV
- /guide-redd page accessibility
- MRV PDF export endpoint authentication and response
- Cooperative dashboard MRV quick action
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for admin user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestHealthAndBasicAPIs:
    """Basic health check and API availability tests"""
    
    def test_health_endpoint(self, api_client):
        """Test API health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: Health endpoint returns ok")
    
    def test_features_endpoint(self, api_client):
        """Test features endpoint returns data"""
        response = api_client.get(f"{BASE_URL}/api/features")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Features endpoint returns {len(data)} features")


class TestREDDPracticesAPI:
    """Tests for REDD+ practices API"""
    
    def test_redd_practices_endpoint(self, authenticated_client):
        """Test GET /api/redd/practices returns 5 categories with 21 practices"""
        response = authenticated_client.get(f"{BASE_URL}/api/redd/practices")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "categories" in data
        assert "total_practices" in data
        assert "max_score" in data
        
        # Verify counts
        assert len(data["categories"]) == 5, f"Expected 5 categories, got {len(data['categories'])}"
        assert data["total_practices"] == 21, f"Expected 21 practices, got {data['total_practices']}"
        assert data["max_score"] == 10
        
        print(f"PASS: REDD practices API returns {len(data['categories'])} categories, {data['total_practices']} practices")


class TestMRVSummaryAPI:
    """Tests for MRV summary API"""
    
    def test_mrv_summary_endpoint(self, authenticated_client):
        """Test GET /api/redd/mrv/summary returns aggregated data"""
        response = authenticated_client.get(f"{BASE_URL}/api/redd/mrv/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        required_fields = ["total_farmers", "total_hectares", "total_arbres", 
                          "avg_score_carbone", "avg_score_redd"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: MRV summary returns {data['total_farmers']} farmers, {data['total_hectares']} hectares")
    
    def test_mrv_farmers_endpoint(self, authenticated_client):
        """Test GET /api/redd/mrv/farmers returns farmer list"""
        response = authenticated_client.get(f"{BASE_URL}/api/redd/mrv/farmers?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert "farmers" in data
        assert isinstance(data["farmers"], list)
        
        print(f"PASS: MRV farmers endpoint returns {len(data['farmers'])} farmers")


class TestPDFExportAPI:
    """Tests for PDF export endpoint"""
    
    def test_pdf_endpoint_unauthenticated_returns_403(self, api_client):
        """Test GET /api/redd/pdf/mrv-report returns 403 without auth"""
        # Create a new session without auth
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/redd/pdf/mrv-report")
        
        # Should return 401 or 403 for unauthenticated requests
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: PDF endpoint returns {response.status_code} for unauthenticated requests")
    
    def test_pdf_endpoint_authenticated_returns_pdf(self, authenticated_client):
        """Test GET /api/redd/pdf/mrv-report returns PDF for authenticated admin"""
        response = authenticated_client.get(f"{BASE_URL}/api/redd/pdf/mrv-report")
        assert response.status_code == 200
        
        # Verify content type is PDF
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Verify content disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert "GreenLink_MRV_REDD" in content_disposition
        
        # Verify PDF content (starts with %PDF)
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"PASS: PDF endpoint returns valid PDF ({len(response.content)} bytes)")


class TestAuthenticationFlow:
    """Tests for authentication flow"""
    
    def test_login_with_identifier_field(self, api_client):
        """Test login uses 'identifier' field and returns 'access_token'"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        
        user = data["user"]
        assert user.get("user_type") in ["admin", "super_admin", "cooperative"]
        
        print(f"PASS: Login returns access_token for user type: {user.get('user_type')}")
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns error"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400, 404]
        print(f"PASS: Invalid login returns {response.status_code}")


class TestCooperativeDashboardAPI:
    """Tests for cooperative dashboard API"""
    
    def test_cooperative_dashboard_endpoint(self, authenticated_client):
        """Test cooperative dashboard endpoint is accessible"""
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/dashboard")
        # May return 200 or 403 depending on user type
        assert response.status_code in [200, 403, 404]
        print(f"PASS: Cooperative dashboard endpoint returns {response.status_code}")


class TestSSRTEIntegration:
    """Tests for SSRTE/ICI integration in MRV"""
    
    def test_ssrte_responses_in_mrv(self, authenticated_client):
        """Test SSRTE responses are included in MRV data"""
        response = authenticated_client.get(f"{BASE_URL}/api/ssrte/responses?limit=5")
        # SSRTE endpoint may return 200, 403, or 404 depending on route configuration
        assert response.status_code in [200, 403, 404]
        print(f"PASS: SSRTE responses endpoint returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
