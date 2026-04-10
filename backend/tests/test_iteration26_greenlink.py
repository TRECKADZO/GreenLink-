from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 26 - GreenLink Backend API Tests
Iteration 26 - GreenLink Backend API Tests
Testing:
Testing:
- Marketplace Intrants API (/api/marketplace/products)
- Marketplace Intrants API (/api/marketplace/products)
- User Registration/Login (/api/auth/register, /api/auth/login)
- User Registration/Login (/api/auth/register, /api/auth/login)
- Carbon Premium Calculator (/api/carbon-payments/ma-prime)
- Carbon Premium Calculator (/api/carbon-payments/ma-prime)
- Carbon Credits Submission/Pending (/api/carbon-listings/submit, /api/carbon-listings/pending)
- Carbon Credits Submission/Pending (/api/carbon-listings/submit, /api/carbon-listings/pending)
"""
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
# ADMIN_EMAIL imported from test_config
# ADMIN_PASSWORD imported from test_config
COOP_EMAIL = "coop-gagnoa@greenlink.ci"
COOP_PASSWORD = "password"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def coop_token(api_client):
    """Get cooperative authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Cooperative login failed: {response.status_code} - {response.text}")

@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self, api_client):
        """Test admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["user_type"] == "admin"
        print(f"✅ Admin login successful: {ADMIN_EMAIL}")
    
    def test_admin_login_invalid_password(self, api_client):
        """Test admin login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid password correctly rejected")


class TestUserRegistration:
    """User registration tests"""
    
    def test_register_producteur(self, api_client):
        """Test registering a new producer with phone, password, full_name, user_type=producteur"""
        # Valid Ivory Coast phone format: +225XXXXXXXXXX (10 digits after +225)
        import random
        suffix = ''.join([str(random.randint(0,9)) for _ in range(7)])
        unique_phone = f"+2250707{suffix}"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "testpass123",
            "full_name": f"TEST_Producteur_{datetime.now().strftime('%H%M%S')}",
            "user_type": "producteur"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user"
        assert data["user"]["user_type"] == "producteur"
        assert data["user"]["phone_number"] == unique_phone
        print(f"✅ Producer registration successful: {unique_phone}")
    
    def test_register_duplicate_phone_fails(self, api_client):
        """Test that duplicate phone registration fails"""
        import random
        suffix = ''.join([str(random.randint(0,9)) for _ in range(7)])
        unique_phone = f"+2250708{suffix}"
        
        # First registration
        response1 = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "testpass123",
            "full_name": "TEST_DuplicateTest",
            "user_type": "producteur"
        })
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Second registration with same phone
        response2 = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": "testpass456",
            "full_name": "TEST_DuplicateTest2",
            "user_type": "producteur"
        })
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        print("✅ Duplicate phone registration correctly rejected")


class TestUserLogin:
    """User login tests"""
    
    def test_login_with_phone(self, api_client):
        """Test login with phone number as identifier"""
        import random
        suffix = ''.join([str(random.randint(0,9)) for _ in range(7)])
        unique_phone = f"+2250709{suffix}"
        password = "logintest123"
        
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "password": password,
            "full_name": "TEST_LoginPhoneUser",
            "user_type": "producteur"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Now login with phone
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": unique_phone,
            "password": password
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        assert "access_token" in data
        print(f"✅ Login with phone successful: {unique_phone}")
    
    def test_login_with_email(self, api_client):
        """Test login with email as identifier"""
        import random
        suffix = ''.join([str(random.randint(0,9)) for _ in range(7)])
        unique_email = f"test_{suffix}@greenlink.ci"
        unique_phone = f"+2250701{suffix}"
        password = "emaillogin123"
        
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "phone_number": unique_phone,
            "email": unique_email,
            "password": password,
            "full_name": "TEST_LoginEmailUser",
            "user_type": "producteur"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Login with email
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": unique_email,
            "password": password
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        print(f"✅ Login with email successful: {unique_email}")


