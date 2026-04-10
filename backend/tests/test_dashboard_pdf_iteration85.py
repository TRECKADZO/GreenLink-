from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test Dashboard PDF Export - Iteration 85
Test Dashboard PDF Export - Iteration 85
Tests the PDF export endpoint for cooperative dashboard reports
Tests the PDF export endpoint for cooperative dashboard reports
"""
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardPDFExport:
    """Tests for GET /api/cooperative/pdf/dashboard-report"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for cooperative/admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in login response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with authorization"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_pdf_endpoint_returns_200(self, auth_headers):
        """Test that PDF endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
    
    def test_pdf_content_type(self, auth_headers):
        """Test that response has correct Content-Type"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected application/pdf, got {content_type}"
    
    def test_pdf_has_content_disposition(self, auth_headers):
        """Test that response has Content-Disposition header for download"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp, f"Expected attachment in Content-Disposition, got {content_disp}"
        assert '.pdf' in content_disp, f"Expected .pdf in filename, got {content_disp}"
    
    def test_pdf_file_size_reasonable(self, auth_headers):
        """Test that PDF file size is reasonable (> 1KB, < 10MB)"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        file_size = len(response.content)
        assert file_size > 1000, f"PDF too small: {file_size} bytes"
        assert file_size < 10 * 1024 * 1024, f"PDF too large: {file_size} bytes"
    
    def test_pdf_valid_header(self, auth_headers):
        """Test that PDF starts with %PDF magic bytes"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF', f"Invalid PDF header: {response.content[:10]}"
    
    def test_pdf_requires_auth(self):
        """Test that PDF endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/cooperative/pdf/dashboard-report")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_pdf_contains_indicateurs_cles(self, auth_headers):
        """Test that PDF contains 'Indicateurs Cles' section"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        assert "Indicateurs Cles" in full_text, "Missing 'Indicateurs Cles' section"
    
    def test_pdf_contains_8_kpis(self, auth_headers):
        """Test that PDF contains all 8 KPI labels"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        kpis = ["Membres", "Superficie", "REDD+", "Score", "SSRTE", "Enfants", "Couverture", "ICI"]
        for kpi in kpis:
            assert kpi in full_text, f"Missing KPI: {kpi}"
    
    def test_pdf_contains_redd_levels(self, auth_headers):
        """Test that PDF contains REDD+ level distribution"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        levels = ["Excellence", "Avance", "Intermediaire", "Debutant", "Non conforme"]
        for level in levels:
            assert level in full_text, f"Missing REDD+ level: {level}"
    
    def test_pdf_contains_risk_grid(self, auth_headers):
        """Test that PDF contains SSRTE risk grid"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        risk_levels = ["Critique", "Eleve", "Modere", "Faible"]
        for risk in risk_levels:
            assert risk in full_text, f"Missing risk level: {risk}"
    
    def test_pdf_contains_risque_par_zone(self, auth_headers):
        """Test that PDF contains 'Risque par Zone' section"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        assert "Risque par Zone" in full_text, "Missing 'Risque par Zone' section"
    
    def test_pdf_no_inconnu_zones(self, auth_headers):
        """Test that PDF does not contain 'Inconnu' placeholder for zones"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        # 'Inconnu' should not appear as a zone name
        assert "Inconnu" not in full_text, "Found 'Inconnu' placeholder - zones should have real names"
    
    def test_pdf_contains_tendances_mensuelles(self, auth_headers):
        """Test that PDF contains 'Tendances Mensuelles' section with 6 months"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        assert "Tendances Mensuelles" in full_text, "Missing 'Tendances Mensuelles' section"
        # Check for at least some month abbreviations
        months_found = sum(1 for m in ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] if m in full_text)
        assert months_found >= 6, f"Expected at least 6 months in trends, found {months_found}"
    
    def test_pdf_contains_practices_adoption(self, auth_headers):
        """Test that PDF contains practices adoption section"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        practices = ["Agroforesterie", "Compostage", "Couverture sol", "Zero brulage"]
        for practice in practices:
            assert practice in full_text, f"Missing practice: {practice}"
    
    def test_pdf_contains_ici_remediation(self, auth_headers):
        """Test that PDF contains ICI remediation table"""
        try:
            import PyPDF2
        except ImportError:
            pytest.skip("PyPDF2 not installed")
        
        response = requests.get(
            f"{BASE_URL}/api/cooperative/pdf/dashboard-report",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reader = PyPDF2.PdfReader(io.BytesIO(response.content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text()
        
        # Check for ICI remediation table headers
        assert "Remediation" in full_text or "ICI" in full_text, "Missing ICI remediation section"
        assert "Resolus" in full_text or "En Cours" in full_text, "Missing ICI status columns"
