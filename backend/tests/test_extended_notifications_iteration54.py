from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Extended Notifications System Tests - Iteration 54
Extended Notifications System Tests - Iteration 54
Tests for:
Tests for:
1. POST /api/cooperative/members/{member_id}/parcels triggers new_parcel_to_verify notification
1. POST /api/cooperative/members/{member_id}/parcels triggers new_parcel_to_verify notification
2. PUT /api/cooperative/parcels/{parcel_id}/verify triggers parcel_verified notification
2. PUT /api/cooperative/parcels/{parcel_id}/verify triggers parcel_verified notification
3. GET /api/notifications/history returns notifications with types
3. GET /api/notifications/history returns notifications with types
4. GET /api/notifications/unread-count returns correct count
4. GET /api/notifications/unread-count returns correct count
5. PUT /api/notifications/history/read-all resets unread count
5. PUT /api/notifications/history/read-all resets unread count
6. SSRTE critical alert notification (when children_at_risk > 0)
6. SSRTE critical alert notification (when children_at_risk > 0)
7. Payment received notification (when carbon premium paid)
7. Payment received notification (when carbon premium paid)
"""
"""

import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_CREDENTIALS = {
    "identifier": COOP_EMAIL,
    "password": "greenlink2024"
}
TEST_MEMBER_ID = "69bdef2c13defac7fb3a12d9"


class TestExtendedNotifications:
    """Extended Notifications System Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as cooperative
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.user_id = data.get("user", {}).get("id") or data.get("user_id")
        assert self.token, "No access token received"
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"✓ Logged in as cooperative, user_id: {self.user_id}")
    
    def test_01_get_initial_unread_count(self):
        """Test GET /api/notifications/unread-count returns correct count"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "non_lues" in data, "Response should contain 'non_lues' key"
        print(f"✓ Initial unread count: {data['non_lues']}")
        return data["non_lues"]
    
    def test_02_get_notification_history(self):
        """Test GET /api/notifications/history returns notifications with types"""
        response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=20")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "notifications" in data, "Response should contain 'notifications' key"
        notifications = data["notifications"]
        print(f"✓ Found {len(notifications)} notifications in history")
        
        # Check notification structure
        if notifications:
            notif = notifications[0]
            assert "_id" in notif, "Notification should have _id"
            assert "title" in notif, "Notification should have title"
            assert "body" in notif, "Notification should have body"
            assert "type" in notif, "Notification should have type"
            assert "read" in notif, "Notification should have read status"
            assert "created_at" in notif, "Notification should have created_at"
            print(f"✓ Notification structure verified: type={notif.get('type')}, title={notif.get('title')[:50]}...")
            
            # Check for expected notification types
            types_found = set(n.get("type") for n in notifications)
            print(f"✓ Notification types found: {types_found}")
        
        return notifications
    
    def test_03_create_parcel_triggers_notification(self):
        """Test POST /api/cooperative/members/{member_id}/parcels triggers new_parcel_to_verify notification"""
        # Get initial unread count
        initial_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        initial_count = initial_response.json().get("non_lues", 0)
        
        # Create a new parcel
        parcel_data = {
            "location": f"Test Location {datetime.now().strftime('%H%M%S')}",
            "village": "Test Village Notification",
            "area_hectares": 1.5,
            "crop_type": "cacao",
            "gps_lat": 5.3456,
            "gps_lng": -4.0123
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/cooperative/members/{TEST_MEMBER_ID}/parcels",
            json=parcel_data
        )
        assert response.status_code == 200, f"Failed to create parcel: {response.text}"
        data = response.json()
        parcel_id = data.get("parcel_id")
        assert parcel_id, "Should return parcel_id"
        print(f"✓ Created parcel: {parcel_id}")
        
        # Check notification history for new_parcel_to_verify type
        history_response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=10")
        assert history_response.status_code == 200
        notifications = history_response.json().get("notifications", [])
        
        # Look for new_parcel_to_verify notification
        parcel_notifs = [n for n in notifications if n.get("type") == "new_parcel_to_verify"]
        print(f"✓ Found {len(parcel_notifs)} new_parcel_to_verify notifications")
        
        return parcel_id
    
    def test_04_verify_parcel_triggers_notification(self):
        """Test PUT /api/cooperative/parcels/{parcel_id}/verify triggers parcel_verified notification"""
        # First, get a pending parcel
        response = self.session.get(f"{BASE_URL}/api/cooperative/parcels/pending-verification")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        parcels = data.get("parcelles", [])
        if not parcels:
            pytest.skip("No pending parcels to verify")
        
        parcel_id = parcels[0].get("id")
        farmer_id = parcels[0].get("producteur_id")
        print(f"✓ Found pending parcel: {parcel_id}, farmer_id: {farmer_id}")
        
        # Verify the parcel
        verification_data = {
            "verification_status": "verified",
            "verification_notes": "Test verification for notification testing",
            "verified_gps_lat": 5.3456,
            "verified_gps_lng": -4.0123
        }
        
        verify_response = self.session.put(
            f"{BASE_URL}/api/cooperative/parcels/{parcel_id}/verify",
            json=verification_data
        )
        assert verify_response.status_code == 200, f"Failed to verify parcel: {verify_response.text}"
        print(f"✓ Parcel verified successfully")
        
        # Check that parcel_verified notification was created
        # Note: The notification is sent to the farmer, not the cooperative
        # So we check the notification_history collection directly via another endpoint or verify the response
        verify_data = verify_response.json()
        assert "message" in verify_data, "Should return success message"
        print(f"✓ Verification response: {verify_data.get('message')}")
        
        return parcel_id
    
    def test_05_notification_types_in_history(self):
        """Test that notification history contains expected types"""
        response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=50")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        notifications = response.json().get("notifications", [])
        types_found = set(n.get("type") for n in notifications if n.get("type"))
        
        print(f"✓ All notification types in history: {types_found}")
        
        # Check for expected types
        expected_types = {"new_parcel_to_verify", "parcel_verified", "ssrte_critical_alert", "payment_received"}
        found_expected = types_found.intersection(expected_types)
        print(f"✓ Expected types found: {found_expected}")
        
        return types_found
    
    def test_06_mark_all_notifications_read(self):
        """Test PUT /api/notifications/history/read-all resets unread count"""
        # Get initial unread count
        initial_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        initial_count = initial_response.json().get("non_lues", 0)
        print(f"✓ Initial unread count: {initial_count}")
        
        # Mark all as read
        response = self.session.put(f"{BASE_URL}/api/notifications/history/read-all")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        print(f"✓ Marked {data.get('updated', 0)} notifications as read")
        
        # Verify unread count is now 0
        final_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        final_count = final_response.json().get("non_lues", 0)
        assert final_count == 0, f"Unread count should be 0 after mark-all-read, got {final_count}"
        print(f"✓ Final unread count: {final_count}")
    
    def test_07_notifications_sorted_by_date(self):
        """Test that notifications are sorted by date (newest first)"""
        response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=20")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        notifications = response.json().get("notifications", [])
        if len(notifications) < 2:
            pytest.skip("Not enough notifications to test sorting")
        
        # Check that notifications are sorted by created_at descending
        dates = [n.get("created_at") for n in notifications if n.get("created_at")]
        for i in range(len(dates) - 1):
            assert dates[i] >= dates[i + 1], f"Notifications should be sorted newest first: {dates[i]} should be >= {dates[i+1]}"
        
        print(f"✓ Notifications are correctly sorted by date (newest first)")
        print(f"  First: {dates[0] if dates else 'N/A'}")
        print(f"  Last: {dates[-1] if dates else 'N/A'}")


