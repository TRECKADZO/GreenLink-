#!/usr/bin/env python3
"""
GreenLink Authentication System Test Suite
Tests all authentication endpoints as specified in the review request.
"""

import requests
import json
import sys
from typing import Dict, Any

# Backend URL from review request
BACKEND_URL = "https://agritech-coop.preview.emergentagent.com/api"

def make_request(method: str, endpoint: str, data: Dict[Any, Any] = None, headers: Dict[str, str] = None) -> requests.Response:
    """Helper function to make HTTP requests with error handling"""
    url = f"{BACKEND_URL}{endpoint}"
    try:
        # Set shorter timeout and better session handling
        session = requests.Session()
        session.timeout = 10
        
        if method.upper() == "GET":
            response = session.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = session.post(url, json=data, headers=headers, timeout=10)
        elif method.upper() == "PUT":
            response = session.put(url, json=data, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        return response
    except requests.Timeout as e:
        print(f"❌ Timeout for {method} {url}: {e}")
        return None
    except requests.ConnectionError as e:
        print(f"❌ Connection error for {method} {url}: {e}")
        return None
    except requests.RequestException as e:
        print(f"❌ Request failed for {method} {url}: {e}")
        return None

def test_register_producteur():
    """Test 1: Register Endpoint - POST /api/auth/register (producteur)"""
    print("\n🧪 TEST 1: Register Producteur Account")
    
    # Test data from review request (fixed phone format)
    register_data = {
        "phone_number": "+22507123456789",
        "password": "test123",
        "full_name": "Test Producteur",
        "user_type": "producteur"
    }
    
    response = make_request("POST", "/auth/register", register_data)
    
    if not response:
        print("❌ CRITICAL: Failed to connect to register endpoint")
        return None, None
    
    if response.status_code == 201 or response.status_code == 200:
        try:
            result = response.json()
            print("✅ Registration successful")
            print(f"   - Status Code: {response.status_code}")
            print(f"   - Token Type: {result.get('token_type', 'Missing')}")
            print(f"   - Access Token: {'Present' if result.get('access_token') else 'Missing'}")
            
            user = result.get('user', {})
            print(f"   - User ID: {user.get('_id', 'Missing')}")
            print(f"   - Full Name: {user.get('full_name', 'Missing')}")
            print(f"   - User Type: {user.get('user_type', 'Missing')}")
            print(f"   - Phone: {user.get('phone_number', 'Missing')}")
            
            # Check producteur-specific fields initialization
            crops = user.get('crops')
            farm_location = user.get('farm_location')
            farm_size = user.get('farm_size')
            
            print(f"   - Crops (initialized): {crops}")
            print(f"   - Farm Location: {farm_location}")
            print(f"   - Farm Size: {farm_size}")
            
            if crops == [] and farm_location is None and farm_size is None:
                print("✅ Producteur fields properly initialized")
            else:
                print("⚠️  Producteur field initialization needs review")
            
            return result.get('access_token'), user.get('_id')
            
        except Exception as e:
            print(f"❌ Failed to parse response: {e}")
            print(f"   Response text: {response.text}")
            return None, None
    else:
        print(f"❌ Registration failed - Status: {response.status_code}")
        try:
            error_detail = response.json()
            print(f"   Error: {error_detail}")
        except:
            print(f"   Response: {response.text}")
        return None, None

def test_login():
    """Test 2: Login Endpoint - POST /api/auth/login"""
    print("\n🧪 TEST 2: Login with Created Account")
    
    login_data = {
        "phone_number": "+22507123456789",
        "password": "test123"
    }
    
    response = make_request("POST", "/auth/login", login_data)
    
    if not response:
        print("❌ CRITICAL: Failed to connect to login endpoint")
        return None
    
    if response.status_code == 200:
        try:
            result = response.json()
            print("✅ Login successful")
            print(f"   - Status Code: {response.status_code}")
            print(f"   - Token Type: {result.get('token_type', 'Missing')}")
            print(f"   - Access Token: {'Present' if result.get('access_token') else 'Missing'}")
            
            user = result.get('user', {})
            print(f"   - User ID: {user.get('_id', 'Missing')}")
            print(f"   - Full Name: {user.get('full_name', 'Missing')}")
            
            return result.get('access_token')
            
        except Exception as e:
            print(f"❌ Failed to parse login response: {e}")
            return None
    else:
        print(f"❌ Login failed - Status: {response.status_code}")
        try:
            error_detail = response.json()
            print(f"   Error: {error_detail}")
        except:
            print(f"   Response: {response.text}")
        return None

def test_get_profile(token: str):
    """Test 3: Get Profile - GET /api/auth/me"""
    print("\n🧪 TEST 3: Get User Profile")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = make_request("GET", "/auth/me", headers=headers)
    
    if not response:
        print("❌ CRITICAL: Failed to connect to profile endpoint")
        return False
    
    if response.status_code == 200:
        try:
            user = response.json()
            print("✅ Profile retrieved successfully")
            print(f"   - User ID: {user.get('_id', 'Missing')}")
            print(f"   - Full Name: {user.get('full_name', 'Missing')}")
            print(f"   - User Type: {user.get('user_type', 'Missing')}")
            print(f"   - Phone: {user.get('phone_number', 'Missing')}")
            print(f"   - Active: {user.get('is_active', 'Missing')}")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to parse profile response: {e}")
            return False
    else:
        print(f"❌ Profile retrieval failed - Status: {response.status_code}")
        try:
            error_detail = response.json()
            print(f"   Error: {error_detail}")
        except:
            print(f"   Response: {response.text}")
        return False

def test_update_profile(token: str):
    """Test 4: Update Profile - PUT /api/auth/profile"""
    print("\n🧪 TEST 4: Update Producteur Profile")
    
    # Test data from review request
    update_data = {
        "farm_location": "Bouaflé",
        "farm_size": 5.5,
        "crops": ["Cacao", "Café"]
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = make_request("PUT", "/auth/profile", update_data, headers)
    
    if not response:
        print("❌ CRITICAL: Failed to connect to profile update endpoint")
        return False
    
    if response.status_code == 200:
        try:
            updated_user = response.json()
            print("✅ Profile updated successfully")
            print(f"   - Farm Location: {updated_user.get('farm_location', 'Missing')}")
            print(f"   - Farm Size: {updated_user.get('farm_size', 'Missing')}")
            print(f"   - Crops: {updated_user.get('crops', 'Missing')}")
            
            # Verify the updates were applied
            expected_location = "Bouaflé"
            expected_size = 5.5
            expected_crops = ["Cacao", "Café"]
            
            if (updated_user.get('farm_location') == expected_location and
                updated_user.get('farm_size') == expected_size and
                updated_user.get('crops') == expected_crops):
                print("✅ All profile updates verified correctly")
                return True
            else:
                print("⚠️  Profile update values don't match expected")
                return False
                
        except Exception as e:
            print(f"❌ Failed to parse update response: {e}")
            return False
    else:
        print(f"❌ Profile update failed - Status: {response.status_code}")
        try:
            error_detail = response.json()
            print(f"   Error: {error_detail}")
        except:
            print(f"   Response: {response.text}")
        return False

def test_different_user_types():
    """Test 5: Test Different User Types"""
    print("\n🧪 TEST 5: Different User Types Registration")
    
    user_types = [
        {
            "name": "acheteur",
            "data": {
                "phone_number": "+22508112233445",
                "password": "acheteur123",
                "full_name": "Test Acheteur",
                "user_type": "acheteur"
            },
            "expected_fields": ["company_name", "purchase_volume"]
        },
        {
            "name": "entreprise_rse",
            "data": {
                "phone_number": "+22509556677889",
                "password": "rse123",
                "full_name": "Test Entreprise RSE",
                "user_type": "entreprise_rse"
            },
            "expected_fields": ["company_name_rse", "sector", "carbon_goals"]
        },
        {
            "name": "fournisseur",
            "data": {
                "phone_number": "+22507998877667",
                "password": "fournisseur123",
                "full_name": "Test Fournisseur",
                "user_type": "fournisseur"
            },
            "expected_fields": ["supplier_company", "products_offered"]
        }
    ]
    
    success_count = 0
    
    for user_type_test in user_types:
        print(f"\n   Testing {user_type_test['name']} registration:")
        
        response = make_request("POST", "/auth/register", user_type_test["data"])
        
        if not response:
            print(f"   ❌ Failed to connect for {user_type_test['name']}")
            continue
        
        if response.status_code in [200, 201]:
            try:
                result = response.json()
                user = result.get('user', {})
                
                print(f"   ✅ {user_type_test['name']} registered successfully")
                print(f"      - User Type: {user.get('user_type')}")
                
                # Check type-specific fields are initialized
                fields_ok = True
                for field in user_type_test["expected_fields"]:
                    field_value = user.get(field)
                    print(f"      - {field}: {field_value}")
                    if field_value is None or (isinstance(field_value, list) and field_value == []):
                        # This is expected initialization
                        continue
                    else:
                        fields_ok = False
                
                if fields_ok:
                    print(f"   ✅ {user_type_test['name']} fields properly initialized")
                    success_count += 1
                else:
                    print(f"   ⚠️  {user_type_test['name']} field initialization needs review")
                
            except Exception as e:
                print(f"   ❌ Failed to parse {user_type_test['name']} response: {e}")
        else:
            print(f"   ❌ {user_type_test['name']} registration failed - Status: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"      Error: {error_detail}")
            except:
                print(f"      Response: {response.text}")
    
    print(f"\n   User Types Test Summary: {success_count}/3 successful")
    return success_count == 3

def test_error_handling():
    """Test 6: Error Handling"""
    print("\n🧪 TEST 6: Error Handling Tests")
    
    tests_passed = 0
    total_tests = 4
    
    # Test 6a: Duplicate phone number
    print("\n   6a. Testing duplicate phone number registration:")
    duplicate_data = {
        "phone_number": "+22507123456789",  # Same as first user
        "password": "test456",
        "full_name": "Duplicate User",
        "user_type": "acheteur"
    }
    
    response = make_request("POST", "/auth/register", duplicate_data)
    if response and response.status_code == 400:
        print("   ✅ Duplicate phone number correctly rejected")
        tests_passed += 1
    else:
        print(f"   ❌ Duplicate phone number test failed - Status: {response.status_code if response else 'No response'}")
    
    # Test 6b: Wrong password login
    print("\n   6b. Testing login with wrong password:")
    wrong_login = {
        "phone_number": "+22507123456789",
        "password": "wrongpassword"
    }
    
    response = make_request("POST", "/auth/login", wrong_login)
    if response and response.status_code == 401:
        print("   ✅ Wrong password correctly rejected")
        tests_passed += 1
    else:
        print(f"   ❌ Wrong password test failed - Status: {response.status_code if response else 'No response'}")
    
    # Test 6c: Invalid phone number format
    print("\n   6c. Testing invalid phone number format:")
    invalid_phone = {
        "phone_number": "invalid-phone",
        "password": "test123",
        "full_name": "Invalid Phone User",
        "user_type": "producteur"
    }
    
    response = make_request("POST", "/auth/register", invalid_phone)
    if response and response.status_code == 422:  # Validation error
        print("   ✅ Invalid phone number format correctly rejected")
        tests_passed += 1
    else:
        print(f"   ❌ Invalid phone number test failed - Status: {response.status_code if response else 'No response'}")
    
    # Test 6d: Access /me without token
    print("\n   6d. Testing access to /me without token:")
    response = make_request("GET", "/auth/me")
    if response and response.status_code in [401, 403]:  # Accept both 401 and 403 
        print("   ✅ Unauthorized access correctly rejected")
        tests_passed += 1
    else:
        print(f"   ❌ Unauthorized access test failed - Status: {response.status_code if response else 'No response'}")
    
    print(f"\n   Error Handling Test Summary: {tests_passed}/{total_tests} passed")
    return tests_passed == total_tests

def main():
    """Main test runner"""
    print("=" * 80)
    print("🔐 GREENLINK AUTHENTICATION SYSTEM TEST SUITE")
    print("=" * 80)
    
    # Test counters
    total_tests = 6
    passed_tests = 0
    
    # Test 1: Register producteur
    token, user_id = test_register_producteur()
    if token and user_id:
        passed_tests += 1
    
    # Test 2: Login
    login_token = test_login()
    if login_token:
        passed_tests += 1
        # Use login token for subsequent tests
        token = login_token
    
    # Tests 3-4: Profile operations (only if we have a token)
    if token:
        # Test 3: Get profile
        if test_get_profile(token):
            passed_tests += 1
        
        # Test 4: Update profile
        if test_update_profile(token):
            passed_tests += 1
    else:
        print("\n⚠️  Skipping profile tests due to authentication failure")
    
    # Test 5: Different user types
    if test_different_user_types():
        passed_tests += 1
    
    # Test 6: Error handling
    if test_error_handling():
        passed_tests += 1
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUITE SUMMARY")
    print("=" * 80)
    print(f"Tests Passed: {passed_tests}/{total_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! Authentication system is working correctly.")
    else:
        print("❌ SOME TESTS FAILED! Please review the issues above.")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)