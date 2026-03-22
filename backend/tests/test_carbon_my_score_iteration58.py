"""
Iteration 58 - Carbon My-Score Enriched API Tests
Tests for GET /api/greenlink/carbon/my-score endpoint with enriched response:
- Breakdown object (base, arbres, ombrage, pratiques, surface, max_possible)
- Personalized recommendations (type, title, description, potential_gain, priority)
- Parcels with carbon fields (nombre_arbres, couverture_ombragee, pratiques_ecologiques, verification_status)
- Aggregated stats (total_trees, avg_shade_cover, practices_count, practices_list)
- Empty state handling (0 parcels)
- Phone normalization for coop_member linking
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
FARMER_WITH_PARCELS = {
    "identifier": "+2250705551234",
    "password": "koffi2024"
}

FIELD_AGENT_NO_PARCELS = {
    "identifier": "test_agent@greenlink.ci",
    "password": "agent2024"
}


class TestCarbonMyScoreAuthentication:
    """Authentication tests for carbon/my-score endpoint"""
    
    def test_my_score_requires_authentication(self):
        """Test that endpoint returns 401/403 without token"""
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: my-score requires authentication")
    
    def test_my_score_with_invalid_token(self):
        """Test that endpoint rejects invalid token"""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: my-score rejects invalid token")


class TestCarbonMyScoreFarmerWithParcels:
    """Tests for farmer with parcels (+2250705551234 has 4 parcels)"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        """Get authentication token for farmer with parcels"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_WITH_PARCELS)
        if response.status_code != 200:
            pytest.skip(f"Farmer login failed: {response.status_code} - {response.text}")
        data = response.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            pytest.skip(f"No token in response: {data}")
        print(f"PASS: Farmer login successful")
        return token
    
    def test_my_score_returns_200(self, farmer_token):
        """Test that endpoint returns 200 for authenticated farmer"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: my-score returns 200 for farmer")
    
    def test_my_score_returns_breakdown_object(self, farmer_token):
        """Test that response contains breakdown object with all components"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "breakdown" in data, "Response missing 'breakdown' field"
        
        breakdown = data["breakdown"]
        required_fields = ["base", "arbres", "ombrage", "pratiques", "surface", "max_possible"]
        for field in required_fields:
            assert field in breakdown, f"Breakdown missing '{field}' field"
            assert isinstance(breakdown[field], (int, float)), f"'{field}' should be numeric"
        
        # Verify base is 3.0 and max_possible is 10.0
        assert breakdown["base"] == 3.0, f"Expected base=3.0, got {breakdown['base']}"
        assert breakdown["max_possible"] == 10.0, f"Expected max_possible=10.0, got {breakdown['max_possible']}"
        
        print(f"PASS: Breakdown object complete: {breakdown}")
    
    def test_my_score_returns_recommendations_array(self, farmer_token):
        """Test that response contains recommendations array with proper structure"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendations" in data, "Response missing 'recommendations' field"
        assert isinstance(data["recommendations"], list), "Recommendations should be a list"
        
        # If there are recommendations, verify structure
        if data["recommendations"]:
            rec = data["recommendations"][0]
            required_fields = ["type", "title", "description", "potential_gain", "priority"]
            for field in required_fields:
                assert field in rec, f"Recommendation missing '{field}' field"
            
            # Verify types
            assert rec["type"] in ["arbres", "ombrage", "pratique"], f"Invalid recommendation type: {rec['type']}"
            assert isinstance(rec["potential_gain"], (int, float)), "potential_gain should be numeric"
            assert rec["priority"] in ["haute", "moyenne", "faible"], f"Invalid priority: {rec['priority']}"
            
            print(f"PASS: Recommendations array valid, first rec: {rec['title']}")
        else:
            print("PASS: Recommendations array present (empty - farmer may have max score)")
    
    def test_my_score_returns_parcels_with_carbon_fields(self, farmer_token):
        """Test that parcels array contains carbon premium fields"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "parcels" in data, "Response missing 'parcels' field"
        assert isinstance(data["parcels"], list), "Parcels should be a list"
        assert len(data["parcels"]) > 0, "Farmer should have at least 1 parcel"
        
        parcel = data["parcels"][0]
        required_fields = ["id", "nombre_arbres", "couverture_ombragee", "pratiques_ecologiques", "verification_status"]
        for field in required_fields:
            assert field in parcel, f"Parcel missing '{field}' field"
        
        # Verify types
        assert isinstance(parcel["nombre_arbres"], (int, float)), "nombre_arbres should be numeric"
        assert isinstance(parcel["couverture_ombragee"], (int, float)), "couverture_ombragee should be numeric"
        assert isinstance(parcel["pratiques_ecologiques"], list), "pratiques_ecologiques should be a list"
        assert parcel["verification_status"] in ["pending", "verified", "rejected"], f"Invalid status: {parcel['verification_status']}"
        
        print(f"PASS: Parcels contain carbon fields. First parcel: id={parcel['id']}, trees={parcel['nombre_arbres']}, shade={parcel['couverture_ombragee']}%")
    
    def test_my_score_returns_aggregated_stats(self, farmer_token):
        """Test that response contains aggregated statistics"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check for aggregated stats
        required_stats = ["total_trees", "avg_shade_cover", "practices_count", "practices_list"]
        for stat in required_stats:
            assert stat in data, f"Response missing '{stat}' field"
        
        # Verify types
        assert isinstance(data["total_trees"], (int, float)), "total_trees should be numeric"
        assert isinstance(data["avg_shade_cover"], (int, float)), "avg_shade_cover should be numeric"
        assert isinstance(data["practices_count"], int), "practices_count should be integer"
        assert isinstance(data["practices_list"], list), "practices_list should be a list"
        
        print(f"PASS: Aggregated stats present: trees={data['total_trees']}, shade={data['avg_shade_cover']}%, practices={data['practices_count']}")
    
    def test_my_score_returns_core_fields(self, farmer_token):
        """Test that response contains core score fields"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check core fields
        core_fields = ["average_score", "total_credits", "total_premium", "parcels_count", "total_area"]
        for field in core_fields:
            assert field in data, f"Response missing '{field}' field"
        
        # Verify farmer has parcels
        assert data["parcels_count"] > 0, f"Expected parcels_count > 0, got {data['parcels_count']}"
        
        print(f"PASS: Core fields present: score={data['average_score']}, credits={data['total_credits']}, parcels={data['parcels_count']}")
    
    def test_my_score_recommendations_sorted_by_potential_gain(self, farmer_token):
        """Test that recommendations are sorted by potential_gain descending"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        recommendations = data.get("recommendations", [])
        
        if len(recommendations) >= 2:
            gains = [r["potential_gain"] for r in recommendations]
            assert gains == sorted(gains, reverse=True), f"Recommendations not sorted by potential_gain: {gains}"
            print(f"PASS: Recommendations sorted by potential_gain: {gains}")
        else:
            print("PASS: Not enough recommendations to verify sorting (may have high score)")
    
    def test_my_score_breakdown_components_within_range(self, farmer_token):
        """Test that breakdown components are within valid ranges"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        breakdown = data["breakdown"]
        
        # Verify ranges based on code: arbres(0-2), ombrage(0-2), pratiques(0-2.5), surface(0-0.5)
        assert 0 <= breakdown["arbres"] <= 2.0, f"arbres out of range: {breakdown['arbres']}"
        assert 0 <= breakdown["ombrage"] <= 2.0, f"ombrage out of range: {breakdown['ombrage']}"
        assert 0 <= breakdown["pratiques"] <= 2.5, f"pratiques out of range: {breakdown['pratiques']}"
        assert 0 <= breakdown["surface"] <= 0.5, f"surface out of range: {breakdown['surface']}"
        
        # Verify total doesn't exceed max
        total = breakdown["base"] + breakdown["arbres"] + breakdown["ombrage"] + breakdown["pratiques"] + breakdown["surface"]
        assert total <= breakdown["max_possible"], f"Total {total} exceeds max {breakdown['max_possible']}"
        
        print(f"PASS: Breakdown components within valid ranges, total={total}")