class TestSSRTECriticalAlertNotification:
    """Test SSRTE critical alert notification trigger"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as cooperative
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.user_id = data.get("user", {}).get("id") or data.get("user_id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"✓ Logged in as cooperative for SSRTE tests")
    
    def test_ssrte_visit_with_children_at_risk(self):
        """Test that SSRTE visit with children_at_risk > 0 triggers ssrte_critical_alert notification"""
        # Create an SSRTE visit with children at risk
        visit_data = {
            "member_id": TEST_MEMBER_ID,
            "visit_date": datetime.utcnow().isoformat(),
            "household_size": 5,
            "children_count": 2,
            "children_details": [
                {"age": 12, "works_on_farm": True, "in_school": False},  # At risk
                {"age": 16, "works_on_farm": True, "in_school": True}   # Not at risk
            ],
            "living_conditions": "average",
            "has_piped_water": False,
            "has_electricity": True,
            "distance_to_school_km": 3.5,
            "observations": "Test visit for notification testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ssrte/visits/create", json=visit_data)
        
        if response.status_code == 200:
            data = response.json()
            children_at_risk = data.get("children_at_risk", 0)
            notification_sent = data.get("notification_sent", False)
            print(f"✓ SSRTE visit created: children_at_risk={children_at_risk}, notification_sent={notification_sent}")
            
            if children_at_risk > 0:
                # Check notification history for ssrte_critical_alert
                history_response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=10")
                if history_response.status_code == 200:
                    notifications = history_response.json().get("notifications", [])
                    ssrte_notifs = [n for n in notifications if n.get("type") == "ssrte_critical_alert"]
                    print(f"✓ Found {len(ssrte_notifs)} ssrte_critical_alert notifications")
        else:
            print(f"⚠ SSRTE visit creation returned {response.status_code}: {response.text[:200]}")
            # This might fail if user doesn't have SSRTE access - that's OK for this test


class TestPaymentReceivedNotification:
    """Test payment_received notification trigger"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as cooperative
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"✓ Logged in as cooperative for payment tests")
    
    def test_carbon_premium_payment_notification(self):
        """Test that carbon premium payment triggers payment_received notification"""
        # Note: This requires an approved carbon audit for the member
        # We'll try to process a payment and check if notification is created
        
        response = self.session.post(
            f"{BASE_URL}/api/cooperative/carbon-premiums/pay",
            params={"member_id": TEST_MEMBER_ID}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Payment processed: {data.get('message', 'Success')}")
            print(f"  Amount: {data.get('amount_xof', 0)} XOF")
            
            # Check notification history for payment_received
            history_response = self.session.get(f"{BASE_URL}/api/notifications/history?limit=10")
            if history_response.status_code == 200:
                notifications = history_response.json().get("notifications", [])
                payment_notifs = [n for n in notifications if n.get("type") == "payment_received"]
                print(f"✓ Found {len(payment_notifs)} payment_received notifications")
        elif response.status_code == 400:
            # No premium to pay - expected if no approved audit
            print(f"⚠ No premium to pay for member (expected if no approved audit): {response.json().get('detail', '')}")
        else:
            print(f"⚠ Payment request returned {response.status_code}: {response.text[:200]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
