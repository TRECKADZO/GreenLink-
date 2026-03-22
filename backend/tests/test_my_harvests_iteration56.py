"""
Test suite for GET /api/greenlink/harvests/my-harvests endpoint
and POST /api/greenlink/harvests unit conversion features.

Features tested:
1. GET /api/greenlink/harvests/my-harvests - returns farmer's harvests with stats
2. Filtering by statut (en_attente, validee, rejetee)
3. Unit conversion: tonnes→kg (x1000), sacs→kg (x65)
4. quantity_display format with original unit
5. original_quantity field in response
6. Stats calculation (total, en_attente, validees, rejetees, total_kg)
7. Authentication requirement (401 without token)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FARMER_IDENTIFIER = "+2250709090909"
FARMER_PASSWORD = "koffi2024"
COOP_IDENTIFIER = "bielaghana@gmail.com"
COOP_PASSWORD = "greenlink2024"

# Existing parcel IDs for farmer
PARCEL_IDS = ["69bb7453e3514dcc49538716", "69bb747d9d9fd71b72c89ebb"]


class TestAuthentication:
    """Test authentication requirements"""
    
    def test_my_harvests_requires_auth(self):
        """GET /api/greenlink/harvests/my-harvests should return 401/403 without token"""
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}: {response.text}"
        print(f"PASS: my-harvests endpoint requires authentication ({response.status_code} without token)")
    
    def test_farmer_login(self):
        """Test farmer login to get access token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FARMER_IDENTIFIER,
            "password": FARMER_PASSWORD
        })
        assert response.status_code == 200, f"Farmer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        print(f"PASS: Farmer login successful, token received")
        return data["access_token"]
    
    def test_coop_login(self):
        """Test cooperative login to get access token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200, f"Coop login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        print(f"PASS: Cooperative login successful, token received")
        return data["access_token"]


@pytest.fixture(scope="module")
def farmer_token():
    """Get farmer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": FARMER_IDENTIFIER,
        "password": FARMER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Farmer login failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def coop_token():
    """Get cooperative authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_IDENTIFIER,
        "password": COOP_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Coop login failed: {response.text}")
    return response.json()["access_token"]


class TestMyHarvestsEndpoint:
    """Test GET /api/greenlink/harvests/my-harvests endpoint"""
    
    def test_get_my_harvests_basic(self, farmer_token):
        """GET /api/greenlink/harvests/my-harvests returns harvests list with stats"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "harvests" in data, f"Missing 'harvests' key in response: {data}"
        assert "stats" in data, f"Missing 'stats' key in response: {data}"
        assert "total" in data, f"Missing 'total' key in response: {data}"
        
        print(f"PASS: my-harvests returns {len(data['harvests'])} harvests with stats")
        return data
    
    def test_stats_structure(self, farmer_token):
        """Verify stats contains required fields"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        stats = data["stats"]
        
        # Verify stats fields
        required_stats = ["total", "en_attente", "validees", "rejetees", "total_kg"]
        for field in required_stats:
            assert field in stats, f"Missing '{field}' in stats: {stats}"
        
        # Verify stats are integers
        assert isinstance(stats["total"], int), f"stats.total should be int: {stats['total']}"
        assert isinstance(stats["en_attente"], int), f"stats.en_attente should be int: {stats['en_attente']}"
        assert isinstance(stats["validees"], int), f"stats.validees should be int: {stats['validees']}"
        assert isinstance(stats["rejetees"], int), f"stats.rejetees should be int: {stats['rejetees']}"
        assert isinstance(stats["total_kg"], (int, float)), f"stats.total_kg should be numeric: {stats['total_kg']}"
        
        print(f"PASS: Stats structure correct - total={stats['total']}, en_attente={stats['en_attente']}, validees={stats['validees']}, rejetees={stats['rejetees']}, total_kg={stats['total_kg']}")
    
    def test_harvest_item_structure(self, farmer_token):
        """Verify each harvest item has required fields"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["harvests"]) == 0:
            pytest.skip("No harvests found for farmer - skipping structure test")
        
        harvest = data["harvests"][0]
        required_fields = ["id", "parcel_id", "quantity_kg", "original_quantity", "quantity_display", 
                          "quality_grade", "unit", "statut", "created_at"]
        
        for field in required_fields:
            assert field in harvest, f"Missing '{field}' in harvest: {harvest}"
        
        print(f"PASS: Harvest item structure correct with all required fields")
        print(f"  Sample harvest: id={harvest['id']}, quantity_kg={harvest['quantity_kg']}, unit={harvest['unit']}, quantity_display={harvest['quantity_display']}")


