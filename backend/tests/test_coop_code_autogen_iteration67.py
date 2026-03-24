"""
Iteration 67 - Cooperative Code Auto-Generation Tests
Tests for:
1. POST /api/auth/register with user_type=cooperative auto-generates coop_code in COOP-XXX-NNN format
2. POST /api/auth/register cooperative response includes coop_code and coop_name in user object
3. POST /api/auth/register cooperative with department 'DALO' generates COOP-DAL-XXX prefix
4. POST /api/auth/register cooperative without department uses coop_name prefix
5. POST /api/auth/register for non-cooperative types (acheteur, producteur) still works
6. GET /api/auth/cooperatives returns list of active cooperatives with code, name, region
"""

import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def generate_unique_phone():
    """Generate unique phone number for testing"""
    return f"+22507{random.randint(10000000, 99999999)}"

def generate_unique_email():
    """Generate unique email for testing"""
    suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
    return f"test_coop_{suffix}@test.com"


class TestCooperativeCodeAutoGeneration:
    """Tests for cooperative code auto-generation feature"""
    
    def test_register_cooperative_autogenerates_coop_code(self):
        """POST /api/auth/register with user_type=cooperative auto-generates coop_code"""
        phone = generate_unique_phone()
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Test Coop Admin",
            "user_type": "cooperative",
            "coop_name": "Cooperative Test Daloa"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        print(f"Register cooperative response: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        
        user = data["user"]
        assert "coop_code" in user, "User should have coop_code"
        assert user["coop_code"] is not None, "coop_code should not be None"
        
        # Verify format: COOP-XXX-NNN
        coop_code = user["coop_code"]
        assert coop_code.startswith("COOP-"), f"coop_code should start with 'COOP-', got: {coop_code}"
        parts = coop_code.split("-")
        assert len(parts) == 3, f"coop_code should have 3 parts (COOP-XXX-NNN), got: {coop_code}"
        assert parts[0] == "COOP", f"First part should be 'COOP', got: {parts[0]}"
        assert len(parts[1]) == 3, f"Second part should be 3 chars, got: {parts[1]}"
        assert parts[2].isdigit(), f"Third part should be numeric, got: {parts[2]}"
        
        print(f"✓ Cooperative registered with auto-generated code: {coop_code}")
    
    def test_register_cooperative_response_includes_coop_name(self):
        """POST /api/auth/register cooperative response includes coop_name in user object"""
        phone = generate_unique_phone()
        coop_name = "Cooperative des Planteurs de Gagnoa"
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Admin Gagnoa",
            "user_type": "cooperative",
            "coop_name": coop_name
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        user = data["user"]
        
        assert "coop_name" in user, "User should have coop_name"
        assert user["coop_name"] == coop_name, f"coop_name should be '{coop_name}', got: {user['coop_name']}"
        
        print(f"✓ Cooperative response includes coop_name: {user['coop_name']}")
    
    def test_register_cooperative_with_department_dalo_generates_dal_prefix(self):
        """POST /api/auth/register cooperative with department 'DALO' generates COOP-DAL-XXX prefix"""
        phone = generate_unique_phone()
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Admin Daloa Coop",
            "user_type": "cooperative",
            "coop_name": "Cooperative Daloa Centre",
            "department": "DALO",  # Daloa department code
            "headquarters_region": "Centre-Ouest"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        user = data["user"]
        coop_code = user["coop_code"]
        
        # Should use department prefix (first 3 chars of DALO = DAL)
        assert coop_code.startswith("COOP-DAL-"), f"coop_code should start with 'COOP-DAL-', got: {coop_code}"
        
        print(f"✓ Cooperative with department DALO got code: {coop_code}")
    
    def test_register_cooperative_without_department_uses_coop_name_prefix(self):
        """POST /api/auth/register cooperative without department uses coop_name prefix"""
        phone = generate_unique_phone()
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Admin Soubre Coop",
            "user_type": "cooperative",
            "coop_name": "Soubre Farmers Union"
            # No department provided
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        user = data["user"]
        coop_code = user["coop_code"]
        
        # Should use coop_name prefix (first 3 chars of "Soubre" = SOU)
        assert coop_code.startswith("COOP-SOU-"), f"coop_code should start with 'COOP-SOU-', got: {coop_code}"
        
        print(f"✓ Cooperative without department got code from coop_name: {coop_code}")
    
    def test_register_cooperative_with_headquarters_region_as_fallback(self):
        """POST /api/auth/register cooperative uses headquarters_region as department fallback"""
        phone = generate_unique_phone()
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Admin Man Coop",
            "user_type": "cooperative",
            "coop_name": "Cooperative Man Ouest",
            "headquarters_region": "Ouest"  # No department, but has headquarters_region
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        user = data["user"]
        coop_code = user["coop_code"]
        
        # Should use headquarters_region prefix (first 3 chars of "Ouest" = OUE)
        assert coop_code.startswith("COOP-OUE-"), f"coop_code should start with 'COOP-OUE-', got: {coop_code}"
        
        print(f"✓ Cooperative with headquarters_region got code: {coop_code}")


class TestNonCooperativeRegistration:
    """Tests for non-cooperative user type registration (should still work)"""
    
    def test_register_acheteur_still_works(self):
        """POST /api/auth/register for acheteur type still works"""
        phone = generate_unique_phone()
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Test Acheteur",
            "user_type": "acheteur"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "acheteur"
        
        # Acheteur should NOT have coop_code
        assert data["user"].get("coop_code") is None, "Acheteur should not have coop_code"
        
        print(f"✓ Acheteur registration works without coop_code")
    
    def test_register_producteur_still_works(self):
        """POST /api/auth/register for producteur type still works"""
        phone = generate_unique_phone()
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Test Producteur",
            "user_type": "producteur"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "producteur"
        
        # Producteur should NOT have coop_code
        assert data["user"].get("coop_code") is None, "Producteur should not have coop_code"
        
        print(f"✓ Producteur registration works without coop_code")
    
    def test_register_fournisseur_still_works(self):
        """POST /api/auth/register for fournisseur type still works"""
        phone = generate_unique_phone()
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Test Fournisseur",
            "user_type": "fournisseur"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "fournisseur"
        
        print(f"✓ Fournisseur registration works")
    
    def test_register_entreprise_rse_still_works(self):
        """POST /api/auth/register for entreprise_rse type still works"""
        phone = generate_unique_phone()
        payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Test Entreprise RSE",
            "user_type": "entreprise_rse"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_type"] == "entreprise_rse"
        
        print(f"✓ Entreprise RSE registration works")


class TestCooperativesListEndpoint:
    """Tests for GET /api/auth/cooperatives public endpoint"""
    
    def test_get_cooperatives_returns_list(self):
        """GET /api/auth/cooperatives returns list of active cooperatives"""
        response = requests.get(f"{BASE_URL}/api/auth/cooperatives")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "cooperatives" in data, "Response should have 'cooperatives' key"
        assert isinstance(data["cooperatives"], list), "cooperatives should be a list"
        
        print(f"✓ GET /api/auth/cooperatives returns {len(data['cooperatives'])} cooperatives")
    
    def test_get_cooperatives_returns_code_name_region(self):
        """GET /api/auth/cooperatives returns cooperatives with code, name, region"""
        # First create a cooperative to ensure we have at least one
        phone = generate_unique_phone()
        create_payload = {
            "phone_number": phone,
            "password": "test123456",
            "full_name": "Admin Test Coop List",
            "user_type": "cooperative",
            "coop_name": "Test Coop For List",
            "headquarters_region": "Sud"
        }
        create_response = requests.post(f"{BASE_URL}/api/auth/register", json=create_payload)
        assert create_response.status_code == 200
        created_coop_code = create_response.json()["user"]["coop_code"]
        
        # Now get the list
        response = requests.get(f"{BASE_URL}/api/auth/cooperatives")
        assert response.status_code == 200
        
        data = response.json()
        cooperatives = data["cooperatives"]
        
        # Find our created cooperative
        found = False
        for coop in cooperatives:
            if coop.get("code") == created_coop_code:
                found = True
                assert "code" in coop, "Cooperative should have 'code'"
                assert "name" in coop, "Cooperative should have 'name'"
                assert "region" in coop, "Cooperative should have 'region'"
                assert coop["name"] == "Test Coop For List", f"Name mismatch: {coop['name']}"
                print(f"✓ Found cooperative: code={coop['code']}, name={coop['name']}, region={coop['region']}")
                break
        
        assert found, f"Created cooperative {created_coop_code} not found in list"
    
    def test_get_cooperatives_is_public_no_auth_required(self):
        """GET /api/auth/cooperatives is public (no auth required)"""
        # Make request without any auth headers
        response = requests.get(f"{BASE_URL}/api/auth/cooperatives")
        
        # Should not return 401 or 403
        assert response.status_code == 200, f"Public endpoint should return 200, got {response.status_code}"
        
        print(f"✓ GET /api/auth/cooperatives is public (no auth required)")


class TestCoopCodeSequencing:
    """Tests for cooperative code sequence incrementing"""
    
    def test_coop_code_sequence_increments(self):
        """Multiple cooperatives with same prefix get incrementing sequence numbers"""
        # Create two cooperatives with same department
        codes = []
        for i in range(2):
            phone = generate_unique_phone()
            payload = {
                "phone_number": phone,
                "password": "test123456",
                "full_name": f"Admin Seq Test {i}",
                "user_type": "cooperative",
                "coop_name": f"Sequence Test Coop {i}",
                "department": "ABID"  # Same department for both
            }
            
            response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
            assert response.status_code == 200
            
            coop_code = response.json()["user"]["coop_code"]
            codes.append(coop_code)
            print(f"Created cooperative {i+1}: {coop_code}")
        
        # Both should have COOP-ABI- prefix
        for code in codes:
            assert code.startswith("COOP-ABI-"), f"Code should start with COOP-ABI-, got: {code}"
        
        # Extract sequence numbers
        seq1 = int(codes[0].split("-")[2])
        seq2 = int(codes[1].split("-")[2])
        
        # Second should be greater than first (sequence increments)
        assert seq2 > seq1, f"Sequence should increment: {seq1} -> {seq2}"
        
        print(f"✓ Sequence increments correctly: {seq1} -> {seq2}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
