from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 90 - Cooperative Network Admin Dashboard Tests
Iteration 90 - Cooperative Network Admin Dashboard Tests
Tests for the new admin endpoints in cooperative_referral.py:
Tests for the new admin endpoints in cooperative_referral.py:
- GET /api/cooperative-referral/admin/network-full
- GET /api/cooperative-referral/admin/network-full
- POST /api/cooperative-referral/admin/generate-code/{coop_id}
- POST /api/cooperative-referral/admin/generate-code/{coop_id}
- DELETE /api/cooperative-referral/admin/remove-affiliation/{coop_id}
- DELETE /api/cooperative-referral/admin/remove-affiliation/{coop_id}
"""
"""

import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config
COOP_EMAIL = "sponsor-coop-e2e@test.ci"
# COOP_PASSWORD imported from test_config


class TestCooperativeNetworkAdmin:
    """Tests for admin cooperative network endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Cooperative login failed: {response.text}")
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def coop_headers(self, coop_token):
        """Headers with coop auth"""
        return {"Authorization": f"Bearer {coop_token}"}
    
    # ============================================
    # GET /api/cooperative-referral/admin/network-full
    # ============================================
    
    def test_admin_network_full_returns_200(self, admin_headers):
        """Admin should be able to access network-full endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/cooperative-referral/admin/network-full returns 200 for admin")
    
    def test_admin_network_full_returns_stats(self, admin_headers):
        """Network-full should return stats object with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check stats object exists
        assert "stats" in data, "Response missing 'stats' field"
        stats = data["stats"]
        
        # Check required stats fields
        required_stats = [
            "total_cooperatives",
            "affiliated_cooperatives",
            "orphan_cooperatives",
            "active_sponsors",
            "affiliation_rate",
            "total_members_in_network",
            "cooperatives_with_code",
            "code_coverage_rate"
        ]
        for field in required_stats:
            assert field in stats, f"Stats missing '{field}' field"
        
        print(f"PASS: Stats returned with all required fields: {list(stats.keys())}")
        print(f"  - Total cooperatives: {stats['total_cooperatives']}")
        print(f"  - Affiliated: {stats['affiliated_cooperatives']}")
        print(f"  - Active sponsors: {stats['active_sponsors']}")
    
    def test_admin_network_full_returns_nodes(self, admin_headers):
        """Network-full should return nodes array"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "nodes" in data, "Response missing 'nodes' field"
        assert isinstance(data["nodes"], list), "nodes should be a list"
        
        if len(data["nodes"]) > 0:
            node = data["nodes"][0]
            # Check node structure
            expected_fields = ["id", "coop_name", "referral_code", "region", "is_sponsor", "is_affiliated"]
            for field in expected_fields:
                assert field in node, f"Node missing '{field}' field"
        
        print(f"PASS: Nodes array returned with {len(data['nodes'])} cooperatives")
    
    def test_admin_network_full_returns_edges(self, admin_headers):
        """Network-full should return edges array for sponsor-affiliate relationships"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "edges" in data, "Response missing 'edges' field"
        assert isinstance(data["edges"], list), "edges should be a list"
        
        if len(data["edges"]) > 0:
            edge = data["edges"][0]
            assert "from" in edge, "Edge missing 'from' field"
            assert "to" in edge, "Edge missing 'to' field"
        
        print(f"PASS: Edges array returned with {len(data['edges'])} relationships")
    
    def test_admin_network_full_returns_top_sponsors(self, admin_headers):
        """Network-full should return top_sponsors array"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "top_sponsors" in data, "Response missing 'top_sponsors' field"
        assert isinstance(data["top_sponsors"], list), "top_sponsors should be a list"
        
        if len(data["top_sponsors"]) > 0:
            sponsor = data["top_sponsors"][0]
            assert "coop_name" in sponsor, "Top sponsor missing 'coop_name'"
            assert "affiliates_count" in sponsor, "Top sponsor missing 'affiliates_count'"
        
        print(f"PASS: Top sponsors array returned with {len(data['top_sponsors'])} sponsors")
    
    def test_admin_network_full_returns_recent_affiliations(self, admin_headers):
        """Network-full should return recent_affiliations array"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_affiliations" in data, "Response missing 'recent_affiliations' field"
        assert isinstance(data["recent_affiliations"], list), "recent_affiliations should be a list"
        
        print(f"PASS: Recent affiliations array returned with {len(data['recent_affiliations'])} entries")
    
    def test_admin_network_full_returns_region_distribution(self, admin_headers):
        """Network-full should return region_distribution array"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "region_distribution" in data, "Response missing 'region_distribution' field"
        assert isinstance(data["region_distribution"], list), "region_distribution should be a list"
        
        if len(data["region_distribution"]) > 0:
            region = data["region_distribution"][0]
            assert "region" in region, "Region entry missing 'region' field"
            assert "count" in region, "Region entry missing 'count' field"
        
        print(f"PASS: Region distribution returned with {len(data['region_distribution'])} regions")
    
    def test_admin_network_full_returns_growth_timeline(self, admin_headers):
        """Network-full should return growth_timeline array"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "growth_timeline" in data, "Response missing 'growth_timeline' field"
        assert isinstance(data["growth_timeline"], list), "growth_timeline should be a list"
        
        if len(data["growth_timeline"]) > 0:
            entry = data["growth_timeline"][0]
            assert "month" in entry, "Growth entry missing 'month' field"
            assert "count" in entry, "Growth entry missing 'count' field"
        
        print(f"PASS: Growth timeline returned with {len(data['growth_timeline'])} months")
    
    # ============================================
    # Non-admin access tests (403 Forbidden)
    # ============================================
    
    def test_non_admin_network_full_returns_403(self, coop_headers):
        """Non-admin users should get 403 on admin/network-full"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative-referral/admin/network-full",
            headers=coop_headers
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("PASS: Non-admin user gets 403 on GET /api/cooperative-referral/admin/network-full")
    
    def test_non_admin_generate_code_returns_403(self, coop_headers):
        """Non-admin users should get 403 on admin/generate-code"""
        response = requests.post(
            f"{BASE_URL}/api/cooperative-referral/admin/generate-code/test-id",
            headers=coop_headers
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("PASS: Non-admin user gets 403 on POST /api/cooperative-referral/admin/generate-code")
    
    def test_non_admin_remove_affiliation_returns_403(self, coop_headers):
        """Non-admin users should get 403 on admin/remove-affiliation"""
        response = requests.delete(
            f"{BASE_URL}/api/cooperative-referral/admin/remove-affiliation/test-id",
            headers=coop_headers
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("PASS: Non-admin user gets 403 on DELETE /api/cooperative-referral/admin/remove-affiliation")
    
    def test_unauthenticated_network_full_returns_401(self):
        """Unauthenticated requests should get 401"""
        response = requests.get(f"{BASE_URL}/api/cooperative-referral/admin/network-full")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Unauthenticated request gets 401/403 on admin endpoint")
    
    # ============================================
    # POST /api/cooperative-referral/admin/generate-code/{coop_id}
    # ============================================
    
    def test_admin_generate_code_invalid_coop_returns_404(self, admin_headers):
        """Generate code for non-existent coop should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/cooperative-referral/admin/generate-code/invalid-coop-id-12345",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Generate code for invalid coop_id returns 404")
    
    # ============================================
    # DELETE /api/cooperative-referral/admin/remove-affiliation/{coop_id}
    # ============================================
    
    def test_admin_remove_affiliation_invalid_coop_returns_404(self, admin_headers):
        """Remove affiliation for non-existent coop should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/cooperative-referral/admin/remove-affiliation/invalid-coop-id-12345",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Remove affiliation for invalid coop_id returns 404")


class TestCooperativeReferralPageShareMessage:
    """Test that share message includes application URL"""
    
    def test_share_message_includes_url(self):
        """Verify CooperativeReferralPage.jsx includes app URL in share message"""
        # Read the file and check for window.location.origin usage
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "window.location.origin", "/app/frontend/src/pages/cooperative/CooperativeReferralPage.jsx"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, "window.location.origin not found in CooperativeReferralPage.jsx"
        assert "window.location.origin" in result.stdout
        print(f"PASS: Share message includes application URL via window.location.origin")
        print(f"  Found at: {result.stdout.strip()}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
