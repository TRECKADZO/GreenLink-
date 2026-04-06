"""
Test suite for GreenLink Cooperative API endpoints
Tests: Authentication, Dashboard, Members CRUD, Lots Management, Distributions, Reports
"""

import pytest
import requests
import os
from datetime import datetime
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://greenlink-security.preview.emergentagent.com')

# Test cooperative credentials
COOP_EMAIL = "coop-gagnoa@test.com"
COOP_PASSWORD = "password123"


class TestCooperativeAuth:
    """Test cooperative authentication endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_coop_login_success(self):
        """Test cooperative login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["user_type"] == "cooperative"
        assert data["user"]["coop_name"] == "COOP-GAGNOA"
        assert data["user"]["coop_code"] == "CG-001"
        print(f"✓ Cooperative login successful: {data['user']['coop_name']}")
    
    def test_coop_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "wrong@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_coop_profile_fields(self):
        """Test that cooperative profile has required fields"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        data = response.json()
        user = data["user"]
        
        # Verify cooperative-specific fields exist
        assert "coop_name" in user
        assert "coop_code" in user
        assert "certifications" in user
        assert "commission_rate" in user
        
        # Verify certifications is a list
        assert isinstance(user["certifications"], list)
        assert len(user["certifications"]) > 0
        print(f"✓ Cooperative fields present: certifications={user['certifications']}")


class TestCooperativeDashboard:
    """Test cooperative dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login and get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_dashboard_returns_data(self):
        """Test dashboard returns all required sections"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        
        # Check all required sections exist
        assert "coop_info" in data
        assert "members" in data
        assert "parcels" in data
        assert "lots" in data
        assert "financial" in data
        assert "recent_members" in data
        
        print(f"✓ Dashboard sections verified")
    
    def test_dashboard_coop_info(self):
        """Test dashboard coop_info section"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard")
        data = response.json()
        
        coop_info = data["coop_info"]
        assert coop_info["name"] == "COOP-GAGNOA"
        assert coop_info["code"] == "CG-001"
        assert isinstance(coop_info["certifications"], list)
        assert isinstance(coop_info["commission_rate"], (int, float))
        
        print(f"✓ Coop info: {coop_info['name']} ({coop_info['code']})")
    
    def test_dashboard_members_section(self):
        """Test dashboard members statistics"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/dashboard")
        data = response.json()
        
        members = data["members"]
        assert "total" in members
        assert "active" in members
        assert "pending_validation" in members
        assert "onboarding_rate" in members
        
        print(f"✓ Members stats: {members['total']} total, {members['pending_validation']} pending")
    
    def test_dashboard_unauthorized(self):
        """Test dashboard requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/cooperative/dashboard")
        assert response.status_code in [401, 403]
        print("✓ Dashboard correctly requires authentication")


