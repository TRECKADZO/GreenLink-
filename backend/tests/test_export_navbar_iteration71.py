from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 71 - Export Members (XLSX/PDF) and Navbar coop_name Display Tests
Iteration 71 - Export Members (XLSX/PDF) and Navbar coop_name Display Tests
Tests:
Tests:
1. GET /api/cooperative/members/export?format=xlsx - returns valid Excel file
1. GET /api/cooperative/members/export?format=xlsx - returns valid Excel file
2. GET /api/cooperative/members/export?format=pdf - returns valid PDF file
2. GET /api/cooperative/members/export?format=pdf - returns valid PDF file
3. Export with status filter
3. Export with status filter
4. Export with search filter
4. Export with search filter
5. Navbar shows coop_name for cooperative users
5. Navbar shows coop_name for cooperative users
"""
"""

import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
# COOP_EMAIL imported from test_config
COOP_PASSWORD = COOP_PASSWORD  # from test_config
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def coop_token(api_client):
    """Get cooperative authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Cooperative authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def coop_user_data(api_client):
    """Get cooperative user data to verify coop_name"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("user", {})
    return {}


@pytest.fixture(scope="module")
def authenticated_coop_client(api_client, coop_token):
    """Session with cooperative auth header"""
    api_client.headers.update({"Authorization": f"Bearer {coop_token}"})
    return api_client


class TestExportXLSX:
    """Test Excel export functionality"""
    
    def test_export_xlsx_returns_valid_file(self, authenticated_coop_client):
        """Test that XLSX export returns a valid Excel file"""
        response = authenticated_coop_client.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "xlsx"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "application/vnd.openxmlformats" in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Check Content-Disposition header for filename
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, f"Expected attachment disposition, got: {content_disp}"
        assert ".xlsx" in content_disp, f"Expected .xlsx in filename, got: {content_disp}"
        
        # Check file magic bytes (PK for ZIP/XLSX)
        content = response.content
        assert len(content) > 0, "File content is empty"
        assert content[:2] == b'PK', f"Expected PK (ZIP) magic bytes for XLSX, got: {content[:4]}"
        
        print(f"XLSX export successful: {len(content)} bytes, Content-Disposition: {content_disp}")
    
    def test_export_xlsx_with_status_filter(self, authenticated_coop_client):
        """Test XLSX export with status filter"""
        response = authenticated_coop_client.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "xlsx", "status": "active"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.content[:2] == b'PK', "Expected valid XLSX file"
        print(f"XLSX export with status=active: {len(response.content)} bytes")
    
    def test_export_xlsx_with_search_filter(self, authenticated_coop_client):
        """Test XLSX export with search filter"""
        response = authenticated_coop_client.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "xlsx", "search": "Test"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.content[:2] == b'PK', "Expected valid XLSX file"
        print(f"XLSX export with search=Test: {len(response.content)} bytes")


class TestExportPDF:
    """Test PDF export functionality"""
    
    def test_export_pdf_returns_valid_file(self, authenticated_coop_client):
        """Test that PDF export returns a valid PDF file"""
        response = authenticated_coop_client.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "pdf"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "pdf" in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Check Content-Disposition header for filename
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, f"Expected attachment disposition, got: {content_disp}"
        assert ".pdf" in content_disp, f"Expected .pdf in filename, got: {content_disp}"
        
        # Check file magic bytes (%PDF)
        content = response.content
        assert len(content) > 0, "File content is empty"
        assert content[:4] == b'%PDF', f"Expected %PDF magic bytes, got: {content[:4]}"
        
        print(f"PDF export successful: {len(content)} bytes, Content-Disposition: {content_disp}")
    
    def test_export_pdf_with_status_filter(self, authenticated_coop_client):
        """Test PDF export with status filter"""
        response = authenticated_coop_client.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "pdf", "status": "pending_validation"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.content[:4] == b'%PDF', "Expected valid PDF file"
        print(f"PDF export with status=pending_validation: {len(response.content)} bytes")
    
    def test_export_pdf_with_search_filter(self, authenticated_coop_client):
        """Test PDF export with search filter"""
        response = authenticated_coop_client.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "pdf", "search": "Kouassi"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.content[:4] == b'%PDF', "Expected valid PDF file"
        print(f"PDF export with search=Kouassi: {len(response.content)} bytes")


class TestExportValidation:
    """Test export validation and error handling"""
    
    def test_export_invalid_format_rejected(self, authenticated_coop_client):
        """Test that invalid format is rejected"""
        response = authenticated_coop_client.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "csv"}  # Invalid format
        )
        
        # Should return 422 (validation error) for invalid format
        assert response.status_code == 422, f"Expected 422 for invalid format, got {response.status_code}"
        print(f"Invalid format correctly rejected with 422")
    
    def test_export_requires_authentication(self, api_client):
        """Test that export requires authentication"""
        # Create a new session without auth
        unauthenticated = requests.Session()
        response = unauthenticated.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "xlsx"}
        )
        
        # API returns 401 or 403 for unauthenticated requests
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got {response.status_code}"
        print(f"Unauthenticated export correctly rejected with {response.status_code}")


class TestNavbarCoopName:
    """Test that cooperative users have coop_name in their user data"""
    
    def test_coop_user_has_coop_name(self, coop_user_data):
        """Test that cooperative user data includes coop_name"""
        assert "coop_name" in coop_user_data or "full_name" in coop_user_data, \
            f"User data should have coop_name or full_name: {coop_user_data.keys()}"
        
        coop_name = coop_user_data.get("coop_name")
        full_name = coop_user_data.get("full_name")
        user_type = coop_user_data.get("user_type")
        
        print(f"User type: {user_type}")
        print(f"coop_name: {coop_name}")
        print(f"full_name: {full_name}")
        
        # For cooperative users, coop_name should be present
        if user_type == "cooperative":
            assert coop_name is not None, "Cooperative user should have coop_name"
            print(f"Cooperative user has coop_name: '{coop_name}'")
    
    def test_coop_user_type_is_cooperative(self, coop_user_data):
        """Test that the test user is a cooperative"""
        user_type = coop_user_data.get("user_type")
        assert user_type == "cooperative", f"Expected user_type 'cooperative', got '{user_type}'"
        print(f"User type confirmed: {user_type}")


class TestExportRouteOrdering:
    """Test that export route is accessible (not shadowed by member_id route)"""
    
    def test_export_route_not_shadowed(self, authenticated_coop_client):
        """Test that /members/export is not interpreted as /members/{member_id}"""
        # If route ordering is wrong, 'export' would be treated as a member_id
        # and would return 404 (member not found) or 400 (invalid ObjectId)
        response = authenticated_coop_client.get(
            f"{BASE_URL}/api/cooperative/members/export",
            params={"format": "xlsx"}
        )
        
        # Should NOT be 404 or 400 (which would indicate route shadowing)
        assert response.status_code == 200, \
            f"Export route may be shadowed by member_id route. Got {response.status_code}: {response.text}"
        print("Export route correctly placed before member_id route")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
