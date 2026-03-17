"""
GreenLink Multi-Profile API Tests
Tests for:
- Authentication (register/login for 4 user types)
- Farmer/Producteur APIs
- Buyer/Acheteur APIs  
- RSE/Carbon Credits APIs
- Supplier/Fournisseur Marketplace APIs
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://carbon-calc-fix.preview.emergentagent.com')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_USERS = {
    'farmer': {'email': 'farmer1@test.com', 'password': 'test123', 'user_type': 'producteur'},
    'buyer': {'email': 'buyer1@test.com', 'password': 'test123', 'user_type': 'acheteur'},
    'rse': {'email': 'rse1@test.com', 'password': 'test123', 'user_type': 'entreprise_rse'},
    'supplier': {'email': 'supplier1@test.com', 'password': 'test123', 'user_type': 'fournisseur'}
}


class TestAuthEndpoints:
    """Authentication API tests for all 4 user types"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def test_login_farmer_email(self):
        """Test farmer login with email"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['farmer']['email'],
            'password': TEST_USERS['farmer']['password']
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert 'access_token' in data
        assert data['user']['user_type'] == 'producteur'
        print(f"✓ Farmer login successful: {data['user']['full_name']}")

    def test_login_buyer_email(self):
        """Test buyer login with email"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['buyer']['email'],
            'password': TEST_USERS['buyer']['password']
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert 'access_token' in data
        assert data['user']['user_type'] == 'acheteur'
        print(f"✓ Buyer login successful: {data['user']['full_name']}")

    def test_login_rse_email(self):
        """Test RSE enterprise login with email"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['rse']['email'],
            'password': TEST_USERS['rse']['password']
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert 'access_token' in data
        assert data['user']['user_type'] == 'entreprise_rse'
        print(f"✓ RSE enterprise login successful: {data['user']['full_name']}")

    def test_login_supplier_email(self):
        """Test supplier login with email"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['supplier']['email'],
            'password': TEST_USERS['supplier']['password']
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert 'access_token' in data
        assert data['user']['user_type'] == 'fournisseur'
        print(f"✓ Supplier login successful: {data['user']['full_name']}")

    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': 'invalid@test.com',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")

    def test_register_new_user_producteur(self):
        """Test registration for producteur type"""
        unique_email = f"test_prod_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            'email': unique_email,
            'password': 'test123',
            'full_name': 'Test Producteur',
            'user_type': 'producteur'
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert 'access_token' in data
        assert data['user']['user_type'] == 'producteur'
        assert data['user']['email'] == unique_email
        print(f"✓ Producteur registration successful")

    def test_register_new_user_acheteur(self):
        """Test registration for acheteur type"""
        unique_email = f"test_ach_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            'email': unique_email,
            'password': 'test123',
            'full_name': 'Test Acheteur',
            'user_type': 'acheteur'
        })
        assert response.status_code == 200
        data = response.json()
        assert data['user']['user_type'] == 'acheteur'
        print(f"✓ Acheteur registration successful")

    def test_register_with_phone(self):
        """Test registration with phone number"""
        unique_phone = f"+225070{datetime.now().strftime('%H%M%S')}"
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            'phone_number': unique_phone,
            'password': 'test123',
            'full_name': 'Test Phone User',
            'user_type': 'producteur'
        })
        assert response.status_code == 200, f"Phone registration failed: {response.text}"
        data = response.json()
        assert data['user']['phone_number'] == unique_phone
        print(f"✓ Phone registration successful: {unique_phone}")


class TestFarmerDashboardAPI:
    """Farmer/Producteur Dashboard APIs"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as farmer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['farmer']['email'],
            'password': TEST_USERS['farmer']['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            pytest.skip("Farmer login failed")

    def test_get_farmer_dashboard(self):
        """Test farmer dashboard endpoint"""
        response = self.session.get(f"{BASE_URL}/api/greenlink/farmer/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        # Check dashboard structure
        assert 'total_parcels' in data
        assert 'total_area_hectares' in data
        assert 'average_carbon_score' in data
        assert 'total_revenue' in data
        assert 'recent_harvests' in data
        print(f"✓ Farmer dashboard: {data['total_parcels']} parcels, {data['total_area_hectares']} ha")

    def test_get_my_parcels(self):
        """Test getting farmer's parcels"""
        response = self.session.get(f"{BASE_URL}/api/greenlink/parcels/my-parcels")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My parcels: {len(data)} parcels found")

    def test_declare_parcel(self):
        """Test declaring a new parcel"""
        response = self.session.post(f"{BASE_URL}/api/greenlink/parcels", json={
            'farmer_name': 'Test Farmer',
            'phone_number': '+225070000001',
            'location': 'Bouaflé Test',
            'region': 'Marahoué',
            'area_hectares': 2.5,
            'trees_count': 350,
            'crop_type': 'cacao',
            'farming_practices': ['agroforesterie', 'compost'],
            'language': 'francais'
        })
        assert response.status_code == 200, f"Parcel declaration failed: {response.text}"
        data = response.json()
        assert 'carbon_score' in data
        assert data['area_hectares'] == 2.5
        print(f"✓ Parcel declared: {data['_id']}, carbon score: {data['carbon_score']}")


