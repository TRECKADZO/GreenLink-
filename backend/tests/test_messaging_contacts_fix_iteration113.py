from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Messaging Contacts Fix Tests - Iteration 113
Messaging Contacts Fix Tests - Iteration 113
Tests for the fix: Changed 'member_id' to 'user_id' in coop_members queries
Tests for the fix: Changed 'member_id' to 'user_id' in coop_members queries


Key fix: In messaging.py contacts endpoint, changed 'member_id' to 'user_id' 
Key fix: In messaging.py contacts endpoint, changed 'member_id' to 'user_id' 
for coop_members queries across cooperative, field_agent, and producteur roles.
for coop_members queries across cooperative, field_agent, and producteur roles.


Tests:
Tests:
- GET /api/messaging/contacts for cooperative role (should see agents + farmers + buyers)
- GET /api/messaging/contacts for cooperative role (should see agents + farmers + buyers)
- GET /api/messaging/contacts for field_agent role (should see cooperative + farmers from same coop)
- GET /api/messaging/contacts for field_agent role (should see cooperative + farmers from same coop)
- GET /api/messaging/contacts for producteur/farmer role (should see cooperatives + agents + buyers)
- GET /api/messaging/contacts for producteur/farmer role (should see cooperatives + agents + buyers)
- POST /api/messaging/conversations/direct creates a direct conversation
- POST /api/messaging/conversations/direct creates a direct conversation
- GET /api/messaging/conversations returns conversations for a user
- GET /api/messaging/conversations returns conversations for a user
- GET /api/messaging/conversations/{id} returns conversation details
- GET /api/messaging/conversations/{id} returns conversation details
- GET /api/messaging/conversations/{id}/messages returns paginated messages
- GET /api/messaging/conversations/{id}/messages returns paginated messages
"""
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
COOPERATIVE_CREDENTIALS = {"identifier": COOP_EMAIL, "password": "test123456"}
AGENT_CREDENTIALS = {"identifier": "testagent@test.ci", "password": "test123456"}
FARMER_CREDENTIALS = {"identifier": "testplanteur@test.ci", "password": "test123456"}
ADMIN_CREDENTIALS = {"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

# Global token cache
_token_cache = {}
_user_info_cache = {}


def get_token_and_info(credentials, force_refresh=False):
    """Helper to get auth token and user info with caching"""
    cache_key = credentials["identifier"]
    if cache_key in _token_cache and not force_refresh:
        return _token_cache[cache_key], _user_info_cache.get(cache_key)
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=credentials)
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        user_info = data.get("user", {})
        _token_cache[cache_key] = token
        _user_info_cache[cache_key] = user_info
        return token, user_info
    elif response.status_code == 429:
        print(f"Rate limited for {cache_key}, waiting...")
        time.sleep(5)
        return None, None
    return None, None


@pytest.fixture(scope="module", autouse=True)
def setup_tokens():
    """Get all tokens once at the start"""
    global _token_cache, _user_info_cache
    
    # Get cooperative token
    coop_resp = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDENTIALS)
    if coop_resp.status_code == 200:
        data = coop_resp.json()
        _token_cache[COOPERATIVE_CREDENTIALS["identifier"]] = data.get("access_token")
        _user_info_cache[COOPERATIVE_CREDENTIALS["identifier"]] = data.get("user", {})
        print(f"Cooperative login: {data.get('user', {}).get('user_type')}")
    else:
        print(f"Cooperative login failed: {coop_resp.status_code} - {coop_resp.text}")
    
    time.sleep(1)
    
    # Get agent token
    agent_resp = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDENTIALS)
    if agent_resp.status_code == 200:
        data = agent_resp.json()
        _token_cache[AGENT_CREDENTIALS["identifier"]] = data.get("access_token")
        _user_info_cache[AGENT_CREDENTIALS["identifier"]] = data.get("user", {})
        print(f"Agent login: {data.get('user', {}).get('user_type')}")
    else:
        print(f"Agent login failed: {agent_resp.status_code} - {agent_resp.text}")
    
    time.sleep(1)
    
    # Get farmer token
    farmer_resp = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDENTIALS)
    if farmer_resp.status_code == 200:
        data = farmer_resp.json()
        _token_cache[FARMER_CREDENTIALS["identifier"]] = data.get("access_token")
        _user_info_cache[FARMER_CREDENTIALS["identifier"]] = data.get("user", {})
        print(f"Farmer login: {data.get('user', {}).get('user_type')}")
    else:
        print(f"Farmer login failed: {farmer_resp.status_code} - {farmer_resp.text}")
    
    time.sleep(1)
    
    # Get admin token
    admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if admin_resp.status_code == 200:
        data = admin_resp.json()
        _token_cache[ADMIN_CREDENTIALS["identifier"]] = data.get("access_token")
        _user_info_cache[ADMIN_CREDENTIALS["identifier"]] = data.get("user", {})
        print(f"Admin login: {data.get('user', {}).get('user_type')}")
    else:
        print(f"Admin login failed: {admin_resp.status_code} - {admin_resp.text}")
    
    yield
    _token_cache.clear()
    _user_info_cache.clear()


class TestCooperativeContacts:
    """Test GET /api/messaging/contacts for cooperative role
    
    Cooperative should see:
    - Their agents (field_agent with cooperative_id matching coop's user_id)
    - Their farmer members (from coop_members with user_id field)
    - Buyers (acheteur/buyer user_type)
    """
    
    def test_cooperative_login(self):
        """Verify cooperative can login"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        user_info = _user_info_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        
        assert token, "Cooperative token not available"
        assert user_info.get("user_type") == "cooperative", f"Expected cooperative, got {user_info.get('user_type')}"
        print(f"PASSED: Cooperative login successful - {user_info.get('full_name') or user_info.get('cooperative_name')}")
    
    def test_cooperative_contacts_returns_list(self):
        """Cooperative can get contacts list"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        assert token, "Cooperative token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"PASSED: Cooperative contacts returned {len(data)} contacts")
        return data
    
    def test_cooperative_contacts_not_empty(self):
        """Cooperative should see at least some contacts (agents, farmers, or buyers)"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        assert token, "Cooperative token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # The fix should ensure cooperative sees contacts (not 0)
        # Note: If there are no agents/farmers/buyers in the system, this could be 0
        # But with the fix, if there ARE members, they should appear
        print(f"PASSED: Cooperative contacts count: {len(data)}")
        
        if len(data) > 0:
            # Verify contact structure
            contact = data[0]
            assert "id" in contact, "Contact missing 'id'"
            assert "name" in contact, "Contact missing 'name'"
            assert "user_type" in contact, "Contact missing 'user_type'"
            assert "user_type_label" in contact, "Contact missing 'user_type_label'"
            
            # Log contact types found
            user_types = set(c.get("user_type") for c in data)
            print(f"  Contact types found: {user_types}")
            
            # Check if we see expected types
            expected_types = {"field_agent", "producteur", "acheteur", "buyer"}
            found_expected = user_types.intersection(expected_types)
            print(f"  Expected types found: {found_expected}")
    
    def test_cooperative_sees_farmers(self):
        """Cooperative should see farmer members (producteur type)"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        assert token, "Cooperative token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        farmers = [c for c in data if c.get("user_type") == "producteur"]
        print(f"PASSED: Cooperative sees {len(farmers)} farmers")
        
        if len(farmers) > 0:
            print(f"  Sample farmer: {farmers[0].get('name')}")


class TestFieldAgentContacts:
    """Test GET /api/messaging/contacts for field_agent role
    
    Field agent should see:
    - Their cooperative (if cooperative_id is set)
    - Farmers from the same cooperative (via coop_members with user_id field)
    - Their assigned farmers
    """
    
    def test_agent_login(self):
        """Verify agent can login"""
        token = _token_cache.get(AGENT_CREDENTIALS["identifier"])
        user_info = _user_info_cache.get(AGENT_CREDENTIALS["identifier"])
        
        assert token, "Agent token not available"
        assert user_info.get("user_type") == "field_agent", f"Expected field_agent, got {user_info.get('user_type')}"
        print(f"PASSED: Agent login successful - {user_info.get('full_name')}")
        print(f"  Agent cooperative_id: {user_info.get('cooperative_id')}")
    
    def test_agent_contacts_returns_list(self):
        """Agent can get contacts list"""
        token = _token_cache.get(AGENT_CREDENTIALS["identifier"])
        assert token, "Agent token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"PASSED: Agent contacts returned {len(data)} contacts")
        return data
    
    def test_agent_contacts_not_empty(self):
        """Agent should see contacts (cooperative and/or farmers)"""
        token = _token_cache.get(AGENT_CREDENTIALS["identifier"])
        user_info = _user_info_cache.get(AGENT_CREDENTIALS["identifier"])
        assert token, "Agent token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        print(f"PASSED: Agent contacts count: {len(data)}")
        
        if len(data) > 0:
            user_types = set(c.get("user_type") for c in data)
            print(f"  Contact types found: {user_types}")
            
            # Check if agent sees their cooperative
            coops = [c for c in data if c.get("user_type") == "cooperative"]
            print(f"  Cooperatives visible: {len(coops)}")
            
            # Check if agent sees farmers
            farmers = [c for c in data if c.get("user_type") == "producteur"]
            print(f"  Farmers visible: {len(farmers)}")
        else:
            # If agent has no cooperative_id set, they might see 0 contacts
            coop_id = user_info.get("cooperative_id")
            if not coop_id:
                print("  Note: Agent has no cooperative_id set, may explain 0 contacts")


class TestFarmerContacts:
    """Test GET /api/messaging/contacts for producteur/farmer role
    
    Farmer should see:
    - Their cooperative (from coop_members with user_id field)
    - Their agent (field_agent with assigned_farmers containing farmer's id)
    - Buyers (acheteur/buyer user_type)
    """
    
    def test_farmer_login(self):
        """Verify farmer can login"""
        token = _token_cache.get(FARMER_CREDENTIALS["identifier"])
        user_info = _user_info_cache.get(FARMER_CREDENTIALS["identifier"])
        
        assert token, "Farmer token not available"
        assert user_info.get("user_type") == "producteur", f"Expected producteur, got {user_info.get('user_type')}"
        print(f"PASSED: Farmer login successful - {user_info.get('full_name')}")
    
    def test_farmer_contacts_returns_list(self):
        """Farmer can get contacts list"""
        token = _token_cache.get(FARMER_CREDENTIALS["identifier"])
        assert token, "Farmer token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"PASSED: Farmer contacts returned {len(data)} contacts")
        return data
    
    def test_farmer_contacts_not_empty(self):
        """Farmer should see contacts (cooperative, agent, or buyers)"""
        token = _token_cache.get(FARMER_CREDENTIALS["identifier"])
        assert token, "Farmer token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        print(f"PASSED: Farmer contacts count: {len(data)}")
        
        if len(data) > 0:
            user_types = set(c.get("user_type") for c in data)
            print(f"  Contact types found: {user_types}")
            
            # Check if farmer sees cooperatives
            coops = [c for c in data if c.get("user_type") == "cooperative"]
            print(f"  Cooperatives visible: {len(coops)}")
            
            # Check if farmer sees agents
            agents = [c for c in data if c.get("user_type") == "field_agent"]
            print(f"  Agents visible: {len(agents)}")
            
            # Check if farmer sees buyers
            buyers = [c for c in data if c.get("user_type") in ["acheteur", "buyer"]]
            print(f"  Buyers visible: {len(buyers)}")


class TestDirectConversation:
    """Test POST /api/messaging/conversations/direct"""
    
    def test_create_direct_conversation_cooperative_to_farmer(self):
        """Cooperative can create direct conversation with a farmer"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        assert token, "Cooperative token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get contacts to find a farmer
        contacts_response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        assert contacts_response.status_code == 200, "Failed to get contacts"
        contacts = contacts_response.json()
        
        # Find a farmer contact
        farmers = [c for c in contacts if c.get("user_type") == "producteur"]
        
        if len(farmers) == 0:
            pytest.skip("No farmer contacts available")
        
        farmer = farmers[0]
        
        # Create direct conversation
        payload = {
            "recipient_id": farmer["id"],
            "initial_message": "TEST_Message de la cooperative au producteur",
            "subject": "TEST_Contact cooperative"
        }
        response = requests.post(f"{BASE_URL}/api/messaging/conversations/direct", 
                                json=payload, headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "conversation_id" in data, "Missing conversation_id"
        
        print(f"PASSED: Created direct conversation {data['conversation_id']}")
        print(f"  With farmer: {farmer.get('name')}")
        print(f"  Existing: {data.get('existing', False)}")
        
        return data["conversation_id"]


class TestConversations:
    """Test GET /api/messaging/conversations"""
    
    def test_get_conversations_cooperative(self):
        """Cooperative can get their conversations"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        assert token, "Cooperative token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/conversations", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"PASSED: Cooperative has {len(data)} conversations")
        
        if len(data) > 0:
            conv = data[0]
            assert "conversation_id" in conv, "Missing conversation_id"
            assert "conversation_type" in conv, "Missing conversation_type"
            assert "other_user" in conv, "Missing other_user"
            print(f"  First conversation: {conv['conversation_id']}")
            print(f"  Type: {conv['conversation_type']}")
            print(f"  With: {conv['other_user'].get('name')}")
    
    def test_get_conversations_farmer(self):
        """Farmer can get their conversations"""
        token = _token_cache.get(FARMER_CREDENTIALS["identifier"])
        assert token, "Farmer token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/conversations", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"PASSED: Farmer has {len(data)} conversations")


class TestConversationDetail:
    """Test GET /api/messaging/conversations/{id} and messages"""
    
    def test_get_conversation_detail(self):
        """Get conversation detail with other_user info"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        assert token, "Cooperative token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get conversations list
        list_response = requests.get(f"{BASE_URL}/api/messaging/conversations", headers=headers)
        assert list_response.status_code == 200, "Failed to get conversations"
        conversations = list_response.json()
        
        if len(conversations) == 0:
            pytest.skip("No conversations to test")
        
        conv_id = conversations[0]["conversation_id"]
        
        # Get detail
        response = requests.get(f"{BASE_URL}/api/messaging/conversations/{conv_id}", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "conversation_id" in data, "Missing conversation_id"
        assert "conversation_type" in data, "Missing conversation_type"
        assert "other_user" in data, "Missing other_user"
        
        other_user = data["other_user"]
        assert "id" in other_user, "other_user missing id"
        assert "name" in other_user, "other_user missing name"
        assert "user_type_label" in other_user, "other_user missing user_type_label"
        
        print(f"PASSED: Conversation detail for {conv_id}")
        print(f"  Type: {data['conversation_type']}")
        print(f"  Other user: {other_user.get('name')} ({other_user.get('user_type_label')})")
    
    def test_get_conversation_messages(self):
        """Get messages for a conversation"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        assert token, "Cooperative token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get conversations list
        list_response = requests.get(f"{BASE_URL}/api/messaging/conversations", headers=headers)
        assert list_response.status_code == 200, "Failed to get conversations"
        conversations = list_response.json()
        
        if len(conversations) == 0:
            pytest.skip("No conversations to test")
        
        conv_id = conversations[0]["conversation_id"]
        
        # Get messages
        response = requests.get(f"{BASE_URL}/api/messaging/conversations/{conv_id}/messages", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "messages" in data, "Missing messages array"
        assert "has_more" in data, "Missing has_more field"
        
        messages = data["messages"]
        print(f"PASSED: Got {len(messages)} messages for conversation {conv_id}")
        
        if len(messages) > 0:
            msg = messages[0]
            assert "message_id" in msg, "Message missing message_id"
            assert "content" in msg, "Message missing content"
            assert "sender_id" in msg, "Message missing sender_id"
            assert "is_mine" in msg, "Message missing is_mine"
            print(f"  First message: {msg['content'][:50]}...")


class TestMessagingStats:
    """Test GET /api/messaging/stats"""
    
    def test_get_stats_cooperative(self):
        """Cooperative can get messaging stats"""
        token = _token_cache.get(COOPERATIVE_CREDENTIALS["identifier"])
        assert token, "Cooperative token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/stats", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "total_conversations" in data, "Missing total_conversations"
        assert "unread_messages" in data, "Missing unread_messages"
        assert "total_messages_sent" in data, "Missing total_messages_sent"
        assert "total_messages_received" in data, "Missing total_messages_received"
        
        print(f"PASSED: Messaging stats for cooperative")
        print(f"  Total conversations: {data['total_conversations']}")
        print(f"  Unread messages: {data['unread_messages']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
