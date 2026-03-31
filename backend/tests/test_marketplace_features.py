"""
GreenLink Marketplace Feature Tests
Tests for:
- Orange Money payment flow (simulation mode)
- Product reviews and ratings
- Wishlist/favorites functionality
- Shopping cart and checkout
- Order tracking
- Supplier notifications
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://redd-impact-metrics.preview.emergentagent.com')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials (from iteration_1.json)
TEST_BUYER = {'email': 'buyer@test.com', 'password': 'password123'}
TEST_SUPPLIER = {'email': 'supplier1@test.com', 'password': 'test123'}


class TestPaymentSimulation:
    """Orange Money Payment Simulation Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def test_simulation_status(self):
        """Test payment simulation status endpoint"""
        response = self.session.get(f"{BASE_URL}/api/payments/simulation-status")
        assert response.status_code == 200
        data = response.json()
        assert 'simulation_mode' in data
        assert data['simulation_mode'] == True  # Should be in simulation mode
        print(f"✓ Payment simulation status: {data['message']}")


class TestProductReviews:
    """Product Reviews and Ratings Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def test_get_product_reviews_unauthenticated(self):
        """Test getting product reviews without auth (public endpoint)"""
        # First get a product ID from the marketplace
        response = self.session.get(f"{BASE_URL}/api/marketplace/products")
        assert response.status_code == 200
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]['_id']
            response = self.session.get(f"{BASE_URL}/api/marketplace/products/{product_id}/reviews")
            assert response.status_code == 200
            reviews = response.json()
            assert isinstance(reviews, list)
            print(f"✓ Product reviews: {len(reviews)} reviews for product {products[0]['name']}")
        else:
            pytest.skip("No products available for review test")

    def test_add_product_review_requires_auth(self):
        """Test adding review without authentication fails"""
        # Get a product first
        response = self.session.get(f"{BASE_URL}/api/marketplace/products")
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]['_id']
            # Try to add review without auth
            response = self.session.post(
                f"{BASE_URL}/api/marketplace/products/{product_id}/reviews?rating=5&comment=Test"
            )
            assert response.status_code in [401, 403]
            print("✓ Product review correctly requires authentication")
        else:
            pytest.skip("No products available")


class TestWishlistAPI:
    """Wishlist/Favorites API Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as buyer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_BUYER['email'],
            'password': TEST_BUYER['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
            self.user = response.json()['user']
        else:
            # Try backup credentials
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                'identifier': 'buyer1@test.com',
                'password': 'test123'
            })
            if response.status_code == 200:
                token = response.json()['access_token']
                self.session.headers.update({'Authorization': f'Bearer {token}'})
                self.user = response.json()['user']
            else:
                pytest.skip("Buyer login failed")

    def test_get_wishlist(self):
        """Test getting user's wishlist"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/wishlist")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Wishlist: {len(data)} items")

    def test_add_to_wishlist(self):
        """Test adding product to wishlist"""
        # Get a product
        response = self.session.get(f"{BASE_URL}/api/marketplace/products")
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]['_id']
            response = self.session.post(f"{BASE_URL}/api/marketplace/wishlist/add?product_id={product_id}")
            assert response.status_code == 200
            print(f"✓ Added to wishlist: {products[0]['name']}")
        else:
            pytest.skip("No products available")

    def test_remove_from_wishlist(self):
        """Test removing product from wishlist"""
        # First add to wishlist
        response = self.session.get(f"{BASE_URL}/api/marketplace/products")
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]['_id']
            # Add first
            self.session.post(f"{BASE_URL}/api/marketplace/wishlist/add?product_id={product_id}")
            # Then remove
            response = self.session.delete(f"{BASE_URL}/api/marketplace/wishlist/remove/{product_id}")
            assert response.status_code == 200
            print(f"✓ Removed from wishlist: {products[0]['name']}")
        else:
            pytest.skip("No products available")


class TestShoppingCart:
    """Shopping Cart API Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as buyer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_BUYER['email'],
            'password': TEST_BUYER['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            # Try backup credentials
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                'identifier': 'buyer1@test.com',
                'password': 'test123'
            })
            if response.status_code == 200:
                token = response.json()['access_token']
                self.session.headers.update({'Authorization': f'Bearer {token}'})
            else:
                pytest.skip("Buyer login failed")

    def test_get_cart(self):
        """Test getting shopping cart"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/cart")
        assert response.status_code == 200
        data = response.json()
        assert 'items' in data
        assert 'total' in data
        print(f"✓ Cart: {data.get('items_count', 0)} items, total: {data['total']} XOF")

    def test_add_to_cart(self):
        """Test adding product to cart"""
        # Get a product with stock
        response = self.session.get(f"{BASE_URL}/api/marketplace/products")
        products = response.json()
        
        product = next((p for p in products if p.get('stock_quantity', 0) > 0), None)
        
        if product:
            product_id = product['_id']
            response = self.session.post(f"{BASE_URL}/api/marketplace/cart/add?product_id={product_id}&quantity=1")
            assert response.status_code == 200
            data = response.json()
            assert 'message' in data
            print(f"✓ Added to cart: {product['name']}")
        else:
            pytest.skip("No products with stock available")

    def test_update_cart_item(self):
        """Test updating cart item quantity"""
        # First add to cart
        response = self.session.get(f"{BASE_URL}/api/marketplace/products")
        products = response.json()
        
        product = next((p for p in products if p.get('stock_quantity', 0) > 2), None)
        
        if product:
            product_id = product['_id']
            # Add first
            self.session.post(f"{BASE_URL}/api/marketplace/cart/add?product_id={product_id}&quantity=1")
            # Update quantity
            response = self.session.put(f"{BASE_URL}/api/marketplace/cart/update?product_id={product_id}&quantity=2")
            assert response.status_code == 200
            print(f"✓ Updated cart item quantity")
        else:
            pytest.skip("No products with sufficient stock")

    def test_remove_from_cart(self):
        """Test removing product from cart"""
        # Get a product
        response = self.session.get(f"{BASE_URL}/api/marketplace/products")
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]['_id']
            # Add first
            self.session.post(f"{BASE_URL}/api/marketplace/cart/add?product_id={product_id}&quantity=1")
            # Remove
            response = self.session.delete(f"{BASE_URL}/api/marketplace/cart/remove/{product_id}")
            assert response.status_code == 200
            print(f"✓ Removed from cart")
        else:
            pytest.skip("No products available")

    def test_clear_cart(self):
        """Test clearing entire cart"""
        response = self.session.delete(f"{BASE_URL}/api/marketplace/cart/clear")
        assert response.status_code == 200
        print(f"✓ Cart cleared")


class TestBuyerOrders:
    """Buyer Orders API Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as buyer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_BUYER['email'],
            'password': TEST_BUYER['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            # Try backup credentials
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                'identifier': 'buyer1@test.com',
                'password': 'test123'
            })
            if response.status_code == 200:
                token = response.json()['access_token']
                self.session.headers.update({'Authorization': f'Bearer {token}'})
            else:
                pytest.skip("Buyer login failed")

    def test_get_buyer_orders(self):
        """Test getting buyer's orders"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/buyer/orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Buyer orders: {len(data)} orders")


class TestOrderTracking:
    """Order Tracking API Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as buyer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_BUYER['email'],
            'password': TEST_BUYER['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            # Try backup credentials  
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                'identifier': 'buyer1@test.com',
                'password': 'test123'
            })
            if response.status_code == 200:
                token = response.json()['access_token']
                self.session.headers.update({'Authorization': f'Bearer {token}'})
            else:
                pytest.skip("Buyer login failed")

    def test_order_tracking_endpoint_exists(self):
        """Test order tracking endpoint structure"""
        # First get buyer's orders
        response = self.session.get(f"{BASE_URL}/api/marketplace/buyer/orders")
        orders = response.json()
        
        if len(orders) > 0:
            order_id = orders[0]['_id']
            response = self.session.get(f"{BASE_URL}/api/marketplace/orders/{order_id}/tracking")
            assert response.status_code == 200
            data = response.json()
            assert 'timeline' in data
            assert 'status' in data
            print(f"✓ Order tracking: status={data['status']}")
        else:
            print("! No orders found for tracking test - will test after checkout")


