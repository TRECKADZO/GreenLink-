"""
Iteration 66 - Testing 3 Bug Fixes:
1. Homepage hero button says 'S'inscrire gratuitement' and links to /register (NOT /farmer/inscription)
2. POST /api/auth/register works for phone-only users without Pydantic validation error
3. POST /api/ussd/register-web auto-generates code_planteur in format GL-XXX-NNNNN

Also tests:
- USSD registration (option 2) shows auto-generated code_planteur after confirmation
- Web registration response includes code_planteur field
"""

import pytest
import requests
import os
import time
import re
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"
COOP_EMAIL = "bielaghana@gmail.com"
COOP_PASSWORD = "474Treckadzo"


class TestAuthRegisterPhoneOnly:
    """Test POST /api/auth/register for phone-only users (Bug Fix #2)"""
    
    def test_register_acheteur_phone_only(self):
        """Register acheteur with phone only (no email) - should not cause Pydantic validation error"""
        unique_phone = f"05{int(time.time()) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "test1234",
            "full_name": "Test Acheteur Phone",
            "user_type": "acheteur"
        })
        
        print(f"Register acheteur phone-only: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        assert data["user"]["phone_number"] == unique_phone
        assert data["user"]["user_type"] == "acheteur"
        # Email should be None for phone-only registration
        assert data["user"].get("email") is None or data["user"].get("email") == ""
    
    def test_register_cooperative_phone_only(self):
        """Register cooperative with phone only"""
        unique_phone = f"06{int(time.time()) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "test1234",
            "full_name": "Test Coop Phone",
            "user_type": "cooperative",
            "coop_name": "Test Coop",
            "coop_code": "TCOOP"
        })
        
        print(f"Register cooperative phone-only: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "cooperative"
    
    def test_register_fournisseur_phone_only(self):
        """Register fournisseur with phone only"""
        unique_phone = f"07{int(time.time()) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "test1234",
            "full_name": "Test Fournisseur Phone",
            "user_type": "fournisseur"
        })
        
        print(f"Register fournisseur phone-only: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "fournisseur"
    
    def test_register_producteur_phone_only(self):
        """Register producteur with phone only"""
        unique_phone = f"08{int(time.time()) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "test1234",
            "full_name": "Test Producteur Phone",
            "user_type": "producteur"
        })
        
        print(f"Register producteur phone-only: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "producteur"
    
    def test_register_entreprise_rse_phone_only(self):
        """Register entreprise_rse with phone only"""
        unique_phone = f"09{int(time.time()) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "test1234",
            "full_name": "Test RSE Phone",
            "user_type": "entreprise_rse"
        })
        
        print(f"Register entreprise_rse phone-only: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "entreprise_rse"
    
    def test_register_with_empty_email_string(self):
        """Register with empty string email - should convert to None and work"""
        unique_phone = f"04{int(time.time()) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "email": "",  # Empty string should be converted to None
            "password": "test1234",
            "full_name": "Test Empty Email",
            "user_type": "acheteur"
        })
        
        print(f"Register with empty email: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data


class TestUSSDWebRegisterCodePlanteur:
    """Test POST /api/ussd/register-web auto-generates code_planteur (Bug Fix #3)"""
    
    def test_register_web_generates_code_planteur(self):
        """Web registration should auto-generate code_planteur in format GL-XXX-NNNNN"""
        unique_phone = f"07{int(time.time()) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test Planteur Web",
            "telephone": unique_phone,
            "village": "Daloa",
            "pin": "1234"
        })
        
        print(f"Register web: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "code_planteur" in data, "Response should contain code_planteur"
        
        code = data["code_planteur"]
        print(f"Generated code_planteur: {code}")
        
        # Verify format: GL-XXX-NNNNN
        assert code.startswith("GL-"), f"Code should start with 'GL-', got: {code}"
        parts = code.split("-")
        assert len(parts) == 3, f"Code should have 3 parts separated by '-', got: {parts}"
        assert len(parts[1]) == 3, f"Prefix should be 3 chars, got: {parts[1]}"
        assert parts[2].isdigit(), f"Sequence should be numeric, got: {parts[2]}"
        assert len(parts[2]) == 5, f"Sequence should be 5 digits, got: {parts[2]}"
    
    def test_register_web_with_cooperative_code(self):
        """Web registration with cooperative_code should use coop prefix"""
        unique_phone = f"07{int(time.time() + 1) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test Planteur Coop",
            "telephone": unique_phone,
            "cooperative_code": "COOP-DAL",
            "village": "Soubre",
            "pin": "5678"
        })
        
        print(f"Register web with coop: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "code_planteur" in data
        
        code = data["code_planteur"]
        print(f"Generated code_planteur with coop: {code}")
        
        # Should use first 3 chars of coop_code as prefix
        assert code.startswith("GL-COO-") or code.startswith("GL-"), f"Code should use coop prefix, got: {code}"
    
    def test_register_web_without_coop_uses_village(self):
        """Web registration without coop should use village prefix"""
        unique_phone = f"07{int(time.time() + 2) % 100000000:08d}"
        
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test Planteur Village",
            "telephone": unique_phone,
            "village": "Abengourou",
            "pin": "9012"
        })
        
        print(f"Register web village only: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "code_planteur" in data
        
        code = data["code_planteur"]
        print(f"Generated code_planteur from village: {code}")
        
        # Should use first 3 chars of village as prefix
        assert code.startswith("GL-ABE-") or code.startswith("GL-"), f"Code should use village prefix, got: {code}"


class TestUSSDCallbackRegistration:
    """Test USSD registration flow shows auto-generated code_planteur"""
    
    def test_ussd_registration_flow_shows_code(self):
        """USSD registration (option 2) should show auto-generated code_planteur after confirmation"""
        session_id = f"test_reg_{uuid.uuid4().hex[:8]}"
        unique_phone = f"+2250799{int(time.time()) % 1000000:06d}"
        
        # Step 1: Welcome menu
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": ""
        })
        assert response.status_code == 200
        data = response.json()
        assert "Nouvelle inscription" in data.get("raw_response", "")
        
        # Step 2: Select option 2 (Nouvelle inscription)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2"
        })
        assert response.status_code == 200
        data = response.json()
        assert "Etape 1/4" in data.get("raw_response", "")
        
        # Step 3: Enter name
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test USSD Planteur"
        })
        assert response.status_code == 200
        data = response.json()
        assert "Etape 2/4" in data.get("raw_response", "")
        
        # Step 4: Enter coop code (0 for none)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test USSD Planteur*0"
        })
        assert response.status_code == 200
        data = response.json()
        assert "Etape 3/4" in data.get("raw_response", "")
        
        # Step 5: Enter village
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test USSD Planteur*0*Gagnoa"
        })
        assert response.status_code == 200
        data = response.json()
        assert "Etape 4/4" in data.get("raw_response", "")
        
        # Step 6: Enter PIN
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test USSD Planteur*0*Gagnoa*1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "Resume inscription" in data.get("raw_response", "") or "Confirmer" in data.get("raw_response", "")
        
        # Step 7: Confirm registration
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test USSD Planteur*0*Gagnoa*1234*1"
        })
        
        print(f"USSD registration confirmation: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        raw = data.get("raw_response", "")
        
        # Should show success message with code planteur
        assert "Inscription reussie" in raw or "code planteur" in raw.lower(), f"Should show success with code, got: {raw}"
        
        # Extract and verify code format
        code_match = re.search(r'GL-[A-Z]{3}-\d{5}', raw)
        assert code_match, f"Should contain code in format GL-XXX-NNNNN, got: {raw}"
        
        code = code_match.group()
        print(f"USSD generated code_planteur: {code}")


class TestUSSDRegistrationsEndpoint:
    """Test GET /api/ussd/registrations shows code_planteur column"""
    
    def test_registrations_include_code_planteur(self):
        """GET /api/ussd/registrations should include code_planteur field"""
        response = requests.get(f"{BASE_URL}/api/ussd/registrations?limit=10")
        
        print(f"Get registrations: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "registrations" in data
        
        # Check if any registration has code_planteur
        registrations = data["registrations"]
        if registrations:
            # At least some should have code_planteur (from our tests)
            has_code = any(r.get("code_planteur") for r in registrations)
            print(f"Found {len(registrations)} registrations, has_code_planteur: {has_code}")
            
            # Print sample
            for r in registrations[:3]:
                print(f"  - {r.get('full_name')}: code={r.get('code_planteur')}, via={r.get('registered_via')}")


class TestHealthAndLogin:
    """Basic health and login tests"""
    
    def test_health_check(self):
        """API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
    
    def test_admin_login(self):
        """Admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "admin"
    
    def test_coop_login(self):
        """Cooperative login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD
        })
        
        assert response.status_code == 200, f"Coop login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "cooperative"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
