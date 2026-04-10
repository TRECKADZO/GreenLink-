from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Messaging System Tests - Iteration 105
Messaging System Tests - Iteration 105
Tests for:
Tests for:
- GET /api/messaging/contacts - Get contacts with user_type_label
- GET /api/messaging/contacts - Get contacts with user_type_label
- POST /api/messaging/conversations/direct - Create direct conversation
- POST /api/messaging/conversations/direct - Create direct conversation
- GET /api/messaging/conversations - Get conversations with conversation_type field
- GET /api/messaging/conversations - Get conversations with conversation_type field
- GET /api/messaging/conversations/{id} - Get single conversation
- GET /api/messaging/conversations/{id} - Get single conversation
- GET /api/messaging/conversations/{id}/messages - Get messages
- GET /api/messaging/conversations/{id}/messages - Get messages
"""
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_CREDENTIALS = {"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
AGENT_CREDENTIALS = {"identifier": "testagent@test.ci", "password": "test123456"}
FARMER_CREDENTIALS = {"identifier": "testplanteur@test.ci", "password": "test123456"}

# Global token cache to avoid rate limiting
_token_cache = {}


def get_token(credentials, force_refresh=False):
    """Helper to get auth token with caching"""
    cache_key = credentials["identifier"]
    if cache_key in _token_cache and not force_refresh:
        return _token_cache[cache_key]
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=credentials)
    if response.status_code == 200:
        token = response.json().get("access_token")
        _token_cache[cache_key] = token
        return token
    elif response.status_code == 429:
        print(f"Rate limited for {cache_key}, waiting...")
        time.sleep(5)
        return None
    return None


# Get tokens once at module load
@pytest.fixture(scope="module", autouse=True)
def setup_tokens():
    """Get all tokens once at the start"""
    global _token_cache
    
    # Get admin token
    admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if admin_resp.status_code == 200:
        _token_cache[ADMIN_CREDENTIALS["identifier"]] = admin_resp.json().get("access_token")
    
    time.sleep(1)  # Small delay to avoid rate limiting
    
    # Get agent token
    agent_resp = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDENTIALS)
    if agent_resp.status_code == 200:
        _token_cache[AGENT_CREDENTIALS["identifier"]] = agent_resp.json().get("access_token")
    
    time.sleep(1)
    
    # Get farmer token
    farmer_resp = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDENTIALS)
    if farmer_resp.status_code == 200:
        _token_cache[FARMER_CREDENTIALS["identifier"]] = farmer_resp.json().get("access_token")
    
    yield
    _token_cache.clear()


class TestMessagingAuth:
    """Test authentication for messaging endpoints"""
    
    def test_login_admin(self):
        """Test admin login returns access_token"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        print(f"PASSED: Admin login successful")
    
    def test_login_agent(self):
        """Test agent login returns access_token"""
        token = _token_cache.get(AGENT_CREDENTIALS["identifier"])
        assert token, "Agent token not available"
        print(f"PASSED: Agent login successful")
    
    def test_login_farmer(self):
        """Test farmer login returns access_token"""
        token = _token_cache.get(FARMER_CREDENTIALS["identifier"])
        assert token, "Farmer token not available"
        print(f"PASSED: Farmer login successful")


