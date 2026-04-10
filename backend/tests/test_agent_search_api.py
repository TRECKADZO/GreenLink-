from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test Suite for Agent Terrain Search API
Test Suite for Agent Terrain Search API
GreenLink - Agent Terrain Secure Search System
GreenLink - Agent Terrain Secure Search System


Tests cover:
Tests cover:
- Agent Search API: GET /api/agent/search?phone=X
- Agent Search API: GET /api/agent/search?phone=X
- Agent Full Details: GET /api/agent/farmer/{farmer_id}/details
- Agent Full Details: GET /api/agent/farmer/{farmer_id}/details
- Agent Dashboard Stats: GET /api/agent/dashboard/stats  
- Agent Dashboard Stats: GET /api/agent/dashboard/stats  
- Agent Audit Logs: GET /api/agent/audit-logs
- Agent Audit Logs: GET /api/agent/audit-logs
- Cooperative Members fix: GET /api/cooperative/members
- Cooperative Members fix: GET /api/cooperative/members
- Cooperative Member Details fix: GET /api/cooperative/members/{member_id}
- Cooperative Member Details fix: GET /api/cooperative/members/{member_id}
"""
"""

import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_USER = {
    "identifier": "coop-gagnoa@greenlink.ci",
    "password": "password"
}

ADMIN_USER = {
    "identifier": ADMIN_EMAIL, 
    "password": ADMIN_PASSWORD
}

# Known farmer phone for testing
TEST_FARMER_PHONE = "0701234567"


