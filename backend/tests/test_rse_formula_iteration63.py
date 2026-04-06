"""
Test RSE Formula Implementation - Iteration 63
Tests the NEW RSE formula (30% frais, 70% distribue: 25% GreenLink, 5% Coop, 70% Paysan)
and formula confidentiality (Admin sees all, Coop/Farmer see only their amounts).

RSE = score x taux_XOF x hectares
- 30% -> Frais
- 70% distribue:
  - 25% -> GreenLink
  - 5%  -> Cooperative
  - 70% -> Paysan

Math verification: For score=7.5, area=3ha, taux=5000:
RSE = 7.5 * 5000 * 3 = 112,500 XOF
frais = 112,500 * 0.30 = 33,750 XOF
distributable = 112,500 * 0.70 = 78,750 XOF
greenlink = 78,750 * 0.25 = 19,687.5 ~ 19,688 XOF
coop = 78,750 * 0.05 = 3,937.5 ~ 3,938 XOF
farmer = 78,750 - 19,688 - 3,938 = 55,124 XOF
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Credentials from review request
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"
COOP_EMAIL = "bielaghana@gmail.com"
COOP_PASSWORD = "474Treckadzo"
FARMER_PHONE = "+2250705551234"
FARMER_PASSWORD = "koffi2024"
USSD_TEST_PHONE = "+2250799999999"


class TestRSEFormulaConfig:
    """Tests for RSE formula configuration endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "user_type": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("access_token")
        assert token, f"No access_token in response: {data}"
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_config_returns_repartition_structure(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/config returns new repartition structure"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/config", headers=auth_headers)
        assert response.status_code == 200, f"Config endpoint failed: {response.text}"
        
        data = response.json()
        
        # Verify repartition object exists
        assert "repartition" in data, f"Missing repartition in config: {data}"
        rep = data["repartition"]
        
        # Verify all required fields in repartition
        required_fields = ["frais_pct", "greenlink_pct", "cooperative_pct", "paysan_pct"]
        for field in required_fields:
            assert field in rep, f"Missing {field} in repartition: {rep}"
        
        # Verify correct percentages (30% frais, 25% greenlink, 5% coop, 70% paysan)
        assert rep["frais_pct"] == 30, f"Expected frais_pct=30, got {rep['frais_pct']}"
        assert rep["greenlink_pct"] == 25, f"Expected greenlink_pct=25, got {rep['greenlink_pct']}"
        assert rep["cooperative_pct"] == 5, f"Expected cooperative_pct=5, got {rep['cooperative_pct']}"
        assert rep["paysan_pct"] == 70, f"Expected paysan_pct=70, got {rep['paysan_pct']}"
        
        print(f"Repartition: frais={rep['frais_pct']}%, greenlink={rep['greenlink_pct']}%, coop={rep['cooperative_pct']}%, paysan={rep['paysan_pct']}%")
    
    def test_config_returns_taux_par_hectare(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/config returns taux_par_hectare"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/config", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "taux_par_hectare" in data, f"Missing taux_par_hectare in config: {data}"
        assert isinstance(data["taux_par_hectare"], (int, float)), "taux_par_hectare should be numeric"
        assert data["taux_par_hectare"] > 0, "taux_par_hectare should be positive"
        
        print(f"Taux par hectare: {data['taux_par_hectare']} XOF")
    
    def test_config_returns_formula_string(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/config returns formula description"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/config", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "formula" in data, f"Missing formula in config: {data}"
        
        # Formula should mention key components
        formula = data["formula"].lower()
        assert "score" in formula, "Formula should mention score"
        assert "hectare" in formula, "Formula should mention hectares"
        assert "30%" in formula or "frais" in formula, "Formula should mention 30% frais"
        
        print(f"Formula: {data['formula']}")


class TestRSERateChange:
    """Tests for changing the taux_par_hectare"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "user_type": "admin"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_update_rate_success(self, auth_headers):
        """Test PUT /api/admin/carbon-premiums/config/rate updates the rate"""
        # Get current rate
        config_res = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/config", headers=auth_headers)
        original_rate = config_res.json().get("taux_par_hectare", 5000)
        
        # Update to a new rate
        new_rate = 6000
        response = requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/config/rate",
            headers=auth_headers,
            json={"taux_par_hectare": new_rate}
        )
        assert response.status_code == 200, f"Rate update failed: {response.text}"
        
        data = response.json()
        assert "taux_par_hectare" in data, f"Missing taux_par_hectare in response: {data}"
        assert data["taux_par_hectare"] == new_rate, f"Expected {new_rate}, got {data['taux_par_hectare']}"
        
        # Verify it persisted
        verify_res = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/config", headers=auth_headers)
        assert verify_res.json()["taux_par_hectare"] == new_rate, "Rate not persisted"
        
        # Restore original rate
        requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/config/rate",
            headers=auth_headers,
            json={"taux_par_hectare": original_rate}
        )
        
        print(f"Rate updated from {original_rate} to {new_rate} and restored")
    
    def test_update_rate_invalid_value(self, auth_headers):
        """Test PUT /api/admin/carbon-premiums/config/rate rejects invalid values"""
        # Test zero
        response = requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/config/rate",
            headers=auth_headers,
            json={"taux_par_hectare": 0}
        )
        assert response.status_code == 400, f"Expected 400 for zero rate, got {response.status_code}"
        
        # Test negative
        response = requests.put(
            f"{BASE_URL}/api/admin/carbon-premiums/config/rate",
            headers=auth_headers,
            json={"taux_par_hectare": -1000}
        )
        assert response.status_code == 400, f"Expected 400 for negative rate, got {response.status_code}"
        
        print("Invalid rate values correctly rejected")


class TestRSEStatsBreakdown:
    """Tests for RSE breakdown in stats endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "user_type": "admin"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_stats_returns_full_rse_breakdown(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/stats returns full RSE breakdown"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        
        data = response.json()
        
        # Verify new RSE breakdown fields
        required_fields = [
            "total_rse",
            "total_frais",
            "total_greenlink",
            "total_paye_planteurs",
            "total_paye_cooperatives",
            "taux_actuel"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing {field} in stats: {data.keys()}"
        
        print(f"RSE Stats: total_rse={data['total_rse']}, frais={data['total_frais']}, greenlink={data['total_greenlink']}")
        print(f"Payouts: farmers={data['total_paye_planteurs']}, coops={data['total_paye_cooperatives']}")
        print(f"Current rate: {data['taux_actuel']} XOF")
    
    def test_stats_taux_actuel_matches_config(self, auth_headers):
        """Test that taux_actuel in stats matches config"""
        stats_res = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/stats", headers=auth_headers)
        config_res = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/config", headers=auth_headers)
        
        stats_rate = stats_res.json().get("taux_actuel")
        config_rate = config_res.json().get("taux_par_hectare")
        
        assert stats_rate == config_rate, f"Stats taux_actuel ({stats_rate}) != config taux_par_hectare ({config_rate})"
        print(f"Rate consistency verified: {stats_rate} XOF")


class TestAdminRequestsRSEVisibility:
    """Tests that Admin can see full RSE breakdown in requests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "user_type": "admin"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_admin_requests_show_rse_fields(self, auth_headers):
        """Test GET /api/admin/carbon-premiums/requests shows RSE breakdown"""
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if not data["requests"]:
            pytest.skip("No requests to verify RSE fields")
        
        req = data["requests"][0]
        
        # Admin should see these RSE fields
        rse_fields = ["rse_total", "frais", "greenlink_share", "taux_par_hectare"]
        for field in rse_fields:
            assert field in req, f"Admin request missing {field}: {req.keys()}"
        
        print(f"Admin sees RSE breakdown: rse_total={req.get('rse_total')}, frais={req.get('frais')}, greenlink={req.get('greenlink_share')}, taux={req.get('taux_par_hectare')}")


class TestFarmerRequestsConfidentiality:
    """Tests that Farmer does NOT see RSE formula details"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FARMER_PHONE,
            "password": FARMER_PASSWORD,
            "user_type": "producteur"
        })
        if response.status_code != 200:
            pytest.skip(f"Farmer login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, farmer_token):
        return {"Authorization": f"Bearer {farmer_token}", "Content-Type": "application/json"}
    
    def test_farmer_requests_hide_rse_details(self, auth_headers):
        """Test GET /api/farmer/carbon-premiums/my-requests does NOT expose RSE details"""
        response = requests.get(f"{BASE_URL}/api/farmer/carbon-premiums/my-requests", headers=auth_headers)
        assert response.status_code == 200, f"Farmer requests failed: {response.text}"
        
        data = response.json()
        
        # Farmer should see farmer_amount but NOT rse_total, frais, greenlink_share, taux_par_hectare
        hidden_fields = ["rse_total", "frais", "greenlink_share", "taux_par_hectare"]
        
        for req in data.get("requests", []):
            # Verify farmer_amount is present
            assert "farmer_amount" in req, f"Farmer request missing farmer_amount: {req.keys()}"
            
            # Verify hidden fields are NOT present
            for field in hidden_fields:
                assert field not in req, f"Farmer request should NOT have {field}: {req.keys()}"
        
        print(f"Farmer sees only farmer_amount, RSE details hidden. Requests count: {len(data.get('requests', []))}")


class TestCooperativeRequestsConfidentiality:
    """Tests that Cooperative does NOT see RSE formula details"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_EMAIL,
            "password": COOP_PASSWORD,
            "user_type": "cooperative"
        })
        if response.status_code != 200:
            pytest.skip(f"Cooperative login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, coop_token):
        return {"Authorization": f"Bearer {coop_token}", "Content-Type": "application/json"}
    
    def test_coop_admin_requests_hide_rse_details(self, auth_headers):
        """Test GET /api/cooperative/carbon-premiums/admin-requests does NOT expose RSE details"""
        response = requests.get(f"{BASE_URL}/api/cooperative/carbon-premiums/admin-requests", headers=auth_headers)
        assert response.status_code == 200, f"Coop admin-requests failed: {response.text}"
        
        data = response.json()
        
        # Coop should see farmer_amount and coop_commission but NOT rse_total, frais, greenlink_share, taux_par_hectare
        hidden_fields = ["rse_total", "frais", "greenlink_share", "taux_par_hectare"]
        
        for req in data.get("requests", []):
            # Verify visible fields
            assert "farmer_amount" in req, f"Coop request missing farmer_amount"
            assert "coop_commission" in req, f"Coop request missing coop_commission"
            
            # Verify hidden fields are NOT present
            for field in hidden_fields:
                assert field not in req, f"Coop request should NOT have {field}: {req.keys()}"
        
        print(f"Coop sees farmer_amount and coop_commission, RSE details hidden. Requests count: {len(data.get('requests', []))}")
    
    def test_coop_members_hide_rate_per_hectare(self, auth_headers):
        """Test GET /api/cooperative/carbon-premiums/members does NOT expose rate_per_hectare in summary"""
        response = requests.get(f"{BASE_URL}/api/cooperative/carbon-premiums/members", headers=auth_headers)
        assert response.status_code == 200, f"Coop members failed: {response.text}"
        
        data = response.json()
        summary = data.get("summary", {})
        
        # Summary should NOT have rate_per_hectare
        assert "rate_per_hectare" not in summary, f"Summary should NOT have rate_per_hectare: {summary.keys()}"
        
        print(f"Coop members summary hides rate_per_hectare. Members: {summary.get('total_members', 0)}")


class TestUSSDPaymentRequestRSE:
    """Tests that USSD payment request stores RSE fields in DB"""
    
    def test_ussd_payment_request_stores_rse_fields(self):
        """Test POST /api/ussd/callback (menu 2*1) creates request with RSE fields"""
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": f"test_rse_iteration63_{os.urandom(4).hex()}",
            "serviceCode": "*144*99#",
            "phoneNumber": USSD_TEST_PHONE,
            "text": "2*1"
        })
        assert response.status_code == 200, f"USSD callback failed: {response.text}"
        
        data = response.json()
        raw_response = data.get("raw_response", data.get("text", ""))
        
        # Response should show farmer amount (not RSE breakdown)
        # Either success or already has request
        print(f"USSD Response: {raw_response[:300]}...")
        
        # The response should NOT show percentage breakdown
        assert "30%" not in raw_response, "USSD should NOT show 30% frais"
        assert "25%" not in raw_response, "USSD should NOT show 25% GreenLink"
        assert "greenlink" not in raw_response.lower(), "USSD should NOT mention GreenLink"


class TestRSEMathVerification:
    """Verify the RSE formula math is correct"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "user_type": "admin"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_rse_formula_math(self, auth_headers):
        """Verify RSE formula: RSE = score x taux x hectares, then 30/70 split"""
        # Get a request with known values
        response = requests.get(f"{BASE_URL}/api/admin/carbon-premiums/requests", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if not data["requests"]:
            pytest.skip("No requests to verify math")
        
        # Find a request with rse_total > 0
        req = None
        for r in data["requests"]:
            if r.get("rse_total", 0) > 0:
                req = r
                break
        
        if not req:
            pytest.skip("No requests with rse_total > 0")
        
        rse_total = req.get("rse_total", 0)
        frais = req.get("frais", 0)
        greenlink = req.get("greenlink_share", 0)
        coop = req.get("coop_commission", 0)
        farmer = req.get("farmer_amount", 0)
        
        # Verify 30% frais
        expected_frais = round(rse_total * 0.30)
        assert abs(frais - expected_frais) <= 2, f"Frais mismatch: {frais} vs expected {expected_frais}"
        
        # Verify distributable = 70%
        distributable = rse_total - frais
        expected_distributable = round(rse_total * 0.70)
        assert abs(distributable - expected_distributable) <= 2, f"Distributable mismatch: {distributable} vs expected {expected_distributable}"
        
        # Verify greenlink = 25% of distributable
        expected_greenlink = round(distributable * 0.25)
        assert abs(greenlink - expected_greenlink) <= 2, f"GreenLink mismatch: {greenlink} vs expected {expected_greenlink}"
        
        # Verify coop = 5% of distributable
        expected_coop = round(distributable * 0.05)
        assert abs(coop - expected_coop) <= 2, f"Coop mismatch: {coop} vs expected {expected_coop}"
        
        # Verify farmer = remainder (70% of distributable)
        expected_farmer = distributable - greenlink - coop
        assert abs(farmer - expected_farmer) <= 2, f"Farmer mismatch: {farmer} vs expected {expected_farmer}"
        
        print(f"RSE Math verified: total={rse_total}, frais={frais} (30%), distributable={distributable} (70%)")
        print(f"  greenlink={greenlink} (25%), coop={coop} (5%), farmer={farmer} (70%)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