class TestCarbonMyScoreEmptyState:
    """Tests for user with 0 parcels (field agent)"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get authentication token for field agent (no parcels)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FIELD_AGENT_NO_PARCELS)
        if response.status_code != 200:
            pytest.skip(f"Agent login failed: {response.status_code} - {response.text}")
        data = response.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            pytest.skip(f"No token in response: {data}")
        print(f"PASS: Field agent login successful")
        return token
    
    def test_my_score_empty_state_returns_200(self, agent_token):
        """Test that endpoint returns 200 for user with no parcels"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: my-score returns 200 for user with no parcels")
    
    def test_my_score_empty_state_breakdown(self, agent_token):
        """Test that empty state returns zeroed breakdown"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "breakdown" in data, "Response missing 'breakdown' field"
        
        breakdown = data["breakdown"]
        # For empty state, all components should be 0
        assert breakdown["arbres"] == 0, f"Expected arbres=0, got {breakdown['arbres']}"
        assert breakdown["ombrage"] == 0, f"Expected ombrage=0, got {breakdown['ombrage']}"
        assert breakdown["pratiques"] == 0, f"Expected pratiques=0, got {breakdown['pratiques']}"
        assert breakdown["surface"] == 0, f"Expected surface=0, got {breakdown['surface']}"
        
        print(f"PASS: Empty state breakdown is zeroed: {breakdown}")
    
    def test_my_score_empty_state_recommendations(self, agent_token):
        """Test that empty state returns empty recommendations"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendations" in data, "Response missing 'recommendations' field"
        assert data["recommendations"] == [], f"Expected empty recommendations, got {data['recommendations']}"
        
        print("PASS: Empty state has empty recommendations")
    
    def test_my_score_empty_state_parcels(self, agent_token):
        """Test that empty state returns empty parcels array"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "parcels" in data, "Response missing 'parcels' field"
        assert data["parcels"] == [], f"Expected empty parcels, got {data['parcels']}"
        assert data["parcels_count"] == 0, f"Expected parcels_count=0, got {data['parcels_count']}"
        
        print("PASS: Empty state has empty parcels array")
    
    def test_my_score_empty_state_stats(self, agent_token):
        """Test that empty state returns zeroed stats"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        assert data["average_score"] == 0, f"Expected average_score=0, got {data['average_score']}"
        assert data["total_credits"] == 0, f"Expected total_credits=0, got {data['total_credits']}"
        assert data["total_premium"] == 0, f"Expected total_premium=0, got {data['total_premium']}"
        
        print("PASS: Empty state has zeroed stats")


