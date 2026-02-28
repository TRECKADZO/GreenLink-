# Billing API Tests for GreenLink Agritech Platform
# Tests for: invoices, payments, distributions, and billing dashboard endpoints

import pytest
import requests
import os
from datetime import datetime
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for testing
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"


class TestBillingAuth:
    """Test authentication requirements for billing endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_billing_dashboard_requires_auth(self):
        """Test that billing dashboard requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/billing/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Billing dashboard requires authentication")
    
    def test_billing_invoices_requires_auth(self):
        """Test that invoices endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/billing/invoices")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Invoices endpoint requires authentication")
    
    def test_billing_distributions_requires_auth(self):
        """Test that distributions endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/billing/distributions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Distributions endpoint requires authentication")


class TestBillingDashboard:
    """Test GET /api/billing/dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Wait for rate limiting
        time.sleep(1)
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"Admin logged in successfully")
    
    def test_get_billing_dashboard_success(self):
        """Test successful retrieval of billing dashboard"""
        response = self.session.get(f"{BASE_URL}/api/billing/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify dashboard structure
        assert "overview" in data, "Missing 'overview' in dashboard"
        assert "this_month" in data, "Missing 'this_month' in dashboard"
        assert "distributions" in data, "Missing 'distributions' in dashboard"
        assert "greenlink_revenue" in data, "Missing 'greenlink_revenue' in dashboard"
        assert "recent_invoices" in data, "Missing 'recent_invoices' in dashboard"
        assert "recent_payments" in data, "Missing 'recent_payments' in dashboard"
        assert "invoice_counts" in data, "Missing 'invoice_counts' in dashboard"
        
        # Verify overview fields
        overview = data["overview"]
        assert "total_invoiced_usd" in overview
        assert "total_paid_usd" in overview
        assert "total_pending_usd" in overview
        assert "total_overdue_usd" in overview
        assert "collection_rate" in overview
        
        # Verify invoice_counts fields
        invoice_counts = data["invoice_counts"]
        assert "draft" in invoice_counts
        assert "sent" in invoice_counts
        assert "paid" in invoice_counts
        
        print(f"PASS: Dashboard retrieved - Total invoiced: {overview['total_invoiced_usd']} USD")
    
    def test_dashboard_data_types(self):
        """Test that dashboard returns correct data types"""
        response = self.session.get(f"{BASE_URL}/api/billing/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        overview = data["overview"]
        
        # Check numeric types
        assert isinstance(overview["total_invoiced_usd"], (int, float))
        assert isinstance(overview["total_paid_usd"], (int, float))
        assert isinstance(overview["collection_rate"], (int, float))
        
        # Check lists
        assert isinstance(data["recent_invoices"], list)
        assert isinstance(data["recent_payments"], list)
        
        print("PASS: Dashboard data types are correct")


class TestInvoicesAPI:
    """Test invoice CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        time.sleep(1)
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_invoices_list(self):
        """Test GET /api/billing/invoices - list all invoices"""
        response = self.session.get(f"{BASE_URL}/api/billing/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "invoices" in data, "Missing 'invoices' in response"
        assert "summary" in data, "Missing 'summary' in response"
        assert isinstance(data["invoices"], list)
        
        # Verify summary fields
        summary = data["summary"]
        assert "total_invoiced_usd" in summary
        assert "total_paid_usd" in summary
        assert "count" in summary
        
        print(f"PASS: Retrieved {len(data['invoices'])} invoices")
    
    def test_get_invoices_with_status_filter(self):
        """Test GET /api/billing/invoices with status filter"""
        response = self.session.get(f"{BASE_URL}/api/billing/invoices?status=paid")
        assert response.status_code == 200
        
        data = response.json()
        # All returned invoices should have status 'paid'
        for invoice in data.get("invoices", []):
            assert invoice.get("status") == "paid", f"Invoice has wrong status: {invoice.get('status')}"
        
        print("PASS: Status filter works correctly")
    
    def test_create_invoice_success(self):
        """Test POST /api/billing/invoices/create - create new invoice"""
        timestamp = int(datetime.now().timestamp())
        invoice_data = {
            "buyer_name": f"TEST_Company_{timestamp}",
            "buyer_email": f"test{timestamp}@example.com",
            "buyer_address": "Test Address, Abidjan",
            "buyer_tax_id": f"NIF{timestamp}",
            "description": f"Test Carbon Credits - Automated Test {timestamp}",
            "tonnes_co2": 100.0,
            "price_per_tonne_usd": 25.0,
            "payment_terms_days": 30,
            "notes": "Automated test invoice"
        }
        
        response = self.session.post(f"{BASE_URL}/api/billing/invoices/create", json=invoice_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "invoice" in data, "Missing 'invoice' in response"
        
        invoice = data["invoice"]
        assert invoice["buyer_name"] == invoice_data["buyer_name"]
        assert invoice["total_usd"] == 2500.0  # 100 * 25
        assert invoice["status"] == "draft"
        assert "invoice_number" in invoice
        
        # Store for cleanup
        self.created_invoice_id = invoice.get("_id")
        
        print(f"PASS: Invoice created - {invoice['invoice_number']} for {invoice['total_usd']} USD")
    
    def test_create_invoice_validation(self):
        """Test invoice creation with missing required fields"""
        invalid_data = {
            "buyer_email": "test@example.com",
            # Missing buyer_name, description, tonnes_co2, price_per_tonne_usd
        }
        
        response = self.session.post(f"{BASE_URL}/api/billing/invoices/create", json=invalid_data)
        assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}"
        
        print("PASS: Invoice creation validates required fields")


class TestInvoiceSendAPI:
    """Test invoice send endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and create a draft invoice for testing"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        time.sleep(1)
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create a draft invoice for testing
        timestamp = int(datetime.now().timestamp())
        invoice_data = {
            "buyer_name": f"TEST_SendTest_{timestamp}",
            "buyer_email": f"sendtest{timestamp}@example.com",
            "description": "Test invoice for send functionality",
            "tonnes_co2": 50.0,
            "price_per_tonne_usd": 20.0,
            "payment_terms_days": 30
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/billing/invoices/create", json=invoice_data)
        if create_response.status_code == 200:
            self.test_invoice_id = create_response.json()["invoice"]["_id"]
        else:
            self.test_invoice_id = None
    
    def test_send_invoice_success(self):
        """Test PUT /api/billing/invoices/{id}/send - mark invoice as sent"""
        if not self.test_invoice_id:
            pytest.skip("No test invoice available")
        
        response = self.session.put(f"{BASE_URL}/api/billing/invoices/{self.test_invoice_id}/send")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        
        # Verify invoice status changed
        get_response = self.session.get(f"{BASE_URL}/api/billing/invoices/{self.test_invoice_id}")
        if get_response.status_code == 200:
            invoice = get_response.json()
            assert invoice.get("status") == "sent", f"Expected status 'sent', got {invoice.get('status')}"
        
        print("PASS: Invoice marked as sent successfully")
    
    def test_send_invoice_not_found(self):
        """Test sending non-existent invoice"""
        fake_id = "000000000000000000000000"
        response = self.session.put(f"{BASE_URL}/api/billing/invoices/{fake_id}/send")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Non-existent invoice returns 404")


class TestPaymentsAPI:
    """Test payment recording endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and create an invoice for payment testing"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        time.sleep(1)
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create and send an invoice for payment testing
        timestamp = int(datetime.now().timestamp())
        invoice_data = {
            "buyer_name": f"TEST_PaymentTest_{timestamp}",
            "buyer_email": f"paytest{timestamp}@example.com",
            "description": "Test invoice for payment recording",
            "tonnes_co2": 100.0,
            "price_per_tonne_usd": 30.0,
            "payment_terms_days": 30
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/billing/invoices/create", json=invoice_data)
        if create_response.status_code == 200:
            invoice = create_response.json()["invoice"]
            self.test_invoice_id = invoice["_id"]
            self.test_invoice_total = invoice["total_usd"]
            
            # Mark as sent
            self.session.put(f"{BASE_URL}/api/billing/invoices/{self.test_invoice_id}/send")
        else:
            self.test_invoice_id = None
            self.test_invoice_total = 0
    
    def test_record_payment_success(self):
        """Test POST /api/billing/payments/record - record a payment"""
        if not self.test_invoice_id:
            pytest.skip("No test invoice available")
        
        payment_data = {
            "invoice_id": self.test_invoice_id,
            "amount_usd": 1500.0,  # Partial payment
            "payment_method": "bank_transfer",
            "payment_reference": f"PAY-TEST-{int(datetime.now().timestamp())}",
            "notes": "Automated test payment"
        }
        
        response = self.session.post(f"{BASE_URL}/api/billing/payments/record", json=payment_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "payment" in data
        assert "invoice_status" in data
        assert "amount_remaining_usd" in data
        
        payment = data["payment"]
        assert payment["amount_usd"] == 1500.0
        assert payment["method"] == "bank_transfer"
        
        # For partial payment, status should be 'partial'
        assert data["invoice_status"] == "partial"
        
        print(f"PASS: Payment recorded - Status: {data['invoice_status']}, Remaining: {data['amount_remaining_usd']} USD")
    
    def test_record_full_payment(self):
        """Test recording full payment updates status to 'paid'"""
        if not self.test_invoice_id:
            pytest.skip("No test invoice available")
        
        # Record full payment
        payment_data = {
            "invoice_id": self.test_invoice_id,
            "amount_usd": self.test_invoice_total,  # Full amount
            "payment_method": "wire",
            "payment_reference": f"WIRE-FULL-{int(datetime.now().timestamp())}",
            "notes": "Full payment test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/billing/payments/record", json=payment_data)
        assert response.status_code == 200
        
        data = response.json()
        # Status should be 'paid' after full payment
        assert data["invoice_status"] == "paid", f"Expected 'paid', got {data['invoice_status']}"
        assert data["amount_remaining_usd"] == 0
        
        print("PASS: Full payment marks invoice as paid")
    
    def test_record_payment_invalid_invoice(self):
        """Test recording payment for non-existent invoice"""
        payment_data = {
            "invoice_id": "000000000000000000000000",
            "amount_usd": 100.0,
            "payment_method": "bank_transfer",
            "payment_reference": "INVALID-TEST"
        }
        
        response = self.session.post(f"{BASE_URL}/api/billing/payments/record", json=payment_data)
        assert response.status_code == 404
        
        print("PASS: Payment for invalid invoice returns 404")
    
    def test_get_payment_history(self):
        """Test GET /api/billing/payments/history"""
        response = self.session.get(f"{BASE_URL}/api/billing/payments/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "payments" in data
        assert "summary" in data
        assert isinstance(data["payments"], list)
        
        summary = data["summary"]
        assert "total_received_usd" in summary
        assert "payment_count" in summary
        
        print(f"PASS: Payment history retrieved - {summary['payment_count']} payments totaling {summary['total_received_usd']} USD")


class TestDistributionsAPI:
    """Test distributions endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        time.sleep(1)
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_distributions_list(self):
        """Test GET /api/billing/distributions"""
        response = self.session.get(f"{BASE_URL}/api/billing/distributions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "distributions" in data
        assert "summary" in data
        assert isinstance(data["distributions"], list)
        
        summary = data["summary"]
        assert "total_to_distribute_fcfa" in summary
        assert "total_distributed_fcfa" in summary
        assert "pending_count" in summary
        
        print(f"PASS: Distributions retrieved - {summary['pending_count']} pending")
    
    def test_get_distributions_with_status_filter(self):
        """Test GET /api/billing/distributions with status filter"""
        response = self.session.get(f"{BASE_URL}/api/billing/distributions?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        for dist in data.get("distributions", []):
            assert dist.get("status") == "pending", f"Distribution has wrong status: {dist.get('status')}"
        
        print("PASS: Distribution status filter works correctly")
    
    def test_get_distribution_detail_not_found(self):
        """Test GET /api/billing/distributions/{id} with invalid ID"""
        fake_id = "000000000000000000000000"
        response = self.session.get(f"{BASE_URL}/api/billing/distributions/{fake_id}")
        assert response.status_code == 404
        
        print("PASS: Non-existent distribution returns 404")


class TestBillingAccessControl:
    """Test that billing endpoints are restricted to admin users"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_non_admin_cannot_access_billing(self):
        """Test that non-admin users cannot access billing endpoints"""
        # Try to login as cooperative user
        time.sleep(1)
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "coop-test@greenlink.ci",
            "password": "coop123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Cooperative user login failed - skipping access control test")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access billing dashboard
        response = self.session.get(f"{BASE_URL}/api/billing/dashboard")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        # Try to access invoices
        response = self.session.get(f"{BASE_URL}/api/billing/invoices")
        assert response.status_code == 403
        
        # Try to create invoice
        response = self.session.post(f"{BASE_URL}/api/billing/invoices/create", json={
            "buyer_name": "Test",
            "description": "Test",
            "tonnes_co2": 10,
            "price_per_tonne_usd": 10
        })
        assert response.status_code == 403
        
        print("PASS: Non-admin users cannot access billing endpoints (403)")


class TestPaymentMethods:
    """Test different payment methods"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and create a test invoice"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        time.sleep(1)
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create invoice
        timestamp = int(datetime.now().timestamp())
        create_response = self.session.post(f"{BASE_URL}/api/billing/invoices/create", json={
            "buyer_name": f"TEST_Methods_{timestamp}",
            "description": "Payment methods test",
            "tonnes_co2": 100,
            "price_per_tonne_usd": 10
        })
        
        if create_response.status_code == 200:
            invoice = create_response.json()["invoice"]
            self.test_invoice_id = invoice["_id"]
            self.session.put(f"{BASE_URL}/api/billing/invoices/{self.test_invoice_id}/send")
        else:
            self.test_invoice_id = None
    
    def test_payment_methods(self):
        """Test all supported payment methods"""
        if not self.test_invoice_id:
            pytest.skip("No test invoice available")
        
        payment_methods = [
            "bank_transfer",
            "wire",
            "check",
            "escrow",
            "orange_money"
        ]
        
        for method in payment_methods:
            payment_data = {
                "invoice_id": self.test_invoice_id,
                "amount_usd": 10.0,  # Small amount
                "payment_method": method,
                "payment_reference": f"TEST-{method.upper()}-{int(datetime.now().timestamp())}"
            }
            
            response = self.session.post(f"{BASE_URL}/api/billing/payments/record", json=payment_data)
            assert response.status_code == 200, f"Payment method {method} failed: {response.status_code}"
            
            data = response.json()
            assert data["payment"]["method"] == method
            print(f"  - {method}: OK")
        
        print("PASS: All payment methods work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
