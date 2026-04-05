"""
Iteration 99 - Critical Bug Fix Test: Farmer Registration by Agent
Tests that when an agent registers a farmer (online or offline), the farmer is:
1. Created in ussd_registrations
2. Created in coop_members
3. Added to the agent's assigned_farmers list
4. Visible in the agent's my-farmers endpoint
"""

import pytest
import requests
import os
import random
import string
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_AGENT_EMAIL = "testagent@test.ci"
TEST_AGENT_PASSWORD = "test123456"
TEST_AGENT_ID = "69d26d0a74d244372789cc81"


def generate_unique_phone():
    """Generate a unique phone number for testing"""
    return f"07{random.randint(10000000, 99999999)}"


def generate_unique_name():
    """Generate a unique name for testing"""
    suffix = ''.join(random.choices(string.ascii_uppercase, k=4))
    return f"TEST_Planteur_{suffix}"


@pytest.fixture(scope="module")
def agent_token():
    """Login as test agent and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": TEST_AGENT_EMAIL,
        "password": TEST_AGENT_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Agent login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def agent_headers(agent_token):
    """Get headers with agent auth token"""
    return {
        "Authorization": f"Bearer {agent_token}",
        "Content-Type": "application/json"
    }


class TestRegisterWebEndpoint:
    """Test POST /api/ussd/register-web with agent_id"""
    
    def test_register_web_with_agent_id_creates_farmer(self, agent_headers):
        """
        Test that register-web with agent_id:
        1. Creates ussd_registration
        2. Creates coop_member
        3. Returns member_id
        """
        phone = generate_unique_phone()
        name = generate_unique_name()
        
        payload = {
            "nom_complet": name,
            "telephone": phone,
            "village": "TestVillage",
            "pin": "1234",
            "hectares": "2.5",
            "agent_id": TEST_AGENT_ID
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/register-web",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Register-web response: {response.status_code} - {response.text}")
        
        # Should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Expected success=True"
        assert "farmer_id" in data, "Expected farmer_id in response"
        assert "member_id" in data, "Expected member_id in response (coop_member created)"
        assert data.get("nom") == name, f"Expected nom={name}"
        assert data.get("telephone") == phone, f"Expected telephone={phone}"
        
        # Store for later verification
        self.__class__.registered_phone = phone
        self.__class__.registered_name = name
        self.__class__.member_id = data.get("member_id")
        
        print(f"✓ Farmer registered: {name}, member_id: {self.__class__.member_id}")
    
    def test_registered_farmer_appears_in_my_farmers(self, agent_headers):
        """
        Test that the newly registered farmer appears in agent's my-farmers list
        """
        if not hasattr(self.__class__, 'member_id') or not self.__class__.member_id:
            pytest.skip("No member_id from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers=agent_headers
        )
        
        print(f"My-farmers response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        print(f"Total farmers in my-farmers: {len(farmers)}")
        
        # Find the registered farmer by phone or name
        found = False
        for farmer in farmers:
            if farmer.get("phone_number") == self.__class__.registered_phone:
                found = True
                print(f"✓ Found registered farmer in my-farmers: {farmer.get('full_name')}")
                break
            if farmer.get("full_name") == self.__class__.registered_name:
                found = True
                print(f"✓ Found registered farmer in my-farmers by name: {farmer.get('full_name')}")
                break
        
        assert found, f"Registered farmer {self.__class__.registered_name} ({self.__class__.registered_phone}) not found in my-farmers list"
    
    def test_duplicate_phone_returns_409(self, agent_headers):
        """Test that registering with same phone returns 409 conflict"""
        if not hasattr(self.__class__, 'registered_phone'):
            pytest.skip("No registered phone from previous test")
        
        payload = {
            "nom_complet": "Duplicate Test",
            "telephone": self.__class__.registered_phone,
            "village": "TestVillage",
            "pin": "5678",
            "agent_id": TEST_AGENT_ID
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/register-web",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Duplicate registration response: {response.status_code}")
        
        assert response.status_code == 409, f"Expected 409 for duplicate phone, got {response.status_code}"


class TestSyncUploadRegisterFarmer:
    """Test POST /api/agent/sync/upload with register_farmer action"""
    
    def test_sync_upload_register_farmer_creates_coop_member(self, agent_headers):
        """
        Test that sync/upload with register_farmer action:
        1. Creates ussd_registration
        2. Creates coop_member
        3. Adds to agent's assigned_farmers
        """
        phone = generate_unique_phone()
        name = generate_unique_name()
        
        payload = {
            "sync_timestamp": datetime.now(timezone.utc).isoformat(),
            "actions": [
                {
                    "action_type": "register_farmer",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "offline_id": f"offline_{random.randint(10000, 99999)}",
                    "data": {
                        "nom_complet": name,
                        "telephone": phone,
                        "village": "SyncTestVillage",
                        "pin": "4321",
                        "hectares": "3.0"
                    }
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/agent/sync/upload",
            json=payload,
            headers=agent_headers
        )
        
        print(f"Sync upload response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify sync was successful
        assert data.get("synced") >= 1, f"Expected at least 1 synced action, got {data.get('synced')}"
        assert data.get("errors") == 0, f"Expected 0 errors, got {data.get('errors')}"
        
        # Store for later verification
        self.__class__.sync_phone = phone
        self.__class__.sync_name = name
        
        print(f"✓ Farmer synced: {name}, phone: {phone}")
    
    def test_synced_farmer_appears_in_my_farmers(self, agent_headers):
        """
        Test that the synced farmer appears in agent's my-farmers list
        """
        if not hasattr(self.__class__, 'sync_phone'):
            pytest.skip("No sync_phone from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers=agent_headers
        )
        
        print(f"My-farmers response after sync: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        print(f"Total farmers in my-farmers after sync: {len(farmers)}")
        
        # Find the synced farmer by phone or name
        found = False
        for farmer in farmers:
            if farmer.get("phone_number") == self.__class__.sync_phone:
                found = True
                print(f"✓ Found synced farmer in my-farmers: {farmer.get('full_name')}")
                break
            if farmer.get("full_name") == self.__class__.sync_name:
                found = True
                print(f"✓ Found synced farmer in my-farmers by name: {farmer.get('full_name')}")
                break
        
        assert found, f"Synced farmer {self.__class__.sync_name} ({self.__class__.sync_phone}) not found in my-farmers list"


class TestMyFarmersEndpoint:
    """Test GET /api/field-agent/my-farmers endpoint"""
    
    def test_my_farmers_returns_list(self, agent_headers):
        """Test that my-farmers endpoint returns a list of farmers"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers=agent_headers
        )
        
        print(f"My-farmers response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "farmers" in data, "Expected 'farmers' key in response"
        assert "total" in data or isinstance(data.get("farmers"), list), "Expected farmers list"
        
        farmers = data.get("farmers", [])
        print(f"✓ My-farmers returned {len(farmers)} farmers")
        
        # Verify farmer structure if any exist
        if farmers:
            farmer = farmers[0]
            assert "id" in farmer or "_id" in farmer, "Expected farmer to have id"
            assert "full_name" in farmer, "Expected farmer to have full_name"
            print(f"✓ First farmer: {farmer.get('full_name')}")
    
    def test_my_farmers_requires_auth(self):
        """Test that my-farmers endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ my-farmers requires authentication")


class TestAgentCoopAgentsRecord:
    """Test that agent has a coop_agents record with assigned_farmers"""
    
    def test_agent_has_coop_agents_record(self, agent_headers):
        """
        Verify the test agent has a coop_agents record
        This is a prerequisite for the farmer assignment to work
        """
        # We can't directly query the database, but we can verify via my-farmers
        # If my-farmers returns data, the agent has a coop_agents record
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers=agent_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Even if empty, the endpoint should work if agent has coop_agents record
        assert "farmers" in data, "Expected farmers key - agent may not have coop_agents record"
        
        print(f"✓ Agent has coop_agents record, {len(data.get('farmers', []))} assigned farmers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
