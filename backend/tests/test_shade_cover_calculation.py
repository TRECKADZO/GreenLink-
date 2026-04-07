"""
Test suite for Shade Cover (Couverture Ombragée) Auto-Calculation Feature
==========================================================================
Tests the backend endpoint GET /api/carbon-score/estimate-couverture
and POST /api/carbon-score/simulate with couverture_ombragee impact.

Formula: (arbres_grands*90 + arbres_moyens*30 + arbres_petits*10) / (area_hectares*10000) * 100
Capped at 100%
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestEstimateCouvertureEndpoint:
    """Tests for GET /api/carbon-score/estimate-couverture"""
    
    def test_basic_calculation_1ha(self):
        """Test basic shade cover calculation for 1 hectare"""
        # 2 grands (90m²) + 5 moyens (30m²) + 10 petits (10m²) = 180 + 150 + 100 = 430m²
        # 430 / 10000 * 100 = 4.3%
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 10, "arbres_moyens": 5, "arbres_grands": 2, "area_hectares": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert "couverture_estimee" in data
        assert data["couverture_estimee"] == 4.3
        assert "formule" in data
        print(f"PASSED: Basic calculation 1ha - couverture_estimee={data['couverture_estimee']}%")
    
    def test_only_large_trees(self):
        """Test with only large trees (Strate 3 >30m)"""
        # 10 grands * 90m² = 900m² / 10000 * 100 = 9%
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 0, "arbres_moyens": 0, "arbres_grands": 10, "area_hectares": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["couverture_estimee"] == 9.0
        print(f"PASSED: Only large trees - couverture_estimee={data['couverture_estimee']}%")
    
    def test_only_medium_trees(self):
        """Test with only medium trees (Strate 2 5-30m)"""
        # 20 moyens * 30m² = 600m² / 10000 * 100 = 6%
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 0, "arbres_moyens": 20, "arbres_grands": 0, "area_hectares": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["couverture_estimee"] == 6.0
        print(f"PASSED: Only medium trees - couverture_estimee={data['couverture_estimee']}%")
    
    def test_only_small_trees(self):
        """Test with only small trees (Strate 1 3-5m)"""
        # 50 petits * 10m² = 500m² / 10000 * 100 = 5%
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 50, "arbres_moyens": 0, "arbres_grands": 0, "area_hectares": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["couverture_estimee"] == 5.0
        print(f"PASSED: Only small trees - couverture_estimee={data['couverture_estimee']}%")
    
    def test_larger_area_2ha(self):
        """Test calculation for 2 hectares"""
        # (20*90 + 50*30 + 100*10) / (2*10000) * 100 = 4300/20000 * 100 = 21.5%
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 100, "arbres_moyens": 50, "arbres_grands": 20, "area_hectares": 2}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["couverture_estimee"] == 21.5
        print(f"PASSED: 2 hectares - couverture_estimee={data['couverture_estimee']}%")
    
    def test_cap_at_100_percent(self):
        """Test that shade cover is capped at 100%"""
        # 200 grands * 90m² = 18000m² / 10000 * 100 = 180% -> capped to 100%
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 0, "arbres_moyens": 0, "arbres_grands": 200, "area_hectares": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["couverture_estimee"] == 100.0
        print(f"PASSED: Cap at 100% - couverture_estimee={data['couverture_estimee']}%")
    
    def test_zero_trees(self):
        """Test with zero trees"""
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 0, "arbres_moyens": 0, "arbres_grands": 0, "area_hectares": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["couverture_estimee"] == 0.0
        print(f"PASSED: Zero trees - couverture_estimee={data['couverture_estimee']}%")
    
    def test_small_area_0_5ha(self):
        """Test with small area (0.5 hectares)"""
        # (5*90 + 10*30 + 20*10) / (0.5*10000) * 100 = 950/5000 * 100 = 19%
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 20, "arbres_moyens": 10, "arbres_grands": 5, "area_hectares": 0.5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["couverture_estimee"] == 19.0
        print(f"PASSED: 0.5 hectares - couverture_estimee={data['couverture_estimee']}%")
    
    def test_default_area_1ha(self):
        """Test that default area is 1 hectare when not specified"""
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 10, "arbres_moyens": 10, "arbres_grands": 10}
        )
        assert response.status_code == 200
        data = response.json()
        # (10*90 + 10*30 + 10*10) / 10000 * 100 = 1300/10000 * 100 = 13%
        assert data["couverture_estimee"] == 13.0
        print(f"PASSED: Default area 1ha - couverture_estimee={data['couverture_estimee']}%")
    
    def test_formula_in_response(self):
        """Test that formula is included in response"""
        response = requests.get(
            f"{BASE_URL}/api/carbon-score/estimate-couverture",
            params={"arbres_petits": 5, "arbres_moyens": 3, "arbres_grands": 1, "area_hectares": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert "formule" in data
        assert "S3:1x90" in data["formule"]
        assert "S2:3x30" in data["formule"]
        assert "S1:5x10" in data["formule"]
        print(f"PASSED: Formula in response - {data['formule']}")


class TestCarbonScoreSimulateWithCouverture:
    """Tests for POST /api/carbon-score/simulate with couverture_ombragee impact"""
    
    def test_simulate_with_high_couverture(self):
        """Test carbon score simulation with high shade cover (60%+)"""
        response = requests.post(
            f"{BASE_URL}/api/carbon-score/simulate",
            json={
                "area_hectares": 2,
                "arbres_petits": 50,
                "arbres_moyens": 30,
                "arbres_grands": 20,
                "couverture_ombragee": 65
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "details" in data
        assert "couverture_ombragee" in data["details"]
        # High couverture (>=60%) should give 1.3 bonus
        assert data["details"]["couverture_ombragee"] >= 1.0
        print(f"PASSED: High couverture (65%) - score={data['score']}, couverture_bonus={data['details']['couverture_ombragee']}")
    
    def test_simulate_with_medium_couverture(self):
        """Test carbon score simulation with medium shade cover (40-60%)"""
        response = requests.post(
            f"{BASE_URL}/api/carbon-score/simulate",
            json={
                "area_hectares": 2,
                "arbres_petits": 30,
                "arbres_moyens": 20,
                "arbres_grands": 10,
                "couverture_ombragee": 45
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["details"]["couverture_ombragee"] >= 0.6
        print(f"PASSED: Medium couverture (45%) - score={data['score']}, couverture_bonus={data['details']['couverture_ombragee']}")
    
    def test_simulate_with_low_couverture(self):
        """Test carbon score simulation with low shade cover (10-20%)"""
        response = requests.post(
            f"{BASE_URL}/api/carbon-score/simulate",
            json={
                "area_hectares": 2,
                "arbres_petits": 10,
                "arbres_moyens": 5,
                "arbres_grands": 2,
                "couverture_ombragee": 15
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["details"]["couverture_ombragee"] >= 0.3
        print(f"PASSED: Low couverture (15%) - score={data['score']}, couverture_bonus={data['details']['couverture_ombragee']}")
    
    def test_simulate_with_zero_couverture(self):
        """Test carbon score simulation with zero shade cover"""
        response = requests.post(
            f"{BASE_URL}/api/carbon-score/simulate",
            json={
                "area_hectares": 1,
                "arbres_petits": 0,
                "arbres_moyens": 0,
                "arbres_grands": 0,
                "couverture_ombragee": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["details"]["couverture_ombragee"] == 0
        print(f"PASSED: Zero couverture - score={data['score']}, couverture_bonus={data['details']['couverture_ombragee']}")
    
    def test_simulate_returns_recommendations(self):
        """Test that simulation returns recommendations for low couverture"""
        response = requests.post(
            f"{BASE_URL}/api/carbon-score/simulate",
            json={
                "area_hectares": 1,
                "arbres_petits": 5,
                "arbres_moyens": 2,
                "arbres_grands": 1,
                "couverture_ombragee": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "recommandations" in data
        print(f"PASSED: Recommendations returned - {len(data['recommandations'])} recommendations")


class TestDecompositionEndpoint:
    """Tests for GET /api/carbon-score/decomposition"""
    
    def test_decomposition_returns_criteria(self):
        """Test that decomposition endpoint returns scoring criteria"""
        response = requests.get(f"{BASE_URL}/api/carbon-score/decomposition")
        assert response.status_code == 200
        data = response.json()
        assert "criteres" in data
        assert "niveaux" in data
        assert data["max_score"] == 10.0
        # Check couverture ombragee is in criteria
        couverture_criteria = [c for c in data["criteres"] if "ombragee" in c["nom"].lower()]
        assert len(couverture_criteria) > 0
        print(f"PASSED: Decomposition endpoint - {len(data['criteres'])} criteria, max_score={data['max_score']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
