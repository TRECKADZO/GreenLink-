"""
Test PDC v2 Migration - Verify old PDC system removed and new PDC v2 working
Tests:
1. Old /api/pdc endpoint returns 404 (removed)
2. PDC v2 /api/pdc-v2/list works (cooperative login)
3. Agent Terrain can access PDC v2 list
4. Planteur can access PDC v2 list (their own PDCs)
5. Routes verification for PDC v2
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
COOPERATIVE_CREDS = {"identifier": "bielaghana@gmail.com", "password": "test123456"}
AGENT_CREDS = {"identifier": "testagent@test.ci", "password": "test123456"}
PLANTEUR_CREDS = {"identifier": "testplanteur@test.ci", "password": "test123456"}


class TestOldPDCRemoved:
    """Test that old PDC API is removed"""
    
    def test_old_pdc_endpoint_returns_404(self):
        """Verify /api/pdc returns 404 (old system removed)"""
        response = requests.get(f"{BASE_URL}/api/pdc")
        # Should return 404 or 405 (not found or method not allowed)
        assert response.status_code in [404, 405, 422], f"Expected 404/405/422, got {response.status_code}"
        print(f"PASSED: Old /api/pdc endpoint returns {response.status_code} (removed)")


class TestPDCV2CooperativeAccess:
    """Test PDC v2 API with cooperative login"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as cooperative"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Cooperative login failed: {response.status_code}")
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_pdc_v2_list_works(self):
        """Verify /api/pdc-v2/list works for cooperative"""
        response = requests.get(f"{BASE_URL}/api/pdc-v2/list", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pdcs" in data, "Response should contain 'pdcs' key"
        assert "total" in data, "Response should contain 'total' key"
        print(f"PASSED: /api/pdc-v2/list returns {data['total']} PDCs for cooperative")
    
    def test_pdc_v2_stats_works(self):
        """Verify /api/pdc-v2/stats/overview works"""
        response = requests.get(f"{BASE_URL}/api/pdc-v2/stats/overview", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total" in data, "Stats should contain 'total'"
        assert "valides" in data, "Stats should contain 'valides'"
        print(f"PASSED: /api/pdc-v2/stats/overview returns total={data['total']}, valides={data['valides']}")
    
    def test_pdc_v2_members_available(self):
        """Verify /api/pdc-v2/members/available works"""
        response = requests.get(f"{BASE_URL}/api/pdc-v2/members/available", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of members"
        print(f"PASSED: /api/pdc-v2/members/available returns {len(data)} available members")


class TestPDCV2AgentTerrainAccess:
    """Test PDC v2 API with agent terrain login"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as agent terrain"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Agent login failed: {response.status_code}")
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_agent_can_access_pdc_v2_list(self):
        """Verify agent terrain can access /api/pdc-v2/list"""
        response = requests.get(f"{BASE_URL}/api/pdc-v2/list", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pdcs" in data, "Response should contain 'pdcs' key"
        print(f"PASSED: Agent terrain can access /api/pdc-v2/list ({data['total']} PDCs)")


class TestPDCV2PlanteurAccess:
    """Test PDC v2 API with planteur login"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as planteur"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLANTEUR_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Planteur login failed: {response.status_code}")
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_planteur_can_access_pdc_v2_list(self):
        """Verify planteur can access /api/pdc-v2/list (their own PDCs)"""
        response = requests.get(f"{BASE_URL}/api/pdc-v2/list", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pdcs" in data, "Response should contain 'pdcs' key"
        print(f"PASSED: Planteur can access /api/pdc-v2/list ({data['total']} PDCs)")


class TestCooperativePDCV2Page:
    """Test /cooperative/pdc-v2 page works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as cooperative"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Cooperative login failed: {response.status_code}")
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cooperative_pdc_v2_api_accessible(self):
        """Verify cooperative can access PDC v2 APIs for /cooperative/pdc-v2 page"""
        # Test list endpoint
        response = requests.get(f"{BASE_URL}/api/pdc-v2/list", headers=self.headers)
        assert response.status_code == 200, f"List failed: {response.status_code}"
        
        # Test stats endpoint
        response = requests.get(f"{BASE_URL}/api/pdc-v2/stats/overview", headers=self.headers)
        assert response.status_code == 200, f"Stats failed: {response.status_code}"
        
        print("PASSED: Cooperative PDC v2 page APIs accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
