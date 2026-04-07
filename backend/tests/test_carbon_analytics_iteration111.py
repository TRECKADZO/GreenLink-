"""
Test Carbon Analytics Dashboard - Iteration 111
Tests for:
1. GET /api/cooperative/carbon-analytics - Cooperative carbon analytics endpoint
2. GET /api/greenlink/carbon/my-score - Farmer carbon score endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
COOPERATIVE_EMAIL = "bielaghana@gmail.com"
COOPERATIVE_PASSWORD = "test123456"
FARMER_EMAIL = "testplanteur@test.ci"
FARMER_PASSWORD = "test123456"


class TestCarbonAnalyticsAPI:
    """Tests for cooperative carbon analytics endpoint"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": COOPERATIVE_EMAIL, "password": COOPERATIVE_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        elif response.status_code == 429:
            pytest.skip("Rate limited - wait 60 seconds")
        pytest.skip(f"Cooperative login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        """Get farmer authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": FARMER_EMAIL, "password": FARMER_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        elif response.status_code == 429:
            pytest.skip("Rate limited - wait 60 seconds")
        pytest.skip(f"Farmer login failed: {response.status_code} - {response.text}")
    
    def test_cooperative_carbon_analytics_endpoint_exists(self, coop_token):
        """Test that GET /api/cooperative/carbon-analytics returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_cooperative_carbon_analytics_has_resume(self, coop_token):
        """Test that response contains resume with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "resume" in data, "Response should contain 'resume'"
        resume = data["resume"]
        
        # Check required resume fields
        assert "total_parcelles" in resume, "resume should have total_parcelles"
        assert "score_moyen" in resume, "resume should have score_moyen"
        assert "total_co2_tonnes" in resume, "resume should have total_co2_tonnes"
        assert "total_prime_farmer_xof" in resume, "resume should have total_prime_farmer_xof"
        assert "total_prime_coop_xof" in resume, "resume should have total_prime_coop_xof"
        assert "total_superficie_ha" in resume, "resume should have total_superficie_ha"
        assert "prix_tonne_co2_xof" in resume, "resume should have prix_tonne_co2_xof"
    
    def test_cooperative_carbon_analytics_has_distribution(self, coop_token):
        """Test that response contains distribution of score levels"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "distribution" in data, "Response should contain 'distribution'"
        distribution = data["distribution"]
        
        # Check distribution levels
        assert "excellent" in distribution, "distribution should have excellent"
        assert "tres_bon" in distribution, "distribution should have tres_bon"
        assert "bon" in distribution, "distribution should have bon"
        assert "en_progression" in distribution, "distribution should have en_progression"
        assert "insuffisant" in distribution, "distribution should have insuffisant"
    
    def test_cooperative_carbon_analytics_has_decomposition_moyenne(self, coop_token):
        """Test that response contains average decomposition"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "decomposition_moyenne" in data, "Response should contain 'decomposition_moyenne'"
        # decomposition_moyenne may be empty if no parcels have scores
    
    def test_cooperative_carbon_analytics_has_parcelles_array(self, coop_token):
        """Test that response contains parcelles array with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "parcelles" in data, "Response should contain 'parcelles'"
        parcelles = data["parcelles"]
        assert isinstance(parcelles, list), "parcelles should be a list"
        
        if len(parcelles) > 0:
            parcel = parcelles[0]
            # Check required parcel fields
            assert "id" in parcel, "parcel should have id"
            assert "rang" in parcel, "parcel should have rang"
            assert "score" in parcel, "parcel should have score"
            assert "niveau" in parcel, "parcel should have niveau"
            assert "co2_tonnes" in parcel, "parcel should have co2_tonnes"
            assert "prime_farmer_xof" in parcel, "parcel should have prime_farmer_xof"
            assert "decomposition" in parcel, "parcel should have decomposition"
            assert "recommandations" in parcel, "parcel should have recommandations"
    
    def test_cooperative_carbon_analytics_parcels_have_ranks(self, coop_token):
        """Test that parcels have sequential ranks starting from 1"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        parcelles = data.get("parcelles", [])
        if len(parcelles) >= 1:
            # First parcel should have rank 1
            assert parcelles[0]["rang"] == 1, "First parcel should have rank 1"
            # Ranks should be sequential
            for i, parcel in enumerate(parcelles):
                assert parcel["rang"] == i + 1, f"Parcel at index {i} should have rank {i+1}, got {parcel['rang']}"
    
    def test_cooperative_carbon_analytics_unauthorized_without_token(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/cooperative/carbon-analytics")
        assert response.status_code in [401, 403], f"Expected 401/403 without token, got {response.status_code}"
    
    def test_farmer_carbon_score_endpoint_exists(self, farmer_token):
        """Test that GET /api/greenlink/carbon/my-score returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/greenlink/carbon/my-score",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_farmer_carbon_score_has_required_fields(self, farmer_token):
        """Test that farmer carbon score response has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/greenlink/carbon/my-score",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "average_score" in data, "Response should have average_score"
        assert "breakdown" in data, "Response should have breakdown"
        assert "recommendations" in data, "Response should have recommendations"
        assert "parcels" in data, "Response should have parcels"
    
    def test_farmer_carbon_score_breakdown_structure(self, farmer_token):
        """Test that breakdown has expected structure"""
        response = requests.get(
            f"{BASE_URL}/api/greenlink/carbon/my-score",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        breakdown = data.get("breakdown", {})
        # Breakdown should have scoring components
        # These may vary but typically include base, arbres, ombrage, pratiques, surface
        assert isinstance(breakdown, dict), "breakdown should be a dict"
    
    def test_farmer_carbon_premiums_endpoint(self, farmer_token):
        """Test that GET /api/farmer/carbon-premiums/my-requests works"""
        response = requests.get(
            f"{BASE_URL}/api/farmer/carbon-premiums/my-requests",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        # This endpoint may return 200 or 404 depending on data
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"


class TestCarbonAnalyticsDataIntegrity:
    """Tests for data integrity in carbon analytics"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": COOPERATIVE_EMAIL, "password": COOPERATIVE_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        elif response.status_code == 429:
            pytest.skip("Rate limited")
        pytest.skip(f"Login failed: {response.status_code}")
    
    def test_distribution_sums_to_total_parcels(self, coop_token):
        """Test that distribution counts sum to total parcels"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        total_parcelles = data["resume"]["total_parcelles"]
        distribution = data["distribution"]
        
        distribution_sum = (
            distribution.get("excellent", 0) +
            distribution.get("tres_bon", 0) +
            distribution.get("bon", 0) +
            distribution.get("en_progression", 0) +
            distribution.get("insuffisant", 0)
        )
        
        assert distribution_sum == total_parcelles, \
            f"Distribution sum ({distribution_sum}) should equal total parcels ({total_parcelles})"
    
    def test_parcels_count_matches_resume(self, coop_token):
        """Test that parcelles array length matches resume.total_parcelles"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        total_parcelles = data["resume"]["total_parcelles"]
        parcelles_count = len(data["parcelles"])
        
        assert parcelles_count == total_parcelles, \
            f"Parcelles array length ({parcelles_count}) should match total_parcelles ({total_parcelles})"
    
    def test_prime_calculations_are_positive(self, coop_token):
        """Test that prime calculations are non-negative"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        resume = data["resume"]
        assert resume["total_prime_farmer_xof"] >= 0, "Farmer prime should be non-negative"
        assert resume["total_prime_coop_xof"] >= 0, "Coop prime should be non-negative"
        
        for parcel in data["parcelles"]:
            assert parcel["prime_farmer_xof"] >= 0, f"Parcel {parcel['id']} prime should be non-negative"
    
    def test_scores_are_within_valid_range(self, coop_token):
        """Test that scores are between 0 and 10"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-analytics",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        resume = data["resume"]
        assert 0 <= resume["score_moyen"] <= 10, f"Average score {resume['score_moyen']} should be 0-10"
        
        for parcel in data["parcelles"]:
            assert 0 <= parcel["score"] <= 10, f"Parcel {parcel['id']} score {parcel['score']} should be 0-10"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
