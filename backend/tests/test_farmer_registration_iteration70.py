"""
Iteration 70 - Farmer Registration Flow Tests
Tests for:
1. POST /api/cooperative/members - PIN code is MANDATORY (returns error without it)
2. POST /api/cooperative/members - creates member with auto-generated code_planteur, hashed PIN, hectares
3. POST /api/cooperative/members - creates ussd_registrations entry
4. GET /api/cooperative/members/activation-stats - returns stats (total, activated, pending, rate, pin count, code count)
5. POST /api/cooperative/members/{id}/send-reminder - sends MOCKED SMS reminder
6. USSD recognition - farmer created by coop is recognized when dialing *144*99# and choosing option 1
7. POST /api/auth/activate-member-account - member can activate and gets code_planteur
"""

import pytest
import requests
import os
import time
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cocoa-agritech.preview.emergentagent.com')

# Test credentials
COOP_EMAIL = "bielaghana@gmail.com"
COOP_PASSWORD = "474Treckadzo"


class TestFarmerRegistrationIteration70:
    """Test farmer registration flow with mandatory PIN and activation tracking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as cooperative before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_phone = f"+22505990{random.randint(10000, 99999)}"
        yield
        # Cleanup: Try to delete test member if created
        # (No direct delete endpoint, so we skip cleanup)
    
    # ============= PIN MANDATORY TESTS =============
    
    def test_create_member_without_pin_returns_error(self):
        """POST /api/cooperative/members without PIN should return 400 or 422 error"""
        response = requests.post(f"{BASE_URL}/api/cooperative/members", 
            headers=self.headers,
            json={
                "full_name": "Test Sans PIN",
                "phone_number": self.test_phone,
                "village": "TestVillage",
                "department": "DALO",
                "consent_given": True
                # No pin_code provided
            }
        )
        # 422 = Pydantic validation error (field required), 400 = custom validation
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}: {response.text}"
        data = response.json()
        # Check that error mentions pin_code field
        detail = str(data.get("detail", ""))
        assert "pin" in detail.lower() or "PIN" in detail, f"Error should mention PIN: {data}"
    
    def test_create_member_with_invalid_pin_returns_error(self):
        """POST /api/cooperative/members with invalid PIN (not 4 digits) should return 400"""
        # Test with 3 digits
        response = requests.post(f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": "Test PIN Court",
                "phone_number": f"+22505991{random.randint(10000, 99999)}",
                "village": "TestVillage",
                "department": "DALO",
                "consent_given": True,
                "pin_code": "123"  # Only 3 digits
            }
        )
        assert response.status_code == 400, f"Expected 400 for 3-digit PIN, got {response.status_code}"
        
        # Test with letters
        response2 = requests.post(f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": "Test PIN Lettres",
                "phone_number": f"+22505992{random.randint(10000, 99999)}",
                "village": "TestVillage",
                "department": "DALO",
                "consent_given": True,
                "pin_code": "12ab"  # Contains letters
            }
        )
        assert response2.status_code == 400, f"Expected 400 for non-numeric PIN, got {response2.status_code}"
    
    # ============= MEMBER CREATION WITH PIN AND HECTARES =============
    
    def test_create_member_with_valid_pin_and_hectares(self):
        """POST /api/cooperative/members with valid PIN and hectares should succeed"""
        test_phone = f"+22505993{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": "Test Planteur Complet",
                "phone_number": test_phone,
                "village": "Gagnoa Centre",
                "department": "GAGN",
                "zone": "Centre-Ouest",
                "consent_given": True,
                "pin_code": "1234",
                "hectares": 2.5
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response contains expected fields
        assert "member_id" in data, "Response should contain member_id"
        assert "code_planteur" in data, "Response should contain code_planteur"
        assert data.get("pin_configured") == True, "pin_configured should be True"
        
        # Verify code_planteur format (GL-XXX-NNNNN or similar)
        code = data.get("code_planteur", "")
        assert len(code) > 5, f"code_planteur should be non-empty: {code}"
        
        print(f"Created member with code_planteur: {code}")
        
        # Store for later tests
        self.created_member_id = data["member_id"]
        self.created_code_planteur = code
        self.created_phone = test_phone
        
        return data
    
    def test_ussd_registrations_entry_created(self):
        """Verify ussd_registrations entry is created when member is added"""
        # Create a member first
        test_phone = f"+22505994{random.randint(10000, 99999)}"
        response = requests.post(f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": "Test USSD Entry",
                "phone_number": test_phone,
                "village": "TestVillage",
                "department": "DALO",
                "consent_given": True,
                "pin_code": "5678",
                "hectares": 1.5
            }
        )
        assert response.status_code == 200, f"Member creation failed: {response.text}"
        
        # Now test USSD callback to verify the farmer is recognized
        ussd_response = requests.post(f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": f"test_session_{random.randint(1000, 9999)}",
                "serviceCode": "*144*99#",
                "phoneNumber": test_phone,
                "text": ""  # Initial dial
            }
        )
        assert ussd_response.status_code == 200, f"USSD callback failed: {ussd_response.text}"
        ussd_data = ussd_response.text
        
        # The farmer should be recognized (not asked to register)
        # Should show main menu or welcome message
        print(f"USSD response for recognized farmer: {ussd_data[:200]}")
        
        # Should NOT contain "inscription" or "register" prompts for new users
        # Should contain menu options for existing users
        assert "1." in ussd_data or "Bienvenue" in ussd_data or "menu" in ussd_data.lower(), \
            f"Farmer should be recognized by USSD: {ussd_data}"
    
    # ============= ACTIVATION STATS ENDPOINT =============
    
    def test_get_activation_stats(self):
        """GET /api/cooperative/members/activation-stats should return stats"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members/activation-stats",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
            "total_members",
            "activated_count",
            "pending_count",
            "activation_rate",
            "pin_configured_count",
            "code_planteur_count"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_members"], int), "total_members should be int"
        assert isinstance(data["activated_count"], int), "activated_count should be int"
        assert isinstance(data["pending_count"], int), "pending_count should be int"
        assert isinstance(data["activation_rate"], (int, float)), "activation_rate should be numeric"
        assert isinstance(data["pin_configured_count"], int), "pin_configured_count should be int"
        assert isinstance(data["code_planteur_count"], int), "code_planteur_count should be int"
        
        # Verify logical consistency
        assert data["total_members"] >= 0, "total_members should be >= 0"
        assert data["activated_count"] + data["pending_count"] == data["total_members"], \
            "activated + pending should equal total"
        assert 0 <= data["activation_rate"] <= 100, "activation_rate should be 0-100"
        
        print(f"Activation stats: {data}")
        return data
    
    def test_activation_stats_includes_pending_list(self):
        """GET /api/cooperative/members/activation-stats should include pending_activation list"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members/activation-stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have pending_activation list
        assert "pending_activation" in data, "Should include pending_activation list"
        assert isinstance(data["pending_activation"], list), "pending_activation should be a list"
        
        # If there are pending members, verify structure
        if len(data["pending_activation"]) > 0:
            member = data["pending_activation"][0]
            assert "id" in member, "Pending member should have id"
            assert "full_name" in member, "Pending member should have full_name"
            assert "phone_number" in member, "Pending member should have phone_number"
            assert "pin_configured" in member, "Pending member should have pin_configured"
            print(f"Sample pending member: {member}")
    
    # ============= SEND REMINDER ENDPOINT =============
    
    def test_send_activation_reminder(self):
        """POST /api/cooperative/members/{id}/send-reminder should send MOCKED SMS"""
        # First create a member to send reminder to
        test_phone = f"+22505995{random.randint(10000, 99999)}"
        create_response = requests.post(f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": "Test Reminder Member",
                "phone_number": test_phone,
                "village": "TestVillage",
                "department": "DALO",
                "consent_given": True,
                "pin_code": "9999"
            }
        )
        assert create_response.status_code == 200, f"Member creation failed: {create_response.text}"
        member_id = create_response.json()["member_id"]
        
        # Now send reminder
        reminder_response = requests.post(
            f"{BASE_URL}/api/cooperative/members/{member_id}/send-reminder",
            headers=self.headers
        )
        assert reminder_response.status_code == 200, f"Send reminder failed: {reminder_response.text}"
        data = reminder_response.json()
        
        # Verify response indicates SMS was mocked
        assert "message" in data, "Response should have message"
        assert data.get("sms_mocked") == True or "simulé" in data.get("note", "").lower() or "mocked" in str(data).lower(), \
            f"Response should indicate SMS is mocked: {data}"
        
        print(f"Reminder response: {data}")
    
    def test_send_reminder_to_nonexistent_member_returns_404(self):
        """POST /api/cooperative/members/{invalid_id}/send-reminder should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members/000000000000000000000000/send-reminder",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_send_reminder_to_already_activated_member_returns_400(self):
        """POST /api/cooperative/members/{id}/send-reminder for activated member should return 400"""
        # This test requires finding an already activated member
        # First get activation stats to find if there are any activated members
        stats_response = requests.get(f"{BASE_URL}/api/cooperative/members/activation-stats",
            headers=self.headers
        )
        stats = stats_response.json()
        
        # If there are recent activations, try to send reminder to one
        if stats.get("recent_activations") and len(stats["recent_activations"]) > 0:
            activated_member_id = stats["recent_activations"][0]["id"]
            response = requests.post(
                f"{BASE_URL}/api/cooperative/members/{activated_member_id}/send-reminder",
                headers=self.headers
            )
            # Should return 400 because member is already activated
            assert response.status_code == 400, f"Expected 400 for activated member, got {response.status_code}"
            print(f"Correctly rejected reminder for activated member: {response.json()}")
        else:
            pytest.skip("No activated members found to test this scenario")
    
    # ============= MEMBER ACTIVATION FLOW =============
    
    def test_member_activation_gets_code_planteur(self):
        """POST /api/auth/activate-member-account should return code_planteur"""
        # Create a member first
        test_phone = f"+22505996{random.randint(10000, 99999)}"
        create_response = requests.post(f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": "Test Activation Flow",
                "phone_number": test_phone,
                "village": "TestVillage",
                "department": "DALO",
                "consent_given": True,
                "pin_code": "4321",
                "hectares": 3.0
            }
        )
        assert create_response.status_code == 200
        created_code = create_response.json()["code_planteur"]
        
        # Now activate the member account
        activate_response = requests.post(f"{BASE_URL}/api/auth/activate-member-account",
            json={
                "phone_number": test_phone,
                "password": "testpassword123"
            }
        )
        assert activate_response.status_code == 200, f"Activation failed: {activate_response.text}"
        data = activate_response.json()
        
        # Verify user has code_planteur
        assert "user" in data, "Response should contain user"
        user = data["user"]
        assert user.get("code_planteur") == created_code, \
            f"User should have code_planteur {created_code}, got {user.get('code_planteur')}"
        
        print(f"Activated user with code_planteur: {user.get('code_planteur')}")
    
    # ============= USSD RECOGNITION TEST =============
    
    def test_ussd_recognizes_coop_created_farmer(self):
        """USSD callback should recognize farmer created by cooperative"""
        # Create a member
        test_phone = f"+22505997{random.randint(10000, 99999)}"
        create_response = requests.post(f"{BASE_URL}/api/cooperative/members",
            headers=self.headers,
            json={
                "full_name": "Test USSD Recognition",
                "phone_number": test_phone,
                "village": "TestVillage",
                "department": "DALO",
                "consent_given": True,
                "pin_code": "1111"
            }
        )
        assert create_response.status_code == 200
        
        # Simulate USSD dial
        session_id = f"test_ussd_{random.randint(10000, 99999)}"
        
        # Initial dial
        ussd_response = requests.post(f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": test_phone,
                "text": ""
            }
        )
        assert ussd_response.status_code == 200
        initial_menu = ussd_response.text
        print(f"Initial USSD menu: {initial_menu[:300]}")
        
        # Select option 1 (usually "Consulter mon compte" or similar)
        ussd_response2 = requests.post(f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": test_phone,
                "text": "1"
            }
        )
        assert ussd_response2.status_code == 200
        option1_response = ussd_response2.text
        print(f"Option 1 response: {option1_response[:300]}")
        
        # The farmer should be recognized and not asked to register
        # Response should contain account info or PIN prompt
        assert "inscription" not in option1_response.lower() or "PIN" in option1_response or "compte" in option1_response.lower(), \
            f"Farmer should be recognized: {option1_response}"


class TestMembersListWithActivationInfo:
    """Test that members list includes activation-related fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_members_list_includes_pin_configured(self):
        """GET /api/cooperative/members should include pin_configured field"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "members" in data, "Response should have members list"
        if len(data["members"]) > 0:
            member = data["members"][0]
            assert "pin_configured" in member, "Member should have pin_configured field"
            assert "code_planteur" in member, "Member should have code_planteur field"
            print(f"Sample member: {member.get('full_name')} - PIN: {member.get('pin_configured')}, Code: {member.get('code_planteur')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