class TestMessagingContacts:
    """Test GET /api/messaging/contacts endpoint"""
    
    def test_get_contacts_admin(self):
        """Admin can get contacts with user_type_label"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            contact = data[0]
            assert "id" in contact, "Contact missing 'id'"
            assert "name" in contact, "Contact missing 'name'"
            assert "user_type" in contact, "Contact missing 'user_type'"
            assert "user_type_label" in contact, "Contact missing 'user_type_label'"
            print(f"PASSED: Admin contacts returned {len(data)} contacts with user_type_label")
            print(f"  Sample contact: {contact['name']} - {contact['user_type_label']}")
        else:
            print("PASSED: Admin contacts returned empty list (no other users)")
    
    def test_get_contacts_agent(self):
        """Agent can get contacts (filtered by role)"""
        token = _token_cache.get(AGENT_CREDENTIALS["identifier"])
        assert token, "Agent token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASSED: Agent contacts returned {len(data)} contacts")
    
    def test_get_contacts_farmer(self):
        """Farmer can get contacts (filtered by role)"""
        token = _token_cache.get(FARMER_CREDENTIALS["identifier"])
        assert token, "Farmer token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASSED: Farmer contacts returned {len(data)} contacts")
    
    def test_get_contacts_with_search(self):
        """Search contacts by name"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/contacts", 
                               params={"search": "test"},
                               headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASSED: Search contacts returned {len(data)} results for 'test'")
    
    def test_contacts_unauthorized(self):
        """Contacts endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/messaging/contacts")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASSED: Contacts endpoint requires authentication")


class TestDirectConversations:
    """Test POST /api/messaging/conversations/direct endpoint"""
    
    def test_create_direct_conversation(self):
        """Admin can create direct conversation with another user"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # First get a contact to message
        contacts_response = requests.get(f"{BASE_URL}/api/messaging/contacts", headers=headers)
        assert contacts_response.status_code == 200, "Failed to get contacts"
        contacts = contacts_response.json()
        
        if len(contacts) == 0:
            pytest.skip("No contacts available to test direct conversation")
        
        # Find a contact without existing conversation
        recipient = None
        for c in contacts:
            if not c.get("existing_conversation"):
                recipient = c
                break
        
        if not recipient:
            # Use first contact (will return existing)
            recipient = contacts[0]
        
        # Create direct conversation
        payload = {
            "recipient_id": recipient["id"],
            "initial_message": "TEST_Message de test pour la messagerie directe",
            "subject": "TEST_Sujet de test"
        }
        response = requests.post(f"{BASE_URL}/api/messaging/conversations/direct", 
                                json=payload, headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "conversation_id" in data, "Missing conversation_id"
        assert data["conversation_id"].startswith("CONV-"), "Invalid conversation_id format"
        
        print(f"PASSED: Created/found direct conversation {data['conversation_id']}")
        print(f"  Existing: {data.get('existing', False)}")
    
    def test_create_direct_conversation_self(self):
        """Cannot create conversation with self"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get current user ID
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200, "Failed to get current user"
        
        user_id = me_response.json().get("_id") or me_response.json().get("id")
        
        payload = {
            "recipient_id": user_id,
            "initial_message": "TEST_Self message"
        }
        response = requests.post(f"{BASE_URL}/api/messaging/conversations/direct", 
                                json=payload, headers=headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASSED: Cannot create conversation with self")
    
    def test_create_direct_conversation_invalid_recipient(self):
        """Cannot create conversation with non-existent user"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        payload = {
            "recipient_id": "000000000000000000000000",  # Invalid ObjectId
            "initial_message": "TEST_Invalid recipient"
        }
        response = requests.post(f"{BASE_URL}/api/messaging/conversations/direct", 
                                json=payload, headers=headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: Cannot create conversation with invalid recipient")


class TestConversationsList:
    """Test GET /api/messaging/conversations endpoint"""
    
    def test_get_conversations(self):
        """Get conversations list with conversation_type field"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/conversations", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            conv = data[0]
            assert "conversation_id" in conv, "Missing conversation_id"
            assert "conversation_type" in conv, "Missing conversation_type"
            assert "other_user" in conv, "Missing other_user"
            assert "last_message" in conv, "Missing last_message"
            
            # Check other_user has user_type_label
            other_user = conv["other_user"]
            assert "user_type_label" in other_user, "other_user missing user_type_label"
            
            print(f"PASSED: Conversations list returned {len(data)} conversations")
            print(f"  First conv type: {conv['conversation_type']}")
            print(f"  Other user: {other_user.get('name')} ({other_user.get('user_type_label')})")
        else:
            print("PASSED: Conversations list returned empty (no conversations)")
    
    def test_get_conversations_archived(self):
        """Get archived conversations"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/conversations", 
                               params={"archived": True},
                               headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASSED: Archived conversations returned {len(data)} items")


class TestConversationDetail:
    """Test GET /api/messaging/conversations/{id} and messages"""
    
    def test_get_conversation_detail(self):
        """Get single conversation with conversation_type"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # First get conversations list
        list_response = requests.get(f"{BASE_URL}/api/messaging/conversations", headers=headers)
        assert list_response.status_code == 200, "Failed to get conversations"
        conversations = list_response.json()
        
        if len(conversations) == 0:
            pytest.skip("No conversations to test")
        
        conv_id = conversations[0]["conversation_id"]
        
        # Get detail
        response = requests.get(f"{BASE_URL}/api/messaging/conversations/{conv_id}", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "conversation_id" in data, "Missing conversation_id"
        assert "conversation_type" in data, "Missing conversation_type"
        assert "other_user" in data, "Missing other_user"
        
        # Check other_user has user_type_label
        other_user = data["other_user"]
        assert "user_type_label" in other_user, "other_user missing user_type_label"
        
        print(f"PASSED: Conversation detail for {conv_id}")
        print(f"  Type: {data['conversation_type']}")
        print(f"  Other user: {other_user.get('name')} ({other_user.get('user_type_label')})")
    
    def test_get_conversation_messages(self):
        """Get messages for a conversation"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # First get conversations list
        list_response = requests.get(f"{BASE_URL}/api/messaging/conversations", headers=headers)
        assert list_response.status_code == 200, "Failed to get conversations"
        conversations = list_response.json()
        
        if len(conversations) == 0:
            pytest.skip("No conversations to test")
        
        conv_id = conversations[0]["conversation_id"]
        
        # Get messages
        response = requests.get(f"{BASE_URL}/api/messaging/conversations/{conv_id}/messages", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "messages" in data, "Missing messages array"
        assert "has_more" in data, "Missing has_more field"
        
        messages = data["messages"]
        if len(messages) > 0:
            msg = messages[0]
            assert "message_id" in msg, "Message missing message_id"
            assert "content" in msg, "Message missing content"
            assert "sender_id" in msg, "Message missing sender_id"
            # Verify content is decrypted (not encrypted)
            assert not msg["content"].startswith("gAAAA"), "Message content is still encrypted"
            print(f"PASSED: Messages returned {len(messages)} messages (decrypted)")
        else:
            print("PASSED: Messages returned empty (no messages)")
    
    def test_get_conversation_not_found(self):
        """Get non-existent conversation returns 404"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/conversations/CONV-INVALID-123", headers=headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: Non-existent conversation returns 404")


class TestMessagingStats:
    """Test GET /api/messaging/stats endpoint"""
    
    def test_get_stats(self):
        """Get messaging statistics"""
        token = _token_cache.get(ADMIN_CREDENTIALS["identifier"])
        assert token, "Admin token not available"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/messaging/stats", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_conversations" in data, "Missing total_conversations"
        assert "unread_messages" in data, "Missing unread_messages"
        assert "total_messages_sent" in data, "Missing total_messages_sent"
        assert "total_messages_received" in data, "Missing total_messages_received"
        
        print(f"PASSED: Messaging stats")
        print(f"  Total conversations: {data['total_conversations']}")
        print(f"  Unread messages: {data['unread_messages']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
