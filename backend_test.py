#!/usr/bin/env python3
"""
Comprehensive Backend Test Suite for GreenLink Authentication System with Email Support
Testing the updated authentication system that supports both email and phone registration/login.
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://farm-intelligence-14.preview.emergentagent.com"
BASE_URL = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_test_header(title):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{title}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def test_register_with_email():
    """Test registering a new user with email"""
    print_test_header("TEST 1: Register with Email")
    
    test_data = {
        "email": "test@greenlink.ci",
        "password": "test123",
        "full_name": "Test Email User",
        "user_type": "producteur"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=test_data)
        print_info(f"POST {BASE_URL}/auth/register")
        print_info(f"Data: {json.dumps(test_data, indent=2)}")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                user = data["user"]
                if user.get("email") == test_data["email"]:
                    print_success(f"Registration with email successful - User ID: {user.get('_id')}")
                    return data["access_token"], user["_id"]
                else:
                    print_error("User email field missing or incorrect in response")
                    return None, None
            else:
                print_error("Missing access_token or user in response")
                return None, None
        else:
            print_error(f"Registration failed: {response.text}")
            return None, None
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return None, None

def test_register_with_phone():
    """Test registering a new user with phone number"""
    print_test_header("TEST 2: Register with Phone")
    
    test_data = {
        "phone_number": "+22507654321",
        "password": "test456",
        "full_name": "Test Phone User",
        "user_type": "acheteur"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=test_data)
        print_info(f"POST {BASE_URL}/auth/register")
        print_info(f"Data: {json.dumps(test_data, indent=2)}")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                user = data["user"]
                if user.get("phone_number") == test_data["phone_number"]:
                    print_success(f"Registration with phone successful - User ID: {user.get('_id')}")
                    return data["access_token"], user["_id"]
                else:
                    print_error("User phone_number field missing or incorrect in response")
                    return None, None
            else:
                print_error("Missing access_token or user in response")
                return None, None
        else:
            print_error(f"Registration failed: {response.text}")
            return None, None
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return None, None

def test_login_with_email():
    """Test login with email as identifier"""
    print_test_header("TEST 3: Login with Email")
    
    login_data = {
        "identifier": "test@greenlink.ci",
        "password": "test123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print_info(f"POST {BASE_URL}/auth/login")
        print_info(f"Data: {json.dumps(login_data, indent=2)}")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                user = data["user"]
                if user.get("email") == login_data["identifier"]:
                    print_success("Email login successful")
                    return True
                else:
                    print_error("User email mismatch in login response")
                    return False
            else:
                print_error("Missing access_token or user in login response")
                return False
        else:
            print_error(f"Email login failed: {response.text}")
            return False
    except Exception as e:
        print_error(f"Email login request failed: {str(e)}")
        return False

def test_login_with_phone():
    """Test login with phone as identifier"""
    print_test_header("TEST 4: Login with Phone")
    
    login_data = {
        "identifier": "+22507654321",
        "password": "test456"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print_info(f"POST {BASE_URL}/auth/login")
        print_info(f"Data: {json.dumps(login_data, indent=2)}")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                user = data["user"]
                if user.get("phone_number") == login_data["identifier"]:
                    print_success("Phone login successful")
                    return True
                else:
                    print_error("User phone number mismatch in login response")
                    return False
            else:
                print_error("Missing access_token or user in login response")
                return False
        else:
            print_error(f"Phone login failed: {response.text}")
            return False
    except Exception as e:
        print_error(f"Phone login request failed: {str(e)}")
        return False

def test_duplicate_email_registration():
    """Test registering with duplicate email should fail"""
    print_test_header("TEST 5: Duplicate Email Registration (Should Fail)")
    
    duplicate_data = {
        "email": "test@greenlink.ci",
        "password": "different123",
        "full_name": "Different User",
        "user_type": "entreprise_rse"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=duplicate_data)
        print_info(f"POST {BASE_URL}/auth/register")
        print_info(f"Data: {json.dumps(duplicate_data, indent=2)}")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            error_msg = response.json().get("detail", "")
            if "email" in error_msg.lower() or "déjà enregistré" in error_msg:
                print_success("Duplicate email registration correctly rejected")
                return True
            else:
                print_error(f"Unexpected error message for duplicate email: {error_msg}")
                return False
        else:
            print_error(f"Expected 400 status code for duplicate email, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Duplicate email test request failed: {str(e)}")
        return False

def test_duplicate_phone_registration():
    """Test registering with duplicate phone should fail"""
    print_test_header("TEST 6: Duplicate Phone Registration (Should Fail)")
    
    duplicate_data = {
        "phone_number": "+22507654321",
        "password": "different456",
        "full_name": "Different User",
        "user_type": "fournisseur"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=duplicate_data)
        print_info(f"POST {BASE_URL}/auth/register")
        print_info(f"Data: {json.dumps(duplicate_data, indent=2)}")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            error_msg = response.json().get("detail", "")
            if "téléphone" in error_msg.lower() or "déjà enregistré" in error_msg:
                print_success("Duplicate phone registration correctly rejected")
                return True
            else:
                print_error(f"Unexpected error message for duplicate phone: {error_msg}")
                return False
        else:
            print_error(f"Expected 400 status code for duplicate phone, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Duplicate phone test request failed: {str(e)}")
        return False

def test_registration_without_contact():
    """Test registering without phone AND email should fail"""
    print_test_header("TEST 7: Registration without Phone AND Email (Should Fail)")
    
    invalid_data = {
        "password": "test789",
        "full_name": "Invalid User",
        "user_type": "producteur"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=invalid_data)
        print_info(f"POST {BASE_URL}/auth/register")
        print_info(f"Data: {json.dumps(invalid_data, indent=2)}")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 422:
            error_msg = response.text
            print_success("Registration without contact info correctly rejected with validation error")
            return True
        else:
            print_error(f"Expected 422 validation error, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"No contact info test request failed: {str(e)}")
        return False

def test_login_wrong_identifier():
    """Test login with non-existent identifier should fail"""
    print_test_header("TEST 8: Login with Wrong Identifier (Should Fail)")
    
    wrong_login = {
        "identifier": "nonexistent@test.com",
        "password": "test123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=wrong_login)
        print_info(f"POST {BASE_URL}/auth/login")
        print_info(f"Data: {json.dumps(wrong_login, indent=2)}")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print_success("Login with wrong identifier correctly rejected")
            return True
        else:
            print_error(f"Expected 401 unauthorized, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Wrong identifier test request failed: {str(e)}")
        return False

def test_profile_display(token, expected_email=None, expected_phone=None):
    """Test profile endpoint to verify email/phone fields are correctly displayed"""
    print_test_header("TEST 9: Profile Display Verification")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print_info(f"GET {BASE_URL}/auth/me")
        print_info(f"Headers: Bearer token provided")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            user = response.json()
            print_info(f"Profile data retrieved: {json.dumps(user, indent=2, default=str)}")
            
            success = True
            if expected_email:
                if user.get("email") == expected_email:
                    print_success(f"Email field correctly displayed: {expected_email}")
                else:
                    print_error(f"Email field mismatch. Expected: {expected_email}, Got: {user.get('email')}")
                    success = False
            
            if expected_phone:
                if user.get("phone_number") == expected_phone:
                    print_success(f"Phone field correctly displayed: {expected_phone}")
                else:
                    print_error(f"Phone field mismatch. Expected: {expected_phone}, Got: {user.get('phone_number')}")
                    success = False
            
            return success
        else:
            print_error(f"Profile retrieval failed: {response.text}")
            return False
    except Exception as e:
        print_error(f"Profile display test request failed: {str(e)}")
        return False

def main():
    print(f"{Colors.BOLD}🧪 GreenLink Authentication System Test Suite with Email Support{Colors.END}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Testing API endpoints at: {BASE_URL}")
    
    test_results = []
    email_token = None
    phone_token = None
    
    # Test 1: Register with Email
    email_token, email_user_id = test_register_with_email()
    test_results.append(("Register with Email", email_token is not None))
    
    # Test 2: Register with Phone  
    phone_token, phone_user_id = test_register_with_phone()
    test_results.append(("Register with Phone", phone_token is not None))
    
    # Test 3: Login with Email
    email_login_success = test_login_with_email()
    test_results.append(("Login with Email", email_login_success))
    
    # Test 4: Login with Phone
    phone_login_success = test_login_with_phone()
    test_results.append(("Login with Phone", phone_login_success))
    
    # Test 5: Duplicate Email Registration
    duplicate_email_test = test_duplicate_email_registration()
    test_results.append(("Duplicate Email Rejection", duplicate_email_test))
    
    # Test 6: Duplicate Phone Registration
    duplicate_phone_test = test_duplicate_phone_registration()
    test_results.append(("Duplicate Phone Rejection", duplicate_phone_test))
    
    # Test 7: Registration without Contact Info
    no_contact_test = test_registration_without_contact()
    test_results.append(("No Contact Info Rejection", no_contact_test))
    
    # Test 8: Login with Wrong Identifier
    wrong_login_test = test_login_wrong_identifier()
    test_results.append(("Wrong Identifier Rejection", wrong_login_test))
    
    # Test 9: Profile Display (if we have tokens)
    if email_token:
        email_profile_test = test_profile_display(email_token, expected_email="test@greenlink.ci")
        test_results.append(("Email Profile Display", email_profile_test))
    
    if phone_token:
        phone_profile_test = test_profile_display(phone_token, expected_phone="+22507654321")
        test_results.append(("Phone Profile Display", phone_profile_test))
    
    # Summary
    print_test_header("TEST RESULTS SUMMARY")
    
    passed_tests = 0
    total_tests = len(test_results)
    
    for test_name, passed in test_results:
        if passed:
            print_success(f"{test_name}")
            passed_tests += 1
        else:
            print_error(f"{test_name}")
    
    print(f"\n{Colors.BOLD}Results: {passed_tests}/{total_tests} tests passed{Colors.END}")
    
    if passed_tests == total_tests:
        print_success(f"🎉 All authentication tests with email support passed!")
        return True
    else:
        print_error(f"⚠️  {total_tests - passed_tests} tests failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)