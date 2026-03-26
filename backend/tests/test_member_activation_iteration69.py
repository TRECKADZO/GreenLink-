"""
Test Member Activation Flow - Iteration 69
Tests for:
1. POST /api/cooperative/members - creates member with auto-generated code_planteur and hashed PIN
2. POST /api/cooperative/members - ussd_registrations entry is also created
3. POST /api/auth/activate-member-account - member can activate using phone and password
4. POST /api/auth/activate-member-account - activated user receives code_planteur from coop_members
5. GET /api/auth/check-member-phone/{phone} - returns found=true, can_activate=true for new coop member
6. USSD recognition - farmer created by coop is recognized by USSD callback
"""

import pytest
import requests
import os
import time
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_EMAIL = "bielaghana@gmail.com"
COOP_PASSWORD = "474Treckadzo"

# Generate unique test phone number
TEST_PHONE = f"+2250599{random.randint(100000, 999999)}"
TEST_PIN = "1234"
TEST_NAME = "Test Planteur Activation"
TEST_VILLAGE = "Daloa Test"
TEST_DEPARTMENT = "DALO"


class TestMemberActivationFlow:
    """Test the complete member activation flow"""
    
    coop_token = None
    created_member_id = None
    created_code_planteur = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as cooperative to get token"""
        if not TestMemberActivationFlow.coop_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": COOP_EMAIL,
                "password": COOP_PASSWORD
            })
            assert response.status_code == 200, f"Coop login failed: {response.text}"
            data = response.json()
            TestMemberActivationFlow.coop_token = data.get("access_token")
            assert TestMemberActivationFlow.coop_token, "No access token returned"
            print(f"✓ Cooperative login successful, user_type: {data.get('user', {}).get('user_type')}")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestMemberActivationFlow.coop_token}"}
    
    # ============= TEST 1: Create member with code_planteur and PIN =============
    def test_01_create_member_with_code_planteur_and_pin(self):
        """POST /api/cooperative/members creates member with auto-generated code_planteur and hashed PIN"""
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.get_auth_headers(),
            json={
                "full_name": TEST_NAME,
                "phone_number": TEST_PHONE,
                "village": TEST_VILLAGE,
                "department": TEST_DEPARTMENT,
                "zone": "Centre-Ouest",
                "consent_given": True,
                "pin_code": TEST_PIN
            }
        )
        
        print(f"Create member response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Create member failed: {response.text}"
        
        data = response.json()
        
        # Verify response contains code_planteur
        assert "code_planteur" in data, "Response missing code_planteur"
        assert data["code_planteur"], "code_planteur is empty"
        assert data["code_planteur"].startswith("GL-"), f"code_planteur format wrong: {data['code_planteur']}"
        
        # Verify PIN was configured
        assert "pin_configured" in data, "Response missing pin_configured"
        assert data["pin_configured"] == True, "PIN was not configured"
        
        # Verify member_id returned
        assert "member_id" in data, "Response missing member_id"
        
        # Store for later tests
        TestMemberActivationFlow.created_member_id = data["member_id"]
        TestMemberActivationFlow.created_code_planteur = data["code_planteur"]
        
        print(f"✓ Member created: id={data['member_id']}, code_planteur={data['code_planteur']}, pin_configured={data['pin_configured']}")
    
    # ============= TEST 2: Verify ussd_registrations entry created =============
    def test_02_ussd_registration_entry_created(self):
        """POST /api/cooperative/members also creates ussd_registrations entry"""
        # Use USSD callback to check if farmer is recognized
        response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": f"test_session_{int(time.time())}",
                "serviceCode": "*144*99#",
                "phoneNumber": TEST_PHONE,
                "text": "1"  # Option 1: "Je suis deja inscrit"
            }
        )
        
        print(f"USSD callback response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"USSD callback failed: {response.text}"
        
        data = response.json()
        raw_response = data.get("raw_response", "")
        
        # Farmer should be recognized (not "Numero non reconnu")
        assert "non reconnu" not in raw_response.lower(), f"Farmer not recognized by USSD: {raw_response}"
        assert "Bonjour" in raw_response or "Menu" in raw_response or "Estimer" in raw_response, \
            f"Expected welcome/menu response, got: {raw_response}"
        
        print(f"✓ USSD recognizes farmer: {raw_response[:100]}...")
    
    # ============= TEST 3: Check member phone returns can_activate=true =============
    def test_03_check_member_phone_can_activate(self):
        """GET /api/auth/check-member-phone/{phone} returns found=true, can_activate=true"""
        # URL encode the phone number
        phone_encoded = TEST_PHONE.replace("+", "%2B")
        response = requests.get(f"{BASE_URL}/api/auth/check-member-phone/{phone_encoded}")
        
        print(f"Check member phone response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Check member phone failed: {response.text}"
        
        data = response.json()
        
        # Verify found and can_activate
        assert data.get("found") == True, f"Expected found=true, got: {data}"
        assert data.get("can_activate") == True, f"Expected can_activate=true, got: {data}"
        
        # Verify member name is returned
        assert data.get("member_name") == TEST_NAME, f"Expected member_name={TEST_NAME}, got: {data.get('member_name')}"
        
        # Verify cooperative name is returned
        assert "cooperative_name" in data, "Response missing cooperative_name"
        
        print(f"✓ Check member phone: found={data['found']}, can_activate={data['can_activate']}, member_name={data['member_name']}")
    
    # ============= TEST 4: Activate member account =============
    def test_04_activate_member_account(self):
        """POST /api/auth/activate-member-account - member can activate using phone and password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/activate-member-account",
            json={
                "phone_number": TEST_PHONE,
                "password": "TestPassword123"
            }
        )
        
        print(f"Activate member response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Activate member failed: {response.text}"
        
        data = response.json()
        
        # Verify access token returned
        assert "access_token" in data, "Response missing access_token"
        assert data["access_token"], "access_token is empty"
        
        # Verify user data returned
        assert "user" in data, "Response missing user"
        user = data["user"]
        
        # Verify user has code_planteur from coop_members
        assert user.get("code_planteur") == TestMemberActivationFlow.created_code_planteur, \
            f"Expected code_planteur={TestMemberActivationFlow.created_code_planteur}, got: {user.get('code_planteur')}"
        
        # Verify user_type is producteur
        assert user.get("user_type") == "producteur", f"Expected user_type=producteur, got: {user.get('user_type')}"
        
        # Verify cooperative link
        assert user.get("cooperative_id"), "User missing cooperative_id"
        assert user.get("coop_member_id") == TestMemberActivationFlow.created_member_id, \
            f"Expected coop_member_id={TestMemberActivationFlow.created_member_id}, got: {user.get('coop_member_id')}"
        
        print(f"✓ Member activated: user_id={user.get('_id')}, code_planteur={user.get('code_planteur')}, user_type={user.get('user_type')}")
    
    # ============= TEST 5: Check member phone after activation returns has_account =============
    def test_05_check_member_phone_after_activation(self):
        """GET /api/auth/check-member-phone/{phone} returns can_activate=false after activation"""
        phone_encoded = TEST_PHONE.replace("+", "%2B")
        response = requests.get(f"{BASE_URL}/api/auth/check-member-phone/{phone_encoded}")
        
        print(f"Check member phone after activation: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Check member phone failed: {response.text}"
        
        data = response.json()
        
        # After activation, can_activate should be false
        assert data.get("found") == True, f"Expected found=true, got: {data}"
        assert data.get("can_activate") == False, f"Expected can_activate=false after activation, got: {data}"
        assert data.get("reason") == "has_account", f"Expected reason=has_account, got: {data.get('reason')}"
        
        print(f"✓ After activation: found={data['found']}, can_activate={data['can_activate']}, reason={data.get('reason')}")
    
    # ============= TEST 6: Verify member list shows code_planteur =============
    def test_06_member_list_shows_code_planteur(self):
        """GET /api/cooperative/members returns members with code_planteur"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.get_auth_headers()
        )
        
        print(f"Get members response: {response.status_code}")
        assert response.status_code == 200, f"Get members failed: {response.text}"
        
        data = response.json()
        members = data.get("members", [])
        
        # Find our test member
        test_member = None
        for m in members:
            if m.get("phone_number") == TEST_PHONE or TEST_PHONE.replace("+225", "") in m.get("phone_number", ""):
                test_member = m
                break
        
        assert test_member, f"Test member not found in members list"
        
        # Verify code_planteur is present
        assert test_member.get("code_planteur") == TestMemberActivationFlow.created_code_planteur, \
            f"Expected code_planteur={TestMemberActivationFlow.created_code_planteur}, got: {test_member.get('code_planteur')}"
        
        # Verify pin_configured is present
        assert "pin_configured" in test_member, "Member missing pin_configured field"
        assert test_member.get("pin_configured") == True, "pin_configured should be True"
        
        print(f"✓ Member in list: code_planteur={test_member.get('code_planteur')}, pin_configured={test_member.get('pin_configured')}")


class TestMemberCreationWithoutPIN:
    """Test member creation without PIN code"""
    
    coop_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as cooperative"""
        if not TestMemberCreationWithoutPIN.coop_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": COOP_EMAIL,
                "password": COOP_PASSWORD
            })
            assert response.status_code == 200
            TestMemberCreationWithoutPIN.coop_token = response.json().get("access_token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestMemberCreationWithoutPIN.coop_token}"}
    
    def test_create_member_without_pin(self):
        """POST /api/cooperative/members without PIN still generates code_planteur"""
        test_phone = f"+2250598{random.randint(100000, 999999)}"
        
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.get_auth_headers(),
            json={
                "full_name": "Test Sans PIN",
                "phone_number": test_phone,
                "village": "Soubre Test",
                "department": "SOUB",
                "consent_given": True
                # No pin_code
            }
        )
        
        print(f"Create member without PIN: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Create member failed: {response.text}"
        
        data = response.json()
        
        # code_planteur should still be generated
        assert "code_planteur" in data, "Response missing code_planteur"
        assert data["code_planteur"].startswith("GL-"), f"code_planteur format wrong: {data['code_planteur']}"
        
        # pin_configured should be False
        assert data.get("pin_configured") == False, f"Expected pin_configured=False, got: {data.get('pin_configured')}"
        
        print(f"✓ Member without PIN: code_planteur={data['code_planteur']}, pin_configured={data['pin_configured']}")


class TestPINValidation:
    """Test PIN code validation"""
    
    coop_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestPINValidation.coop_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": COOP_EMAIL,
                "password": COOP_PASSWORD
            })
            assert response.status_code == 200
            TestPINValidation.coop_token = response.json().get("access_token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestPINValidation.coop_token}"}
    
    def test_invalid_pin_too_short(self):
        """POST /api/cooperative/members rejects PIN with less than 4 digits"""
        test_phone = f"+2250597{random.randint(100000, 999999)}"
        
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.get_auth_headers(),
            json={
                "full_name": "Test PIN Court",
                "phone_number": test_phone,
                "village": "Test Village",
                "consent_given": True,
                "pin_code": "123"  # Only 3 digits
            }
        )
        
        print(f"Invalid PIN (too short): {response.status_code} - {response.text}")
        assert response.status_code == 400, f"Expected 400 for short PIN, got: {response.status_code}"
        assert "4 chiffres" in response.text.lower() or "pin" in response.text.lower(), \
            f"Expected PIN validation error, got: {response.text}"
        
        print("✓ Short PIN correctly rejected")
    
    def test_invalid_pin_non_numeric(self):
        """POST /api/cooperative/members rejects non-numeric PIN"""
        test_phone = f"+2250596{random.randint(100000, 999999)}"
        
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.get_auth_headers(),
            json={
                "full_name": "Test PIN Lettres",
                "phone_number": test_phone,
                "village": "Test Village",
                "consent_given": True,
                "pin_code": "abcd"  # Non-numeric
            }
        )
        
        print(f"Invalid PIN (non-numeric): {response.status_code} - {response.text}")
        assert response.status_code == 400, f"Expected 400 for non-numeric PIN, got: {response.status_code}"
        
        print("✓ Non-numeric PIN correctly rejected")


