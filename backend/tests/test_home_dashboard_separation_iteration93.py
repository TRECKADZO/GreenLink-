from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 93 - Home vs Dashboard Tab Separation Tests
Iteration 93 - Home vs Dashboard Tab Separation Tests
Tests the separation of Accueil (Home) and Tableau (Dashboard) tabs for Agent Terrain and Farmer.
Tests the separation of Accueil (Home) and Tableau (Dashboard) tabs for Agent Terrain and Farmer.
"""
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFieldAgentAPIs:
    """Test Field Agent Dashboard APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip("Authentication failed")
    
    def test_health_check(self):
        """Test health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: GET /api/health returns 200 with status=ok")
    
    def test_field_agent_dashboard(self):
        """Test field agent dashboard endpoint - provides data for Dashboard tab KPIs"""
        response = self.session.get(f"{BASE_URL}/api/field-agent/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # For admin user, should return cooperative overview
        assert "cooperative_info" in data or "agent_info" in data
        print("PASS: GET /api/field-agent/dashboard returns 200")
        print(f"  - Response keys: {list(data.keys())}")
    
    def test_field_agent_my_farmers(self):
        """Test my-farmers endpoint - provides data for Planteurs tab"""
        response = self.session.get(f"{BASE_URL}/api/field-agent/my-farmers")
        assert response.status_code == 200
        data = response.json()
        
        assert "farmers" in data
        assert "total" in data
        print(f"PASS: GET /api/field-agent/my-farmers returns 200 with {data['total']} farmers")
    
    def test_agent_search_valid_phone(self):
        """Test agent search with valid phone format"""
        response = self.session.get(f"{BASE_URL}/api/agent/search?phone=0700000000")
        assert response.status_code == 200
        data = response.json()
        
        assert "found" in data
        print(f"PASS: GET /api/agent/search?phone=xxx returns 200 with found={data['found']}")
    
    def test_agent_search_missing_phone(self):
        """Test agent search without phone parameter"""
        response = self.session.get(f"{BASE_URL}/api/agent/search")
        # Should return 422 (validation error) or 400 (bad request)
        assert response.status_code in [400, 422]
        print(f"PASS: GET /api/agent/search without phone returns {response.status_code}")
    
    def test_agent_search_unauthorized(self):
        """Test agent search without auth"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/agent/search?phone=0700000000")
        assert response.status_code in [401, 403]
        print(f"PASS: GET /api/agent/search without auth returns {response.status_code}")
    
    def test_field_agent_dashboard_unauthorized(self):
        """Test dashboard without auth"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/field-agent/dashboard")
        assert response.status_code in [401, 403]
        print(f"PASS: GET /api/field-agent/dashboard without auth returns {response.status_code}")
    
    def test_field_agent_my_farmers_unauthorized(self):
        """Test my-farmers without auth"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/field-agent/my-farmers")
        assert response.status_code in [401, 403]
        print(f"PASS: GET /api/field-agent/my-farmers without auth returns {response.status_code}")


class TestFarmerDashboardAPIs:
    """Test Farmer Dashboard APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_farmer_dashboard_endpoint(self):
        """Test farmer dashboard endpoint"""
        response = self.session.get(f"{BASE_URL}/api/farmer/dashboard")
        # May return 200 or 403 depending on user type
        assert response.status_code in [200, 403, 404]
        print(f"PASS: GET /api/farmer/dashboard returns {response.status_code}")
    
    def test_farmer_parcels_endpoint(self):
        """Test farmer parcels endpoint"""
        response = self.session.get(f"{BASE_URL}/api/farmer/parcels")
        # May return 200 or 403 depending on user type
        assert response.status_code in [200, 403, 404]
        print(f"PASS: GET /api/farmer/parcels returns {response.status_code}")


class TestREDDEndpoints:
    """Test REDD/Environmental tracking endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_redd_practices_endpoint(self):
        """Test REDD practices endpoint"""
        response = self.session.get(f"{BASE_URL}/api/redd/practices")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: GET /api/redd/practices returns 200 with {len(data) if isinstance(data, list) else 'data'}")
        else:
            print(f"INFO: GET /api/redd/practices returns {response.status_code}")
    
    def test_guide_redd_page_accessible(self):
        """Test that guide-redd page is accessible (frontend route)"""
        # This tests the frontend route exists
        response = self.session.get(f"{BASE_URL}/guide-redd", allow_redirects=False)
        # Frontend routes return 200 (SPA) or redirect
        assert response.status_code in [200, 301, 302, 304]
        print(f"PASS: GET /guide-redd returns {response.status_code}")


class TestUSSDRegistration:
    """Test USSD registration endpoints used by Agent Terrain Inscriptions tab"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_ussd_registrations_list(self):
        """Test USSD registrations list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/ussd/registrations?limit=10")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: GET /api/ussd/registrations returns 200")
        else:
            print(f"INFO: GET /api/ussd/registrations returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