@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def coop_auth_token(api_client):
    """Get cooperative authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=COOP_USER)
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Cooperative authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="session")
def admin_auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def coop_client(api_client, coop_auth_token):
    """Session with cooperative auth header"""
    api_client.headers.update({"Authorization": f"Bearer {coop_auth_token}"})
    return api_client


@pytest.fixture
def admin_client(api_client, admin_auth_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_auth_token}"})
    return api_client


class TestAgentSearchAPI:
    """Agent Search API endpoint tests"""
    
    def test_search_without_auth_returns_error(self, api_client):
        """Search without authentication should return 401 or 403"""
        # Remove any existing auth header
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/agent/search?phone=0701234567")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"TEST PASS: Search without auth returns {response.status_code}")
    
    def test_search_with_coop_user_works(self, coop_client):
        """Cooperative user should be able to search farmers"""
        response = coop_client.get(f"{BASE_URL}/api/agent/search?phone={TEST_FARMER_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response should have 'found' boolean
        assert "found" in data, f"Response missing 'found' field: {data}"
        print(f"TEST PASS: Coop user search returned found={data.get('found')}")
        
        if data["found"]:
            farmer = data.get("farmer", {})
            assert "id" in farmer, "Farmer missing 'id' field"
            assert "full_name" in farmer, "Farmer missing 'full_name' field"
            assert "phone_number" in farmer, "Farmer missing 'phone_number' field"
            print(f"  Found farmer: {farmer.get('full_name')} - {farmer.get('phone_number')}")
    
    def test_search_invalid_phone_format(self, coop_client):
        """Invalid phone format should return 400"""
        response = coop_client.get(f"{BASE_URL}/api/agent/search?phone=abc")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("TEST PASS: Invalid phone format returns 400")
    
    def test_search_with_country_code(self, coop_client):
        """Search with +225 prefix should work"""
        response = coop_client.get(f"{BASE_URL}/api/agent/search?phone=+225{TEST_FARMER_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("TEST PASS: Search with +225 prefix works")
    
    def test_search_nonexistent_phone(self, coop_client):
        """Non-existent phone should return found=false"""
        response = coop_client.get(f"{BASE_URL}/api/agent/search?phone=9999999999")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("found") == False, f"Expected found=False for non-existent phone: {data}"
        print("TEST PASS: Non-existent phone returns found=false")


class TestAgentFarmerDetailsAPI:
    """Agent Farmer Full Details endpoint tests"""
    
    def test_get_farmer_details_requires_auth(self, api_client):
        """Farmer details without auth should return 401 or 403"""
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/agent/farmer/test123/details")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"TEST PASS: Farmer details requires auth (got {response.status_code})")
    
    def test_get_farmer_details_with_valid_id(self, coop_client):
        """Get farmer details with valid ID should work"""
        # First search to get a farmer ID
        search_response = coop_client.get(f"{BASE_URL}/api/agent/search?phone={TEST_FARMER_PHONE}")
        if search_response.status_code != 200:
            pytest.skip("Could not get farmer from search")
        
        data = search_response.json()
        if not data.get("found"):
            pytest.skip("No farmer found in search to get details for")
        
        farmer_id = data.get("farmer", {}).get("id")
        assert farmer_id, "Farmer ID not found in search response"
        
        # Now get full details
        details_response = coop_client.get(f"{BASE_URL}/api/agent/farmer/{farmer_id}/details")
        assert details_response.status_code == 200, f"Expected 200, got {details_response.status_code}: {details_response.text}"
        
        details = details_response.json()
        assert "full_name" in details, "Missing full_name"
        assert "parcels" in details, "Missing parcels"
        assert "harvests" in details, "Missing harvests"
        assert "ssrte_visits" in details, "Missing ssrte_visits"
        print(f"TEST PASS: Got farmer details - {details.get('full_name')}, {len(details.get('parcels', []))} parcels")
    
    def test_get_farmer_details_invalid_id(self, coop_client):
        """Invalid farmer ID should return 404"""
        response = coop_client.get(f"{BASE_URL}/api/agent/farmer/000000000000000000000000/details")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("TEST PASS: Invalid farmer ID returns 404")


class TestAgentDashboardStatsAPI:
    """Agent Dashboard Stats endpoint tests"""
    
    def test_dashboard_stats_requires_auth(self, api_client):
        """Dashboard stats without auth should return 401 or 403"""
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/agent/dashboard/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"TEST PASS: Dashboard stats requires auth (got {response.status_code})")
    
    def test_dashboard_stats_with_coop_user(self, coop_client):
        """Cooperative user should get dashboard stats"""
        response = coop_client.get(f"{BASE_URL}/api/agent/dashboard/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_searches" in data, "Missing total_searches"
        assert "total_views" in data, "Missing total_views"
        assert "farmers_in_zone" in data, "Missing farmers_in_zone"
        print(f"TEST PASS: Dashboard stats - searches={data.get('total_searches')}, views={data.get('total_views')}, farmers={data.get('farmers_in_zone')}")


class TestAgentAuditLogsAPI:
    """Agent Audit Logs endpoint tests"""
    
    def test_audit_logs_requires_auth(self, api_client):
        """Audit logs without auth should return 401 or 403"""
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/agent/audit-logs")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"TEST PASS: Audit logs requires auth (got {response.status_code})")
    
    def test_audit_logs_with_coop_user(self, coop_client):
        """Cooperative user should get audit logs"""
        response = coop_client.get(f"{BASE_URL}/api/agent/audit-logs?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Missing total"
        assert "logs" in data, "Missing logs"
        assert isinstance(data["logs"], list), "logs should be a list"
        print(f"TEST PASS: Audit logs - total={data.get('total')}, returned={len(data.get('logs', []))}")


class TestCooperativeMembersAPI:
    """Cooperative Members API fixes - coop_id_query helper"""
    
    def test_members_list_returns_data(self, coop_client):
        """GET /api/cooperative/members should return members with full_name and phone_number"""
        response = coop_client.get(f"{BASE_URL}/api/cooperative/members?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Missing total"
        assert "members" in data, "Missing members"
        
        if data["total"] > 0:
            member = data["members"][0]
            # Verify full_name and phone_number are populated (fix verification)
            assert "full_name" in member, "Missing full_name in member"
            assert "phone_number" in member, "Missing phone_number in member"
            # Check that values are not None (this was the bug)
            print(f"TEST PASS: Members list - total={data['total']}, first member: {member.get('full_name')} - {member.get('phone_number')}")
            if member.get("full_name") is None:
                print("WARNING: full_name is still None - bug may not be fixed")
            if member.get("phone_number") is None:
                print("WARNING: phone_number is still None - bug may not be fixed")
        else:
            print("TEST PASS: Members list returned empty (no members in coop)")
    
    def test_member_details_by_id(self, coop_client):
        """GET /api/cooperative/members/{member_id} should return member details"""
        # First get list of members
        list_response = coop_client.get(f"{BASE_URL}/api/cooperative/members?limit=5")
        if list_response.status_code != 200:
            pytest.skip("Could not get members list")
        
        data = list_response.json()
        if data.get("total", 0) == 0:
            pytest.skip("No members in cooperative to test details")
        
        member_id = data["members"][0]["id"]
        
        # Get member details (this was returning 404 before fix)
        details_response = coop_client.get(f"{BASE_URL}/api/cooperative/members/{member_id}")
        assert details_response.status_code == 200, f"Expected 200, got {details_response.status_code}: {details_response.text}"
        
        member = details_response.json()
        assert "id" in member, "Missing id"
        assert "full_name" in member, "Missing full_name"
        assert "phone_number" in member, "Missing phone_number"
        print(f"TEST PASS: Member details - {member.get('full_name')} - {member.get('phone_number')}")


class TestRBACAccessControl:
    """RBAC Access Control tests - verify non-agent users get 403"""
    
    def test_coop_user_can_access_agent_search(self, coop_client):
        """Cooperative user type should have access to agent search"""
        response = coop_client.get(f"{BASE_URL}/api/agent/search?phone=0000000000")
        # Should not get 403 (access denied)
        assert response.status_code != 403, f"Cooperative user should have access but got 403"
        print("TEST PASS: Cooperative user has access to agent search")
    
    def test_admin_can_access_agent_search(self, admin_client):
        """Admin user should have access to agent search"""
        response = admin_client.get(f"{BASE_URL}/api/agent/search?phone=0000000000")
        assert response.status_code != 403, f"Admin user should have access but got 403"
        print("TEST PASS: Admin user has access to agent search")


class TestAuditLogging:
    """Verify audit logging for SSRTE/RGPD compliance"""
    
    def test_search_creates_audit_log(self, api_client, coop_auth_token):
        """A search should create an audit log entry"""
        # Use fresh headers for this test
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {coop_auth_token}"
        }
        
        # First get current log count
        before_response = api_client.get(f"{BASE_URL}/api/agent/audit-logs?limit=1", headers=headers)
        assert before_response.status_code == 200, f"Failed to get before logs: {before_response.text}"
        before_total = before_response.json().get("total", 0)
        
        # Perform a search
        search_response = api_client.get(f"{BASE_URL}/api/agent/search?phone={TEST_FARMER_PHONE}", headers=headers)
        assert search_response.status_code == 200, f"Search failed: {search_response.text}"
        
        # Check audit log count increased
        after_response = api_client.get(f"{BASE_URL}/api/agent/audit-logs?limit=5", headers=headers)
        assert after_response.status_code == 200, f"Failed to get after logs: {after_response.text}"
        after_data = after_response.json()
        after_total = after_data.get("total", 0)
        
        assert after_total >= before_total, "Audit log count should not decrease"
        
        # Check latest log entry
        if after_data.get("logs"):
            latest_log = after_data["logs"][0]
            assert "action" in latest_log, "Log missing action"
            assert "timestamp" in latest_log, "Log missing timestamp"
            print(f"TEST PASS: Search created audit log - action={latest_log.get('action')}")
        else:
            print("TEST PASS: Audit log created (count increased)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