class TestUSSDRecognition:
    """Test USSD recognition of coop-created farmers"""
    
    coop_token = None
    test_phone = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestUSSDRecognition.coop_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": COOP_EMAIL,
                "password": COOP_PASSWORD
            })
            assert response.status_code == 200
            TestUSSDRecognition.coop_token = response.json().get("access_token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestUSSDRecognition.coop_token}"}
    
    def test_ussd_recognizes_coop_member(self):
        """USSD callback recognizes farmer created by cooperative"""
        # Create a new member
        test_phone = f"+2250595{random.randint(100000, 999999)}"
        TestUSSDRecognition.test_phone = test_phone
        
        create_response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers=self.get_auth_headers(),
            json={
                "full_name": "USSD Test Farmer",
                "phone_number": test_phone,
                "village": "USSD Village",
                "consent_given": True,
                "pin_code": "5678"
            }
        )
        
        assert create_response.status_code == 200, f"Create member failed: {create_response.text}"
        created_data = create_response.json()
        print(f"Created member: {created_data}")
        
        # Now test USSD recognition
        ussd_response = requests.post(
            f"{BASE_URL}/api/ussd/callback",
            json={
                "sessionId": f"ussd_test_{int(time.time())}",
                "serviceCode": "*144*99#",
                "phoneNumber": test_phone,
                "text": "1"  # "Je suis deja inscrit"
            }
        )
        
        print(f"USSD response: {ussd_response.status_code} - {ussd_response.text[:500]}")
        assert ussd_response.status_code == 200
        
        data = ussd_response.json()
        raw_response = data.get("raw_response", "")
        
        # Should NOT say "non reconnu"
        assert "non reconnu" not in raw_response.lower(), f"USSD did not recognize farmer: {raw_response}"
        
        # Should show main menu or welcome
        assert "Bonjour" in raw_response or "Estimer" in raw_response or "prime" in raw_response.lower(), \
            f"Expected welcome/menu, got: {raw_response}"
        
        print(f"✓ USSD recognizes coop-created farmer: {raw_response[:100]}...")


# Cleanup function to remove test data
@pytest.fixture(scope="module", autouse=True)
def cleanup(request):
    """Cleanup test data after all tests"""
    def cleanup_func():
        print("\n--- Cleanup: Test data should be cleaned up manually or via admin ---")
        # Note: In production, you'd want to delete test users/members
        # For now, we use unique phone numbers to avoid conflicts
    
    request.addfinalizer(cleanup_func)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