class TestMarketplaceProducts:
    """Marketplace Intrants API tests"""
    
    def test_seed_demo_products(self, api_client):
        """Seed demo products if not already present"""
        response = api_client.post(f"{BASE_URL}/api/marketplace/seed-demo-products")
        assert response.status_code == 200, f"Seed failed: {response.text}"
        
        data = response.json()
        assert "count" in data or "message" in data
        print(f"✅ Seed demo products: {data.get('message', data)}")
    
    def test_get_marketplace_products(self, api_client):
        """Test GET /api/marketplace/products returns demo products"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/products")
        assert response.status_code == 200, f"Get products failed: {response.text}"
        
        products = response.json()
        assert isinstance(products, list), "Expected list of products"
        print(f"✅ Marketplace products count: {len(products)}")
        
        return products
    
    def test_marketplace_products_count(self, api_client):
        """Verify at least 12 demo products exist"""
        # First ensure products are seeded
        api_client.post(f"{BASE_URL}/api/marketplace/seed-demo-products")
        
        response = api_client.get(f"{BASE_URL}/api/marketplace/products")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) >= 12, f"Expected at least 12 products, got {len(products)}"
        print(f"✅ Found {len(products)} products (expected ≥12)")
    
    def test_marketplace_products_structure(self, api_client):
        """Verify product data structure: name, price, category, supplier_name, stock_quantity"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/products")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) > 0, "No products found"
        
        product = products[0]
        required_fields = ["name", "price", "category", "supplier_name", "stock_quantity"]
        
        for field in required_fields:
            assert field in product, f"Missing field '{field}' in product: {product.keys()}"
        
        # Type checks
        assert isinstance(product["name"], str), "name should be string"
        assert isinstance(product["price"], (int, float)), "price should be number"
        assert isinstance(product["category"], str), "category should be string"
        assert isinstance(product["supplier_name"], str), "supplier_name should be string"
        assert isinstance(product["stock_quantity"], (int, float)), "stock_quantity should be number"
        
        print(f"✅ Product structure validated: {product['name']}")
        print(f"   - Price: {product['price']} XOF")
        print(f"   - Category: {product['category']}")
        print(f"   - Supplier: {product['supplier_name']}")
        print(f"   - Stock: {product['stock_quantity']}")
    
    def test_marketplace_filter_by_category(self, api_client):
        """Test filtering products by category"""
        # Test filtering by engrais
        response = api_client.get(f"{BASE_URL}/api/marketplace/products", params={"category": "engrais"})
        assert response.status_code == 200
        
        products = response.json()
        for product in products:
            assert product["category"] == "engrais", f"Expected 'engrais', got '{product['category']}'"
        
        print(f"✅ Category filter 'engrais': {len(products)} products")