class TestCarbonMyScorePhoneNormalization:
    """Tests for phone normalization and coop_member linking"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        """Get authentication token for farmer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_WITH_PARCELS)
        if response.status_code != 200:
            pytest.skip(f"Farmer login failed: {response.status_code}")
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_my_score_resolves_parcels_via_phone_link(self, farmer_token):
        """Test that parcels are resolved via coop_member phone normalization"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Farmer +2250705551234 should have 4 parcels according to test context
        # The endpoint uses phone normalization to link parcels via coop_member
        assert data["parcels_count"] >= 1, f"Expected at least 1 parcel, got {data['parcels_count']}"
        
        print(f"PASS: Farmer has {data['parcels_count']} parcels resolved via phone link")
    
    def test_my_score_parcels_have_valid_ids(self, farmer_token):
        """Test that all parcels have valid MongoDB ObjectIds"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        for parcel in data["parcels"]:
            assert "id" in parcel, "Parcel missing 'id' field"
            assert len(parcel["id"]) == 24, f"Invalid parcel id format: {parcel['id']}"
        
        print(f"PASS: All {len(data['parcels'])} parcels have valid IDs")


class TestCarbonMyScoreDataIntegrity:
    """Tests for data integrity and consistency"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        """Get authentication token for farmer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_WITH_PARCELS)
        if response.status_code != 200:
            pytest.skip(f"Farmer login failed: {response.status_code}")
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_my_score_total_trees_matches_parcels_sum(self, farmer_token):
        """Test that total_trees equals sum of parcel nombre_arbres"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        parcels_sum = sum(p.get("nombre_arbres", 0) for p in data["parcels"])
        # Note: total_trees may include parcels beyond the first 10 returned
        # So we verify total_trees >= parcels_sum
        assert data["total_trees"] >= parcels_sum, f"total_trees ({data['total_trees']}) < parcels sum ({parcels_sum})"
        
        print(f"PASS: total_trees ({data['total_trees']}) consistent with parcels")
    
    def test_my_score_parcels_count_matches_array_length(self, farmer_token):
        """Test that parcels_count matches or exceeds parcels array length"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # parcels array is limited to 10, but parcels_count shows total
        assert data["parcels_count"] >= len(data["parcels"]), \
            f"parcels_count ({data['parcels_count']}) < parcels array length ({len(data['parcels'])})"
        
        print(f"PASS: parcels_count ({data['parcels_count']}) >= array length ({len(data['parcels'])})")
    
    def test_my_score_practices_count_matches_list_length(self, farmer_token):
        """Test that practices_count matches practices_list length"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/carbon/my-score", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        assert data["practices_count"] == len(data["practices_list"]), \
            f"practices_count ({data['practices_count']}) != practices_list length ({len(data['practices_list'])})"
        
        print(f"PASS: practices_count ({data['practices_count']}) matches list length")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