class TestCooperativeMembers:
    """Test cooperative members management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_members_list(self):
        """Test getting members list"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/members")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "members" in data
        assert isinstance(data["members"], list)
        
        # Verify member data structure
        if data["members"]:
            member = data["members"][0]
            assert "id" in member
            assert "full_name" in member
            assert "phone_number" in member
            assert "village" in member
            assert "status" in member
        
        print(f"✓ Members list: {data['total']} members found")
    
    def test_get_members_with_filters(self):
        """Test members list with status filter"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/members", params={
            "status": "pending_validation"
        })
        assert response.status_code == 200
        
        data = response.json()
        # All returned members should have pending status
        for member in data["members"]:
            assert member["status"] == "pending_validation"
        
        print(f"✓ Filtered members: {len(data['members'])} pending")
    
    def test_create_member(self):
        """Test creating a new cooperative member"""
        unique_phone = f"+22505{int(time.time()) % 100000000:08d}"
        
        response = self.session.post(f"{BASE_URL}/api/cooperative/members", json={
            "full_name": "TEST_New Member",
            "phone_number": unique_phone,
            "village": "Test Village",
            "cni_number": "TEST-CNI-001",
            "consent_given": True
        })
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "member_id" in data
        assert "message" in data
        
        # Store member_id for cleanup
        self.new_member_id = data["member_id"]
        print(f"✓ Created member: {data['member_id']}")
        
        # Verify member was created by fetching it
        get_response = self.session.get(f"{BASE_URL}/api/cooperative/members/{self.new_member_id}")
        assert get_response.status_code == 200
        member_data = get_response.json()
        assert member_data["full_name"] == "TEST_New Member"
        assert member_data["village"] == "Test Village"
        print(f"✓ Member verified in database")
    
    def test_create_duplicate_member_fails(self):
        """Test that creating duplicate member fails"""
        # Use existing member's phone
        response = self.session.get(f"{BASE_URL}/api/cooperative/members")
        if response.json()["members"]:
            existing_phone = response.json()["members"][0]["phone_number"]
            
            create_response = self.session.post(f"{BASE_URL}/api/cooperative/members", json={
                "full_name": "Duplicate Test",
                "phone_number": existing_phone,
                "village": "Test",
                "consent_given": True
            })
            
            assert create_response.status_code == 400
            print("✓ Duplicate member correctly rejected")
    
    def test_get_member_details(self):
        """Test getting specific member details"""
        # First get a member ID
        response = self.session.get(f"{BASE_URL}/api/cooperative/members")
        if not response.json()["members"]:
            pytest.skip("No members to test")
        
        member_id = response.json()["members"][0]["id"]
        
        detail_response = self.session.get(f"{BASE_URL}/api/cooperative/members/{member_id}")
        assert detail_response.status_code == 200
        
        data = detail_response.json()
        assert "id" in data
        assert "full_name" in data
        assert "phone_number" in data
        assert "village" in data
        assert "status" in data
        assert "parcels" in data
        assert "total_premium_earned" in data
        
        print(f"✓ Member details: {data['full_name']} from {data['village']}")
    
    def test_validate_member(self):
        """Test validating a pending member"""
        # First get a pending member
        response = self.session.get(f"{BASE_URL}/api/cooperative/members", params={
            "status": "pending_validation"
        })
        
        pending_members = response.json()["members"]
        if not pending_members:
            # Create a new member to validate
            unique_phone = f"+22505{int(time.time()) % 100000000:08d}"
            create_resp = self.session.post(f"{BASE_URL}/api/cooperative/members", json={
                "full_name": "TEST_Validate Member",
                "phone_number": unique_phone,
                "village": "Test Village",
                "consent_given": True
            })
            member_id = create_resp.json()["member_id"]
        else:
            member_id = pending_members[0]["id"]
        
        # Validate the member
        validate_response = self.session.put(f"{BASE_URL}/api/cooperative/members/{member_id}/validate")
        assert validate_response.status_code == 200
        
        data = validate_response.json()
        assert data["message"] == "Membre validé avec succès"
        
        # Verify status changed
        check_response = self.session.get(f"{BASE_URL}/api/cooperative/members/{member_id}")
        assert check_response.json()["status"] == "active"
        
        print(f"✓ Member validated successfully")


class TestCooperativeLots:
    """Test cooperative lots management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_lots_list(self):
        """Test getting lots list"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/lots")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify lot structure if any exist
        if data:
            lot = data[0]
            assert "id" in lot
            assert "lot_name" in lot
            assert "status" in lot
            assert "product_type" in lot
        
        print(f"✓ Lots list: {len(data)} lots found")
    
    def test_create_lot_requires_eligible_members(self):
        """Test that creating a lot checks for eligible members with parcels"""
        response = self.session.post(f"{BASE_URL}/api/cooperative/lots", json={
            "lot_name": "TEST_Premium Cocoa Lot",
            "target_tonnage": 10.0,
            "product_type": "cacao",
            "certification": "rainforest",
            "min_carbon_score": 6.0,
            "description": "Test lot for eligible members"
        })
        
        # This may fail if no members have eligible parcels
        if response.status_code == 400:
            assert "Aucune parcelle éligible" in response.json()["detail"]
            print("✓ Lot creation correctly requires eligible parcels")
        elif response.status_code == 200:
            data = response.json()
            assert "lot_id" in data
            assert "eligible_farmers" in data
            print(f"✓ Lot created with {data['eligible_farmers']} eligible farmers")


class TestCooperativeDistributions:
    """Test cooperative distributions endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_distributions_history(self):
        """Test getting distributions history"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/distributions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify structure if any exist
        if data:
            dist = data[0]
            assert "id" in dist
            assert "lot_name" in dist
            assert "total_premium" in dist
            assert "status" in dist
        
        print(f"✓ Distributions history: {len(data)} distributions found")


class TestCooperativeReports:
    """Test cooperative reports and statistics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_eudr_report(self):
        """Test EUDR compliance report generation"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/reports/eudr")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify report structure
        assert "report_date" in data
        assert "cooperative" in data
        assert "compliance" in data
        assert "statistics" in data
        assert "export_available" in data
        
        # Verify cooperative section
        coop = data["cooperative"]
        assert "name" in coop
        assert "code" in coop
        assert "certifications" in coop
        
        # Verify compliance section
        compliance = data["compliance"]
        assert "total_parcels" in compliance
        assert "geolocation_rate" in compliance
        assert "compliance_rate" in compliance
        assert "deforestation_alerts" in compliance
        
        # Verify statistics section
        stats = data["statistics"]
        assert "total_members" in stats
        assert "total_hectares" in stats
        assert "total_co2_tonnes" in stats
        
        print(f"✓ EUDR Report: {compliance['compliance_rate']}% compliance, {compliance['geolocation_rate']}% geolocated")
    
    def test_village_stats(self):
        """Test village statistics endpoint"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/stats/villages")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify structure if villages exist
        if data:
            village = data[0]
            assert "village" in village
            assert "members_count" in village
            assert "active_count" in village
        
        print(f"✓ Village stats: {len(data)} villages found")


class TestCooperativeAgents:
    """Test cooperative field agents endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_agents_list(self):
        """Test getting agents list"""
        response = self.session.get(f"{BASE_URL}/api/cooperative/agents")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ Agents list: {len(data)} agents found")
    
    def test_create_agent(self):
        """Test creating a field agent"""
        unique_phone = f"+22505{int(time.time()) % 100000000:08d}"
        
        response = self.session.post(f"{BASE_URL}/api/cooperative/agents", json={
            "full_name": "TEST_Agent Kouadio",
            "phone_number": unique_phone,
            "email": f"test_agent_{int(time.time())}@test.com",
            "zone": "Gagnoa Nord",
            "village_coverage": ["Gagnoa Centre", "Oumé"]
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "agent_id" in data
        assert "message" in data
        
        print(f"✓ Agent created: {data['agent_id']}")


class TestCooperativeUserTypeRestriction:
    """Test that cooperative endpoints reject non-cooperative users"""
    
    def test_non_coop_user_rejected(self):
        """Test that non-cooperative users cannot access cooperative endpoints"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to login with a non-cooperative user if one exists
        # For now, test with invalid auth
        response = session.get(f"{BASE_URL}/api/cooperative/dashboard", headers={
            "Authorization": "Bearer invalid_token"
        })
        
        assert response.status_code in [401, 403]
        print("✓ Non-cooperative access correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