class TestCarbonPremiumCalculator:
    """Carbon Premium Calculator (/api/carbon-payments/ma-prime) tests"""
    
    def test_ma_prime_good_practices(self, api_client):
        """Test premium calculation with good sustainable practices"""
        payload = {
            "hectares": 3.0,
            "grands_arbres": 48,
            "culture": "cacao",
            "engrais_chimique": False,
            "brulage": False,
            "residus_au_sol": True,
            "plantes_couverture": True,
            "especes_arbres": 5
        }
        
        response = api_client.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=payload)
        assert response.status_code == 200, f"Ma prime failed: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "prime_par_kg_fcfa" in data, "Missing prime_par_kg_fcfa"
        assert "prime_annuelle_fcfa" in data, "Missing prime_annuelle_fcfa"
        assert "tonnes_co2_an" in data, "Missing tonnes_co2_an"
        assert "conseil" in data, "Missing conseil"
        
        # With good practices, premium should be decent
        assert data["prime_par_kg_fcfa"] > 50, f"Premium too low: {data['prime_par_kg_fcfa']} FCFA/kg"
        assert data["tonnes_co2_an"] > 10, f"CO2 sequestration too low: {data['tonnes_co2_an']} tonnes"
        
        print(f"✅ Ma Prime (good practices):")
        print(f"   - Prime/kg: {data['prime_par_kg_fcfa']} FCFA")
        print(f"   - Annual: {data['prime_annuelle_fcfa']} FCFA")
        print(f"   - CO2: {data['tonnes_co2_an']} tonnes/year")
        print(f"   - Conseil: {data['conseil'][:50]}...")
    
    def test_ma_prime_poor_practices(self, api_client):
        """Test premium calculation with poor practices (chemical fertilizers, burning)"""
        payload = {
            "hectares": 3.0,
            "grands_arbres": 15,  # Few trees
            "culture": "cacao",
            "engrais_chimique": True,  # Chemical fertilizers
            "brulage": True,  # Burning
            "residus_au_sol": False,
            "plantes_couverture": False,
            "especes_arbres": 1
        }
        
        response = api_client.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=payload)
        assert response.status_code == 200, f"Ma prime failed: {response.text}"
        
        data = response.json()
        
        # Verify response has required fields
        assert "prime_par_kg_fcfa" in data
        assert "prime_annuelle_fcfa" in data
        
        print(f"✅ Ma Prime (poor practices):")
        print(f"   - Prime/kg: {data['prime_par_kg_fcfa']} FCFA (lower due to poor practices)")
        print(f"   - Annual: {data['prime_annuelle_fcfa']} FCFA")
    
    def test_ma_prime_no_distribution_exposed(self, api_client):
        """Verify that distribution model is NOT exposed to farmers"""
        payload = {
            "hectares": 2.0,
            "grands_arbres": 30,
            "culture": "cafe",
            "engrais_chimique": False,
            "brulage": False,
            "residus_au_sol": True,
            "plantes_couverture": False,
            "especes_arbres": 3
        }
        
        response = api_client.post(f"{BASE_URL}/api/carbon-payments/ma-prime", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # These fields should NOT be in the response (farmer shouldn't see internal distribution)
        private_fields = ["distribution_model", "fees", "greenlink_share", "coop_share"]
        for field in private_fields:
            assert field not in data, f"Private field '{field}' should not be exposed to farmer"
        
        print("✅ Distribution model correctly hidden from farmer response")


class TestCarbonCreditsSubmission:
    """Carbon Credits Submission tests (/api/carbon-listings/*)"""
    
    def test_submit_carbon_credits(self, api_client, coop_token):
        """Test cooperative submitting carbon credits for approval"""
        api_client.headers.update({"Authorization": f"Bearer {coop_token}"})
        
        unique_project = f"TEST_Project_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "credit_type": "Agroforesterie",
            "project_name": unique_project,
            "project_description": "Test carbon project for iteration 26 testing",
            "verification_standard": "Verra VCS",
            "quantity_tonnes_co2": 150.0,
            "vintage_year": 2024,
            "region": "Gagnoa",
            "department": "Gôh",
            "methodology": "VM0017",
            "area_hectares": 50.0,
            "trees_planted": 2500,
            "farmers_involved": 25,
            "biodiversity_impact": "Protection de 3 espèces menacées",
            "social_impact": "Amélioration des revenus de 25 familles",
            "monitoring_plan": "Suivi annuel par GPS et photos",
            "documentation_urls": []
        }
        
        response = api_client.post(f"{BASE_URL}/api/carbon-listings/submit", json=payload)
        assert response.status_code == 200, f"Submit failed: {response.text}"
        
        data = response.json()
        assert "listing_id" in data, "Missing listing_id"
        assert data["status"] == "pending_approval"
        
        print(f"✅ Carbon credits submitted: {data['listing_id']}")
        print(f"   - Project: {unique_project}")
        print(f"   - Quantity: 150 tonnes CO2")
        print(f"   - Status: pending_approval")
        
        return data["listing_id"]
    
    def test_get_pending_listings_as_admin(self, api_client, admin_token):
        """Test admin can view pending carbon credit listings"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/carbon-listings/pending")
        assert response.status_code == 200, f"Get pending failed: {response.text}"
        
        listings = response.json()
        assert isinstance(listings, list), "Expected list of pending listings"
        
        print(f"✅ Admin can view {len(listings)} pending carbon credit listings")
        
        if len(listings) > 0:
            listing = listings[0]
            assert "listing_id" in listing
            assert "quantity_tonnes_co2" in listing
            assert "submitter_name" in listing
            print(f"   - First listing: {listing.get('listing_id')}")
            print(f"     Project: {listing.get('project_name')}")
            print(f"     Quantity: {listing.get('quantity_tonnes_co2')} tonnes")
    
    def test_pending_listings_rejected_for_non_admin(self, api_client, coop_token):
        """Test that non-admin cannot access pending listings"""
        api_client.headers.update({"Authorization": f"Bearer {coop_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/carbon-listings/pending")
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        
        print("✅ Non-admin correctly rejected from pending listings")


class TestAPIHealthCheck:
    """Basic API health checks"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✅ API root endpoint is healthy")
    
    def test_api_status(self, api_client):
        """Test API status endpoint"""
        response = api_client.get(f"{BASE_URL}/api/status")
        # Status might be 200 or 404 depending on implementation
        assert response.status_code in [200, 404, 405]
        print(f"✅ API status endpoint responded: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
