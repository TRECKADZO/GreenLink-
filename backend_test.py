#!/usr/bin/env python3
"""
Comprehensive Backend Test Suite for GreenLink Multi-Profile Platform
Testing the complete GreenLink system including:
1. Producer/Farmer Profile (Producteur) 
2. Buyer Profile (Acheteur)
3. CSR Company Profile (Entreprise RSE)
4. Integration Tests
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Get backend URL from environment
BACKEND_URL = "https://coop-dashboard-6.preview.emergentagent.com"
BASE_URL = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_test_header(title):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{title}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*80}{Colors.END}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

# Global test data storage
test_tokens = {}
test_user_ids = {}
test_data = {}

class TestTracker:
    def __init__(self):
        self.results = []
    
    def add_result(self, test_name, passed, details=""):
        self.results.append({
            "name": test_name,
            "passed": passed,
            "details": details
        })
        if passed:
            print_success(f"{test_name}")
        else:
            print_error(f"{test_name}: {details}")
    
    def get_summary(self):
        passed = len([r for r in self.results if r["passed"]])
        total = len(self.results)
        return passed, total

tracker = TestTracker()

def make_request(method, url, **kwargs):
    """Helper function to make HTTP requests with proper error handling"""
    try:
        response = requests.request(method, url, **kwargs)
        print_info(f"{method.upper()} {url}")
        if "json" in kwargs:
            print_info(f"Data: {json.dumps(kwargs['json'], indent=2, default=str)}")
        print_info(f"Status Code: {response.status_code}")
        return response
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return None

# ============= AUTHENTICATION SETUP =============

def setup_test_accounts():
    """Create test accounts for all user types"""
    print_test_header("SETUP: Creating Test Accounts")
    
    accounts = [
        {
            "email": "planteur@test.ci",
            "password": "test123",
            "full_name": "Kouadio Yao",
            "user_type": "producteur",
            "key": "producteur"
        },
        {
            "email": "acheteur@test.ci", 
            "password": "test123",
            "full_name": "Société Cacao Plus",
            "user_type": "acheteur",
            "key": "acheteur"
        },
        {
            "email": "rse@test.ci",
            "password": "test123", 
            "full_name": "Green Impact SA",
            "user_type": "entreprise_rse",
            "key": "entreprise_rse"
        }
    ]
    
    for account in accounts:
        # First try to register
        response = make_request("POST", f"{BASE_URL}/auth/register", json=account)
        
        if response and response.status_code == 200:
            data = response.json()
            test_tokens[account["key"]] = data["access_token"]
            test_user_ids[account["key"]] = data["user"]["_id"]
            print_success(f"Created {account['key']} account: {account['email']}")
        else:
            # Try to login if already exists
            login_data = {
                "identifier": account["email"],
                "password": account["password"]
            }
            response = make_request("POST", f"{BASE_URL}/auth/login", json=login_data)
            
            if response and response.status_code == 200:
                data = response.json()
                test_tokens[account["key"]] = data["access_token"]
                test_user_ids[account["key"]] = data["user"]["_id"]
                print_success(f"Logged into existing {account['key']} account: {account['email']}")
            else:
                print_error(f"Failed to setup {account['key']} account")
                return False
    
    return len(test_tokens) == 3

# ============= PRODUCER/FARMER TESTS =============

def test_producer_parcel_declaration():
    """Test parcel declaration by producer"""
    print_test_header("PRODUCER TEST 1: Parcel Declaration")
    
    if "producteur" not in test_tokens:
        tracker.add_result("Producer Parcel Declaration", False, "No producer token available")
        return
    
    parcel_data = {
        "farmer_name": "Kouadio Yao",
        "phone_number": "+22507123456",
        "location": "Bouaflé Centre",
        "region": "Bouaflé",
        "crop_type": "cacao",
        "area_hectares": 3.5,
        "trees_count": 450,
        "farming_practices": ["agroforesterie", "compost", "zero_pesticides"],
        "language": "francais"
    }
    
    headers = {"Authorization": f"Bearer {test_tokens['producteur']}"}
    response = make_request("POST", f"{BASE_URL}/greenlink/parcels", json=parcel_data, headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        if all(field in data for field in ["_id", "carbon_score", "carbon_credits_earned"]):
            test_data["parcel_id"] = data["_id"]
            carbon_score = data["carbon_score"]
            print_info(f"Created parcel with carbon score: {carbon_score}")
            tracker.add_result("Producer Parcel Declaration", True, f"Carbon score: {carbon_score}")
        else:
            tracker.add_result("Producer Parcel Declaration", False, "Missing required fields in response")
    else:
        tracker.add_result("Producer Parcel Declaration", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_producer_get_parcels():
    """Test getting producer's parcels"""
    print_test_header("PRODUCER TEST 2: Get My Parcels")
    
    if "producteur" not in test_tokens:
        tracker.add_result("Get Producer Parcels", False, "No producer token available")
        return
    
    headers = {"Authorization": f"Bearer {test_tokens['producteur']}"}
    response = make_request("GET", f"{BASE_URL}/greenlink/parcels/my-parcels", headers=headers)
    
    if response and response.status_code == 200:
        parcels = response.json()
        if isinstance(parcels, list) and len(parcels) > 0:
            parcel = parcels[0]
            if all(field in parcel for field in ["_id", "farmer_name", "carbon_score"]):
                print_info(f"Retrieved {len(parcels)} parcels")
                tracker.add_result("Get Producer Parcels", True, f"Found {len(parcels)} parcels")
            else:
                tracker.add_result("Get Producer Parcels", False, "Parcel missing required fields")
        else:
            tracker.add_result("Get Producer Parcels", False, "No parcels returned")
    else:
        tracker.add_result("Get Producer Parcels", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_producer_harvest_declaration():
    """Test harvest declaration by producer"""
    print_test_header("PRODUCER TEST 3: Harvest Declaration")
    
    if "producteur" not in test_tokens or "parcel_id" not in test_data:
        tracker.add_result("Producer Harvest Declaration", False, "Missing producer token or parcel ID")
        return
    
    harvest_data = {
        "parcel_id": test_data["parcel_id"],
        "quantity_kg": 250,
        "quality_grade": "A",
        "price_per_kg": 1500,
        "sale_type": "marketplace"
    }
    
    headers = {"Authorization": f"Bearer {test_tokens['producteur']}"}
    response = make_request("POST", f"{BASE_URL}/greenlink/harvests", json=harvest_data, headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        if all(field in data for field in ["_id", "total_amount", "carbon_premium"]):
            test_data["harvest_id"] = data["_id"]
            carbon_premium = data["carbon_premium"]
            total_amount = data["total_amount"]
            print_info(f"Harvest declared - Total: {total_amount} FCFA, Carbon premium: {carbon_premium} FCFA")
            tracker.add_result("Producer Harvest Declaration", True, f"Premium: {carbon_premium} FCFA")
        else:
            tracker.add_result("Producer Harvest Declaration", False, "Missing required fields in response")
    else:
        tracker.add_result("Producer Harvest Declaration", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_producer_payment_request():
    """Test mobile money payment request"""
    print_test_header("PRODUCER TEST 4: Mobile Money Payment Request")
    
    if "producteur" not in test_tokens or "harvest_id" not in test_data:
        tracker.add_result("Producer Payment Request", False, "Missing producer token or harvest ID")
        return
    
    payment_data = {
        "harvest_id": test_data["harvest_id"],
        "phone_number": "+22507123456",
        "amount": 387500,
        "payment_method": "orange_money"
    }
    
    headers = {"Authorization": f"Bearer {test_tokens['producteur']}"}
    response = make_request("POST", f"{BASE_URL}/greenlink/payments/request", json=payment_data, headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        if all(field in data for field in ["success", "transaction_id", "amount"]):
            transaction_id = data["transaction_id"]
            print_info(f"Payment processed - Transaction ID: {transaction_id}")
            tracker.add_result("Producer Payment Request", True, f"Transaction ID: {transaction_id}")
        else:
            tracker.add_result("Producer Payment Request", False, "Missing required fields in response")
    else:
        tracker.add_result("Producer Payment Request", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_producer_dashboard():
    """Test producer dashboard"""
    print_test_header("PRODUCER TEST 5: Producer Dashboard")
    
    if "producteur" not in test_tokens:
        tracker.add_result("Producer Dashboard", False, "No producer token available")
        return
    
    headers = {"Authorization": f"Bearer {test_tokens['producteur']}"}
    response = make_request("GET", f"{BASE_URL}/greenlink/farmer/dashboard", headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        required_fields = ["total_parcels", "total_area_hectares", "average_carbon_score", "total_revenue", "carbon_premium_earned"]
        if all(field in data for field in required_fields):
            print_info(f"Dashboard stats - Parcels: {data['total_parcels']}, Revenue: {data['total_revenue']} FCFA")
            tracker.add_result("Producer Dashboard", True, f"Revenue: {data['total_revenue']} FCFA")
        else:
            missing_fields = [f for f in required_fields if f not in data]
            tracker.add_result("Producer Dashboard", False, f"Missing fields: {missing_fields}")
    else:
        tracker.add_result("Producer Dashboard", False, f"Failed with status {response.status_code if response else 'No response'}")

# ============= BUYER TESTS =============

def test_buyer_create_order():
    """Test buyer order creation"""
    print_test_header("BUYER TEST 1: Create Buyer Order")
    
    if "acheteur" not in test_tokens:
        tracker.add_result("Buyer Create Order", False, "No buyer token available")
        return
    
    order_data = {
        "crop_type": "cacao",
        "quantity_needed_kg": 5000,
        "max_price_per_kg": 1600,
        "carbon_requirement": True,
        "min_carbon_score": 7.0,
        "certifications_required": ["UTZ"],
        "delivery_location": "Abidjan Port",
        "delivery_date": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }
    
    headers = {"Authorization": f"Bearer {test_tokens['acheteur']}"}
    response = make_request("POST", f"{BASE_URL}/greenlink/buyer/orders", json=order_data, headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        if all(field in data for field in ["_id", "status", "matched_parcels"]):
            test_data["buyer_order_id"] = data["_id"]
            matched_count = len(data["matched_parcels"])
            print_info(f"Order created with {matched_count} matched parcels")
            tracker.add_result("Buyer Create Order", True, f"Matched {matched_count} parcels")
        else:
            tracker.add_result("Buyer Create Order", False, "Missing required fields in response")
    else:
        tracker.add_result("Buyer Create Order", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_buyer_traceability_report():
    """Test EUDR traceability report generation"""
    print_test_header("BUYER TEST 2: EUDR Traceability Report")
    
    if "acheteur" not in test_tokens or "buyer_order_id" not in test_data:
        tracker.add_result("Buyer Traceability Report", False, "Missing buyer token or order ID")
        return
    
    headers = {"Authorization": f"Bearer {test_tokens['acheteur']}"}
    response = make_request("GET", f"{BASE_URL}/greenlink/buyer/traceability/{test_data['buyer_order_id']}", headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        required_fields = ["order_id", "parcels", "farmers", "average_carbon_score", "eudr_compliant", "blockchain_hash"]
        if all(field in data for field in required_fields):
            eudr_compliant = data["eudr_compliant"]
            carbon_score = data["average_carbon_score"]
            print_info(f"Traceability report - Carbon score: {carbon_score}, EUDR compliant: {eudr_compliant}")
            tracker.add_result("Buyer Traceability Report", True, f"EUDR compliant: {eudr_compliant}")
        else:
            missing_fields = [f for f in required_fields if f not in data]
            tracker.add_result("Buyer Traceability Report", False, f"Missing fields: {missing_fields}")
    else:
        tracker.add_result("Buyer Traceability Report", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_buyer_dashboard():
    """Test buyer dashboard"""
    print_test_header("BUYER TEST 3: Buyer Dashboard")
    
    if "acheteur" not in test_tokens:
        tracker.add_result("Buyer Dashboard", False, "No buyer token available")
        return
    
    headers = {"Authorization": f"Bearer {test_tokens['acheteur']}"}
    response = make_request("GET", f"{BASE_URL}/greenlink/buyer/dashboard", headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        required_fields = ["total_orders", "active_orders", "total_carbon_offset_tonnes", "eudr_compliance_rate"]
        if all(field in data for field in required_fields):
            total_orders = data["total_orders"]
            compliance_rate = data["eudr_compliance_rate"]
            print_info(f"Buyer stats - Orders: {total_orders}, EUDR compliance: {compliance_rate}%")
            tracker.add_result("Buyer Dashboard", True, f"Orders: {total_orders}, Compliance: {compliance_rate}%")
        else:
            missing_fields = [f for f in required_fields if f not in data]
            tracker.add_result("Buyer Dashboard", False, f"Missing fields: {missing_fields}")
    else:
        tracker.add_result("Buyer Dashboard", False, f"Failed with status {response.status_code if response else 'No response'}")

# ============= CSR COMPANY TESTS =============

def test_carbon_credits_marketplace():
    """Test carbon credits marketplace listing"""
    print_test_header("CSR TEST 1: Carbon Credits Marketplace")
    
    # Test without filters
    response = make_request("GET", f"{BASE_URL}/greenlink/carbon-credits")
    
    if response and response.status_code == 200:
        credits = response.json()
        if isinstance(credits, list) and len(credits) >= 1:  # At least 1 credit should be available
            credit = credits[0]
            if all(field in credit for field in ["_id", "credit_type", "price_per_tonne", "verification_standard"]):
                test_data["carbon_credit_id"] = credit["_id"]
                print_info(f"Found {len(credits)} carbon credits available")
                tracker.add_result("Carbon Credits Marketplace", True, f"Found {len(credits)} credits")
            else:
                tracker.add_result("Carbon Credits Marketplace", False, "Credit missing required fields")
        else:
            tracker.add_result("Carbon Credits Marketplace", False, f"No available credits found, got {len(credits) if isinstance(credits, list) else 0}")
    else:
        tracker.add_result("Carbon Credits Marketplace", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_carbon_credits_filters():
    """Test carbon credits marketplace with filters"""
    print_test_header("CSR TEST 2: Carbon Credits Marketplace Filters")
    
    # Test with filters
    params = {
        "standard": "Verra",
        "min_price": 10000,
        "max_price": 20000
    }
    
    response = make_request("GET", f"{BASE_URL}/greenlink/carbon-credits", params=params)
    
    if response and response.status_code == 200:
        credits = response.json()
        if isinstance(credits, list):
            # Verify filters applied correctly
            valid = True
            for credit in credits:
                if credit.get("verification_standard") != "Verra":
                    valid = False
                    break
                price = credit.get("price_per_tonne", 0)
                if price < 10000 or price > 20000:
                    valid = False
                    break
            
            if valid:
                print_info(f"Filter test passed - Found {len(credits)} Verra credits in price range")
                tracker.add_result("Carbon Credits Marketplace Filters", True, f"Found {len(credits)} filtered credits")
            else:
                tracker.add_result("Carbon Credits Marketplace Filters", False, "Filters not applied correctly")
        else:
            tracker.add_result("Carbon Credits Marketplace Filters", False, "Invalid response format")
    else:
        tracker.add_result("Carbon Credits Marketplace Filters", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_carbon_credit_purchase():
    """Test carbon credit purchase"""
    print_test_header("CSR TEST 3: Carbon Credit Purchase")
    
    if "entreprise_rse" not in test_tokens or "carbon_credit_id" not in test_data:
        tracker.add_result("Carbon Credit Purchase", False, "Missing CSR token or credit ID")
        return
    
    purchase_data = {
        "credit_id": test_data["carbon_credit_id"],
        "quantity_tonnes": 100,
        "total_price": 1200000,
        "purpose": "scope3_compensation",
        "retirement_requested": True
    }
    
    headers = {"Authorization": f"Bearer {test_tokens['entreprise_rse']}"}
    response = make_request("POST", f"{BASE_URL}/greenlink/carbon-credits/purchase", json=purchase_data, headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        if all(field in data for field in ["_id", "certificate_url", "status"]):
            certificate_url = data["certificate_url"]
            status = data["status"]
            print_info(f"Purchase completed - Status: {status}, Certificate: {certificate_url}")
            tracker.add_result("Carbon Credit Purchase", True, f"Status: {status}")
        else:
            tracker.add_result("Carbon Credit Purchase", False, "Missing required fields in response")
    else:
        tracker.add_result("Carbon Credit Purchase", False, f"Failed with status {response.status_code if response else 'No response'}")

def test_csr_impact_dashboard():
    """Test CSR impact dashboard"""
    print_test_header("CSR TEST 4: CSR Impact Dashboard")
    
    if "entreprise_rse" not in test_tokens:
        tracker.add_result("CSR Impact Dashboard", False, "No CSR token available")
        return
    
    headers = {"Authorization": f"Bearer {test_tokens['entreprise_rse']}"}
    response = make_request("GET", f"{BASE_URL}/greenlink/rse/impact-dashboard", headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        required_fields = ["total_co2_offset_tonnes", "total_farmers_impacted", "women_farmers_percentage", "regions_covered"]
        if all(field in data for field in required_fields):
            co2_offset = data["total_co2_offset_tonnes"]
            farmers_impacted = data["total_farmers_impacted"]
            women_percentage = data["women_farmers_percentage"]
            print_info(f"Impact stats - CO2: {co2_offset}t, Farmers: {farmers_impacted}, Women: {women_percentage}%")
            tracker.add_result("CSR Impact Dashboard", True, f"CO2 offset: {co2_offset}t")
        else:
            missing_fields = [f for f in required_fields if f not in data]
            tracker.add_result("CSR Impact Dashboard", False, f"Missing fields: {missing_fields}")
    else:
        tracker.add_result("CSR Impact Dashboard", False, f"Failed with status {response.status_code if response else 'No response'}")

# ============= INTEGRATION TESTS =============

def test_user_type_protection():
    """Test that users can only access their respective endpoints"""
    print_test_header("INTEGRATION TEST 1: User Type Protection")
    
    # Test producer trying to access buyer endpoint with valid data
    if "producteur" in test_tokens:
        headers = {"Authorization": f"Bearer {test_tokens['producteur']}"}
        valid_order_data = {
            "crop_type": "cacao",
            "quantity_needed_kg": 100,
            "max_price_per_kg": 1500,
            "delivery_location": "Test Location",
            "delivery_date": "2026-03-29T02:26:45.170304"
        }
        print_info(f"Testing producer access to buyer endpoint - Expected: 403 Forbidden")
        response = make_request("POST", f"{BASE_URL}/greenlink/buyer/orders", 
                              json=valid_order_data, 
                              headers=headers)
        
        print_info(f"Response object: {response}")
        print_info(f"Response is None: {response is None}")
        print_info(f"Response bool value: {bool(response)}")
        if response is not None:
            print_info(f"Response status: {response.status_code}")
            if response.status_code == 403:
                print_success("Producer correctly blocked from buyer endpoint (403 Forbidden)")
                protection_working = True
            else:
                print_error(f"Producer not blocked - got status {response.status_code} (expected 403)")
                protection_working = False
        else:
            print_error("Producer test failed - no response received")
            protection_working = False
    else:
        protection_working = False
    
    # Test buyer trying to access CSR endpoint with valid data
    if "acheteur" in test_tokens and protection_working:
        print_info(f"Testing buyer access to CSR endpoint - Expected: 403 Forbidden")
        headers = {"Authorization": f"Bearer {test_tokens['acheteur']}"}
        valid_purchase_data = {
            "credit_id": "69a0ffe601140ffe9d7ce709",
            "quantity_tonnes": 10,
            "total_price": 120000,
            "purpose": "scope3_compensation"
        }
        response = make_request("POST", f"{BASE_URL}/greenlink/carbon-credits/purchase",
                              json=valid_purchase_data,
                              headers=headers)
        
        if response is not None:
            print_info(f"Response status: {response.status_code}")
            if response.status_code == 403:
                print_success("Buyer correctly blocked from CSR endpoint (403 Forbidden)")
            else:
                print_error(f"Buyer not blocked - got status {response.status_code} (expected 403)")
                protection_working = False
        else:
            print_error("Buyer test failed - no response received")
            protection_working = False
    
    tracker.add_result("User Type Protection", protection_working, "Access control validation")

def run_comprehensive_tests():
    """Run all tests in the correct order"""
    print(f"{Colors.BOLD}🧪 GreenLink Multi-Profile Platform Comprehensive Test Suite{Colors.END}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Testing API endpoints at: {BASE_URL}")
    
    # Setup phase
    if not setup_test_accounts():
        print_error("Failed to setup test accounts. Cannot proceed with testing.")
        return False
    
    # Producer tests
    test_producer_parcel_declaration()
    test_producer_get_parcels()
    test_producer_harvest_declaration()
    test_producer_payment_request()
    test_producer_dashboard()
    
    # Buyer tests
    test_buyer_create_order()
    test_buyer_traceability_report()
    test_buyer_dashboard()
    
    # CSR tests
    test_carbon_credits_marketplace()
    test_carbon_credits_filters()
    test_carbon_credit_purchase()
    test_csr_impact_dashboard()
    
    # Integration tests
    test_user_type_protection()
    
    # Results summary
    print_test_header("TEST RESULTS SUMMARY")
    
    passed, total = tracker.get_summary()
    
    # Group results by category
    producer_tests = [r for r in tracker.results if "Producer" in r["name"]]
    buyer_tests = [r for r in tracker.results if "Buyer" in r["name"]]
    csr_tests = [r for r in tracker.results if "CSR" in r["name"] or "Carbon" in r["name"]]
    integration_tests = [r for r in tracker.results if "Integration" in r["name"] or "Protection" in r["name"]]
    
    categories = [
        ("PRODUCER TESTS", producer_tests),
        ("BUYER TESTS", buyer_tests), 
        ("CSR COMPANY TESTS", csr_tests),
        ("INTEGRATION TESTS", integration_tests)
    ]
    
    for category_name, category_tests in categories:
        if category_tests:
            print(f"\n{Colors.BOLD}{category_name}:{Colors.END}")
            for test in category_tests:
                status = "✅" if test["passed"] else "❌"
                print(f"  {status} {test['name']}")
                if not test["passed"] and test["details"]:
                    print(f"      {Colors.RED}Error: {test['details']}{Colors.END}")
    
    print(f"\n{Colors.BOLD}Overall Results: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print_success(f"🎉 All GreenLink platform tests passed!")
        return True
    else:
        print_error(f"⚠️  {total - passed} tests failed")
        return False

def main():
    """Main test execution"""
    success = run_comprehensive_tests()
    
    # Print final status
    if success:
        print_success("✅ GreenLink Multi-Profile Platform: All systems operational")
    else:
        print_error("❌ GreenLink Multi-Profile Platform: Issues detected")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)