from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test ARS 1000 Analytics & Excel Export - Iteration 122
Test ARS 1000 Analytics & Excel Export - Iteration 122
Tests:
Tests:
1. GET /api/admin/analytics/ars1000/stats - Comprehensive ARS 1000 metrics
1. GET /api/admin/analytics/ars1000/stats - Comprehensive ARS 1000 metrics
2. GET /api/admin/analytics/ars1000/export/excel/{pdc_id} - Excel export with 7 sheets
2. GET /api/admin/analytics/ars1000/export/excel/{pdc_id} - Excel export with 7 sheets
"""
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
COOPERATIVE_EMAIL = COOP_EMAIL
COOPERATIVE_PASSWORD = "test123456"
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config


class TestARS1000Analytics:
    """Test ARS 1000 Analytics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, email, password):
        """Helper to get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_01_login_cooperative(self):
        """Test cooperative login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOPERATIVE_EMAIL,
            "password": COOPERATIVE_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Cooperative login successful")
    
    def test_02_ars1000_stats_endpoint(self):
        """Test GET /api/admin/analytics/ars1000/stats returns comprehensive metrics"""
        token = self.get_auth_token(COOPERATIVE_EMAIL, COOPERATIVE_PASSWORD)
        assert token, "Failed to get auth token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/analytics/ars1000/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Stats endpoint failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify PDC section
        assert "pdc" in data, "Missing 'pdc' section in response"
        pdc = data["pdc"]
        assert "total" in pdc, "Missing 'total' in pdc"
        assert "by_status" in pdc, "Missing 'by_status' in pdc"
        assert "conformite_moyenne" in pdc, "Missing 'conformite_moyenne' in pdc"
        assert "distribution" in pdc, "Missing 'distribution' in pdc"
        assert "fiches_completion_pct" in pdc, "Missing 'fiches_completion_pct' in pdc"
        
        # Verify distribution has quality categories
        dist = pdc["distribution"]
        assert "excellent" in dist, "Missing 'excellent' in distribution"
        assert "bon" in dist, "Missing 'bon' in distribution"
        assert "moyen" in dist, "Missing 'moyen' in distribution"
        assert "faible" in dist, "Missing 'faible' in distribution"
        
        # Verify fiches completion has all 7 fiches
        fiches = pdc["fiches_completion_pct"]
        expected_fiches = ["identification", "epargne", "menage_detail", "exploitation", 
                          "cultures", "inventaire_arbres", "arbres_ombrage_resume", 
                          "materiel_detail", "matrice_strategique_detail", "programme_annuel"]
        for fiche in expected_fiches:
            assert fiche in fiches, f"Missing '{fiche}' in fiches_completion_pct"
        
        # Verify recoltes section
        assert "recoltes" in data, "Missing 'recoltes' section"
        recoltes = data["recoltes"]
        assert "total_declarations" in recoltes, "Missing 'total_declarations' in recoltes"
        assert "by_status" in recoltes, "Missing 'by_status' in recoltes"
        assert "grade_distribution" in recoltes, "Missing 'grade_distribution' in recoltes"
        
        # Verify certifications section
        assert "certifications" in data, "Missing 'certifications' section"
        certs = data["certifications"]
        assert "total" in certs, "Missing 'total' in certifications"
        assert "by_level" in certs, "Missing 'by_level' in certifications"
        
        # Verify reclamations section
        assert "reclamations" in data, "Missing 'reclamations' section"
        recl = data["reclamations"]
        assert "total" in recl, "Missing 'total' in reclamations"
        assert "by_status" in recl, "Missing 'by_status' in reclamations"
        
        # Verify agroforesterie section
        assert "agroforesterie" in data, "Missing 'agroforesterie' section"
        agro = data["agroforesterie"]
        assert "total_arbres_inventories" in agro, "Missing 'total_arbres_inventories'"
        assert "total_ombrage" in agro, "Missing 'total_ombrage'"
        
        # Verify top_cooperatives section
        assert "top_cooperatives" in data, "Missing 'top_cooperatives' section"
        
        print(f"✓ ARS 1000 stats endpoint returns all required sections")
        print(f"  - PDC total: {pdc['total']}, conformite_moyenne: {pdc['conformite_moyenne']}%")
        print(f"  - Recoltes: {recoltes['total_declarations']} declarations")
        print(f"  - Certifications: {certs['total']}")
        print(f"  - Reclamations: {recl['total']}")
        print(f"  - Agroforesterie: {agro['total_arbres_inventories']} arbres")
        print(f"  - Top cooperatives: {len(data['top_cooperatives'])} entries")
    
    def test_03_ars1000_stats_unauthorized(self):
        """Test that stats endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics/ars1000/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Stats endpoint correctly requires authentication")
    
    def test_04_get_pdc_for_excel_export(self):
        """Get a PDC ID to test Excel export"""
        token = self.get_auth_token(COOPERATIVE_EMAIL, COOPERATIVE_PASSWORD)
        assert token, "Failed to get auth token"
        
        # Get list of PDCs from cooperative
        response = self.session.get(
            f"{BASE_URL}/api/ars1000/pdc/cooperative/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to get PDCs: {response.text}"
        
        data = response.json()
        pdcs = data.get("pdcs", [])
        
        if len(pdcs) > 0:
            pdc_id = pdcs[0].get("id")
            print(f"✓ Found PDC for Excel export test: {pdc_id}")
            return pdc_id
        else:
            print("⚠ No PDCs found for Excel export test")
            return None
    
    def test_05_excel_export_endpoint(self):
        """Test GET /api/admin/analytics/ars1000/export/excel/{pdc_id}"""
        token = self.get_auth_token(COOPERATIVE_EMAIL, COOPERATIVE_PASSWORD)
        assert token, "Failed to get auth token"
        
        # First get a PDC ID
        response = self.session.get(
            f"{BASE_URL}/api/ars1000/pdc/cooperative/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to get PDCs: {response.text}"
        
        data = response.json()
        pdcs = data.get("pdcs", [])
        
        if len(pdcs) == 0:
            pytest.skip("No PDCs available for Excel export test")
        
        pdc_id = pdcs[0].get("id")
        
        # Test Excel export
        response = self.session.get(
            f"{BASE_URL}/api/admin/analytics/ars1000/export/excel/{pdc_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Excel export failed: {response.status_code} - {response.text}"
        
        # Verify content type is Excel
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Verify content disposition has filename
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Missing attachment in Content-Disposition"
        assert ".xlsx" in content_disp, "Missing .xlsx extension in filename"
        
        # Verify file has content
        assert len(response.content) > 1000, "Excel file seems too small"
        
        print(f"✓ Excel export successful for PDC {pdc_id}")
        print(f"  - Content-Type: {content_type}")
        print(f"  - Content-Disposition: {content_disp}")
        print(f"  - File size: {len(response.content)} bytes")
    
    def test_06_excel_export_invalid_pdc(self):
        """Test Excel export with invalid PDC ID"""
        token = self.get_auth_token(COOPERATIVE_EMAIL, COOPERATIVE_PASSWORD)
        assert token, "Failed to get auth token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/analytics/ars1000/export/excel/invalid_id_12345",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print(f"✓ Excel export correctly rejects invalid PDC ID")
    
    def test_07_excel_export_unauthorized(self):
        """Test that Excel export requires authentication"""
        # Get a valid PDC ID first
        token = self.get_auth_token(COOPERATIVE_EMAIL, COOPERATIVE_PASSWORD)
        response = self.session.get(
            f"{BASE_URL}/api/ars1000/pdc/cooperative/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            pdcs = response.json().get("pdcs", [])
            if pdcs:
                pdc_id = pdcs[0].get("id")
                # Try without auth
                response = self.session.get(
                    f"{BASE_URL}/api/admin/analytics/ars1000/export/excel/{pdc_id}"
                )
                assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
                print(f"✓ Excel export correctly requires authentication")
            else:
                pytest.skip("No PDCs available")
        else:
            pytest.skip("Could not get PDCs")
    
    def test_08_stats_data_types(self):
        """Verify data types in stats response"""
        token = self.get_auth_token(COOPERATIVE_EMAIL, COOPERATIVE_PASSWORD)
        assert token, "Failed to get auth token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/analytics/ars1000/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify numeric types
        assert isinstance(data["pdc"]["total"], int), "pdc.total should be int"
        assert isinstance(data["pdc"]["conformite_moyenne"], (int, float)), "conformite_moyenne should be numeric"
        assert isinstance(data["recoltes"]["total_declarations"], int), "total_declarations should be int"
        assert isinstance(data["certifications"]["total"], int), "certifications.total should be int"
        assert isinstance(data["reclamations"]["total"], int), "reclamations.total should be int"
        
        # Verify dict types
        assert isinstance(data["pdc"]["by_status"], dict), "by_status should be dict"
        assert isinstance(data["pdc"]["distribution"], dict), "distribution should be dict"
        assert isinstance(data["pdc"]["fiches_completion_pct"], dict), "fiches_completion_pct should be dict"
        
        # Verify list type
        assert isinstance(data["top_cooperatives"], list), "top_cooperatives should be list"
        
        print(f"✓ All data types are correct in stats response")
    
    def test_09_admin_login_and_stats(self):
        """Test admin can also access stats"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Admin login failed - may be rate limited")
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/analytics/ars1000/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Admin stats access failed: {response.status_code}"
        print(f"✓ Admin can access ARS 1000 stats")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