class TestCheckoutFlow:
    """Checkout and Payment Flow Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as buyer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_BUYER['email'],
            'password': TEST_BUYER['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            # Try backup credentials
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                'identifier': 'buyer1@test.com',
                'password': 'test123'
            })
            if response.status_code == 200:
                token = response.json()['access_token']
                self.session.headers.update({'Authorization': f'Bearer {token}'})
            else:
                pytest.skip("Buyer login failed")

    def test_complete_checkout_flow(self):
        """Test complete checkout flow with cash on delivery"""
        # 1. Clear cart first
        self.session.delete(f"{BASE_URL}/api/marketplace/cart/clear")
        
        # 2. Get products with stock
        response = self.session.get(f"{BASE_URL}/api/marketplace/products")
        products = response.json()
        
        product = next((p for p in products if p.get('stock_quantity', 0) > 0), None)
        
        if not product:
            pytest.skip("No products with stock")
        
        # 3. Add to cart
        response = self.session.post(f"{BASE_URL}/api/marketplace/cart/add?product_id={product['_id']}&quantity=1")
        assert response.status_code == 200
        print(f"✓ Added {product['name']} to cart")
        
        # 4. Verify cart
        response = self.session.get(f"{BASE_URL}/api/marketplace/cart")
        cart = response.json()
        assert cart['items_count'] > 0
        print(f"✓ Cart has {cart['items_count']} items, total: {cart['total']} XOF")
        
        # 5. Checkout with cash on delivery
        checkout_params = {
            'delivery_address': 'Test Address, Abidjan',
            'delivery_phone': '+225070000000',
            'payment_method': 'cash_on_delivery',
            'notes': 'Test checkout'
        }
        response = self.session.post(
            f"{BASE_URL}/api/marketplace/cart/checkout",
            params=checkout_params
        )
        assert response.status_code == 200
        data = response.json()
        assert 'orders' in data
        assert len(data['orders']) > 0
        print(f"✓ Checkout successful: {len(data['orders'])} order(s) created")
        
        # Store order for tracking test
        return data['orders'][0]


class TestSupplierNotifications:
    """Supplier Notifications Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as supplier
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_SUPPLIER['email'],
            'password': TEST_SUPPLIER['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            pytest.skip("Supplier login failed")

    def test_get_supplier_notifications(self):
        """Test getting supplier notifications"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check if there are order notifications
        order_notifications = [n for n in data if n.get('type') == 'order']
        print(f"✓ Supplier notifications: {len(data)} total, {len(order_notifications)} order-related")

    def test_mark_notification_read(self):
        """Test marking notification as read"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/notifications")
        notifications = response.json()
        
        if len(notifications) > 0:
            notification_id = notifications[0]['_id']
            response = self.session.put(f"{BASE_URL}/api/marketplace/notifications/{notification_id}/read")
            assert response.status_code == 200
            print("✓ Notification marked as read")
        else:
            print("! No notifications to test")

    def test_mark_all_notifications_read(self):
        """Test marking all notifications as read"""
        response = self.session.put(f"{BASE_URL}/api/marketplace/notifications/mark-all-read")
        assert response.status_code == 200
        print("✓ All notifications marked as read")


class TestSupplierOrderStatus:
    """Supplier Order Status Update Tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Login as supplier
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            'identifier': TEST_SUPPLIER['email'],
            'password': TEST_SUPPLIER['password']
        })
        if response.status_code == 200:
            token = response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        else:
            pytest.skip("Supplier login failed")

    def test_get_supplier_orders(self):
        """Test getting supplier's orders"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/orders/my-orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Supplier orders: {len(data)} orders")


if __name__ == "__main__":
    pytest.main([__file__, '-v', '--tb=short'])
