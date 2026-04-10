from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 72 - Member Creation with PIN and Hectares Testing
Iteration 72 - Member Creation with PIN and Hectares Testing
Tests the complete flow: login cooperative, create member with PIN + hectares,
Tests the complete flow: login cooperative, create member with PIN + hectares,
verify code_planteur generation, and activation stats.
verify code_planteur generation, and activation stats.
"""
"""

import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_IDENTIFIER = COOP_EMAIL
COOP_PASSWORD = COOP_PASSWORD  # from test_config

class TestCooperativeLogin:
    """Test cooperative authentication"""
    
    def test_login_with_identifier(self):
        """Test login using identifier field (not email)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["user_type"] == "cooperative", f"Expected cooperative, got {data['user']['user_type']}"
        print(f"PASS: Cooperative login successful, user_type={data['user']['user_type']}")
    
    def test_login_returns_coop_info(self):
        """Verify login returns cooperative-specific fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        user = data["user"]
        # Cooperative should have coop_name and coop_code
        assert "coop_name" in user or "full_name" in user, "Missing coop_name or full_name"
        print(f"PASS: Login returns coop info: coop_name={user.get('coop_name')}, coop_code={user.get('coop_code')}")


class TestMemberCreationWithPinAndHectares:
    """Test member creation with mandatory PIN and optional hectares"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for cooperative"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_create_member_without_pin_fails(self, auth_token):
        """Creating member without PIN should fail with 422"""
        unique_phone = f"+2250700TEST{int(time.time()) % 10000:04d}"
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "full_name": "Test Sans PIN",
                "phone_number": unique_phone,
                "village": "TestVillage",
                "consent_given": True
                # Missing pin_code - should fail
            }
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print(f"PASS: Member creation without PIN returns 422 (validation error)")
    
    def test_create_member_with_invalid_pin_fails(self, auth_token):
        """Creating member with invalid PIN (not 4 digits) should fail"""
        unique_phone = f"+2250700TEST{int(time.time()) % 10000:04d}"
        
        # Test with 3-digit PIN
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "full_name": "Test Invalid PIN",
                "phone_number": unique_phone,
                "village": "TestVillage",
                "consent_given": True,
                "pin_code": "123"  # Only 3 digits
            }
        )
        assert response.status_code == 400, f"Expected 400 for 3-digit PIN, got {response.status_code}: {response.text}"
        print(f"PASS: 3-digit PIN returns 400")
        
        # Test with non-numeric PIN
        unique_phone2 = f"+2250700TEST{(int(time.time()) + 1) % 10000:04d}"
        response2 = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "full_name": "Test Non-Numeric PIN",
                "phone_number": unique_phone2,
                "village": "TestVillage",
                "consent_given": True,
                "pin_code": "12ab"  # Non-numeric
            }
        )
        assert response2.status_code == 400, f"Expected 400 for non-numeric PIN, got {response2.status_code}: {response2.text}"
        print(f"PASS: Non-numeric PIN returns 400")
    
    def test_create_member_with_valid_pin_and_hectares(self, auth_token):
        """Creating member with valid 4-digit PIN and hectares should succeed"""
        unique_phone = f"+2250700TEST{int(time.time()) % 10000:04d}"
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "full_name": "Test Planteur PIN Hectares",
                "phone_number": unique_phone,
                "village": "TestVillage",
                "department": "GAGN",
                "zone": "Centre-Ouest",
                "cni_number": "CI-TEST-123456",
                "consent_given": True,
                "pin_code": "1234",
                "hectares": 2.5
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response contains required fields
        assert "code_planteur" in data, "Missing code_planteur in response"
        assert "pin_configured" in data, "Missing pin_configured in response"
        assert data["pin_configured"] == True, f"Expected pin_configured=True, got {data['pin_configured']}"
        assert data["code_planteur"].startswith("GL-"), f"code_planteur should start with GL-, got {data['code_planteur']}"
        
        print(f"PASS: Member created with code_planteur={data['code_planteur']}, pin_configured={data['pin_configured']}")
        return data
    
    def test_create_member_with_pin_only(self, auth_token):
        """Creating member with PIN but no hectares should succeed"""
        unique_phone = f"+2250700TEST{(int(time.time()) + 2) % 10000:04d}"
        response = requests.post(
            f"{BASE_URL}/api/cooperative/members",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "full_name": "Test Planteur PIN Only",
                "phone_number": unique_phone,
                "village": "TestVillage2",
                "consent_given": True,
                "pin_code": "5678"
                # No hectares - should still work
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["pin_configured"] == True
        assert "code_planteur" in data
        print(f"PASS: Member created without hectares, code_planteur={data['code_planteur']}")


class TestActivationStats:
    """Test activation statistics endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for cooperative"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_get_activation_stats(self, auth_token):
        """GET /api/cooperative/members/activation-stats returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members/activation-stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        required_fields = [
            "total_members", "activated_count", "pending_count", 
            "activation_rate", "pin_configured_count", "pin_missing_count",
            "code_planteur_count"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_members"], int), "total_members should be int"
        assert isinstance(data["activation_rate"], (int, float)), "activation_rate should be numeric"
        assert isinstance(data["pin_configured_count"], int), "pin_configured_count should be int"
        
        print(f"PASS: Activation stats - total={data['total_members']}, activated={data['activated_count']}, "
              f"pending={data['pending_count']}, pin_configured={data['pin_configured_count']}")
    
    def test_activation_stats_includes_pending_list(self, auth_token):
        """Activation stats should include pending_activation list"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members/activation-stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "pending_activation" in data, "Missing pending_activation list"
        assert isinstance(data["pending_activation"], list), "pending_activation should be a list"
        
        # If there are pending members, verify structure
        if len(data["pending_activation"]) > 0:
            member = data["pending_activation"][0]
            assert "id" in member, "Pending member missing id"
            assert "full_name" in member, "Pending member missing full_name"
            assert "phone_number" in member, "Pending member missing phone_number"
            assert "pin_configured" in member, "Pending member missing pin_configured"
            print(f"PASS: pending_activation list has {len(data['pending_activation'])} members with correct structure")
        else:
            print(f"PASS: pending_activation list is empty (all members activated)")


class TestMembersList:
    """Test members list endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for cooperative"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_get_members_list(self, auth_token):
        """GET /api/cooperative/members returns members with pin_configured and code_planteur"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "members" in data, "Missing members array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["members"], list), "members should be a list"
        
        # Verify member structure includes pin_configured and code_planteur
        if len(data["members"]) > 0:
            member = data["members"][0]
            assert "pin_configured" in member, "Member missing pin_configured field"
            assert "code_planteur" in member, "Member missing code_planteur field"
            assert "full_name" in member, "Member missing full_name"
            assert "phone_number" in member, "Member missing phone_number"
            print(f"PASS: Members list has {data['total']} members with pin_configured and code_planteur fields")
        else:
            print(f"PASS: Members list is empty")


class TestMembersExport:
    """Test members export endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for cooperative"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_export_xlsx(self, auth_token):
        """GET /api/cooperative/members/export?format=xlsx returns valid Excel file"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/members/export?format=xlsx",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type, f"Unexpected content-type: {content_type}"
        
        # Check file magic bytes (PK for ZIP/XLSX)
        assert response.content[:2] == b'PK', "XLSX file should start with PK magic bytes"
        
        print(f"PASS: Export XLSX returns valid Excel file ({len(response.content)} bytes)")
    
    def test_export_unauthenticated_fails(self):
        """Export without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members/export?format=xlsx")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Unauthenticated export returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
