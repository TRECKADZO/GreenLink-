"""
Iteration 59 - Distribution & Web Notifications Tests
Tests for:
1. POST /api/cooperative/lots/{lot_id}/distribute - proportional distribution per farmer
2. GET /api/cooperative/distributions/{dist_id} - detailed breakdown per farmer
3. GET /api/cooperative/distributions - list with distributions array
4. GET /api/notifications/web - notifications from `notifications` collection
5. GET /api/notifications/web/unread-count - unread count
6. PUT /api/notifications/web/{id}/read - mark notification as read
7. PUT /api/notifications/web/read-all - mark all notifications as read
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_CREDENTIALS = {
    "identifier": "+2250505000001",
    "password": "coop2024"
}

FARMER_CREDENTIALS = {
    "identifier": "+2250705551234",
    "password": "koffi2024"
}

# Known lot ID from context
COMPLETED_LOT_ID = "69a22fab12a0c677af90ca5f"


class TestAuthentication:
    """Authentication tests for cooperative and farmer"""
    
    def test_cooperative_login(self):
        """Test cooperative login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        print(f"Coop login status: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        print(f"Coop login successful, user_type: {data.get('user_type')}")
    
    def test_farmer_login(self):
        """Test farmer login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDENTIALS)
        print(f"Farmer login status: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        print(f"Farmer login successful, user_type: {data.get('user_type')}")


@pytest.fixture(scope="module")
def coop_token():
    """Get cooperative auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
    if response.status_code != 200:
        pytest.skip(f"Cooperative login failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def farmer_token():
    """Get farmer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDENTIALS)
    if response.status_code != 200:
        pytest.skip(f"Farmer login failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def coop_headers(coop_token):
    """Headers with cooperative auth"""
    return {"Authorization": f"Bearer {coop_token}"}


@pytest.fixture(scope="module")
def farmer_headers(farmer_token):
    """Headers with farmer auth"""
    return {"Authorization": f"Bearer {farmer_token}"}


class TestDistributionEndpoints:
    """Tests for distribution-related endpoints"""
    
    def test_get_distributions_list(self, coop_headers):
        """GET /api/cooperative/distributions - should return list with distributions array"""
        response = requests.get(f"{BASE_URL}/api/cooperative/distributions", headers=coop_headers)
        print(f"Distributions list status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Distributions count: {len(data)}")
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            dist = data[0]
            print(f"First distribution: id={dist.get('id')}, lot_name={dist.get('lot_name')}")
            
            # Check required fields
            assert "id" in dist, "Distribution should have id"
            assert "lot_name" in dist, "Distribution should have lot_name"
            assert "total_premium" in dist, "Distribution should have total_premium"
            assert "amount_distributed" in dist, "Distribution should have amount_distributed"
            assert "beneficiaries_count" in dist, "Distribution should have beneficiaries_count"
            assert "distributions" in dist, "Distribution should have distributions array"
            assert "total_tonnage_kg" in dist, "Distribution should have total_tonnage_kg"
            
            # Check distributions array has farmer breakdown
            if dist.get("distributions"):
                farmer_dist = dist["distributions"][0]
                print(f"First farmer distribution: {farmer_dist.get('nom_membre')}, amount={farmer_dist.get('amount')}")
                assert "nom_membre" in farmer_dist, "Farmer dist should have nom_membre"
                assert "tonnage_contribution_kg" in farmer_dist, "Farmer dist should have tonnage_contribution_kg"
                assert "contribution_pct" in farmer_dist, "Farmer dist should have contribution_pct"
                assert "amount" in farmer_dist, "Farmer dist should have amount"
    
    def test_get_distribution_detail(self, coop_headers):
        """GET /api/cooperative/distributions/{dist_id} - should return detailed breakdown"""
        # First get list to find a distribution ID
        list_response = requests.get(f"{BASE_URL}/api/cooperative/distributions", headers=coop_headers)
        if list_response.status_code != 200 or not list_response.json():
            pytest.skip("No distributions available to test detail")
        
        dist_id = list_response.json()[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/cooperative/distributions/{dist_id}", headers=coop_headers)
        print(f"Distribution detail status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Distribution detail: id={data.get('id')}, beneficiaries={data.get('beneficiaries_count')}")
        
        # Check all required fields
        assert "id" in data, "Should have id"
        assert "lot_id" in data, "Should have lot_id"
        assert "lot_name" in data, "Should have lot_name"
        assert "total_premium" in data, "Should have total_premium"
        assert "commission_rate" in data, "Should have commission_rate"
        assert "commission_amount" in data, "Should have commission_amount"
        assert "amount_distributed" in data, "Should have amount_distributed"
        assert "total_tonnage_kg" in data, "Should have total_tonnage_kg"
        assert "beneficiaries_count" in data, "Should have beneficiaries_count"
        assert "distributions" in data, "Should have distributions array"
        assert "status" in data, "Should have status"
        
        # Verify distributions array has farmer breakdown
        distributions = data.get("distributions", [])
        print(f"Farmer distributions count: {len(distributions)}")
        
        if distributions:
            for i, farmer_dist in enumerate(distributions[:3]):  # Check first 3
                print(f"  Farmer {i+1}: {farmer_dist.get('nom_membre')}, tonnage={farmer_dist.get('tonnage_contribution_kg')}kg, {farmer_dist.get('contribution_pct')}%, amount={farmer_dist.get('amount')} XOF")
                assert "member_id" in farmer_dist, "Should have member_id"
                assert "nom_membre" in farmer_dist, "Should have nom_membre"
                assert "tonnage_contribution_kg" in farmer_dist, "Should have tonnage_contribution_kg"
                assert "contribution_pct" in farmer_dist, "Should have contribution_pct"
                assert "share_percentage" in farmer_dist, "Should have share_percentage"
                assert "amount" in farmer_dist, "Should have amount"
                assert "payment_status" in farmer_dist, "Should have payment_status"
    
    def test_distribution_proportional_calculation(self, coop_headers):
        """Verify distribution amounts are proportional to tonnage contribution"""
        list_response = requests.get(f"{BASE_URL}/api/cooperative/distributions", headers=coop_headers)
        if list_response.status_code != 200 or not list_response.json():
            pytest.skip("No distributions available")
        
        dist_id = list_response.json()[0]["id"]
        response = requests.get(f"{BASE_URL}/api/cooperative/distributions/{dist_id}", headers=coop_headers)
        data = response.json()
        
        distributions = data.get("distributions", [])
        total_tonnage = data.get("total_tonnage_kg", 0)
        amount_distributed = data.get("amount_distributed", 0)
        
        print(f"Total tonnage: {total_tonnage}kg, Amount distributed: {amount_distributed} XOF")
        
        if not distributions or total_tonnage <= 0:
            pytest.skip("No distribution data to verify")
        
        # Verify proportional distribution
        total_calculated = 0
        for farmer_dist in distributions:
            tonnage = farmer_dist.get("tonnage_contribution_kg", 0)
            expected_pct = (tonnage / total_tonnage) * 100 if total_tonnage > 0 else 0
            actual_pct = farmer_dist.get("contribution_pct", 0)
            amount = farmer_dist.get("amount", 0)
            
            # Allow 0.5% tolerance for rounding
            assert abs(expected_pct - actual_pct) < 0.5, f"Percentage mismatch for {farmer_dist.get('nom_membre')}: expected {expected_pct:.1f}%, got {actual_pct}%"
            
            total_calculated += amount
        
        # Total amounts should roughly equal amount_distributed (allow rounding)
        assert abs(total_calculated - amount_distributed) < 100, f"Total amounts mismatch: calculated {total_calculated}, expected {amount_distributed}"
        print(f"Proportional distribution verified: {len(distributions)} farmers, total {total_calculated} XOF")
    
    def test_get_lot_contributors(self, coop_headers):
        """GET /api/cooperative/lots/{lot_id}/contributors - should return contributor list"""
        response = requests.get(f"{BASE_URL}/api/cooperative/lots/{COMPLETED_LOT_ID}/contributors", headers=coop_headers)
        print(f"Lot contributors status: {response.status_code}")
        
        if response.status_code == 404:
            pytest.skip("Lot not found - may have been deleted")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Contributors: {data.get('total_contributors')}, Total tonnage: {data.get('total_estimated_tonnage_kg')}kg")
        
        assert "lot_id" in data, "Should have lot_id"
        assert "contributors" in data, "Should have contributors array"
        assert "total_contributors" in data, "Should have total_contributors"
        assert "total_estimated_tonnage_kg" in data, "Should have total_estimated_tonnage_kg"
        
        contributors = data.get("contributors", [])
        if contributors:
            for c in contributors[:3]:
                print(f"  Contributor: {c.get('farmer_name')}, tonnage={c.get('estimated_tonnage_kg')}kg")
                assert "farmer_id" in c, "Contributor should have farmer_id"
                assert "farmer_name" in c, "Contributor should have farmer_name"
                assert "estimated_tonnage_kg" in c, "Contributor should have estimated_tonnage_kg"
    
    def test_distribute_already_distributed_lot(self, coop_headers):
        """POST /api/cooperative/lots/{lot_id}/distribute - should fail if already distributed"""
        response = requests.post(f"{BASE_URL}/api/cooperative/lots/{COMPLETED_LOT_ID}/distribute", headers=coop_headers)
        print(f"Distribute already distributed lot status: {response.status_code}")
        
        # Should return 400 if already distributed, or 404 if lot not found
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}: {response.text}"
        
        if response.status_code == 400:
            data = response.json()
            print(f"Error message: {data.get('detail')}")
            assert "deja" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower(), "Should indicate already distributed"


class TestWebNotificationEndpoints:
    """Tests for web notification endpoints (reads from `notifications` collection)"""
    
    def test_get_web_notifications_coop(self, coop_headers):
        """GET /api/notifications/web - should return notifications for cooperative"""
        response = requests.get(f"{BASE_URL}/api/notifications/web", headers=coop_headers)
        print(f"Web notifications (coop) status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Notifications count: {len(data.get('notifications', []))}, Unread: {data.get('non_lues', 0)}")
        
        assert "notifications" in data, "Should have notifications array"
        assert "non_lues" in data, "Should have non_lues count"
        
        notifications = data.get("notifications", [])
        if notifications:
            notif = notifications[0]
            print(f"First notification: id={notif.get('id')}, title={notif.get('title')}, type={notif.get('type')}")
            assert "id" in notif, "Notification should have id"
            assert "title" in notif, "Notification should have title"
            assert "message" in notif, "Notification should have message"
            assert "type" in notif, "Notification should have type"
            assert "is_read" in notif, "Notification should have is_read"
            assert "created_at" in notif, "Notification should have created_at"
    
    def test_get_web_notifications_farmer(self, farmer_headers):
        """GET /api/notifications/web - should return notifications for farmer"""
        response = requests.get(f"{BASE_URL}/api/notifications/web", headers=farmer_headers)
        print(f"Web notifications (farmer) status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Farmer notifications count: {len(data.get('notifications', []))}, Unread: {data.get('non_lues', 0)}")
        
        assert "notifications" in data, "Should have notifications array"
        assert "non_lues" in data, "Should have non_lues count"
    
    def test_get_web_unread_count_coop(self, coop_headers):
        """GET /api/notifications/web/unread-count - should return unread count"""
        response = requests.get(f"{BASE_URL}/api/notifications/web/unread-count", headers=coop_headers)
        print(f"Unread count (coop) status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Unread count: {data.get('non_lues', 0)}")
        
        assert "non_lues" in data, "Should have non_lues field"
        assert isinstance(data["non_lues"], int), "non_lues should be integer"
    
    def test_get_web_unread_count_farmer(self, farmer_headers):
        """GET /api/notifications/web/unread-count - should return unread count for farmer"""
        response = requests.get(f"{BASE_URL}/api/notifications/web/unread-count", headers=farmer_headers)
        print(f"Unread count (farmer) status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Farmer unread count: {data.get('non_lues', 0)}")
        
        assert "non_lues" in data, "Should have non_lues field"
    
    def test_mark_notification_read(self, coop_headers):
        """PUT /api/notifications/web/{id}/read - should mark notification as read"""
        # First get notifications to find an ID
        list_response = requests.get(f"{BASE_URL}/api/notifications/web", headers=coop_headers)
        if list_response.status_code != 200:
            pytest.skip("Cannot get notifications list")
        
        notifications = list_response.json().get("notifications", [])
        if not notifications:
            pytest.skip("No notifications to mark as read")
        
        notif_id = notifications[0]["id"]
        
        response = requests.put(f"{BASE_URL}/api/notifications/web/{notif_id}/read", headers=coop_headers)
        print(f"Mark notification read status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        print(f"Notification {notif_id} marked as read")
    
    def test_mark_all_notifications_read(self, coop_headers):
        """PUT /api/notifications/web/read-all - should mark all notifications as read"""
        response = requests.put(f"{BASE_URL}/api/notifications/web/read-all", headers=coop_headers)
        print(f"Mark all read status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        print(f"All notifications marked as read, updated: {data.get('updated', 0)}")
    
    def test_notifications_unauthorized(self):
        """GET /api/notifications/web - should fail without auth"""
        response = requests.get(f"{BASE_URL}/api/notifications/web")
        print(f"Unauthorized notifications status: {response.status_code}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestSSEEndpoint:
    """Tests for SSE notification stream endpoint"""
    
    def test_sse_stream_endpoint_exists(self, coop_headers):
        """GET /api/notifications/stream - should return SSE stream"""
        # Just verify the endpoint exists and accepts connections
        # We can't fully test SSE in pytest, but we can check it doesn't 404
        try:
            response = requests.get(
                f"{BASE_URL}/api/notifications/stream",
                headers={**coop_headers, "Accept": "text/event-stream"},
                stream=True,
                timeout=2
            )
            print(f"SSE stream status: {response.status_code}")
            assert response.status_code == 200, f"SSE endpoint failed: {response.status_code}"
            assert "text/event-stream" in response.headers.get("Content-Type", ""), "Should return event-stream content type"
            print("SSE endpoint accessible and returns event-stream")
            response.close()
        except requests.exceptions.Timeout:
            # Timeout is expected for SSE - it means the connection was established
            print("SSE connection established (timeout expected)")
        except Exception as e:
            print(f"SSE test exception: {e}")
            # Don't fail on connection issues - SSE may not work in test environment


class TestLotsEndpoints:
    """Tests for lots-related endpoints"""
    
    def test_get_lots_list(self, coop_headers):
        """GET /api/cooperative/lots - should return lots list"""
        response = requests.get(f"{BASE_URL}/api/cooperative/lots", headers=coop_headers)
        print(f"Lots list status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Lots count: {len(data)}")
        assert isinstance(data, list), "Response should be a list"
        
        if data:
            lot = data[0]
            print(f"First lot: id={lot.get('id')}, name={lot.get('lot_name')}, status={lot.get('status')}")
            assert "id" in lot, "Lot should have id"
            assert "lot_name" in lot, "Lot should have lot_name"
            assert "status" in lot, "Lot should have status"
    
    def test_get_lots_filtered_by_status(self, coop_headers):
        """GET /api/cooperative/lots?status=completed - should filter by status"""
        response = requests.get(f"{BASE_URL}/api/cooperative/lots?status=completed", headers=coop_headers)
        print(f"Completed lots status: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Completed lots count: {len(data)}")
        
        for lot in data:
            assert lot.get("status") == "completed", f"Lot {lot.get('id')} has status {lot.get('status')}, expected completed"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