class TestMyHarvestsFiltering:
    """Test filtering by statut parameter"""
    
    def test_filter_by_en_attente(self, farmer_token):
        """GET /api/greenlink/harvests/my-harvests?statut=en_attente"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests?statut=en_attente", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # All returned harvests should have statut=en_attente
        for harvest in data["harvests"]:
            assert harvest["statut"] == "en_attente", f"Expected statut=en_attente, got {harvest['statut']}"
        
        print(f"PASS: Filter by statut=en_attente returns {len(data['harvests'])} harvests")
    
    def test_filter_by_validee(self, farmer_token):
        """GET /api/greenlink/harvests/my-harvests?statut=validee"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests?statut=validee", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # All returned harvests should have statut=validee
        for harvest in data["harvests"]:
            assert harvest["statut"] == "validee", f"Expected statut=validee, got {harvest['statut']}"
        
        print(f"PASS: Filter by statut=validee returns {len(data['harvests'])} harvests")
    
    def test_filter_by_rejetee(self, farmer_token):
        """GET /api/greenlink/harvests/my-harvests?statut=rejetee"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests?statut=rejetee", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # All returned harvests should have statut=rejetee
        for harvest in data["harvests"]:
            assert harvest["statut"] == "rejetee", f"Expected statut=rejetee, got {harvest['statut']}"
        
        print(f"PASS: Filter by statut=rejetee returns {len(data['harvests'])} harvests")


class TestHarvestDeclarationUnitConversion:
    """Test POST /api/greenlink/harvests unit conversion"""
    
    def test_declare_harvest_tonnes_conversion(self, farmer_token):
        """POST /api/greenlink/harvests with unit=tonnes converts correctly (2 tonnes = 2000 kg)"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        
        payload = {
            "parcel_id": PARCEL_IDS[0],
            "quantity_kg": 2,  # 2 tonnes
            "unit": "tonnes",
            "quality_grade": "A",
            "notes": "TEST_tonnes_conversion"
        }
        
        response = requests.post(f"{BASE_URL}/api/greenlink/harvests", json=payload, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        harvest = data.get("harvest", {})
        
        # Verify conversion: 2 tonnes = 2000 kg
        assert harvest.get("quantity_kg") == 2000, f"Expected quantity_kg=2000, got {harvest.get('quantity_kg')}"
        assert harvest.get("original_quantity") == 2, f"Expected original_quantity=2, got {harvest.get('original_quantity')}"
        assert harvest.get("unit") == "tonnes", f"Expected unit=tonnes, got {harvest.get('unit')}"
        
        # Verify quantity_display format
        quantity_display = harvest.get("quantity_display", "")
        assert "2 tonne(s)" in quantity_display, f"Expected '2 tonne(s)' in quantity_display: {quantity_display}"
        assert "2000 kg" in quantity_display, f"Expected '2000 kg' in quantity_display: {quantity_display}"
        
        print(f"PASS: Tonnes conversion correct - 2 tonnes = 2000 kg, display='{quantity_display}'")
        return harvest.get("id")
    
    def test_declare_harvest_sacs_conversion(self, farmer_token):
        """POST /api/greenlink/harvests with unit=sacs converts correctly (3 sacs = 195 kg)"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        
        payload = {
            "parcel_id": PARCEL_IDS[0],
            "quantity_kg": 3,  # 3 sacs
            "unit": "sacs",
            "quality_grade": "B",
            "notes": "TEST_sacs_conversion"
        }
        
        response = requests.post(f"{BASE_URL}/api/greenlink/harvests", json=payload, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        harvest = data.get("harvest", {})
        
        # Verify conversion: 3 sacs = 195 kg (3 * 65)
        assert harvest.get("quantity_kg") == 195, f"Expected quantity_kg=195, got {harvest.get('quantity_kg')}"
        assert harvest.get("original_quantity") == 3, f"Expected original_quantity=3, got {harvest.get('original_quantity')}"
        assert harvest.get("unit") == "sacs", f"Expected unit=sacs, got {harvest.get('unit')}"
        
        # Verify quantity_display format
        quantity_display = harvest.get("quantity_display", "")
        assert "3 sac(s)" in quantity_display, f"Expected '3 sac(s)' in quantity_display: {quantity_display}"
        assert "195 kg" in quantity_display, f"Expected '195 kg' in quantity_display: {quantity_display}"
        
        print(f"PASS: Sacs conversion correct - 3 sacs = 195 kg, display='{quantity_display}'")
        return harvest.get("id")
    
    def test_declare_harvest_kg_no_conversion(self, farmer_token):
        """POST /api/greenlink/harvests with unit=kg does not convert"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        
        payload = {
            "parcel_id": PARCEL_IDS[0],
            "quantity_kg": 500,  # 500 kg
            "unit": "kg",
            "quality_grade": "A",
            "notes": "TEST_kg_no_conversion"
        }
        
        response = requests.post(f"{BASE_URL}/api/greenlink/harvests", json=payload, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        harvest = data.get("harvest", {})
        
        # Verify no conversion: 500 kg stays 500 kg
        assert harvest.get("quantity_kg") == 500, f"Expected quantity_kg=500, got {harvest.get('quantity_kg')}"
        assert harvest.get("unit") == "kg", f"Expected unit=kg, got {harvest.get('unit')}"
        
        # Verify quantity_display format
        quantity_display = harvest.get("quantity_display", "")
        assert "500 kg" in quantity_display, f"Expected '500 kg' in quantity_display: {quantity_display}"
        
        print(f"PASS: KG no conversion - 500 kg stays 500 kg, display='{quantity_display}'")
        return harvest.get("id")


class TestQuantityDisplayInMyHarvests:
    """Test that quantity_display is correctly returned in my-harvests"""
    
    def test_quantity_display_format(self, farmer_token):
        """Verify quantity_display contains original unit format"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["harvests"]) == 0:
            pytest.skip("No harvests found for farmer")
        
        # Check each harvest has quantity_display
        for harvest in data["harvests"]:
            assert "quantity_display" in harvest, f"Missing quantity_display in harvest: {harvest}"
            assert harvest["quantity_display"], f"Empty quantity_display in harvest: {harvest}"
            
            # Verify format based on unit
            unit = harvest.get("unit", "kg")
            qty_display = harvest["quantity_display"]
            
            if unit == "tonnes":
                assert "tonne(s)" in qty_display or "kg" in qty_display, f"Invalid tonnes display: {qty_display}"
            elif unit == "sacs":
                assert "sac(s)" in qty_display or "kg" in qty_display, f"Invalid sacs display: {qty_display}"
            else:
                assert "kg" in qty_display, f"Invalid kg display: {qty_display}"
        
        print(f"PASS: All {len(data['harvests'])} harvests have valid quantity_display format")


class TestStatsCalculation:
    """Test that stats are calculated correctly"""
    
    def test_stats_match_harvests_count(self, farmer_token):
        """Verify stats.total matches actual harvests count when no filter"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # When no filter, total should match harvests count
        assert data["stats"]["total"] == len(data["harvests"]), \
            f"stats.total ({data['stats']['total']}) != harvests count ({len(data['harvests'])})"
        
        # Sum of statuses should equal total
        status_sum = data["stats"]["en_attente"] + data["stats"]["validees"] + data["stats"]["rejetees"]
        assert status_sum == data["stats"]["total"], \
            f"Status sum ({status_sum}) != total ({data['stats']['total']})"
        
        print(f"PASS: Stats calculation correct - total={data['stats']['total']}, sum of statuses={status_sum}")
    
    def test_total_kg_calculation(self, farmer_token):
        """Verify total_kg is sum of all quantity_kg"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/harvests/my-harvests", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected total_kg
        expected_total_kg = sum(h.get("quantity_kg", 0) for h in data["harvests"])
        
        assert data["stats"]["total_kg"] == expected_total_kg, \
            f"stats.total_kg ({data['stats']['total_kg']}) != calculated sum ({expected_total_kg})"
        
        print(f"PASS: total_kg calculation correct - {data['stats']['total_kg']} kg")


class TestCooperativeHarvestValidation:
    """Test cooperative harvest validation with quantity_display"""
    
    def test_coop_harvests_list(self, coop_token):
        """GET /api/cooperative/harvests returns harvests with quantity_display"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/harvests", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "harvests" in data, f"Missing 'harvests' key: {data}"
        assert "stats" in data, f"Missing 'stats' key: {data}"
        
        # Check quantity_display in each harvest
        for harvest in data["harvests"]:
            assert "quantity_display" in harvest, f"Missing quantity_display: {harvest}"
        
        print(f"PASS: Cooperative harvests endpoint returns {len(data['harvests'])} harvests with quantity_display")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_harvests(self, farmer_token):
        """Note: Test harvests with TEST_ prefix should be cleaned up manually or via DB"""
        print("INFO: Test harvests created with notes containing 'TEST_' prefix")
        print("INFO: Manual cleanup may be needed for: TEST_tonnes_conversion, TEST_sacs_conversion, TEST_kg_no_conversion")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
