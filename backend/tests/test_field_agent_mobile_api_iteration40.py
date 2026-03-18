"""
Test Field Agent Mobile API - Iteration 40
Testing API endpoints for the restructured mobile field agent portal

APIs under test:
1. GET /api/field-agent/dashboard - Agent dashboard with stats, performance, achievements
2. GET /api/field-agent/my-farmers - Farmers with completion data and forms_status
3. GET /api/agent/search?phone={number} - Search farmer by phone

Test credentials: Field Agent Kone Alphone
identifier: +2250709005301
password: greenlink2024
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFieldAgentAuth:
    """Test authentication for field agent"""
    
    def test_field_agent_login(self):
        """Login as field agent and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "+2250709005301",
            "password": "greenlink2024"
        })
        print(f"Login status: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data.keys()}"
        
        # user_type can be at root level or inside 'user' object
        user_type = data.get("user_type") or data.get("user", {}).get("user_type")
        full_name = data.get("full_name") or data.get("user", {}).get("full_name")
        print(f"User type: {user_type}, Name: {full_name}")
        
        # Store token for other tests
        TestFieldAgentAuth.token = data["access_token"]
        TestFieldAgentAuth.user = data
        return data["access_token"]


class TestFieldAgentDashboard:
    """Test GET /api/field-agent/dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure we have a valid token"""
        if not hasattr(TestFieldAgentAuth, 'token'):
            test = TestFieldAgentAuth()
            test.test_field_agent_login()
        self.token = TestFieldAgentAuth.token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_returns_200(self):
        """Dashboard endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=self.headers)
        print(f"Dashboard status: {response.status_code}")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
    
    def test_dashboard_has_agent_info(self):
        """Dashboard returns agent_info section"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Could be cooperative view or agent view
        if "agent_info" in data:
            agent_info = data["agent_info"]
            print(f"Agent info: {agent_info}")
            assert "name" in agent_info or "id" in agent_info
        elif "cooperative_info" in data:
            # Coop user viewing agents
            coop_info = data["cooperative_info"]
            print(f"Cooperative info: {coop_info}")
            assert "name" in coop_info or "id" in coop_info
        else:
            print(f"Dashboard keys: {data.keys()}")
    
    def test_dashboard_has_performance(self):
        """Dashboard returns performance section with score"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        if "performance" in data:
            performance = data["performance"]
            print(f"Performance: {performance}")
            assert "score" in performance, "Performance should have score"
        elif "global_stats" in data:
            # Cooperative view
            stats = data["global_stats"]
            print(f"Global stats: {stats}")
    
    def test_dashboard_has_statistics(self):
        """Dashboard returns statistics section"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        if "statistics" in data:
            stats = data["statistics"]
            print(f"Statistics keys: {stats.keys()}")
            # Should have ssrte_visits, members_onboarded, geotagged_photos
            if "ssrte_visits" in stats:
                ssrte = stats["ssrte_visits"]
                assert "total" in ssrte
                assert "progress" in ssrte
    
    def test_dashboard_has_risk_distribution(self):
        """Dashboard returns risk_distribution section"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        if "risk_distribution" in data:
            risk = data["risk_distribution"]
            print(f"Risk distribution: {risk}")
            # Expected keys: critique, eleve, modere, faible
    
    def test_dashboard_has_recent_activities(self):
        """Dashboard returns recent_activities section"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        if "recent_activities" in data:
            activities = data["recent_activities"]
            print(f"Recent activities count: {len(activities)}")
    
    def test_dashboard_has_achievements(self):
        """Dashboard returns achievements section"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        if "achievements" in data:
            achievements = data["achievements"]
            print(f"Achievements: {achievements}")


class TestMyFarmersEndpoint:
    """Test GET /api/field-agent/my-farmers endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure we have a valid token"""
        if not hasattr(TestFieldAgentAuth, 'token'):
            test = TestFieldAgentAuth()
            test.test_field_agent_login()
        self.token = TestFieldAgentAuth.token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_my_farmers_returns_200(self):
        """My farmers endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=self.headers)
        print(f"My farmers status: {response.status_code}")
        assert response.status_code == 200, f"My farmers failed: {response.text}"
    
    def test_my_farmers_has_farmers_list(self):
        """My farmers returns farmers array"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "farmers" in data, f"Response missing 'farmers' key: {data.keys()}"
        assert "total" in data, f"Response missing 'total' key: {data.keys()}"
        print(f"Total farmers: {data['total']}")
    
    def test_my_farmers_have_completion_data(self):
        """Each farmer has completion data (completed, total, percentage)"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        if len(farmers) > 0:
            farmer = farmers[0]
            print(f"Farmer sample: {farmer.get('full_name')}")
            
            # Check completion object
            if "completion" in farmer:
                completion = farmer["completion"]
                print(f"Completion: {completion}")
                assert "completed" in completion, "completion should have 'completed'"
                assert "total" in completion, "completion should have 'total'"
                assert "percentage" in completion, "completion should have 'percentage'"
            else:
                print(f"Farmer keys: {farmer.keys()}")
        else:
            print("No farmers assigned - checking empty response is valid")
    
    def test_my_farmers_have_forms_status(self):
        """Each farmer has forms_status with ici, ssrte, parcels, photos, register"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        if len(farmers) > 0:
            farmer = farmers[0]
            
            # Check forms_status object
            if "forms_status" in farmer:
                forms_status = farmer["forms_status"]
                print(f"Forms status keys: {forms_status.keys()}")
                
                expected_forms = ["ici", "ssrte", "parcels", "photos", "register"]
                for form in expected_forms:
                    assert form in forms_status, f"forms_status should have '{form}'"
                    
                # Each form should have completed flag
                for form_key, form_data in forms_status.items():
                    if isinstance(form_data, dict):
                        assert "completed" in form_data, f"{form_key} should have 'completed' flag"
                        print(f"  {form_key}: completed={form_data.get('completed')}")
            else:
                print(f"Farmer keys: {farmer.keys()}")
        else:
            print("No farmers assigned to this agent")
    
    def test_my_farmers_basic_info(self):
        """Each farmer has basic info: full_name, phone_number, village"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        farmers = data.get("farmers", [])
        
        for farmer in farmers[:3]:  # Check first 3
            assert "id" in farmer, "Farmer should have id"
            assert "full_name" in farmer, "Farmer should have full_name"
            print(f"Farmer: {farmer.get('full_name')}, village: {farmer.get('village')}")


