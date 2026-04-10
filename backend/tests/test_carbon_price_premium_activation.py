from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test Carbon Price Management, Premium Distribution, and Member/Agent Activation Flows
Test Carbon Price Management, Premium Distribution, and Member/Agent Activation Flows
Tests for iteration 23 - Verify:
Tests for iteration 23 - Verify:
1. Carbon listing submission WITHOUT price (cooperative sets quantity only)
1. Carbon listing submission WITHOUT price (cooperative sets quantity only)
2. Admin approval WITH price (admin sets price_per_tonne)
2. Admin approval WITH price (admin sets price_per_tonne)
3. Admin approval FAILS without price
3. Admin approval FAILS without price
4. Premium distribution calculation (30% fees, 70/25/5 split)
4. Premium distribution calculation (30% fees, 70/25/5 split)
5. Simulate premium endpoint
5. Simulate premium endpoint
6. Carbon price management (GET/PUT)
6. Carbon price management (GET/PUT)
7. Member activation flow (check phone -> activate)
7. Member activation flow (check phone -> activate)
8. Agent activation flow (check phone -> activate)
8. Agent activation flow (check phone -> activate)
"""
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_IDENTIFIER = ADMIN_EMAIL
# ADMIN_PASSWORD imported from test_config
COOP_IDENTIFIER = "coop-gagnoa@greenlink.ci"
COOP_PASSWORD = "password"


class TestAuthLogin:
    """Test login functionality for admin and cooperative"""
    
    def test_admin_login(self):
        """Test admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login status: {response.status_code}")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "admin"
        print("PASS: Admin login successful")
    
    def test_cooperative_login(self):
        """Test cooperative login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        print(f"Cooperative login status: {response.status_code}")
        assert response.status_code == 200, f"Coop login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "cooperative"
        print("PASS: Cooperative login successful")


class TestCarbonListingNoPrice:
    """Test carbon listing submission without price (cooperative submits quantity only)"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Cooperative login failed")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_submit_carbon_listing_without_price(self, coop_token):
        """Cooperative submits carbon listing with quantity only (NO price_per_tonne)"""
        unique_id = str(uuid.uuid4())[:6]
        payload = {
            "credit_type": "Agroforesterie",
            "project_name": f"TEST_Project_{unique_id}",
            "project_description": "Test project for carbon credits without price",
            "verification_standard": "Verra VCS",
            "quantity_tonnes_co2": 100,
            "vintage_year": 2024,
            "region": "Sud-Ouest",
            "department": "Soubré",
            # NO price_per_tonne - admin will set it
        }
        
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        print(f"Submit carbon listing response: {response.status_code}")
        assert response.status_code == 200, f"Submit failed: {response.text}"
        data = response.json()
        assert "listing_id" in data
        assert data["status"] == "pending_approval"
        print(f"PASS: Carbon listing submitted without price. listing_id={data['listing_id']}")
        return data["listing_id"]


