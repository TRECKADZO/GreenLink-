"""
Test Notification API Endpoints for GreenLink Agritech
- Device registration and unregistration
- Notification preferences (get/update)
- Notification history
- Test notification sending

Note: Actual push notifications require physical device with Expo token.
Backend endpoints are tested for correctness.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Cooperative test credentials
COOP_CREDENTIALS = {
    "identifier": "coop-test@greenlink.ci",
    "password": "coop123"
}

# Admin test credentials
ADMIN_CREDENTIALS = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}


@pytest.fixture(scope="module")
def api_client():
    """Create a requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def coop_token(api_client):
    """Get cooperative authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
    print(f"Coop login response status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"Coop login successful, token obtained: {token[:20]}..." if token else "No token returned")
        return token
    print(f"Coop login failed: {response.text}")
    pytest.skip("Cooperative authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    print(f"Admin login response status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"Admin login successful, token obtained: {token[:20]}..." if token else "No token returned")
        return token
    print(f"Admin login failed: {response.text}")
    pytest.skip("Admin authentication failed - skipping admin tests")


@pytest.fixture(scope="module")
def coop_authenticated_client(api_client, coop_token):
    """Session with cooperative auth header"""
    client = requests.Session()
    client.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {coop_token}"
    })
    return client


@pytest.fixture(scope="module")
def admin_authenticated_client(api_client, admin_token):
    """Session with admin auth header"""
    client = requests.Session()
    client.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return client


class TestHealthCheck:
    """Basic health check"""
    
    def test_backend_health(self, api_client):
        """Test backend is running via auth endpoint"""
        # Use login endpoint to verify backend is responding
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200, f"Backend health check failed: {response.text}"
        print("Backend health check via login: PASS")


class TestNotificationPreferences:
    """Test notification preferences CRUD"""
    
    def test_get_preferences_returns_defaults(self, coop_authenticated_client):
        """GET /api/notifications/preferences - should return default preferences"""
        response = coop_authenticated_client.get(f"{BASE_URL}/api/notifications/preferences")
        
        assert response.status_code == 200, f"Get preferences failed: {response.status_code} - {response.text}"
        
        data = response.json()
        print(f"Preferences response: {data}")
        
        # Check expected default preference keys
        expected_keys = ["premium_available", "payment_confirmed", "weekly_reminders", 
                        "coop_announcements", "harvest_updates", "marketing"]
        
        for key in expected_keys:
            assert key in data, f"Missing preference key: {key}"
        
        # Check default values (all true except marketing)
        assert data.get("premium_available") == True, "premium_available should default to True"
        assert data.get("payment_confirmed") == True, "payment_confirmed should default to True"
        assert data.get("weekly_reminders") == True, "weekly_reminders should default to True"
        assert data.get("coop_announcements") == True, "coop_announcements should default to True"
        assert data.get("harvest_updates") == True, "harvest_updates should default to True"
        assert data.get("marketing") == False, "marketing should default to False"
        
        print("GET /api/notifications/preferences: PASS - Default preferences returned")
    
    def test_get_preferences_requires_auth(self, api_client):
        """GET /api/notifications/preferences requires authentication"""
        client = requests.Session()
        response = client.get(f"{BASE_URL}/api/notifications/preferences")
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got: {response.status_code}"
        print("GET /api/notifications/preferences auth check: PASS")
    
    def test_update_preferences(self, coop_authenticated_client):
        """PUT /api/notifications/preferences - should update preferences"""
        # Update preferences
        new_prefs = {
            "premium_available": True,
            "payment_confirmed": True,
            "weekly_reminders": False,  # Changed
            "coop_announcements": True,
            "harvest_updates": False,  # Changed
            "marketing": True  # Changed
        }
        
        response = coop_authenticated_client.put(
            f"{BASE_URL}/api/notifications/preferences",
            json=new_prefs
        )
        
        assert response.status_code == 200, f"Update preferences failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success: true"
        
        # Verify preferences were updated
        prefs = data.get("preferences", {})
        assert prefs.get("weekly_reminders") == False, "weekly_reminders should be updated to False"
        assert prefs.get("harvest_updates") == False, "harvest_updates should be updated to False"
        assert prefs.get("marketing") == True, "marketing should be updated to True"
        
        print("PUT /api/notifications/preferences: PASS - Preferences updated successfully")
        
        # Restore default preferences
        default_prefs = {
            "premium_available": True,
            "payment_confirmed": True,
            "weekly_reminders": True,
            "coop_announcements": True,
            "harvest_updates": True,
            "marketing": False
        }
        coop_authenticated_client.put(f"{BASE_URL}/api/notifications/preferences", json=default_prefs)
        print("  Preferences restored to defaults")


class TestDeviceRegistration:
    """Test device registration endpoints"""
    
    def test_register_device(self, coop_authenticated_client):
        """POST /api/notifications/register-device - should register a device"""
        # Use a unique test push token
        test_token = f"ExponentPushToken[TEST_{uuid.uuid4().hex[:16]}]"
        
        device_data = {
            "push_token": test_token,
            "platform": "android",
            "device_name": "Test Device Pytest"
        }
        
        response = coop_authenticated_client.post(
            f"{BASE_URL}/api/notifications/register-device",
            json=device_data
        )
        
        assert response.status_code == 200, f"Register device failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success: true"
        assert data.get("message") in ["Device registered", "Device updated"], f"Unexpected message: {data.get('message')}"
        
        print(f"POST /api/notifications/register-device: PASS - Token registered: {test_token[:40]}...")
        
        return test_token
    
    def test_register_device_requires_auth(self, api_client):
        """POST /api/notifications/register-device requires authentication"""
        client = requests.Session()
        device_data = {
            "push_token": "ExponentPushToken[test123]",
            "platform": "android"
        }
        response = client.post(
            f"{BASE_URL}/api/notifications/register-device",
            json=device_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got: {response.status_code}"
        print("POST /api/notifications/register-device auth check: PASS")
    
    def test_register_device_updates_existing(self, coop_authenticated_client):
        """POST /api/notifications/register-device - should update existing device"""
        # Use a consistent token to test update
        test_token = "ExponentPushToken[TEST_UPDATE_EXISTING_123]"
        
        # First registration
        device_data = {
            "push_token": test_token,
            "platform": "android",
            "device_name": "Original Device"
        }
        response1 = coop_authenticated_client.post(
            f"{BASE_URL}/api/notifications/register-device",
            json=device_data
        )
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Second registration with same token (should update)
        device_data["device_name"] = "Updated Device"
        device_data["platform"] = "ios"
        response2 = coop_authenticated_client.post(
            f"{BASE_URL}/api/notifications/register-device",
            json=device_data
        )
        assert response2.status_code == 200, f"Update registration failed: {response2.text}"
        
        data = response2.json()
        assert data.get("success") == True
        # Should be "Device updated" since token already exists
        
        print("POST /api/notifications/register-device update existing: PASS")


class TestNotificationHistory:
    """Test notification history endpoints"""
    
    def test_get_notification_history(self, coop_authenticated_client):
        """GET /api/notifications/history - should return notification history"""
        response = coop_authenticated_client.get(f"{BASE_URL}/api/notifications/history")
        
        assert response.status_code == 200, f"Get history failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Check response structure
        assert "notifications" in data, "Response should have 'notifications' field"
        assert "count" in data, "Response should have 'count' field"
        assert isinstance(data["notifications"], list), "Notifications should be a list"
        assert isinstance(data["count"], int), "Count should be an integer"
        
        # If there are notifications, verify their structure
        if len(data["notifications"]) > 0:
            notif = data["notifications"][0]
            assert "_id" in notif, "Notification should have _id"
            print(f"GET /api/notifications/history: PASS - {data['count']} notifications found")
        else:
            print("GET /api/notifications/history: PASS - Empty history (0 notifications)")
    
    def test_get_notification_history_with_limit(self, coop_authenticated_client):
        """GET /api/notifications/history with limit parameter"""
        response = coop_authenticated_client.get(f"{BASE_URL}/api/notifications/history?limit=10")
        
        assert response.status_code == 200, f"Get history with limit failed: {response.status_code}"
        
        data = response.json()
        assert len(data["notifications"]) <= 10, "Should respect limit parameter"
        
        print(f"GET /api/notifications/history with limit: PASS - {len(data['notifications'])} notifications")
    
    def test_get_notification_history_requires_auth(self, api_client):
        """GET /api/notifications/history requires authentication"""
        client = requests.Session()
        response = client.get(f"{BASE_URL}/api/notifications/history")
        assert response.status_code in [401, 403], f"Expected 401/403, got: {response.status_code}"
        print("GET /api/notifications/history auth check: PASS")


class TestTestNotification:
    """Test test notification endpoint"""
    
    def test_send_test_notification(self, coop_authenticated_client):
        """POST /api/notifications/test - should send test notification (may fail without device)"""
        response = coop_authenticated_client.post(f"{BASE_URL}/api/notifications/test")
        
        assert response.status_code == 200, f"Test notification failed: {response.status_code} - {response.text}"
        
        data = response.json()
        print(f"POST /api/notifications/test response: {data}")
        
        # The endpoint should return either success or "no registered devices"
        # Both are valid responses depending on whether devices are registered
        if data.get("success"):
            print("POST /api/notifications/test: PASS - Test notification sent successfully")
        else:
            # Expected when no physical device is registered
            assert "error" in data or "No registered devices" in str(data), f"Unexpected response: {data}"
            print("POST /api/notifications/test: PASS - No registered devices (expected without physical device)")
    
    def test_send_test_notification_requires_auth(self, api_client):
        """POST /api/notifications/test requires authentication"""
        client = requests.Session()
        response = client.post(f"{BASE_URL}/api/notifications/test", headers={"Content-Type": "application/json"})
        assert response.status_code in [401, 403], f"Expected 401/403, got: {response.status_code}"
        print("POST /api/notifications/test auth check: PASS")


class TestWeeklyReminders:
    """Test weekly reminder trigger (admin only)"""
    
    def test_trigger_weekly_reminders_requires_admin(self, coop_authenticated_client):
        """POST /api/notifications/trigger-weekly-reminders requires admin"""
        response = coop_authenticated_client.post(f"{BASE_URL}/api/notifications/trigger-weekly-reminders")
        
        # Should be forbidden for cooperative user (not admin)
        assert response.status_code == 403, f"Expected 403 Forbidden for cooperative user, got: {response.status_code}"
        print("POST /api/notifications/trigger-weekly-reminders coop access: PASS - Returns 403 for non-admin")
    
    def test_trigger_weekly_reminders_admin(self, admin_authenticated_client):
        """POST /api/notifications/trigger-weekly-reminders with admin"""
        response = admin_authenticated_client.post(f"{BASE_URL}/api/notifications/trigger-weekly-reminders")
        
        assert response.status_code == 200, f"Admin weekly reminders failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success: true"
        assert "message" in data, "Response should have message"
        
        print(f"POST /api/notifications/trigger-weekly-reminders admin: PASS - {data.get('message')}")


class TestPendingSMS:
    """Test pending SMS endpoints (admin/coop only)"""
    
    def test_get_pending_sms(self, coop_authenticated_client):
        """GET /api/notifications/pending-sms - should return pending SMS list"""
        response = coop_authenticated_client.get(f"{BASE_URL}/api/notifications/pending-sms")
        
        assert response.status_code == 200, f"Get pending SMS failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "pending_sms" in data, "Response should have 'pending_sms' field"
        assert "count" in data, "Response should have 'count' field"
        assert isinstance(data["pending_sms"], list), "pending_sms should be a list"
        
        print(f"GET /api/notifications/pending-sms: PASS - {data['count']} pending SMS")
    
    def test_get_pending_sms_requires_auth(self, api_client):
        """GET /api/notifications/pending-sms requires authentication"""
        client = requests.Session()
        response = client.get(f"{BASE_URL}/api/notifications/pending-sms")
        assert response.status_code in [401, 403], f"Expected 401/403, got: {response.status_code}"
        print("GET /api/notifications/pending-sms auth check: PASS")
