"""
PWA Feature Tests - Iteration 19
Testing: PWA manifest, service worker accessibility, and agent APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPWAAssets:
    """Test PWA static assets accessibility"""
    
    def test_manifest_accessible(self):
        """Manifest.json should be accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == 'GreenLink - Agent Terrain'
        assert data['short_name'] == 'GreenLink'
        assert data['start_url'] == '/agent/terrain'
        assert data['display'] == 'standalone'
        assert len(data['icons']) >= 2
        print(f"✓ Manifest accessible with correct PWA config")
    
    def test_service_worker_accessible(self):
        """Service worker JS should be accessible"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        assert response.status_code == 200
        assert 'CACHE_NAME' in response.text
        assert 'greenlink-agent-v1' in response.text
        assert "self.addEventListener('install'" in response.text
        assert "self.addEventListener('fetch'" in response.text
        print(f"✓ Service worker accessible with caching logic")
    
    def test_pwa_icon_192_accessible(self):
        """192x192 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icon-192.png")
        assert response.status_code == 200
        assert 'image/png' in response.headers.get('content-type', '')
        print(f"✓ Icon 192x192 accessible")
    
    def test_pwa_icon_512_accessible(self):
        """512x512 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icon-512.png")
        assert response.status_code == 200
        assert 'image/png' in response.headers.get('content-type', '')
        print(f"✓ Icon 512x512 accessible")


class TestAgentAPIs:
    """Test Agent Terrain APIs still functional"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for cooperative user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "coop-gagnoa@greenlink.ci",
            "password": "password"
        })
        assert response.status_code == 200
        return response.json()['access_token']
    
    def test_agent_search_requires_auth(self):
        """Agent search API should require authentication"""
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=0701234567")
        assert response.status_code in [401, 403]
        print(f"✓ Agent search requires auth (status: {response.status_code})")
    
    def test_agent_search_with_auth(self, auth_token):
        """Agent search API should work with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=0701234567", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # API returns 'farmer' (singular) when found, 'found: True/False'
        assert data.get('found') == True or 'farmer' in data or 'farmers' in data
        print(f"✓ Agent search returns farmer data (found: {data.get('found', 'N/A')})")
    
    def test_agent_sync_status(self, auth_token):
        """Sync status endpoint should work"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/sync/status", headers=headers)
        assert response.status_code == 200
        print(f"✓ Sync status accessible")
    
    def test_agent_sync_download(self, auth_token):
        """Sync download should return farmers for zone"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/agent/sync/download", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert 'farmers' in data
        print(f"✓ Sync download returns farmers (count: {len(data['farmers'])})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
