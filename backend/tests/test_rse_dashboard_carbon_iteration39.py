"""
Iteration 39 - RSE Dashboard Stats & Carbon Credit Form Testing
Tests:
- GET /api/rse/dashboard-stats with enriched metrics (EUDR, ESG, child labor, traceability, carbon market)
- POST /api/carbon-listings/submit with new ESG fields (additionality, permanence, co-benefits, SDGs, community consent)
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from problem statement
RSE_USER = {"identifier": "rse-devis@test.com", "password": "test1234"}
COOP_USER = {"identifier": "bielaghana@gmail.com", "password": "greenlink2024"}
ADMIN_USER = {"identifier": "klenakan.eric@gmail.com", "password": "474Treckadzo"}


def get_auth_token(credentials: dict) -> str:
    """Helper to login and get auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=credentials,
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


def random_string(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


class TestRSEDashboardStats:
    """Tests for GET /api/rse/dashboard-stats endpoint"""
    
    @pytest.fixture(scope="class")
    def rse_token(self):
        """Get RSE user token"""
        token = get_auth_token(RSE_USER)
        if not token:
            pytest.skip("RSE user authentication failed")
        return token
    
    def test_rse_dashboard_stats_requires_auth(self):
        """Test that dashboard stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/rse/dashboard-stats")
        assert response.status_code in [401, 403], "Should require authentication"
    
    def test_rse_dashboard_stats_returns_all_sections(self, rse_token):
        """Test that dashboard stats returns all required sections"""
        response = requests.get(
            f"{BASE_URL}/api/rse/dashboard-stats",
            headers={"Authorization": f"Bearer {rse_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all required top-level sections exist
        assert "eudr_compliance" in data, "Missing eudr_compliance section"
        assert "child_labor_monitoring" in data, "Missing child_labor_monitoring section"
        assert "traceability" in data, "Missing traceability section"
        assert "carbon_market" in data, "Missing carbon_market section"
        assert "my_impact" in data, "Missing my_impact section"
        assert "esg_score" in data, "Missing esg_score section"
    
    def test_eudr_compliance_fields(self, rse_token):
        """Test EUDR compliance section has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/rse/dashboard-stats",
            headers={"Authorization": f"Bearer {rse_token}"}
        )
        assert response.status_code == 200
        
        eudr = response.json()["eudr_compliance"]
        
        # Required EUDR fields
        assert "compliance_rate" in eudr, "Missing compliance_rate"
        assert "geolocation_rate" in eudr, "Missing geolocation_rate"
        assert "verification_rate" in eudr, "Missing verification_rate"
        assert "total_parcels" in eudr, "Missing total_parcels"
        assert "geolocated_parcels" in eudr, "Missing geolocated_parcels"
        assert "verified_parcels" in eudr, "Missing verified_parcels"
        assert "deforestation_free" in eudr, "Missing deforestation_free"
        
        # Rates should be between 0 and 100
        assert 0 <= eudr["compliance_rate"] <= 100
        assert 0 <= eudr["geolocation_rate"] <= 100
        assert 0 <= eudr["verification_rate"] <= 100
    
    def test_child_labor_monitoring_fields(self, rse_token):
        """Test child labor monitoring section has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/rse/dashboard-stats",
            headers={"Authorization": f"Bearer {rse_token}"}
        )
        assert response.status_code == 200
        
        clm = response.json()["child_labor_monitoring"]
        
        # Required child labor monitoring fields
        assert "total_ici_forms" in clm, "Missing total_ici_forms"
        assert "total_ssrte_visits" in clm, "Missing total_ssrte_visits"
        assert "children_monitored" in clm, "Missing children_monitored"
        assert "high_risk_cases" in clm, "Missing high_risk_cases"
        assert "moderate_risk_cases" in clm, "Missing moderate_risk_cases"
        assert "low_risk_cases" in clm, "Missing low_risk_cases"
        assert "total_alerts" in clm, "Missing total_alerts"
        assert "resolved_alerts" in clm, "Missing resolved_alerts"
        assert "resolution_rate" in clm, "Missing resolution_rate"
        
        # All values should be >= 0
        assert clm["total_ici_forms"] >= 0
        assert clm["total_ssrte_visits"] >= 0
        assert clm["children_monitored"] >= 0
    
    def test_esg_score_fields(self, rse_token):
        """Test ESG score section has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/rse/dashboard-stats",
            headers={"Authorization": f"Bearer {rse_token}"}
        )
        assert response.status_code == 200
        
        esg = response.json()["esg_score"]
        
        # Required ESG fields
        assert "global" in esg, "Missing global score"
        assert "environmental" in esg, "Missing environmental score"
        assert "social" in esg, "Missing social score"
        assert "governance" in esg, "Missing governance score"
        assert "details" in esg, "Missing details section"
        
        # All scores should be 0-100
        assert 0 <= esg["global"] <= 100
        assert 0 <= esg["environmental"] <= 100
        assert 0 <= esg["social"] <= 100
        assert 0 <= esg["governance"] <= 100
        
        # Check details sub-fields
        details = esg["details"]
        assert "e_carbon_offset" in details
        assert "e_deforestation_free" in details
        assert "e_certification" in details
        assert "s_ici_monitoring" in details
        assert "s_alert_resolution" in details
        assert "s_ssrte_coverage" in details
        assert "g_geolocation" in details
        assert "g_verification" in details
    
    def test_traceability_fields(self, rse_token):
        """Test traceability section has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/rse/dashboard-stats",
            headers={"Authorization": f"Bearer {rse_token}"}
        )
        assert response.status_code == 200
        
        trace = response.json()["traceability"]
        
        # Required traceability fields
        assert "total_farmers" in trace, "Missing total_farmers"
        assert "total_cooperatives" in trace, "Missing total_cooperatives"
        assert "total_hectares" in trace, "Missing total_hectares"
        assert "total_parcels" in trace, "Missing total_parcels"
        assert "certified_parcels" in trace, "Missing certified_parcels"
        assert "certifications" in trace, "Missing certifications"
        
        # certifications should be a dict
        assert isinstance(trace["certifications"], dict)
    
    def test_carbon_market_fields(self, rse_token):
        """Test carbon market section has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/rse/dashboard-stats",
            headers={"Authorization": f"Bearer {rse_token}"}
        )
        assert response.status_code == 200
        
        carbon = response.json()["carbon_market"]
        
        # Required carbon market fields
        assert "available_credits" in carbon, "Missing available_credits"
        assert "total_tonnes_available" in carbon, "Missing total_tonnes_available"
        assert "avg_price_per_tonne" in carbon, "Missing avg_price_per_tonne"
        assert "min_price" in carbon, "Missing min_price"
        assert "max_price" in carbon, "Missing max_price"
        assert "credit_types" in carbon, "Missing credit_types"
        
        # credit_types should be a list
        assert isinstance(carbon["credit_types"], list)
    
    def test_my_impact_fields(self, rse_token):
        """Test my_impact section has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/rse/dashboard-stats",
            headers={"Authorization": f"Bearer {rse_token}"}
        )
        assert response.status_code == 200
        
        my_impact = response.json()["my_impact"]
        
        # Required my_impact fields
        assert "total_tonnes_offset" in my_impact, "Missing total_tonnes_offset"
        assert "total_investment_xof" in my_impact, "Missing total_investment_xof"
        assert "purchases_count" in my_impact, "Missing purchases_count"


class TestCarbonListingsSubmit:
    """Tests for POST /api/carbon-listings/submit endpoint with new ESG fields"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative user token"""
        token = get_auth_token(COOP_USER)
        if not token:
            pytest.skip("Cooperative user authentication failed")
        return token
    
    def test_submit_requires_auth(self):
        """Test that submit requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json={"credit_type": "Agroforesterie", "project_name": "Test"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [401, 403], "Should require authentication"
    
    def test_submit_basic_carbon_listing(self, coop_token):
        """Test submitting a basic carbon listing"""
        payload = {
            "credit_type": "Agroforesterie",
            "project_name": f"TEST Basic Project {random_string()}",
            "project_description": "Test project for iteration 39",
            "verification_standard": "Verra VCS",
            "quantity_tonnes_co2": 50,
            "vintage_year": 2025
        }
        
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "listing_id" in data, "Missing listing_id in response"
        assert "status" in data, "Missing status in response"
        assert data["status"] == "pending_approval"
        assert data["listing_id"].startswith("CRB-")
    
    def test_submit_with_new_esg_fields(self, coop_token):
        """Test submitting carbon listing with all new ESG fields"""
        payload = {
            "credit_type": "Reforestation",
            "project_name": f"TEST ESG Fields Project {random_string()}",
            "project_description": "Test project with all ESG fields",
            "verification_standard": "Gold Standard",
            "quantity_tonnes_co2": 100,
            "vintage_year": 2025,
            "region": "Sud-Ouest",
            "department": "Soubre",
            "methodology": "VM0015",
            "area_hectares": 75,
            "trees_planted": 5000,
            "farmers_involved": 50,
            # New ESG fields
            "project_start_date": "2025-01-15",
            "project_end_date": "2035-01-15",
            "baseline_scenario": "Without intervention, the degraded land would remain unproductive with minimal carbon sequestration.",
            "additionality_justification": "This project would not be viable without carbon finance revenue. Traditional farming income cannot support the required upfront investment.",
            "permanence_plan": "30-year forest management agreement with community. Buffer pool established. Annual monitoring with third-party verification.",
            "leakage_assessment": "Minimal leakage risk - community-owned land with no alternative agricultural pressure. Adjacent areas already protected.",
            "co_benefits": ["biodiversite", "ressources_eau", "qualite_sol", "revenus_communaute"],
            "sdg_alignment": [1, 2, 13, 15],
            "community_consent": True,
            "certification_body": "Control Union"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "pending_approval"
        assert "listing_id" in data
        print(f"Created listing with ESG fields: {data['listing_id']}")
    
    def test_submit_validates_required_fields(self, coop_token):
        """Test that required fields are validated"""
        # Missing required fields
        payload = {
            "credit_type": "Agroforesterie"
            # Missing project_name, project_description, verification_standard, quantity_tonnes_co2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/carbon-listings/submit",
            json=payload,
            headers={
                "Authorization": f"Bearer {coop_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 422, f"Expected validation error 422, got {response.status_code}"
    
    def test_my_listings_returns_submissions(self, coop_token):
        """Test that my listings endpoint returns user's submissions"""
        response = requests.get(
            f"{BASE_URL}/api/carbon-listings/my",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of listings"
        
        # Find TEST listings created by our tests
        test_listings = [l for l in data if l.get("project_name", "").startswith("TEST")]
        print(f"Found {len(test_listings)} TEST listings for this cooperative")


class TestCarbonListingsStats:
    """Tests for carbon listings statistics endpoint"""
    
    def test_stats_endpoint(self):
        """Test /api/carbon-listings/stats returns proper stats"""
        response = requests.get(f"{BASE_URL}/api/carbon-listings/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "pending" in data
        assert "approved" in data
        assert "rejected" in data
        assert "default_price_per_tonne" in data
        assert "distribution_model" in data
    
    def test_carbon_price_endpoint(self):
        """Test /api/carbon-listings/carbon-price returns price info"""
        response = requests.get(f"{BASE_URL}/api/carbon-listings/carbon-price")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "default_price_per_tonne" in data
        assert "currency" in data
        assert data["currency"] == "XOF"


class TestSimulatePremium:
    """Tests for premium simulation endpoint"""
    
    def test_simulate_premium(self):
        """Test premium simulation endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/carbon-listings/simulate-premium",
            params={"quantity_tonnes": 100}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check distribution breakdown
        assert "total_revenue" in data
        assert "fees" in data
        assert "farmer_premium" in data
        assert "greenlink_revenue" in data
        assert "coop_commission" in data
        assert "net_amount" in data
        
        # Verify calculation logic (30% fees, 70% farmer, 25% greenlink, 5% coop from net)
        assert data["fees_rate"] == 0.30
        assert data["farmer_rate"] == 0.70
        assert data["greenlink_rate"] == 0.25
        assert data["coop_rate"] == 0.05


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