class TestBuyerDashboardAPI:
    """Buyer/Acheteur Dashboard APIs"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as buyer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['buyer']['email'],
            'password': TEST_USERS['buyer']['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            pytest.skip("Buyer login failed")

    def test_get_buyer_dashboard(self):
        """Test buyer dashboard endpoint"""
        response = self.session.get(f"{BASE_URL}/api/greenlink/buyer/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        # Check dashboard structure
        assert 'total_orders' in data
        assert 'active_orders' in data
        assert 'total_carbon_offset_tonnes' in data
        assert 'eudr_compliance_rate' in data
        print(f"✓ Buyer dashboard: {data['total_orders']} orders, {data['eudr_compliance_rate']}% EUDR compliant")

    def test_get_buyer_orders(self):
        """Test getting buyer's orders"""
        response = self.session.get(f"{BASE_URL}/api/greenlink/buyer/orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Buyer orders: {len(data)} orders found")

    def test_create_buyer_order(self):
        """Test creating a buyer order"""
        response = self.session.post(f"{BASE_URL}/api/greenlink/buyer/orders", json={
            'crop_type': 'cacao',
            'quantity_needed_kg': 5000,
            'delivery_location': 'Abidjan Port',
            'max_price_per_kg': 1500,
            'carbon_requirement': True,
            'min_carbon_score': 7.0,
            'delivery_date': '2026-03-15T00:00:00'
        })
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        data = response.json()
        assert 'buyer_id' in data
        assert data['crop_type'] == 'cacao'
        print(f"✓ Buyer order created: {data['_id']}")


class TestRSEDashboardAPI:
    """RSE/Enterprise Carbon Credits APIs"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as RSE enterprise
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['rse']['email'],
            'password': TEST_USERS['rse']['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            pytest.skip("RSE login failed")

    def test_get_rse_impact_dashboard(self):
        """Test RSE impact dashboard endpoint"""
        response = self.session.get(f"{BASE_URL}/api/greenlink/rse/impact-dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        # Check dashboard structure
        assert 'total_co2_offset_tonnes' in data
        assert 'total_farmers_impacted' in data
        assert 'women_farmers_percentage' in data
        assert 'total_trees_planted' in data
        assert 'regions_covered' in data
        print(f"✓ RSE dashboard: {data['total_co2_offset_tonnes']}t CO2, {data['total_farmers_impacted']} farmers")

    def test_get_carbon_credits_marketplace(self):
        """Test carbon credits marketplace (public endpoint)"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/greenlink/carbon-credits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Carbon credits available: {len(data)} credits")


class TestSupplierMarketplaceAPI:
    """Supplier/Fournisseur Marketplace APIs"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as supplier
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['supplier']['email'],
            'password': TEST_USERS['supplier']['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            pytest.skip("Supplier login failed")

    def test_get_supplier_dashboard_stats(self):
        """Test supplier dashboard stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/dashboard/stats")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        # Check dashboard structure
        assert 'total_products' in data
        assert 'active_products' in data
        assert 'total_orders' in data
        assert 'total_revenue' in data
        print(f"✓ Supplier dashboard: {data['total_products']} products, {data['total_revenue']} XOF")

    def test_get_my_products(self):
        """Test getting supplier's products"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/products/my-products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My products: {len(data)} products found")

    def test_create_product(self):
        """Test creating a new product"""
        response = self.session.post(f"{BASE_URL}/api/marketplace/products", json={
            'name': f'Test Engrais NPK {datetime.now().strftime("%H%M%S")}',
            'description': 'Engrais composé NPK 15-15-15 pour cacao',
            'category': 'engrais',
            'price': 15000,
            'unit': 'sac 50kg',
            'stock_quantity': 100,
            'min_order_quantity': 5
        })
        assert response.status_code == 200, f"Product creation failed: {response.text}"
        data = response.json()
        assert 'supplier_id' in data
        assert data['is_active'] == True
        print(f"✓ Product created: {data['_id']}")
        return data

    def test_get_public_products(self):
        """Test getting public products list"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/marketplace/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public products: {len(data)} products available")

    def test_get_my_orders(self):
        """Test getting supplier's orders"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/orders/my-orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My orders: {len(data)} orders found")

    def test_get_notifications(self):
        """Test getting notifications"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Notifications: {len(data)} notifications")


class TestCrossProfileAPIs:
    """Test API access restrictions between profiles"""

    def test_farmer_cannot_access_supplier_dashboard(self):
        """Test farmer cannot access supplier dashboard"""
        session = requests.Session()
        session.headers.update({'Content-Type': 'application/json'})
        # Login as farmer
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['farmer']['email'],
            'password': TEST_USERS['farmer']['password']
        })
        token = response.json()['access_token']
        session.headers.update({'Authorization': f'Bearer {token}'})
        
        # Try to access supplier dashboard
        response = session.get(f"{BASE_URL}/api/marketplace/dashboard/stats")
        assert response.status_code == 403
        print("✓ Farmer correctly blocked from supplier dashboard")

    def test_buyer_cannot_create_product(self):
        """Test buyer cannot create products"""
        session = requests.Session()
        session.headers.update({'Content-Type': 'application/json'})
        # Login as buyer
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_USERS['buyer']['email'],
            'password': TEST_USERS['buyer']['password']
        })
        token = response.json()['access_token']
        session.headers.update({'Authorization': f'Bearer {token}'})
        
        # Try to create a product
        response = session.post(f"{BASE_URL}/api/marketplace/products", json={
            'name': 'Unauthorized Product',
            'description': 'Should not be created',
            'category': 'engrais',
            'price': 10000,
            'unit': 'kg',
            'stock_quantity': 10,
            'min_order_quantity': 1
        })
        assert response.status_code == 403
        print("✓ Buyer correctly blocked from creating products")


if __name__ == "__main__":
    pytest.main([__file__, '-v', '--tb=short'])
