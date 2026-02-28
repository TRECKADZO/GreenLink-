"""
Test PDF Report Generation for GreenLink Cooperative
- EUDR Compliance PDF Report
- Carbon Credits PDF Report
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Cooperative test credentials
COOP_CREDENTIALS = {
    "identifier": "coop-test@greenlink.ci",
    "password": "coop123"
}


@pytest.fixture(scope="module")
def api_client():
    """Create a requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def coop_token(api_client):
    """Get cooperative authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
    print(f"Login response status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"Login successful, token obtained: {token[:20]}..." if token else "No token returned")
        return token
    print(f"Login failed: {response.text}")
    pytest.skip("Cooperative authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, coop_token):
    """Session with cooperative auth header"""
    api_client.headers.update({"Authorization": f"Bearer {coop_token}"})
    return api_client


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_backend_health(self, api_client):
        """Test backend is running"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("Backend health check: PASS")


class TestCooperativeAuth:
    """Test cooperative authentication"""
    
    def test_login_returns_access_token(self, api_client):
        """Test login returns access_token (not 'token')"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"Response missing 'access_token': {data.keys()}"
        assert data.get("user", {}).get("user_type") == "cooperative", "User type should be cooperative"
        print(f"Login test: PASS - User type: {data.get('user', {}).get('user_type')}")


class TestEUDRPDFEndpoint:
    """Test EUDR PDF generation endpoint"""
    
    def test_eudr_pdf_requires_auth(self, api_client):
        """Test EUDR PDF endpoint requires authentication"""
        # Reset headers to remove auth
        client = requests.Session()
        response = client.get(f"{BASE_URL}/api/cooperative/reports/eudr/pdf")
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got: {response.status_code}"
        print("EUDR PDF auth check: PASS - Returns 401/403 without auth")
    
    def test_eudr_pdf_returns_valid_pdf(self, authenticated_client):
        """Test EUDR PDF endpoint returns valid PDF"""
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/reports/eudr/pdf")
        
        # Check status
        assert response.status_code == 200, f"EUDR PDF request failed: {response.status_code} - {response.text}"
        
        # Check content type
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Check content starts with PDF magic bytes
        pdf_content = response.content
        assert pdf_content[:4] == b'%PDF', f"Response does not start with PDF header: {pdf_content[:20]}"
        
        # Check content has reasonable size (PDF should be at least 1KB)
        assert len(pdf_content) > 1000, f"PDF content too small: {len(pdf_content)} bytes"
        
        # Check Content-Disposition header
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp, f"Missing attachment disposition: {content_disp}"
        assert 'rapport_eudr' in content_disp, f"Missing rapport_eudr in filename: {content_disp}"
        
        print(f"EUDR PDF generation: PASS - Size: {len(pdf_content)} bytes")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disp}")


class TestCarbonPDFEndpoint:
    """Test Carbon Credits PDF generation endpoint"""
    
    def test_carbon_pdf_requires_auth(self, api_client):
        """Test Carbon PDF endpoint requires authentication"""
        client = requests.Session()
        response = client.get(f"{BASE_URL}/api/cooperative/reports/carbon/pdf")
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got: {response.status_code}"
        print("Carbon PDF auth check: PASS - Returns 401/403 without auth")
    
    def test_carbon_pdf_returns_valid_pdf(self, authenticated_client):
        """Test Carbon PDF endpoint returns valid PDF"""
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/reports/carbon/pdf")
        
        # Check status
        assert response.status_code == 200, f"Carbon PDF request failed: {response.status_code} - {response.text}"
        
        # Check content type
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Check content starts with PDF magic bytes
        pdf_content = response.content
        assert pdf_content[:4] == b'%PDF', f"Response does not start with PDF header: {pdf_content[:20]}"
        
        # Check content has reasonable size
        assert len(pdf_content) > 1000, f"PDF content too small: {len(pdf_content)} bytes"
        
        # Check Content-Disposition header
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp, f"Missing attachment disposition: {content_disp}"
        assert 'rapport_carbone' in content_disp, f"Missing rapport_carbone in filename: {content_disp}"
        
        print(f"Carbon PDF generation: PASS - Size: {len(pdf_content)} bytes")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disp}")


class TestEUDRJsonEndpoint:
    """Test EUDR JSON data endpoint"""
    
    def test_eudr_report_returns_data(self, authenticated_client):
        """Test EUDR JSON report returns valid data"""
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/reports/eudr")
        
        assert response.status_code == 200, f"EUDR report failed: {response.status_code}"
        
        data = response.json()
        
        # Check structure
        assert "cooperative" in data, "Missing cooperative info"
        assert "compliance" in data, "Missing compliance info"
        assert "statistics" in data, "Missing statistics"
        
        # Check cooperative info
        coop = data.get("cooperative", {})
        assert "name" in coop, "Missing coop name"
        assert "code" in coop, "Missing coop code"
        
        # Check compliance data
        compliance = data.get("compliance", {})
        assert "compliance_rate" in compliance, "Missing compliance_rate"
        assert "geolocation_rate" in compliance, "Missing geolocation_rate"
        
        # Check statistics
        stats = data.get("statistics", {})
        assert "total_members" in stats, "Missing total_members"
        assert "total_hectares" in stats, "Missing total_hectares"
        
        print(f"EUDR JSON report: PASS")
        print(f"  Cooperative: {coop.get('name')} ({coop.get('code')})")
        print(f"  Compliance rate: {compliance.get('compliance_rate')}%")
        print(f"  Members: {stats.get('total_members')}, Hectares: {stats.get('total_hectares')}")


class TestVillageStats:
    """Test village statistics endpoint"""
    
    def test_village_stats(self, authenticated_client):
        """Test village statistics returns data"""
        response = authenticated_client.get(f"{BASE_URL}/api/cooperative/stats/villages")
        
        assert response.status_code == 200, f"Village stats failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Village stats should return a list"
        
        if len(data) > 0:
            village = data[0]
            assert "village" in village, "Missing village name"
            assert "members_count" in village, "Missing members_count"
            print(f"Village stats: PASS - {len(data)} villages found")
            print(f"  First village: {village.get('village')} - {village.get('members_count')} members")
        else:
            print("Village stats: PASS - No villages (empty list)")