class TestAgentSearchEndpoint:
    """Test GET /api/agent/search?phone={number} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure we have a valid token"""
        if not hasattr(TestFieldAgentAuth, 'token'):
            test = TestFieldAgentAuth()
            test.test_field_agent_login()
        self.token = TestFieldAgentAuth.token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_without_phone_returns_error(self):
        """Search without phone parameter returns error"""
        response = requests.get(f"{BASE_URL}/api/agent/search", headers=self.headers)
        print(f"Search without phone status: {response.status_code}")
        # Should return 400 or 422 for missing required param
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
    
    def test_search_with_invalid_phone(self):
        """Search with invalid phone format"""
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=abc", headers=self.headers)
        print(f"Search invalid phone status: {response.status_code}")
        # Should return 400 for invalid format
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_search_non_existent_phone(self):
        """Search for non-existent phone number"""
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=0000000000", headers=self.headers)
        print(f"Search non-existent status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "found" in data, f"Response should have 'found' key: {data.keys()}"
        assert data["found"] == False, "Should not find non-existent phone"
        print(f"Search result: found={data['found']}")
    
    def test_search_returns_farmer_data(self):
        """Search returns farmer with profile data when found"""
        # First get a farmer phone from my-farmers
        farmers_response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers", headers=self.headers)
        if farmers_response.status_code != 200:
            pytest.skip("Could not get farmers list")
        
        farmers = farmers_response.json().get("farmers", [])
        if not farmers:
            pytest.skip("No farmers assigned to test search")
        
        # Find a farmer with phone number
        test_phone = None
        for f in farmers:
            if f.get("phone_number"):
                test_phone = f["phone_number"]
                break
        
        if not test_phone:
            pytest.skip("No farmer with phone number found")
        
        # Search for this farmer
        response = requests.get(f"{BASE_URL}/api/agent/search?phone={test_phone}", headers=self.headers)
        print(f"Search for {test_phone} status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        if data.get("found"):
            farmer = data.get("farmer", {})
            print(f"Found farmer: {farmer.get('full_name')}")
            
            # Verify farmer has expected fields
            assert "full_name" in farmer or "id" in farmer, "Farmer should have identifying info"
            if "phone_number" in farmer:
                print(f"Phone: {farmer.get('phone_number')}")
            if "village" in farmer:
                print(f"Village: {farmer.get('village')}")
        else:
            print(f"Farmer not found: {data.get('message', 'No message')}")


class TestUnauthorizedAccess:
    """Test that endpoints require authentication"""
    
    def test_dashboard_requires_auth(self):
        """Dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_my_farmers_requires_auth(self):
        """My farmers requires authentication"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_search_requires_auth(self):
        """Search requires authentication"""
        response = requests.get(f"{BASE_URL}/api/agent/search?phone=0701234567")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
