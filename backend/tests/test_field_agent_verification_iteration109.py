from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 109 - Field Agent Verification & Declaration Tests
Iteration 109 - Field Agent Verification & Declaration Tests
Tests for:
Tests for:
1. GET /api/field-agent/assigned-farmers - List assigned farmers with parcel counts
1. GET /api/field-agent/assigned-farmers - List assigned farmers with parcel counts
2. POST /api/field-agent/farmer-parcels/{farmer_id} - Create new parcel with carbon score
2. POST /api/field-agent/farmer-parcels/{farmer_id} - Create new parcel with carbon score
3. GET /api/field-agent/parcels-to-verify - Get parcels to verify with stats
3. GET /api/field-agent/parcels-to-verify - Get parcels to verify with stats
4. PUT /api/field-agent/parcels/{parcel_id}/verify - Verify parcel with measured values
4. PUT /api/field-agent/parcels/{parcel_id}/verify - Verify parcel with measured values
"""
"""

import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
AGENT_EMAIL = "testagent@test.ci"
AGENT_PASSWORD = "test123456"
# COOP_EMAIL imported from test_config
# COOP_PASSWORD imported from test_config


class TestFieldAgentAuth:
    """Test agent authentication"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Agent login failed: {response.status_code} - {response.text}")
    
    def test_agent_login(self, agent_token):
        """Test agent can login"""
        assert agent_token is not None
        assert len(agent_token) > 0
        print(f"Agent login successful, token length: {len(agent_token)}")


class TestAssignedFarmers:
    """Test GET /api/field-agent/assigned-farmers endpoint"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Agent login failed: {response.status_code}")
    
    def test_get_assigned_farmers_success(self, agent_token):
        """Test getting assigned farmers list"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/assigned-farmers",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "farmers" in data, "Response should contain 'farmers' key"
        assert isinstance(data["farmers"], list), "farmers should be a list"
        
        print(f"Found {len(data['farmers'])} assigned farmers")
        
        # If farmers exist, verify structure
        if len(data["farmers"]) > 0:
            farmer = data["farmers"][0]
            assert "id" in farmer, "Farmer should have 'id'"
            assert "full_name" in farmer, "Farmer should have 'full_name'"
            assert "parcels_count" in farmer, "Farmer should have 'parcels_count'"
            print(f"First farmer: {farmer['full_name']}, parcels: {farmer['parcels_count']}")
    
    def test_get_assigned_farmers_unauthorized(self):
        """Test endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/field-agent/assigned-farmers")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestParcelDeclaration:
    """Test POST /api/field-agent/farmer-parcels/{farmer_id} endpoint"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Agent login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def farmer_id(self, agent_token):
        """Get a farmer ID to test with"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/assigned-farmers",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        if response.status_code == 200:
            farmers = response.json().get("farmers", [])
            if farmers:
                return farmers[0]["id"]
        pytest.skip("No assigned farmers found for testing")
    
    def test_declare_parcel_success(self, agent_token, farmer_id):
        """Test declaring a new parcel for a farmer"""
        parcel_data = {
            "location": f"TEST_Parcelle_{datetime.now().strftime('%H%M%S')}",
            "village": "Test Village",
            "department": "Abidjan",
            "area_hectares": 2.5,
            "crop_type": "cacao",
            "certification": "Rainforest Alliance",
            "arbres_grands": 10,
            "arbres_moyens": 20,
            "arbres_petits": 15,
            "couverture_ombragee": 35.5,
            "gps_lat": 5.3167,
            "gps_lng": -4.0167,
            "notes": "Test parcel created by automated test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/field-agent/farmer-parcels/{farmer_id}",
            headers={
                "Authorization": f"Bearer {agent_token}",
                "Content-Type": "application/json"
            },
            json=parcel_data
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "parcel_id" in data or "message" in data, "Response should contain parcel_id or message"
        
        # Verify carbon score is calculated
        if "carbon_score" in data:
            assert isinstance(data["carbon_score"], (int, float)), "carbon_score should be numeric"
            print(f"Parcel created with carbon score: {data['carbon_score']}")
        
        print(f"Parcel declaration response: {data}")
    
    def test_declare_parcel_missing_required_fields(self, agent_token, farmer_id):
        """Test parcel declaration with missing required fields"""
        parcel_data = {
            "crop_type": "cacao"
            # Missing location, village, area_hectares
        }
        
        response = requests.post(
            f"{BASE_URL}/api/field-agent/farmer-parcels/{farmer_id}",
            headers={
                "Authorization": f"Bearer {agent_token}",
                "Content-Type": "application/json"
            },
            json=parcel_data
        )
        
        # Should still work but with empty/default values or return validation error
        print(f"Missing fields response: {response.status_code} - {response.text}")


class TestParcelsToVerify:
    """Test GET /api/field-agent/parcels-to-verify endpoint"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Agent login failed: {response.status_code}")
    
    def test_get_parcels_to_verify_success(self, agent_token):
        """Test getting parcels to verify"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/parcels-to-verify",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "parcels" in data, "Response should contain 'parcels' key"
        assert "stats" in data, "Response should contain 'stats' key"
        assert "total" in data, "Response should contain 'total' key"
        
        # Verify stats structure
        stats = data["stats"]
        assert "pending" in stats, "Stats should have 'pending' count"
        assert "needs_correction" in stats, "Stats should have 'needs_correction' count"
        assert "verified" in stats, "Stats should have 'verified' count"
        
        print(f"Parcels to verify: {data['total']}")
        print(f"Stats: pending={stats['pending']}, needs_correction={stats['needs_correction']}, verified={stats['verified']}")
        
        # If parcels exist, verify structure
        if len(data["parcels"]) > 0:
            parcel = data["parcels"][0]
            assert "id" in parcel, "Parcel should have 'id'"
            assert "nom_producteur" in parcel, "Parcel should have 'nom_producteur'"
            assert "village" in parcel, "Parcel should have 'village'"
            assert "superficie" in parcel, "Parcel should have 'superficie'"
            assert "statut_verification" in parcel, "Parcel should have 'statut_verification'"
            print(f"First parcel: {parcel['nom_producteur']} - {parcel['village']} - {parcel['superficie']} ha")
    
    def test_get_parcels_with_status_filter(self, agent_token):
        """Test filtering parcels by status"""
        for status in ["pending", "needs_correction", "verified", "all"]:
            response = requests.get(
                f"{BASE_URL}/api/field-agent/parcels-to-verify?status_filter={status}",
                headers={"Authorization": f"Bearer {agent_token}"}
            )
            assert response.status_code == 200, f"Filter '{status}' failed: {response.status_code}"
            data = response.json()
            print(f"Status filter '{status}': {len(data['parcels'])} parcels")
    
    def test_get_parcels_unauthorized(self):
        """Test endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/field-agent/parcels-to-verify")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestParcelVerification:
    """Test PUT /api/field-agent/parcels/{parcel_id}/verify endpoint"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Agent login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def parcel_to_verify(self, agent_token):
        """Get a parcel ID to verify"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/parcels-to-verify?status_filter=pending",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        if response.status_code == 200:
            parcels = response.json().get("parcels", [])
            if parcels:
                return parcels[0]
        pytest.skip("No pending parcels found for verification testing")
    
    def test_verify_parcel_as_verified(self, agent_token, parcel_to_verify):
        """Test verifying a parcel with measured values"""
        parcel_id = parcel_to_verify["id"]
        
        verification_data = {
            "verification_status": "verified",
            "verification_notes": "TEST - Parcel verified by automated test",
            "gps_lat": 5.3167,
            "gps_lng": -4.0167,
            "corrected_area_hectares": parcel_to_verify.get("superficie", 2.0),
            "arbres_petits": 10,
            "arbres_moyens": 15,
            "arbres_grands": 8,
            "couverture_ombragee": 40.0,
            "pratiques_ecologiques": ["compostage", "agroforesterie"]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            headers={
                "Authorization": f"Bearer {agent_token}",
                "Content-Type": "application/json"
            },
            json=verification_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "verification_status" in data, "Response should contain 'verification_status'"
        assert "carbon_score" in data, "Response should contain 'carbon_score'"
        
        print(f"Verification response: {data}")
        print(f"Carbon score after verification: {data['carbon_score']}")
    
    def test_verify_parcel_invalid_status(self, agent_token, parcel_to_verify):
        """Test verification with invalid status"""
        parcel_id = parcel_to_verify["id"]
        
        verification_data = {
            "verification_status": "invalid_status",
            "verification_notes": "Test"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/{parcel_id}/verify",
            headers={
                "Authorization": f"Bearer {agent_token}",
                "Content-Type": "application/json"
            },
            json=verification_data
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
    
    def test_verify_parcel_invalid_id(self, agent_token):
        """Test verification with invalid parcel ID"""
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/invalid_id_123/verify",
            headers={
                "Authorization": f"Bearer {agent_token}",
                "Content-Type": "application/json"
            },
            json={"verification_status": "verified"}
        )
        
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
    
    def test_verify_parcel_unauthorized(self):
        """Test endpoint requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/field-agent/parcels/some_id/verify",
            json={"verification_status": "verified"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestFieldAgentDashboard:
    """Test field agent dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Agent login failed: {response.status_code}")
    
    def test_get_agent_dashboard(self, agent_token):
        """Test getting agent dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Dashboard response keys: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
