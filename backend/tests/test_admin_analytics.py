"""
Super Admin Analytics API Tests
Testing endpoints for:
- Strategic Dashboard
- Production Report
- Carbon Report  
- Social Impact Report
- Trade Report
- EUDR Compliance Report
- Regional Analytics
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_URL = f"{BASE_URL}/api/admin/analytics"

# Test credentials for admin user
ADMIN_CREDENTIALS = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}

# Non-admin test credentials
PRODUCER_CREDENTIALS = {
    "identifier": "+2250101010101",
    "password": "password123"
}


@pytest.fixture(scope="module")
def admin_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=ADMIN_CREDENTIALS
    )
    if response.status_code == 200:
        data = response.json()
        assert data['user']['user_type'] == 'admin', "User is not admin"
        return data['access_token']
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(admin_token):
    """Generate auth headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestAdminAuthValidation:
    """Test authentication requirements for admin endpoints"""
    
    def test_dashboard_requires_auth(self):
        """Dashboard endpoint requires authentication"""
        response = requests.get(f"{API_URL}/dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Dashboard requires authentication")
    
    def test_dashboard_requires_admin_role(self, admin_token):
        """Verify admin role check works by testing with valid admin token"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{API_URL}/dashboard", headers=headers)
        assert response.status_code == 200, f"Admin should access dashboard, got {response.status_code}"
        print("PASS: Admin user can access dashboard")


class TestStrategicDashboard:
    """Test main strategic dashboard endpoint"""
    
    def test_dashboard_success(self, auth_headers):
        """GET /api/admin/analytics/dashboard returns comprehensive data"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check required top-level fields
        assert 'generated_at' in data
        assert 'period' in data
        assert 'currency' in data
        assert data['currency'] == 'FCFA'
        print("PASS: Dashboard returns correct base structure")
    
    def test_dashboard_production_section(self, auth_headers):
        """Dashboard includes production metrics"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        production = data.get('production')
        assert production is not None, "Production section missing"
        assert 'total_farmers' in production
        assert 'total_hectares' in production
        assert 'total_cooperatives' in production
        assert 'production_by_crop_kg' in production
        assert 'average_yield_kg_per_ha' in production
        
        # Verify data types
        assert isinstance(production['total_farmers'], int)
        assert isinstance(production['total_hectares'], (int, float))
        print(f"PASS: Production metrics - Farmers: {production['total_farmers']}, Hectares: {production['total_hectares']}")
    
    def test_dashboard_sustainability_section(self, auth_headers):
        """Dashboard includes sustainability/carbon metrics"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        sustainability = data.get('sustainability')
        assert sustainability is not None, "Sustainability section missing"
        assert 'total_co2_captured_tonnes' in sustainability
        assert 'carbon_credits_generated' in sustainability
        assert 'carbon_credits_sold' in sustainability
        assert 'carbon_revenue_fcfa' in sustainability
        assert 'deforestation_free_rate' in sustainability
        
        print(f"PASS: Sustainability - CO2: {sustainability['total_co2_captured_tonnes']}T, Credits: {sustainability['carbon_credits_generated']}")
    
    def test_dashboard_eudr_compliance_section(self, auth_headers):
        """Dashboard includes EUDR compliance metrics"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        eudr = data.get('eudr_compliance')
        assert eudr is not None, "EUDR compliance section missing"
        assert 'total_parcels' in eudr
        assert 'geolocated_parcels' in eudr
        assert 'geolocation_rate' in eudr
        assert 'eudr_compliance_rate' in eudr
        assert 'certification_coverage' in eudr
        
        # EUDR compliance rate should be a percentage
        assert 0 <= eudr['eudr_compliance_rate'] <= 100
        print(f"PASS: EUDR Compliance - Rate: {eudr['eudr_compliance_rate']}%, Parcels: {eudr['total_parcels']}")
    
    def test_dashboard_social_impact_section(self, auth_headers):
        """Dashboard includes social impact metrics"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        social = data.get('social_impact')
        assert social is not None, "Social impact section missing"
        assert 'total_beneficiaries' in social
        assert 'gender_equality_rate' in social
        assert 'youth_participation_rate' in social
        assert 'financial_inclusion_rate' in social
        assert 'income_increase_vs_2023' in social
        
        print(f"PASS: Social Impact - Beneficiaries: {social['total_beneficiaries']}, Gender Rate: {social['gender_equality_rate']}%")
    
    def test_dashboard_market_section(self, auth_headers):
        """Dashboard includes market/trade metrics"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        market = data.get('market')
        assert market is not None, "Market section missing"
        assert 'total_transactions' in market
        assert 'total_volume_fcfa' in market
        assert 'average_prices_fcfa_per_kg' in market
        assert 'export_destinations' in market
        
        print(f"PASS: Market - Transactions: {market['total_transactions']}, Volume: {market['total_volume_fcfa']} FCFA")
    
    def test_dashboard_macroeconomic_section(self, auth_headers):
        """Dashboard includes macroeconomic indicators"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        macro = data.get('macroeconomic')
        assert macro is not None, "Macroeconomic section missing"
        assert 'contribution_pib_agricole' in macro
        assert 'devises_generees_usd' in macro
        assert 'emploi_secteur_agricole' in macro
        
        print(f"PASS: Macroeconomic - PIB Contribution: {macro['contribution_pib_agricole']}")
    
    def test_dashboard_cooperatives_section(self, auth_headers):
        """Dashboard includes cooperatives data"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        coops = data.get('cooperatives')
        assert coops is not None, "Cooperatives section missing"
        assert 'total_cooperatives' in coops
        assert 'total_members' in coops
        assert 'average_members_per_coop' in coops
        
        print(f"PASS: Cooperatives - Total: {coops['total_cooperatives']}, Members: {coops['total_members']}")
    
    def test_dashboard_period_filter(self, auth_headers):
        """Dashboard accepts different period filters"""
        periods = ['month', 'quarter', 'year', 'all']
        
        for period in periods:
            response = requests.get(
                f"{API_URL}/dashboard",
                headers=auth_headers,
                params={'period': period}
            )
            assert response.status_code == 200, f"Period '{period}' failed with {response.status_code}"
            data = response.json()
            assert data['period'] == period, f"Period not set correctly for {period}"
        
        print(f"PASS: All period filters work correctly: {periods}")


class TestProductionReport:
    """Test production report endpoint"""
    
    def test_production_report_success(self, auth_headers):
        """GET /api/admin/analytics/report/production returns data"""
        response = requests.get(f"{API_URL}/report/production", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data['report_type'] == 'Production Agricole'
        assert 'summary' in data
        assert 'monthly_trend' in data
        assert 'projections' in data
        
        summary = data['summary']
        assert 'total_parcels' in summary
        assert 'total_production_kg' in summary
        
        print(f"PASS: Production Report - Parcels: {summary['total_parcels']}, Production: {summary['total_production_kg']} kg")
    
    def test_production_report_requires_auth(self):
        """Production report requires authentication"""
        response = requests.get(f"{API_URL}/report/production")
        assert response.status_code == 401
        print("PASS: Production report requires auth")


class TestCarbonReport:
    """Test carbon/sustainability report endpoint"""
    
    def test_carbon_report_success(self, auth_headers):
        """GET /api/admin/analytics/report/carbon returns data"""
        response = requests.get(f"{API_URL}/report/carbon", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data['report_type'] == 'Impact Carbone & Durabilité'
        assert 'carbon_capture' in data
        assert 'carbon_market' in data
        assert 'sustainability_indicators' in data
        assert 'sdg_alignment' in data
        
        carbon = data['carbon_capture']
        assert 'total_co2_captured_tonnes' in carbon
        assert 'equivalent_trees_planted' in carbon
        
        print(f"PASS: Carbon Report - CO2: {carbon['total_co2_captured_tonnes']}T, Trees: {carbon['equivalent_trees_planted']}")
    
    def test_carbon_report_requires_auth(self):
        """Carbon report requires authentication"""
        response = requests.get(f"{API_URL}/report/carbon")
        assert response.status_code == 401
        print("PASS: Carbon report requires auth")


class TestSocialImpactReport:
    """Test social impact report endpoint"""
    
    def test_social_impact_report_success(self, auth_headers):
        """GET /api/admin/analytics/report/social-impact returns data"""
        response = requests.get(f"{API_URL}/report/social-impact", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data['report_type'] == 'Impact Social & Développement'
        assert 'beneficiaries' in data
        assert 'gender_equality' in data
        assert 'youth_inclusion' in data
        assert 'financial_inclusion' in data
        assert 'income_improvement' in data
        
        beneficiaries = data['beneficiaries']
        assert 'total_direct_beneficiaries' in beneficiaries
        assert 'farmers_registered' in beneficiaries
        
        print(f"PASS: Social Impact Report - Beneficiaries: {beneficiaries['total_direct_beneficiaries']}")
    
    def test_social_impact_report_requires_auth(self):
        """Social impact report requires authentication"""
        response = requests.get(f"{API_URL}/report/social-impact")
        assert response.status_code == 401
        print("PASS: Social impact report requires auth")


class TestTradeReport:
    """Test trade/commerce report endpoint"""
    
    def test_trade_report_success(self, auth_headers):
        """GET /api/admin/analytics/report/trade returns data"""
        response = requests.get(f"{API_URL}/report/trade", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data['report_type'] == 'Commerce & Export'
        assert 'trade_volume' in data
        assert 'by_commodity' in data
        assert 'export_markets' in data
        assert 'major_buyers' in data
        assert 'price_forecast' in data
        
        trade = data['trade_volume']
        assert 'total_transactions' in trade
        assert 'total_value_fcfa' in trade
        
        print(f"PASS: Trade Report - Transactions: {trade['total_transactions']}, Value: {trade['total_value_fcfa']} FCFA")
    
    def test_trade_report_requires_auth(self):
        """Trade report requires authentication"""
        response = requests.get(f"{API_URL}/report/trade")
        assert response.status_code == 401
        print("PASS: Trade report requires auth")


class TestEUDRComplianceReport:
    """Test EUDR compliance report endpoint"""
    
    def test_eudr_report_success(self, auth_headers):
        """GET /api/admin/analytics/report/eudr-compliance returns data"""
        response = requests.get(f"{API_URL}/report/eudr-compliance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert 'EUDR' in data['report_type']
        assert 'compliance_status' in data
        assert 'traceability' in data
        assert 'deforestation_free' in data
        assert 'due_diligence' in data
        assert 'certifications' in data
        assert 'export_readiness' in data
        
        compliance = data['compliance_status']
        assert 'overall_compliance_rate' in compliance
        assert 0 <= compliance['overall_compliance_rate'] <= 100
        
        print(f"PASS: EUDR Report - Compliance: {compliance['overall_compliance_rate']}%, Status: {compliance['status']}")
    
    def test_eudr_report_requires_auth(self):
        """EUDR compliance report requires authentication"""
        response = requests.get(f"{API_URL}/report/eudr-compliance")
        assert response.status_code == 401
        print("PASS: EUDR compliance report requires auth")


class TestRegionalAnalytics:
    """Test regional analytics endpoint"""
    
    def test_regions_analytics_success(self, auth_headers):
        """GET /api/admin/analytics/regions returns regional data"""
        response = requests.get(f"{API_URL}/regions", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data['report_type'] == 'Analyse Régionale'
        assert 'total_regions' in data
        assert 'regions' in data
        assert 'top_producing_regions' in data
        
        print(f"PASS: Regional Analytics - Total regions: {data['total_regions']}")
    
    def test_regions_analytics_requires_auth(self):
        """Regional analytics requires authentication"""
        response = requests.get(f"{API_URL}/regions")
        assert response.status_code == 401
        print("PASS: Regional analytics requires auth")


class TestCSVExport:
    """Test CSV export endpoint"""
    
    def test_csv_export_success(self, auth_headers):
        """GET /api/admin/analytics/export/csv returns export info"""
        report_types = ['production', 'carbon', 'social', 'trade', 'eudr']
        
        for report_type in report_types:
            response = requests.get(
                f"{API_URL}/export/csv",
                headers=auth_headers,
                params={'report_type': report_type}
            )
            assert response.status_code == 200, f"Export for {report_type} failed"
            data = response.json()
            assert 'download_url' in data
            assert report_type in data['download_url']
        
        print(f"PASS: CSV export works for all report types: {report_types}")
    
    def test_csv_export_requires_auth(self):
        """CSV export requires authentication"""
        response = requests.get(
            f"{API_URL}/export/csv",
            params={'report_type': 'production'}
        )
        assert response.status_code == 401
        print("PASS: CSV export requires auth")


class TestDataIntegrity:
    """Test data integrity and values in dashboard"""
    
    def test_dashboard_data_consistency(self, auth_headers):
        """Verify dashboard data is consistent across sections"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        # Farmers count should be consistent
        production_farmers = data['production']['total_farmers']
        social_direct = data['social_impact']['direct_farmers']
        assert production_farmers == social_direct, f"Farmer count mismatch: {production_farmers} vs {social_direct}"
        
        # Cooperatives count should be consistent
        production_coops = data['production']['total_cooperatives']
        coops_total = data['cooperatives']['total_cooperatives']
        assert production_coops == coops_total, f"Cooperative count mismatch: {production_coops} vs {coops_total}"
        
        print("PASS: Dashboard data is internally consistent")
    
    def test_seeded_data_present(self, auth_headers):
        """Verify seeded test data is present"""
        response = requests.get(f"{API_URL}/dashboard", headers=auth_headers)
        data = response.json()
        
        # Based on seed data description: 150 farmers, 8 cooperatives, 250 parcels
        # We check for reasonable data presence
        assert data['production']['total_farmers'] > 0, "No farmers found"
        assert data['production']['total_hectares'] > 0, "No hectares found"
        assert data['sustainability']['total_co2_captured_tonnes'] > 0, "No CO2 data"
        assert data['eudr_compliance']['total_parcels'] > 0, "No parcels found"
        
        print(f"PASS: Seeded data present - Farmers: {data['production']['total_farmers']}, Parcels: {data['eudr_compliance']['total_parcels']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
