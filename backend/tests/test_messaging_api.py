from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Messaging API Tests - Secure messaging system between buyers and sellers
Messaging API Tests - Secure messaging system between buyers and sellers
Tests cover: authentication, conversations, stats, blocked users, and error handling
Tests cover: authentication, conversations, stats, blocked users, and error handling
"""
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config
COOP_EMAIL = "coop-gagnoa@greenlink.ci"
COOP_PASSWORD = "password"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")

@pytest.fixture(scope="module")
def coop_token():
    """Get cooperative authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Cooperative authentication failed")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestMessagingAuth:
    """Authentication tests for messaging APIs"""
    
    def test_admin_login_success(self, api_client):
        """Test admin login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["user_type"] == "admin"
        print(f"✓ Admin login successful: {data['user']['full_name']}")
    
    def test_coop_login_success(self, api_client):
        """Test cooperative login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == COOP_EMAIL
        assert data["user"]["user_type"] == "cooperative"
        print(f"✓ Cooperative login successful: {data['user']['full_name']}")


class TestMessagingStatsAPI:
    """Tests for GET /api/messaging/stats"""
    
    def test_stats_admin(self, api_client, admin_token):
        """Test messaging stats endpoint returns correct structure for admin"""
        response = api_client.get(
            f"{BASE_URL}/api/messaging/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_conversations" in data
        assert "unread_messages" in data
        assert "total_messages_sent" in data
        assert "total_messages_received" in data
        
        # Verify data types
        assert isinstance(data["total_conversations"], int)
        assert isinstance(data["unread_messages"], int)
        assert isinstance(data["total_messages_sent"], int)
        assert isinstance(data["total_messages_received"], int)
        
        print(f"✓ Admin messaging stats: {data}")
    
    def test_stats_coop(self, api_client, coop_token):
        """Test messaging stats endpoint for cooperative user"""
        response = api_client.get(
            f"{BASE_URL}/api/messaging/stats",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields present
        assert "total_conversations" in data
        assert "unread_messages" in data
        assert "total_messages_sent" in data
        assert "total_messages_received" in data
        
        print(f"✓ Cooperative messaging stats: {data}")
    
    def test_stats_unauthorized(self, api_client):
        """Test stats endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/messaging/stats")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access correctly rejected")


class TestMessagingConversationsAPI:
    """Tests for GET /api/messaging/conversations"""
    
    def test_list_conversations_admin(self, api_client, admin_token):
        """Test listing conversations for admin"""
        response = api_client.get(
            f"{BASE_URL}/api/messaging/conversations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Response should be a list
        assert isinstance(data, list)
        
        # If conversations exist, verify structure
        if len(data) > 0:
            conv = data[0]
            assert "conversation_id" in conv
            assert "other_user" in conv
            assert "last_message" in conv or "last_message_at" in conv
            print(f"✓ Found {len(data)} conversations for admin")
        else:
            print("✓ No conversations found for admin (expected for new implementation)")
    
    def test_list_conversations_coop(self, api_client, coop_token):
        """Test listing conversations for cooperative"""
        response = api_client.get(
            f"{BASE_URL}/api/messaging/conversations",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Cooperative conversations: {len(data)} found")
    
    def test_list_conversations_archived(self, api_client, admin_token):
        """Test listing archived conversations"""
        response = api_client.get(
            f"{BASE_URL}/api/messaging/conversations?archived=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Archived conversations: {len(data)} found")
    
    def test_list_conversations_unauthorized(self, api_client):
        """Test conversations endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/messaging/conversations")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access correctly rejected")


class TestMessagingBlockedUsersAPI:
    """Tests for blocked users functionality"""
    
    def test_list_blocked_users(self, api_client, admin_token):
        """Test listing blocked users"""
        response = api_client.get(
            f"{BASE_URL}/api/messaging/blocked",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Blocked users list retrieved: {len(data)} blocked")
    
    def test_block_user_self_error(self, api_client, admin_token):
        """Test cannot block yourself"""
        # Get admin user ID first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_id = login_response.json()["user"]["_id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/messaging/block",
            json={"user_id": admin_id},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should get 400 error - can't block yourself
        assert response.status_code == 400
        print("✓ Self-blocking correctly prevented")


class TestMessagingConversationCreation:
    """Tests for creating conversations"""
    
    def test_create_conversation_without_listing(self, api_client, admin_token):
        """Test creating conversation requires valid listing"""
        response = api_client.post(
            f"{BASE_URL}/api/messaging/conversations",
            json={
                "listing_id": "INVALID-LISTING-ID",
                "recipient_id": "invalid-user-id",
                "initial_message": "Test message"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should fail with 404 - listing not found
        assert response.status_code == 404
        print("✓ Invalid listing correctly rejected")
    
    def test_create_conversation_self_message_error(self, api_client, coop_token):
        """Test cannot message yourself (seller contacting own listing)"""
        # First get a listing from the cooperative
        listings_response = api_client.get(
            f"{BASE_URL}/api/harvest-marketplace/listings"
        )
        
        if listings_response.status_code == 200:
            listings = listings_response.json()
            
            # Find a listing from coop-gagnoa
            coop_listing = None
            for listing in listings:
                if listing.get("seller_name", "").lower().find("gagnoa") >= 0:
                    coop_listing = listing
                    break
            
            if coop_listing:
                response = api_client.post(
                    f"{BASE_URL}/api/messaging/conversations",
                    json={
                        "listing_id": coop_listing["listing_id"],
                        "recipient_id": coop_listing["seller_id"],
                        "initial_message": "Test self-message"
                    },
                    headers={"Authorization": f"Bearer {coop_token}"}
                )
                # Should get 400 - can't message yourself
                assert response.status_code == 400
                print("✓ Self-messaging correctly prevented")
            else:
                print("⚠ No cooperative listing found - skipping self-message test")
        else:
            pytest.skip("Could not fetch listings")


class TestMessagingConversationDetail:
    """Tests for conversation detail endpoints"""
    
    def test_get_nonexistent_conversation(self, api_client, admin_token):
        """Test getting a non-existent conversation returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/messaging/conversations/CONV-INVALID-ID",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("✓ Non-existent conversation correctly returns 404")
    
    def test_get_messages_nonexistent_conversation(self, api_client, admin_token):
        """Test getting messages from non-existent conversation returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/messaging/conversations/CONV-INVALID-ID/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("✓ Non-existent conversation messages correctly returns 404")


class TestMessagingReportAPI:
    """Tests for message reporting functionality"""
    
    def test_report_invalid_message(self, api_client, admin_token):
        """Test reporting non-existent message returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/messaging/report",
            json={
                "message_id": "MSG-INVALID-ID",
                "reason": "spam"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("✓ Invalid message report correctly rejected")


class TestMessagingDeleteAPI:
    """Tests for message deletion"""
    
    def test_delete_nonexistent_message(self, api_client, admin_token):
        """Test deleting non-existent message returns 404"""
        response = api_client.delete(
            f"{BASE_URL}/api/messaging/messages/MSG-INVALID-ID",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("✓ Non-existent message deletion correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