class TestAdminApprovalWithPrice:
    """Test admin approval workflow - admin must set price when approving"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Cooperative login failed")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def pending_listing(self, coop_token):
        """Create a pending listing to test approval"""
        unique_id = str(uuid.uuid4())[:6]
        payload = {
            "credit_type": "Reforestation",
            "project_name": f"TEST_Approval_{unique_id}",
            "project_description": "Test project for approval workflow",
            "verification_standard": "Gold Standard",
            "quantity_tonnes_co2": 500,
            "vintage_year": 2024,
            "region": "Centre",
            "department": "Bouaké",
        }
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        if response.status_code == 200:
            return response.json()["listing_id"]
        pytest.skip("Failed to create pending listing")
    
    def test_admin_approval_without_price_fails(self, admin_token, pending_listing):
        """Admin approval without price_per_tonne should fail with 400"""
        response = requests.put(
            f"{BASE_URL}/api/carbon-listings/{pending_listing}/review",
            json={"action": "approve", "admin_note": "Testing without price"},  # NO price_per_tonne
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Approval without price response: {response.status_code}")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "prix" in response.text.lower() or "price" in response.text.lower()
        print("PASS: Admin approval without price correctly fails with 400")
    
    def test_admin_approval_with_price_succeeds(self, admin_token, coop_token):
        """Admin approval with price_per_tonne should succeed"""
        # Create a new listing for this test
        unique_id = str(uuid.uuid4())[:6]
        payload = {
            "credit_type": "Agriculture Régénérative",
            "project_name": f"TEST_ApproveWithPrice_{unique_id}",
            "project_description": "Test approval with price",
            "verification_standard": "Plan Vivo",
            "quantity_tonnes_co2": 250,
            "vintage_year": 2024,
            "region": "Ouest",
            "department": "Man",
        }
        submit_resp = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert submit_resp.status_code == 200
        listing_id = submit_resp.json()["listing_id"]
        
        # Admin approves with price
        response = requests.put(
            f"{BASE_URL}/api/carbon-listings/{listing_id}/review",
            json={
                "action": "approve",
                "price_per_tonne": 18000,
                "admin_note": "Approved with price"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Approval with price response: {response.status_code}")
        assert response.status_code == 200, f"Approval failed: {response.text}"
        data = response.json()
        assert data["price_per_tonne"] == 18000
        assert "premium_distribution" in data
        print(f"PASS: Admin approval with price succeeds. Distribution: {data['premium_distribution']}")


class TestPremiumDistribution:
    """Test premium distribution calculation: 30% fees, then 70% farmer / 25% greenlink / 5% coop"""
    
    def test_premium_distribution_calculation(self):
        """Verify premium distribution formula via simulate-premium endpoint"""
        # quantity_tonnes=500, price_per_tonne=20000 (default if not set)
        response = requests.get(f"{BASE_URL}/api/carbon-listings/simulate-premium?quantity_tonnes=500&price_per_tonne=20000")
        print(f"Simulate premium response: {response.status_code}")
        assert response.status_code == 200, f"Simulate premium failed: {response.text}"
        data = response.json()
        
        # Verify calculations
        # total = 500 * 20000 = 10,000,000
        # fees = 10,000,000 * 0.30 = 3,000,000
        # net = 7,000,000
        # farmer = 7,000,000 * 0.70 = 4,900,000
        # greenlink = 7,000,000 * 0.25 = 1,750,000
        # coop = 7,000,000 * 0.05 = 350,000
        
        assert data["total_revenue"] == 10000000
        assert data["fees"] == 3000000
        assert data["fees_rate"] == 0.30
        assert data["net_amount"] == 7000000
        assert data["farmer_premium"] == 4900000
        assert data["farmer_rate"] == 0.70
        assert data["greenlink_revenue"] == 1750000
        assert data["greenlink_rate"] == 0.25
        assert data["coop_commission"] == 350000
        assert data["coop_rate"] == 0.05
        
        print(f"PASS: Premium distribution verified correctly")
        print(f"  Total: {data['total_revenue']:,} XOF")
        print(f"  Fees (30%): {data['fees']:,} XOF")
        print(f"  Net: {data['net_amount']:,} XOF")
        print(f"  Farmer (70%): {data['farmer_premium']:,} XOF")
        print(f"  GreenLink (25%): {data['greenlink_revenue']:,} XOF")
        print(f"  Coop (5%): {data['coop_commission']:,} XOF")
    
    def test_simulate_premium_uses_default_price(self):
        """Simulate premium uses default price when not specified"""
        response = requests.get(f"{BASE_URL}/api/carbon-listings/simulate-premium?quantity_tonnes=100")
        print(f"Simulate with default price response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "price_per_tonne" in data
        assert data["quantity_tonnes"] == 100
        print(f"PASS: Simulate premium uses default price: {data['price_per_tonne']} XOF")


class TestCarbonPriceManagement:
    """Test carbon price management endpoints (admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_carbon_price_public(self):
        """GET /carbon-price should be accessible without auth"""
        response = requests.get(f"{BASE_URL}/api/carbon-listings/carbon-price")
        print(f"Get carbon price response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "default_price_per_tonne" in data
        assert data["currency"] == "XOF"
        print(f"PASS: Carbon price accessible: {data['default_price_per_tonne']} XOF")
    
    def test_update_carbon_price_admin_only(self, admin_token):
        """PUT /carbon-price requires admin auth"""
        # Test without auth
        response = requests.put(
            f"{BASE_URL}/api/carbon-listings/carbon-price",
            json={"default_price_per_tonne": 17500}
        )
        print(f"Update price without auth: {response.status_code}")
        assert response.status_code in [401, 403], "Expected 401/403 without auth"
        
        # Test with admin auth
        response = requests.put(
            f"{BASE_URL}/api/carbon-listings/carbon-price",
            json={"default_price_per_tonne": 17500},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Update price with admin auth: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert data["default_price_per_tonne"] == 17500
        print("PASS: Admin can update carbon price")
        
        # Reset to default
        requests.put(
            f"{BASE_URL}/api/carbon-listings/carbon-price",
            json={"default_price_per_tonne": 15000},
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestMemberActivationFlow:
    """Test member activation: check phone -> activate account -> login"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Cooperative login failed")
    
    def test_check_member_phone_not_found(self):
        """Check phone that doesn't exist as member"""
        fake_phone = "+225999999999"
        response = requests.get(f"{BASE_URL}/api/auth/check-member-phone/{fake_phone}")
        print(f"Check fake phone response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False
        assert data["can_activate"] == False
        assert data["reason"] == "not_found"
        print("PASS: Non-existent member phone correctly returns not_found")
    
    def test_member_activation_full_flow(self, coop_token):
        """Full flow: coop creates member -> check phone -> activate -> login"""
        unique_id = str(uuid.uuid4())[:6]
        test_phone = f"+225070{unique_id[:6].replace('-', '0')}"
        test_password = "testpass123"
        
        # Step 1: Cooperative creates member
        member_payload = {
            "full_name": f"TEST_Member_{unique_id}",
            "phone_number": test_phone,
            "village": "Test Village",
            "department": "Gagnoa",
            "zone": "Centre-Ouest",
            "consent_given": True
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            json=member_payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        print(f"Create member response: {create_resp.status_code}")
        
        if create_resp.status_code != 200:
            # Member might already exist, try with different phone
            test_phone = f"+225071{unique_id[:6].replace('-', '1')}"
            member_payload["phone_number"] = test_phone
            create_resp = requests.post(
                f"{BASE_URL}/api/cooperative/members",
                json=member_payload,
                headers={"Authorization": f"Bearer {coop_token}"}
            )
        
        assert create_resp.status_code == 200, f"Create member failed: {create_resp.text}"
        print(f"PASS: Member created with phone {test_phone}")
        
        # Step 2: Check phone - should find the member
        check_resp = requests.get(f"{BASE_URL}/api/auth/check-member-phone/{test_phone}")
        print(f"Check member phone response: {check_resp.status_code}")
        assert check_resp.status_code == 200
        check_data = check_resp.json()
        assert check_data["found"] == True
        assert check_data["can_activate"] == True
        assert "cooperative_name" in check_data
        print(f"PASS: Member phone found, can activate. Coop: {check_data.get('cooperative_name')}")
        
        # Step 3: Activate account
        activate_resp = requests.post(
            f"{BASE_URL}/api/auth/activate-member-account",
            json={"phone_number": test_phone, "password": test_password}
        )
        print(f"Activate member response: {activate_resp.status_code}")
        assert activate_resp.status_code == 200, f"Activation failed: {activate_resp.text}"
        activate_data = activate_resp.json()
        assert "access_token" in activate_data
        assert activate_data["user"]["user_type"] == "producteur"
        print(f"PASS: Member account activated successfully")
        
        # Step 4: Login with the new credentials
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": test_phone,
            "password": test_password
        })
        print(f"Login with activated account: {login_resp.status_code}")
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert "access_token" in login_data
        print("PASS: Member can login after activation")
        
        # Cleanup: Mark as TEST user (leave for manual cleanup)
        return test_phone


class TestAgentActivationFlow:
    """Test agent activation: check phone -> activate account -> login"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Cooperative login failed")
    
    def test_check_agent_phone_not_found(self):
        """Check phone that doesn't exist as agent"""
        fake_phone = "+225888888888"
        response = requests.get(f"{BASE_URL}/api/auth/check-agent-phone/{fake_phone}")
        print(f"Check fake agent phone response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False
        assert data["can_activate"] == False
        assert data["reason"] == "not_found"
        print("PASS: Non-existent agent phone correctly returns not_found")
    
    def test_agent_activation_full_flow(self, coop_token):
        """Full flow: coop creates agent -> check phone -> activate -> login"""
        unique_id = str(uuid.uuid4())[:6]
        test_phone = f"+225080{unique_id[:6].replace('-', '2')}"
        test_password = "agentpass123"
        
        # Step 1: Cooperative creates agent
        agent_payload = {
            "full_name": f"TEST_Agent_{unique_id}",
            "phone_number": test_phone,
            "email": f"test_agent_{unique_id}@test.com",
            "zone": "Zone Sud",
            "village_coverage": ["Village A", "Village B"]
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/cooperative/agents",
            json=agent_payload,
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        print(f"Create agent response: {create_resp.status_code}")
        
        if create_resp.status_code != 200:
            # Agent might already exist, try with different phone
            test_phone = f"+225081{unique_id[:6].replace('-', '3')}"
            agent_payload["phone_number"] = test_phone
            create_resp = requests.post(
                f"{BASE_URL}/api/cooperative/agents",
                json=agent_payload,
                headers={"Authorization": f"Bearer {coop_token}"}
            )
        
        assert create_resp.status_code == 200, f"Create agent failed: {create_resp.text}"
        print(f"PASS: Agent created with phone {test_phone}")
        
        # Step 2: Check phone - should find the agent
        check_resp = requests.get(f"{BASE_URL}/api/auth/check-agent-phone/{test_phone}")
        print(f"Check agent phone response: {check_resp.status_code}")
        assert check_resp.status_code == 200
        check_data = check_resp.json()
        assert check_data["found"] == True
        assert check_data["can_activate"] == True
        assert check_data["account_type"] == "field_agent"
        print(f"PASS: Agent phone found, can activate. Coop: {check_data.get('cooperative_name')}")
        
        # Step 3: Activate account
        activate_resp = requests.post(
            f"{BASE_URL}/api/auth/activate-agent-account",
            json={"phone_number": test_phone, "password": test_password}
        )
        print(f"Activate agent response: {activate_resp.status_code}")
        assert activate_resp.status_code == 200, f"Activation failed: {activate_resp.text}"
        activate_data = activate_resp.json()
        assert "access_token" in activate_data
        assert activate_data["user"]["user_type"] == "field_agent"
        assert "permissions" in activate_data
        print(f"PASS: Agent account activated with permissions: {activate_data['permissions']}")
        
        # Step 4: Login with the new credentials
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": test_phone,
            "password": test_password
        })
        print(f"Login with activated agent account: {login_resp.status_code}")
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert "access_token" in login_data
        assert login_data["user"]["user_type"] == "field_agent"
        print("PASS: Agent can login after activation")
        
        return test_phone


class TestCarbonListingStats:
    """Test carbon listing stats endpoint"""
    
    def test_carbon_stats_includes_distribution_model(self):
        """Stats endpoint returns distribution model info"""
        response = requests.get(f"{BASE_URL}/api/carbon-listings/stats")
        print(f"Carbon stats response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "distribution_model" in data
        assert data["distribution_model"]["fees_rate"] == "30%"
        assert data["distribution_model"]["farmer_share"] == "70% du net"
        assert data["distribution_model"]["greenlink_share"] == "25% du net"
        assert data["distribution_model"]["coop_share"] == "5% du net"
        print(f"PASS: Stats include distribution model. Pending: {data['pending']}, Approved: {data['approved']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
