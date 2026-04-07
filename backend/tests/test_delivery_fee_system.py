"""
Test Delivery Fee System - Iteration 55
Tests for supplier delivery settings and fee calculation endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://redd-carbon-track.preview.emergentagent.com')

# Test credentials
SUPPLIER_EMAIL = "testfournisseur@test.com"
SUPPLIER_PASSWORD = "supplier2024"
COOPERATIVE_EMAIL = "bielaghana@gmail.com"
COOPERATIVE_PASSWORD = "greenlink2024"


class TestDeliverySettingsAPI:
    """Test delivery settings endpoints for suppliers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as supplier"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as supplier
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        assert response.status_code == 200, f"Supplier login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"Logged in as supplier: {self.user['full_name']} (user_type: {self.user['user_type']})")
    
    def test_01_get_delivery_settings_returns_defaults_or_saved(self):
        """GET /api/marketplace/supplier/delivery-settings returns settings"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/supplier/delivery-settings")
        assert response.status_code == 200, f"Failed to get delivery settings: {response.text}"
        
        data = response.json()
        print(f"Delivery settings response: {data}")
        
        # Verify structure
        assert "modeles_livraison" in data, "Missing modeles_livraison in response"
        assert "seuil_gratuit" in data, "Missing seuil_gratuit in response"
        
        modeles = data["modeles_livraison"]
        assert "frais_fixe" in modeles, "Missing frais_fixe model"
        assert "par_distance" in modeles, "Missing par_distance model"
        assert "par_poids" in modeles, "Missing par_poids model"
        
        # Verify frais_fixe structure
        assert "actif" in modeles["frais_fixe"], "Missing actif in frais_fixe"
        assert "montant" in modeles["frais_fixe"], "Missing montant in frais_fixe"
        
        # Verify par_distance structure
        assert "actif" in modeles["par_distance"], "Missing actif in par_distance"
        assert "zones" in modeles["par_distance"], "Missing zones in par_distance"
        zones = modeles["par_distance"]["zones"]
        assert "meme_ville" in zones, "Missing meme_ville zone"
        assert "meme_region" in zones, "Missing meme_region zone"
        assert "national" in zones, "Missing national zone"
        
        # Verify par_poids structure
        assert "actif" in modeles["par_poids"], "Missing actif in par_poids"
        assert "prix_par_unite" in modeles["par_poids"], "Missing prix_par_unite in par_poids"
        
        # Verify seuil_gratuit structure
        assert "actif" in data["seuil_gratuit"], "Missing actif in seuil_gratuit"
        assert "montant_minimum" in data["seuil_gratuit"], "Missing montant_minimum in seuil_gratuit"
        
        print("PASS: GET delivery settings returns correct structure")
    
    def test_02_update_delivery_settings_all_models(self):
        """PUT /api/marketplace/supplier/delivery-settings saves all 3 models + seuil_gratuit"""
        settings = {
            "modeles_livraison": {
                "frais_fixe": {"actif": True, "montant": 2000},
                "par_distance": {
                    "actif": True,
                    "zones": {"meme_ville": 1000, "meme_region": 3000, "national": 5000}
                },
                "par_poids": {"actif": True, "prix_par_unite": 500}
            },
            "seuil_gratuit": {"actif": True, "montant_minimum": 50000}
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/marketplace/supplier/delivery-settings",
            json=settings
        )
        assert response.status_code == 200, f"Failed to update delivery settings: {response.text}"
        
        data = response.json()
        print(f"Update response: {data}")
        assert "message" in data, "Missing message in response"
        print("PASS: PUT delivery settings returns success message")
    
    def test_03_verify_settings_persisted(self):
        """GET /api/marketplace/supplier/delivery-settings returns saved settings after PUT"""
        # First update settings
        settings = {
            "modeles_livraison": {
                "frais_fixe": {"actif": True, "montant": 2500},
                "par_distance": {
                    "actif": True,
                    "zones": {"meme_ville": 1500, "meme_region": 3500, "national": 5500}
                },
                "par_poids": {"actif": True, "prix_par_unite": 600}
            },
            "seuil_gratuit": {"actif": True, "montant_minimum": 60000}
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/marketplace/supplier/delivery-settings",
            json=settings
        )
        assert update_response.status_code == 200
        
        # Now fetch and verify
        get_response = self.session.get(f"{BASE_URL}/api/marketplace/supplier/delivery-settings")
        assert get_response.status_code == 200
        
        data = get_response.json()
        modeles = data["modeles_livraison"]
        
        # Verify frais_fixe
        assert modeles["frais_fixe"]["actif"] == True, "frais_fixe.actif not persisted"
        assert modeles["frais_fixe"]["montant"] == 2500, f"frais_fixe.montant not persisted: {modeles['frais_fixe']['montant']}"
        
        # Verify par_distance
        assert modeles["par_distance"]["actif"] == True, "par_distance.actif not persisted"
        assert modeles["par_distance"]["zones"]["meme_ville"] == 1500, "meme_ville not persisted"
        assert modeles["par_distance"]["zones"]["meme_region"] == 3500, "meme_region not persisted"
        assert modeles["par_distance"]["zones"]["national"] == 5500, "national not persisted"
        
        # Verify par_poids
        assert modeles["par_poids"]["actif"] == True, "par_poids.actif not persisted"
        assert modeles["par_poids"]["prix_par_unite"] == 600, "prix_par_unite not persisted"
        
        # Verify seuil_gratuit
        assert data["seuil_gratuit"]["actif"] == True, "seuil_gratuit.actif not persisted"
        assert data["seuil_gratuit"]["montant_minimum"] == 60000, "montant_minimum not persisted"
        
        print("PASS: All delivery settings persisted correctly")
    
    def test_04_delivery_settings_requires_supplier_role(self):
        """Delivery settings endpoints require fournisseur user_type"""
        # Login as cooperative (non-supplier)
        coop_session = requests.Session()
        coop_session.headers.update({"Content-Type": "application/json"})
        
        login_response = coop_session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOPERATIVE_EMAIL,
            "password": COOPERATIVE_PASSWORD
        })
        assert login_response.status_code == 200
        coop_token = login_response.json()["access_token"]
        coop_session.headers.update({"Authorization": f"Bearer {coop_token}"})
        
        # Try to access delivery settings as cooperative
        get_response = coop_session.get(f"{BASE_URL}/api/marketplace/supplier/delivery-settings")
        assert get_response.status_code == 403, f"Expected 403 for non-supplier, got {get_response.status_code}"
        
        print("PASS: Delivery settings correctly restricted to suppliers only")


class TestDeliveryFeesCalculation:
    """Test delivery fee calculation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as supplier and configure delivery settings"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as supplier
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_05_get_delivery_fees_empty_cart(self):
        """GET /api/marketplace/delivery-fees returns empty when cart is empty"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/delivery-fees?zone=national")
        assert response.status_code == 200, f"Failed to get delivery fees: {response.text}"
        
        data = response.json()
        print(f"Delivery fees (empty cart): {data}")
        
        assert "supplier_fees" in data, "Missing supplier_fees in response"
        assert "total_delivery" in data, "Missing total_delivery in response"
        
        # Empty cart should have empty supplier_fees
        assert isinstance(data["supplier_fees"], list), "supplier_fees should be a list"
        assert data["total_delivery"] == 0, "total_delivery should be 0 for empty cart"
        
        print("PASS: Delivery fees returns correct structure for empty cart")
    
    def test_06_get_delivery_fees_with_zone_param(self):
        """GET /api/marketplace/delivery-fees accepts zone parameter"""
        zones = ["meme_ville", "meme_region", "national"]
        
        for zone in zones:
            response = self.session.get(f"{BASE_URL}/api/marketplace/delivery-fees?zone={zone}")
            assert response.status_code == 200, f"Failed for zone {zone}: {response.text}"
            print(f"Zone {zone}: {response.json()}")
        
        print("PASS: Delivery fees endpoint accepts all zone parameters")


class TestCartWithDeliveryFees:
    """Test cart endpoint with delivery fees"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as supplier"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as supplier
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_07_cart_includes_delivery_fees(self):
        """GET /api/marketplace/cart includes delivery_fees and total_delivery"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/cart?zone=national")
        assert response.status_code == 200, f"Failed to get cart: {response.text}"
        
        data = response.json()
        print(f"Cart response: {data}")
        
        # Verify delivery-related fields exist
        assert "delivery_fees" in data, "Missing delivery_fees in cart response"
        assert "total_delivery" in data, "Missing total_delivery in cart response"
        assert "total_with_delivery" in data, "Missing total_with_delivery in cart response"
        
        # Verify basic cart fields
        assert "items" in data, "Missing items in cart response"
        assert "total" in data, "Missing total in cart response"
        assert "items_count" in data, "Missing items_count in cart response"
        
        print("PASS: Cart endpoint includes delivery fee fields")
    
    def test_08_cart_accepts_zone_parameter(self):
        """GET /api/marketplace/cart accepts zone query parameter"""
        zones = ["meme_ville", "meme_region", "national"]
        
        for zone in zones:
            response = self.session.get(f"{BASE_URL}/api/marketplace/cart?zone={zone}")
            assert response.status_code == 200, f"Failed for zone {zone}: {response.text}"
            data = response.json()
            assert "delivery_fees" in data, f"Missing delivery_fees for zone {zone}"
            print(f"Cart with zone={zone}: total_delivery={data['total_delivery']}")
        
        print("PASS: Cart endpoint accepts zone parameter")


class TestCheckoutWithDeliveryFees:
    """Test checkout endpoint with delivery fees"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as supplier"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as supplier
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_09_checkout_accepts_json_body(self):
        """POST /api/marketplace/cart/checkout accepts JSON body with delivery_zone"""
        checkout_body = {
            "delivery_address": "123 Test Street, Abidjan",
            "delivery_phone": "+2250701000001",
            "delivery_city": "Abidjan",
            "delivery_zone": "meme_ville",
            "payment_method": "cash_on_delivery",
            "notes": "Test checkout"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/marketplace/cart/checkout",
            json=checkout_body
        )
        
        # Cart might be empty, so we accept 400 (empty cart) or 200 (success)
        if response.status_code == 400:
            data = response.json()
            assert "Panier vide" in data.get("detail", ""), f"Unexpected error: {data}"
            print("PASS: Checkout correctly rejects empty cart")
        elif response.status_code == 200:
            data = response.json()
            assert "success" in data, "Missing success in checkout response"
            print(f"PASS: Checkout succeeded: {data}")
        else:
            pytest.fail(f"Unexpected status code {response.status_code}: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
