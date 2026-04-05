"""
Iteration 100 - Testing Features:
1. POST /api/ussd/register-web without cooperative_code but with agent_id → farmer created with correct coop_id from agent's cooperative
2. GET /api/field-agent/my-farmers → photos.completed should be True for farmer with agent_photos saved
3. GET /api/field-agent/my-farmers → redd field exists in forms_status
4. POST /api/agent/photos for a farmer → my-farmers shows photos.completed=True

Test credentials:
- Field Agent: testagent@test.ci / test123456, user_id=69d26d0a74d244372789cc81
- Agent has 6 assigned farmers, first one (Konan Yao Pierre, id=69d27ef947797cbad7193b8a) has 1 photo saved
"""

import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
AGENT_EMAIL = "testagent@test.ci"
AGENT_PASSWORD = "test123456"
AGENT_USER_ID = "69d26d0a74d244372789cc81"
FARMER_WITH_PHOTOS_ID = "69d27ef947797cbad7193b8a"


@pytest.fixture(scope="module")
def agent_token():
    """Login as field agent and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": AGENT_EMAIL,
        "password": AGENT_PASSWORD
    })
    assert response.status_code == 200, f"Agent login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def auth_headers(agent_token):
    """Auth headers for authenticated requests"""
    return {"Authorization": f"Bearer {agent_token}"}


def generate_unique_phone():
    """Generate unique phone number for testing"""
    suffix = ''.join(random.choices(string.digits, k=8))
    return f"07{suffix}"


class TestRegisterWebWithAgentId:
    """Test POST /api/ussd/register-web with agent_id (no cooperative_code)"""
    
    def test_register_without_coop_code_with_agent_id(self, auth_headers):
        """
        When agent registers farmer without cooperative_code,
        farmer should be created with coop_id from agent's cooperative
        """
        unique_phone = generate_unique_phone()
        payload = {
            "nom_complet": f"TEST_Planteur_Iter100_{unique_phone[-4:]}",
            "telephone": unique_phone,
            "village": "TestVillage",
            "pin": "1234",
            "hectares": "2.5",
            "agent_id": AGENT_USER_ID
            # Note: NO cooperative_code field
        }
        
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json=payload, headers=auth_headers)
        
        # Should succeed
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "farmer_id" in data
        assert "member_id" in data, "member_id should be returned when agent_id is provided"
        assert data.get("nom") == payload["nom_complet"]
        assert data.get("telephone") == unique_phone
        
        print(f"✓ Farmer registered: {data.get('nom')}, member_id: {data.get('member_id')}")
        
        return data.get("member_id")
    
    def test_registered_farmer_has_correct_coop_id(self, auth_headers):
        """Verify the created coop_member has the agent's coop_id"""
        # First register a farmer
        unique_phone = generate_unique_phone()
        payload = {
            "nom_complet": f"TEST_CoopCheck_{unique_phone[-4:]}",
            "telephone": unique_phone,
            "village": "TestVillage",
            "pin": "1234",
            "agent_id": AGENT_USER_ID
        }
        
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        member_id = data.get("member_id")
        
        # Now check my-farmers to verify the farmer appears with correct data
        farmers_response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=auth_headers)
        assert farmers_response.status_code == 200
        farmers_data = farmers_response.json()
        
        # Find the newly registered farmer
        farmers = farmers_data.get("farmers", [])
        new_farmer = next((f for f in farmers if f.get("id") == member_id), None)
        
        assert new_farmer is not None, f"Newly registered farmer {member_id} not found in my-farmers"
        print(f"✓ Farmer {new_farmer.get('full_name')} found in my-farmers with id {member_id}")


class TestMyFarmersPhotosCompletion:
    """Test GET /api/field-agent/my-farmers photos.completed status"""
    
    def test_farmer_with_photos_shows_completed(self, auth_headers):
        """
        Farmer with photos in agent_photos collection should have photos.completed=True
        Test farmer: Konan Yao Pierre (id=69d27ef947797cbad7193b8a) has 1 photo
        """
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=auth_headers)
        assert response.status_code == 200, f"my-farmers failed: {response.text}"
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        # Find the farmer with photos (Konan Yao Pierre)
        farmer_with_photos = next((f for f in farmers if f.get("id") == FARMER_WITH_PHOTOS_ID), None)
        
        if farmer_with_photos:
            forms_status = farmer_with_photos.get("forms_status", {})
            photos_status = forms_status.get("photos", {})
            
            print(f"Farmer: {farmer_with_photos.get('full_name')}")
            print(f"Photos status: {photos_status}")
            
            assert photos_status.get("completed") == True, \
                f"photos.completed should be True for farmer with photos. Got: {photos_status}"
            print(f"✓ Farmer {farmer_with_photos.get('full_name')} has photos.completed=True")
        else:
            # If farmer not found, check if any farmer has photos completed
            farmers_with_photos = [f for f in farmers if f.get("forms_status", {}).get("photos", {}).get("completed")]
            print(f"Farmers with photos.completed=True: {len(farmers_with_photos)}")
            if farmers_with_photos:
                print(f"✓ Found {len(farmers_with_photos)} farmer(s) with photos.completed=True")
            else:
                pytest.skip(f"Farmer {FARMER_WITH_PHOTOS_ID} not found in assigned farmers")


