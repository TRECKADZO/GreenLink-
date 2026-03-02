"""
SSRTE (Système de Suivi et Remédiation du Travail des Enfants) API Tests
Tests for: /api/ssrte/stats/overview, /api/ssrte/visits, /api/ssrte/cases, /api/ssrte/visits/create, /api/ssrte/cases/create
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestSSRTEAuth:
    """Test authentication for SSRTE access"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "coop-gagnoa@greenlink.ci",
            "password": "password"
        })
        assert response.status_code == 200, f"Coop login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_admin_login_success(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"Admin token obtained: {admin_token[:50]}...")
    
    def test_coop_login_success(self, coop_token):
        """Verify cooperative can login"""
        assert coop_token is not None
        assert len(coop_token) > 0
        print(f"Coop token obtained: {coop_token[:50]}...")


class TestSSRTEStatsAPI:
    """Test SSRTE statistics overview API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "coop-gagnoa@greenlink.ci",
            "password": "password"
        })
        return response.json()["access_token"]
    
    def test_stats_overview_admin(self, admin_token):
        """Test /api/ssrte/stats/overview with admin token"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/stats/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "visits" in data
        assert "cases" in data
        assert "remediations" in data
        assert "rates" in data
        
        # Verify visits structure
        assert "total" in data["visits"]
        assert "high_risk" in data["visits"]
        assert "monthly" in data["visits"]
        assert "risk_rate" in data["visits"]
        
        # Verify cases structure
        assert "total" in data["cases"]
        assert "identified" in data["cases"]
        assert "in_progress" in data["cases"]
        assert "resolved" in data["cases"]
        
        print(f"Stats overview (admin): visits={data['visits']['total']}, cases={data['cases']['total']}")
    
    def test_stats_overview_coop(self, coop_token):
        """Test /api/ssrte/stats/overview with coop token"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/stats/overview",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "visits" in data
        assert "cases" in data
        assert "remediations" in data
        assert "rates" in data
        
        print(f"Stats overview (coop): visits={data['visits']['total']}, cases={data['cases']['total']}")
    
    def test_stats_overview_unauthorized(self):
        """Test /api/ssrte/stats/overview without token"""
        response = requests.get(f"{BASE_URL}/api/ssrte/stats/overview")
        assert response.status_code in [401, 403]


class TestSSRTEVisitsAPI:
    """Test SSRTE visits API endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "coop-gagnoa@greenlink.ci",
            "password": "password"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def member_id(self, coop_token):
        """Get a member ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members?limit=1",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        if response.status_code == 200:
            members = response.json().get("members", [])
            if members:
                return members[0]["id"]
        pytest.skip("No members found for testing")
    
    def test_list_visits_admin(self, admin_token):
        """Test /api/ssrte/visits list with admin token"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/visits",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "visits" in data
        assert "total" in data
        assert isinstance(data["visits"], list)
        
        print(f"Visits list (admin): {data['total']} visits found")
        
        # If visits exist, verify visit structure
        if data["visits"]:
            visit = data["visits"][0]
            assert "id" in visit
            assert "agent_name" in visit
            print(f"First visit: {visit.get('id')}, agent: {visit.get('agent_name')}")
    
    def test_list_visits_coop(self, coop_token):
        """Test /api/ssrte/visits list with coop token"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/visits",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "visits" in data
        assert "total" in data
        
        print(f"Visits list (coop): {data['total']} visits found")
    
    def test_create_visit_success(self, coop_token, member_id):
        """Test /api/ssrte/visits/create endpoint"""
        visit_data = {
            "member_id": member_id,
            "household_size": 4,
            "children_count": 2,
            "children_details": [
                {"age": 12, "gender": "M", "in_school": True, "works_on_farm": False},
                {"age": 9, "gender": "F", "in_school": True, "works_on_farm": False}
            ],
            "living_conditions": "average",
            "has_piped_water": True,
            "has_electricity": True,
            "distance_to_school_km": 1.5,
            "observations": f"TEST_visit_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ssrte/visits/create",
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            },
            json=visit_data
        )
        assert response.status_code == 200, f"Visit creation failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert "message" in data
        assert "visit_id" in data
        assert "risk_level" in data
        
        # Low risk visit (no children at risk)
        assert data["risk_level"] == "low"
        
        print(f"Visit created: {data['visit_id']}, risk_level: {data['risk_level']}")
        
        return data["visit_id"]
    
    def test_create_high_risk_visit(self, coop_token, member_id):
        """Test creating a high risk visit (child working without school)"""
        visit_data = {
            "member_id": member_id,
            "household_size": 6,
            "children_count": 3,
            "children_details": [
                {"age": 14, "gender": "M", "in_school": True, "works_on_farm": True},
                {"age": 11, "gender": "F", "in_school": False, "works_on_farm": True},  # At risk
                {"age": 8, "gender": "M", "in_school": True, "works_on_farm": True}   # At risk (under 15)
            ],
            "living_conditions": "poor",
            "has_piped_water": False,
            "has_electricity": False,
            "distance_to_school_km": 5.0,
            "observations": f"TEST_high_risk_visit_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ssrte/visits/create",
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            },
            json=visit_data
        )
        assert response.status_code == 200, f"High risk visit creation failed: {response.text}"
        data = response.json()
        
        # Should be high risk
        assert data["risk_level"] == "high"
        assert data["children_at_risk"] >= 1
        
        print(f"High risk visit created: {data['visit_id']}, children_at_risk: {data['children_at_risk']}")
        
        return data["visit_id"]
    
    def test_create_visit_missing_member(self, coop_token):
        """Test /api/ssrte/visits/create with invalid member_id"""
        visit_data = {
            "member_id": "000000000000000000000000",  # Invalid ID
            "household_size": 4,
            "children_count": 2,
            "children_details": [],
            "living_conditions": "average"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ssrte/visits/create",
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            },
            json=visit_data
        )
        # Should return 404 for member not found
        assert response.status_code == 404


class TestSSRTECasesAPI:
    """Test SSRTE child labor cases API endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "coop-gagnoa@greenlink.ci",
            "password": "password"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_visit(self, coop_token):
        """Create a test visit for case creation"""
        # Get a member first
        members_response = requests.get(
            f"{BASE_URL}/api/cooperative/members?limit=1",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        if members_response.status_code != 200:
            pytest.skip("Cannot get members")
        
        members = members_response.json().get("members", [])
        if not members:
            pytest.skip("No members found")
        
        member_id = members[0]["id"]
        
        # Create visit
        visit_data = {
            "member_id": member_id,
            "household_size": 5,
            "children_count": 2,
            "children_details": [
                {"age": 10, "gender": "M", "in_school": False, "works_on_farm": True}
            ],
            "living_conditions": "poor",
            "observations": f"TEST_case_visit_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ssrte/visits/create",
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            },
            json=visit_data
        )
        
        if response.status_code != 200:
            pytest.skip(f"Cannot create test visit: {response.text}")
        
        data = response.json()
        return {"visit_id": data["visit_id"], "member_id": member_id}
    
    def test_list_cases_admin(self, admin_token):
        """Test /api/ssrte/cases list with admin token"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/cases",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "cases" in data
        assert "total" in data
        assert isinstance(data["cases"], list)
        
        print(f"Cases list (admin): {data['total']} cases found")
        
        # If cases exist, verify case structure
        if data["cases"]:
            case = data["cases"][0]
            assert "id" in case
            assert "child_name" in case
            assert "labor_type" in case
            assert "status" in case
            print(f"First case: {case.get('child_name')}, type: {case.get('labor_type')}")
    
    def test_list_cases_coop(self, coop_token):
        """Test /api/ssrte/cases list with coop token"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/cases",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "cases" in data
        assert "total" in data
        
        print(f"Cases list (coop): {data['total']} cases found")
    
    def test_create_case_success(self, coop_token, test_visit):
        """Test /api/ssrte/cases/create endpoint"""
        case_data = {
            "visit_id": test_visit["visit_id"],
            "member_id": test_visit["member_id"],
            "child_name": f"TEST_Child_{uuid.uuid4().hex[:6]}",
            "child_age": 10,
            "child_gender": "M",
            "labor_type": "hazardous",
            "activities_observed": ["carrying_loads", "harvesting"],
            "hours_per_day": 4.0,
            "school_attendance": "none",
            "description": "Child working without attending school - test case",
            "severity_score": 6
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ssrte/cases/create",
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            },
            json=case_data
        )
        assert response.status_code == 200, f"Case creation failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert "message" in data
        assert "case_id" in data
        assert "severity" in data
        
        print(f"Case created: {data['case_id']}, severity: {data['severity']}")
        
        return data["case_id"]
    
    def test_create_critical_case(self, coop_token, test_visit):
        """Test creating a critical severity case (score >= 8)"""
        case_data = {
            "visit_id": test_visit["visit_id"],
            "member_id": test_visit["member_id"],
            "child_name": f"TEST_Critical_{uuid.uuid4().hex[:6]}",
            "child_age": 8,
            "child_gender": "F",
            "labor_type": "worst_forms",
            "activities_observed": ["spraying", "carrying_loads"],
            "hours_per_day": 8.0,
            "school_attendance": "none",
            "description": "Critical case - worst forms of child labor",
            "severity_score": 9
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ssrte/cases/create",
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            },
            json=case_data
        )
        assert response.status_code == 200, f"Critical case creation failed: {response.text}"
        data = response.json()
        
        # Should be critical severity
        assert data["severity"] == "critical"
        
        print(f"Critical case created: {data['case_id']}")
    
    def test_create_case_invalid_visit(self, coop_token):
        """Test /api/ssrte/cases/create with invalid visit_id"""
        case_data = {
            "visit_id": "000000000000000000000000",  # Invalid ID
            "member_id": "000000000000000000000000",
            "child_name": "Test Child",
            "child_age": 10,
            "child_gender": "M",
            "labor_type": "hazardous",
            "activities_observed": [],
            "school_attendance": "none",
            "description": "Test case",
            "severity_score": 5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ssrte/cases/create",
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            },
            json=case_data
        )
        # Should return 404 for visit not found
        assert response.status_code == 404


class TestSSRTEAgentsAPI:
    """Test SSRTE agents management API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        return response.json()["access_token"]
    
    def test_list_agents(self, admin_token):
        """Test /api/ssrte/agents list"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/agents",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "agents" in data
        assert "total" in data
        
        print(f"SSRTE Agents: {data['total']} found")


class TestSSRTERemediationsAPI:
    """Test SSRTE remediations API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        return response.json()["access_token"]
    
    def test_list_remediations(self, admin_token):
        """Test /api/ssrte/remediations list"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/remediations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "remediations" in data
        assert "total" in data
        
        print(f"Remediations: {data['total']} found")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
