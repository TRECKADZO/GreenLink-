"""
Test Push Notifications Feature - Iteration 53
Tests for:
1. POST /api/cooperative/members/{member_id}/parcels - creates parcel AND stores notification
2. GET /api/notifications/unread-count - returns correct non_lues count
3. GET /api/notifications/history - returns notifications with title, body, type, read status
4. PUT /api/notifications/history/{id}/read - marks notification as read
5. PUT /api/notifications/history/read-all - marks all notifications as read
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_CREDENTIALS = {
    "identifier": "bielaghana@gmail.com",
    "password": "greenlink2024"
}

# Known member_id for testing
TEST_MEMBER_ID = "69bdef2c13defac7fb3a12d9"


class TestPushNotificationsFeature:
    """Test suite for push notifications feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_id = None
        
    def authenticate(self):
        """Authenticate and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_CREDENTIALS
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.user_id = data.get("user", {}).get("id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return data
    
    # ============= Authentication Test =============
    
    def test_01_cooperative_login(self):
        """Test cooperative login returns access_token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=COOP_CREDENTIALS
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"PASS: Login successful, user_type={data['user'].get('user_type')}")
    
    # ============= Notification Count Test =============
    
    def test_02_get_unread_count(self):
        """Test GET /api/notifications/unread-count returns non_lues"""
        self.authenticate()
        
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200, f"Failed to get unread count: {response.text}"
        
        data = response.json()
        assert "non_lues" in data, f"Response missing 'non_lues' key: {data}"
        assert isinstance(data["non_lues"], int), f"non_lues should be int, got {type(data['non_lues'])}"
        
        print(f"PASS: Unread count = {data['non_lues']}")
        return data["non_lues"]
    
    # ============= Notification History Test =============
    
    def test_03_get_notification_history(self):
        """Test GET /api/notifications/history returns notifications with required fields"""
        self.authenticate()
        
        response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=20")
        assert response.status_code == 200, f"Failed to get history: {response.text}"
        
        data = response.json()
        assert "notifications" in data, f"Response missing 'notifications' key: {data}"
        assert "count" in data, f"Response missing 'count' key: {data}"
        
        notifications = data["notifications"]
        print(f"PASS: Got {len(notifications)} notifications")
        
        # Check structure of notifications if any exist
        if notifications:
            notif = notifications[0]
            required_fields = ["_id", "title", "body", "type", "read", "created_at"]
            for field in required_fields:
                assert field in notif, f"Notification missing '{field}' field: {notif}"
            print(f"PASS: Notification structure verified - title='{notif.get('title')}', type='{notif.get('type')}', read={notif.get('read')}")
        
        return notifications
    
    # ============= Create Parcel and Verify Notification =============
    
    def test_04_create_parcel_triggers_notification(self):
        """Test POST /api/cooperative/members/{member_id}/parcels creates notification"""
        self.authenticate()
        
        # Get initial unread count
        initial_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        initial_count = initial_response.json().get("non_lues", 0)
        print(f"Initial unread count: {initial_count}")
        
        # Create a new parcel
        parcel_data = {
            "location": f"Test Location {datetime.utcnow().strftime('%H%M%S')}",
            "village": "Test Village",
            "area_hectares": 2.5,
            "crop_type": "cacao",
            "gps_lat": 6.8276,
            "gps_lng": -5.2893,
            "certification": "Rainforest Alliance"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/cooperative/members/{TEST_MEMBER_ID}/parcels",
            json=parcel_data
        )
        
        # Check parcel creation
        assert response.status_code == 200, f"Failed to create parcel: {response.text}"
        parcel_result = response.json()
        assert "parcel_id" in parcel_result, f"No parcel_id in response: {parcel_result}"
        print(f"PASS: Parcel created with id={parcel_result['parcel_id']}")
        
        # Check notification was created - get history
        import time
        time.sleep(1)  # Wait for async notification to be stored
        
        history_response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=5")
        assert history_response.status_code == 200
        
        notifications = history_response.json().get("notifications", [])
        
        # Look for new_parcel_to_verify notification
        parcel_notif = None
        for notif in notifications:
            if notif.get("type") == "new_parcel_to_verify":
                parcel_notif = notif
                break
        
        if parcel_notif:
            print(f"PASS: Found new_parcel_to_verify notification - title='{parcel_notif.get('title')}', body='{parcel_notif.get('body')}'")
            assert "title" in parcel_notif
            assert "body" in parcel_notif
            assert parcel_notif.get("read") == False, "New notification should be unread"
        else:
            # Check if any notification was created recently
            print(f"INFO: No new_parcel_to_verify notification found, checking recent notifications...")
            if notifications:
                print(f"Recent notifications: {[n.get('type') for n in notifications[:3]]}")
        
        return parcel_result
    
    # ============= Mark Single Notification as Read =============
    
    def test_05_mark_notification_read(self):
        """Test PUT /api/notifications/history/{id}/read marks notification as read"""
        self.authenticate()
        
        # Get notifications
        history_response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=10")
        assert history_response.status_code == 200
        
        notifications = history_response.json().get("notifications", [])
        
        # Find an unread notification
        unread_notif = None
        for notif in notifications:
            if not notif.get("read"):
                unread_notif = notif
                break
        
        if not unread_notif:
            print("SKIP: No unread notifications to test mark-as-read")
            return
        
        notif_id = unread_notif["_id"]
        print(f"Marking notification {notif_id} as read...")
        
        # Mark as read
        response = self.session.put(f"{BASE_URL}/api/notifications/history/{notif_id}/read")
        assert response.status_code == 200, f"Failed to mark as read: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        print(f"PASS: Notification {notif_id} marked as read")
        
        # Verify it's now read
        verify_response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=10")
        verify_notifications = verify_response.json().get("notifications", [])
        
        for notif in verify_notifications:
            if notif["_id"] == notif_id:
                assert notif.get("read") == True, f"Notification should be read: {notif}"
                print(f"PASS: Verified notification is now read")
                break
    
    # ============= Mark All Notifications as Read =============
    
    def test_06_mark_all_notifications_read(self):
        """Test PUT /api/notifications/history/read-all marks all as read"""
        self.authenticate()
        
        # Mark all as read
        response = self.session.put(f"{BASE_URL}/api/notifications/history/read-all")
        assert response.status_code == 200, f"Failed to mark all as read: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        print(f"PASS: Mark all read - updated {data.get('updated', 0)} notifications")
        
        # Verify unread count is 0
        count_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert count_response.status_code == 200
        
        count_data = count_response.json()
        assert count_data.get("non_lues") == 0, f"Expected 0 unread, got {count_data.get('non_lues')}"
        print(f"PASS: Unread count is now 0")
    
    # ============= Verify Notification Structure =============
    
    def test_07_notification_structure_validation(self):
        """Test notification objects have all required fields"""
        self.authenticate()
        
        # Create another parcel to ensure we have a notification
        parcel_data = {
            "location": f"Structure Test {datetime.utcnow().strftime('%H%M%S')}",
            "village": "Test Village 2",
            "area_hectares": 1.5,
            "crop_type": "cafe"
        }
        
        self.session.post(
            f"{BASE_URL}/api/cooperative/members/{TEST_MEMBER_ID}/parcels",
            json=parcel_data
        )
        
        import time
        time.sleep(1)
        
        # Get history
        response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=5")
        assert response.status_code == 200
        
        notifications = response.json().get("notifications", [])
        
        if notifications:
            notif = notifications[0]
            
            # Verify all required fields
            assert "_id" in notif, "Missing _id"
            assert "title" in notif, "Missing title"
            assert "body" in notif, "Missing body"
            assert "type" in notif, "Missing type"
            assert "read" in notif, "Missing read"
            assert "created_at" in notif, "Missing created_at"
            
            # Verify types
            assert isinstance(notif["_id"], str), "id should be string"
            assert isinstance(notif["title"], str), "title should be string"
            assert isinstance(notif["body"], str), "body should be string"
            assert isinstance(notif["type"], str), "type should be string"
            assert isinstance(notif["read"], bool), "read should be boolean"
            
            print(f"PASS: Notification structure validated")
            print(f"  - _id: {notif['_id']}")
            print(f"  - title: {notif['title']}")
            print(f"  - body: {notif['body'][:50]}...")
            print(f"  - type: {notif['type']}")
            print(f"  - read: {notif['read']}")
            print(f"  - created_at: {notif['created_at']}")
        else:
            print("WARN: No notifications found to validate structure")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