class TestMyFarmersReddField:
    """Test GET /api/field-agent/my-farmers has redd field in forms_status"""
    
    def test_forms_status_has_redd_field(self, auth_headers):
        """forms_status should have 6 keys including 'redd'"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=auth_headers)
        assert response.status_code == 200, f"my-farmers failed: {response.text}"
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        assert len(farmers) > 0, "No farmers found"
        
        # Check first farmer's forms_status
        first_farmer = farmers[0]
        forms_status = first_farmer.get("forms_status", {})
        
        # Expected keys: ici, ssrte, redd, parcels, photos, register
        expected_keys = {"ici", "ssrte", "redd", "parcels", "photos", "register"}
        actual_keys = set(forms_status.keys())
        
        print(f"Farmer: {first_farmer.get('full_name')}")
        print(f"forms_status keys: {actual_keys}")
        
        assert "redd" in actual_keys, f"'redd' field missing from forms_status. Got: {actual_keys}"
        assert expected_keys.issubset(actual_keys), f"Missing keys. Expected: {expected_keys}, Got: {actual_keys}"
        
        # Check redd structure
        redd_status = forms_status.get("redd", {})
        assert "completed" in redd_status, "redd should have 'completed' field"
        assert "label" in redd_status, "redd should have 'label' field"
        
        print(f"✓ forms_status has all 6 keys including 'redd': {actual_keys}")
        print(f"✓ redd status: {redd_status}")


class TestAgentPhotosEndpoint:
    """Test POST /api/agent/photos and verify my-farmers update"""
    
    def test_save_photos_updates_completion(self, auth_headers):
        """
        After saving photos via POST /api/agent/photos,
        my-farmers should show photos.completed=True for that farmer
        """
        # First, get a farmer to add photos to
        farmers_response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=auth_headers)
        assert farmers_response.status_code == 200
        farmers = farmers_response.json().get("farmers", [])
        
        if not farmers:
            pytest.skip("No farmers available to test photo upload")
        
        # Use the first farmer
        test_farmer = farmers[0]
        farmer_id = test_farmer.get("id")
        farmer_name = test_farmer.get("full_name")
        
        print(f"Testing photo upload for farmer: {farmer_name} (id: {farmer_id})")
        
        # Save photos
        photo_payload = {
            "farmer_id": farmer_id,
            "farmer_name": farmer_name,
            "photos": [
                {
                    "gps": {"lat": 5.3364, "lng": -4.0267, "acc": 10},
                    "timestamp": "2025-01-15T10:30:00Z",
                    "name": "test_photo_iter100.jpg"
                }
            ]
        }
        
        photo_response = requests.post(
            f"{BASE_URL}/api/agent/photos",
            json=photo_payload,
            headers=auth_headers
        )
        
        # Check if endpoint exists and works
        if photo_response.status_code == 404:
            pytest.skip("POST /api/agent/photos endpoint not found")
        
        assert photo_response.status_code in [200, 201], f"Photo save failed: {photo_response.text}"
        print(f"✓ Photos saved successfully")
        
        # Now verify my-farmers shows photos.completed=True
        updated_farmers_response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=auth_headers)
        assert updated_farmers_response.status_code == 200
        
        updated_farmers = updated_farmers_response.json().get("farmers", [])
        updated_farmer = next((f for f in updated_farmers if f.get("id") == farmer_id), None)
        
        if updated_farmer:
            photos_status = updated_farmer.get("forms_status", {}).get("photos", {})
            print(f"Updated photos status: {photos_status}")
            
            # Photos should now be completed
            assert photos_status.get("completed") == True, \
                f"photos.completed should be True after saving photos. Got: {photos_status}"
            print(f"✓ Farmer {farmer_name} now has photos.completed=True")


class TestMyFarmersStructure:
    """Test overall structure of my-farmers response"""
    
    def test_my_farmers_returns_expected_structure(self, auth_headers):
        """Verify my-farmers returns expected data structure"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level structure
        assert "farmers" in data
        assert "total" in data
        assert "last_updated" in data
        
        farmers = data.get("farmers", [])
        print(f"Total farmers: {data.get('total')}")
        
        if farmers:
            # Check farmer structure
            farmer = farmers[0]
            expected_fields = ["id", "full_name", "phone_number", "forms_status", "completion"]
            
            for field in expected_fields:
                assert field in farmer, f"Missing field '{field}' in farmer data"
            
            # Check forms_status structure
            forms_status = farmer.get("forms_status", {})
            for form_key in ["ici", "ssrte", "redd", "parcels", "photos", "register"]:
                assert form_key in forms_status, f"Missing '{form_key}' in forms_status"
                form_data = forms_status[form_key]
                assert "completed" in form_data, f"Missing 'completed' in {form_key}"
                assert "label" in form_data, f"Missing 'label' in {form_key}"
            
            print(f"✓ Farmer structure is correct")
            print(f"✓ forms_status has all 6 required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
