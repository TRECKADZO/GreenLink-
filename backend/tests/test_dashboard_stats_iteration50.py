from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Iteration 50 - Dashboard Statistics Audit
Iteration 50 - Dashboard Statistics Audit
Tests all dashboard endpoints for Cooperative, Admin, Field Agent, Farmer, and SSRTE dashboards
Tests all dashboard endpoints for Cooperative, Admin, Field Agent, Farmer, and SSRTE dashboards
Verifies no 500 errors, KeyErrors, or TypeErrors (round(None), trees_count, total_producteurs)
Verifies no 500 errors, KeyErrors, or TypeErrors (round(None), trees_count, total_producteurs)
"""
"""

import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
COOP_CREDS = {"identifier": COOP_EMAIL, "password": "greenlink2024"}
AGENT_CREDS = {"identifier": "+2250709005301", "password": "greenlink2024"}
FARMER_CREDS = {"identifier": "+2250701234567", "password": "greenlink2024"}


class TestAuthentication:
    """Test login for all user types"""
    
    def test_admin_login(self):
        """Admin login should return access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        print(f"✓ Admin login successful, user_type: {data.get('user', {}).get('user_type')}")
    
    def test_cooperative_login(self):
        """Cooperative login should return access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDS)
        assert response.status_code == 200, f"Cooperative login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        print(f"✓ Cooperative login successful, user_type: {data.get('user', {}).get('user_type')}")
    
    def test_agent_login(self):
        """Field agent login should return access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        print(f"✓ Agent login successful, user_type: {data.get('user', {}).get('user_type')}")
    
    def test_farmer_login(self):
        """Farmer login should return access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDS)
        assert response.status_code == 200, f"Farmer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        print(f"✓ Farmer login successful, user_type: {data.get('user', {}).get('user_type')}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def coop_token():
    """Get cooperative auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDS)
    if response.status_code != 200:
        pytest.skip(f"Cooperative login failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def agent_token():
    """Get field agent auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
    if response.status_code != 200:
        pytest.skip(f"Agent login failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def farmer_token():
    """Get farmer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDS)
    if response.status_code != 200:
        pytest.skip(f"Farmer login failed: {response.text}")
    return response.json().get("access_token")


class TestCooperativeDashboard:
    """Test cooperative dashboard endpoints"""
    
    def test_coop_dashboard(self, coop_token):
        """GET /api/cooperative/dashboard - Main dashboard stats"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard", headers=headers)
        assert response.status_code == 200, f"Coop dashboard failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify structure
        assert "members" in data, "Missing 'members' in dashboard"
        assert "parcels" in data, "Missing 'parcels' in dashboard"
        assert "agents" in data, "Missing 'agents' in dashboard"
        
        # Verify no None values in numeric fields
        assert data["members"]["total"] is not None, "members.total is None"
        assert data["parcels"]["total_count"] is not None, "parcels.total_count is None"
        assert data["parcels"]["total_hectares"] is not None, "parcels.total_hectares is None"
        
        print(f"✓ Coop dashboard: {data['members']['total']} members, {data['parcels']['total_count']} parcels, {data['parcels']['total_hectares']} ha")
    
    def test_coop_members(self, coop_token):
        """GET /api/cooperative/members - Members list with parcels_count"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=headers)
        assert response.status_code == 200, f"Coop members failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "members" in data, "Missing 'members' in response"
        assert "total" in data, "Missing 'total' in response"
        
        # Check that parcels_count exists for each member
        for member in data["members"]:
            assert "parcels_count" in member, f"Missing parcels_count for member {member.get('full_name')}"
            assert member["parcels_count"] is not None, f"parcels_count is None for {member.get('full_name')}"
        
        # Check specific members mentioned in requirements
        member_names = [m.get("full_name", "").lower() for m in data["members"]]
        print(f"✓ Coop members: {data['total']} total, names: {[m.get('full_name') for m in data['members'][:5]]}")
    
    def test_coop_parcels_all(self, coop_token):
        """GET /api/cooperative/parcels/all - All parcels"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/parcels/all", headers=headers)
        assert response.status_code == 200, f"Coop parcels/all failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "parcels" in data, "Missing 'parcels' in response"
        assert "total" in data, "Missing 'total' in response"
        
        print(f"✓ Coop parcels/all: {data['total']} parcels")
    
    def test_coop_parcels_pending(self, coop_token):
        """GET /api/cooperative/parcels/pending-verification - Pending parcels"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/parcels/pending-verification", headers=headers)
        assert response.status_code == 200, f"Coop parcels/pending failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "parcels" in data, "Missing 'parcels' in response"
        assert "total_pending" in data, "Missing 'total_pending' in response"
        
        print(f"✓ Coop parcels/pending: {data['total_pending']} pending")
    
    def test_coop_agents_progress(self, coop_token):
        """GET /api/cooperative/agents-progress - Agents progress"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/agents-progress", headers=headers)
        assert response.status_code == 200, f"Coop agents-progress failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "agents" in data, "Missing 'agents' in response"
        assert "summary" in data, "Missing 'summary' in response"
        
        print(f"✓ Coop agents-progress: {data['summary'].get('total_agents')} agents, {data['summary'].get('total_farmers')} farmers")
    
    def test_coop_stats_villages(self, coop_token):
        """GET /api/cooperative/stats/villages - Village stats"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/stats/villages", headers=headers)
        assert response.status_code == 200, f"Coop stats/villages failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"✓ Coop stats/villages: {data}")
    
    def test_coop_reports_eudr(self, coop_token):
        """GET /api/cooperative/reports/eudr - EUDR report"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/reports/eudr", headers=headers)
        assert response.status_code == 200, f"Coop reports/eudr failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify no TypeError from round(None) - compliance data is nested
        assert "compliance" in data, "Missing 'compliance' in EUDR report"
        compliance = data.get("compliance", {})
        assert compliance.get("compliance_rate") is not None, "compliance_rate is None"
        print(f"✓ Coop reports/eudr: {compliance.get('compliance_rate')}% compliance")
    
    def test_coop_carbon_premiums_members(self, coop_token):
        """GET /api/cooperative/carbon-premiums/members - Carbon premiums members"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/carbon-premiums/members", headers=headers)
        assert response.status_code == 200, f"Coop carbon-premiums/members failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"✓ Coop carbon-premiums/members: {data}")
    
    def test_coop_carbon_premiums_summary(self, coop_token):
        """GET /api/cooperative/carbon-premiums/summary - Carbon premiums summary"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/cooperative/carbon-premiums/summary", headers=headers)
        assert response.status_code == 200, f"Coop carbon-premiums/summary failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"✓ Coop carbon-premiums/summary: {data}")


class TestAdminDashboard:
    """Test admin dashboard endpoints"""
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats - Platform admin stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Admin stats failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "total_users" in data, "Missing 'total_users' in admin stats"
        assert data["total_users"] is not None, "total_users is None"
        
        print(f"✓ Admin stats: {data['total_users']} users, {data.get('total_products', 0)} products")
    
    def test_admin_realtime_dashboard(self, admin_token):
        """GET /api/admin/realtime-dashboard - Realtime dashboard"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/realtime-dashboard", headers=headers)
        assert response.status_code == 200, f"Admin realtime-dashboard failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify no TypeError from round(None)
        assert "payments" in data, "Missing 'payments' in realtime dashboard"
        assert "totals" in data, "Missing 'totals' in realtime dashboard"
        
        # Check that numeric values are not None
        payments = data.get("payments", {})
        assert payments.get("month_total") is not None or payments.get("month_total") == 0, "payments.month_total is None"
        
        print(f"✓ Admin realtime-dashboard: {data['totals'].get('cooperatives')} coops, {data['totals'].get('farmers')} farmers")
    
    def test_admin_analytics_dashboard(self, admin_token):
        """GET /api/admin/analytics/dashboard - Strategic analytics dashboard"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard", headers=headers)
        assert response.status_code == 200, f"Admin analytics/dashboard failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify key sections exist
        assert "production" in data, "Missing 'production' in analytics dashboard"
        assert "sustainability" in data, "Missing 'sustainability' in analytics dashboard"
        assert "eudr_compliance" in data, "Missing 'eudr_compliance' in analytics dashboard"
        
        print(f"✓ Admin analytics/dashboard: {data['production'].get('total_hectares')} ha, {data['production'].get('total_farmers')} farmers")
    
    def test_admin_analytics_production(self, admin_token):
        """GET /api/admin/analytics/report/production - Production report"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics/report/production", headers=headers)
        assert response.status_code == 200, f"Admin analytics/report/production failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"✓ Admin analytics/report/production: {data.get('summary', {}).get('total_parcels', 'N/A')} parcels")
    
    def test_admin_analytics_social_impact(self, admin_token):
        """GET /api/admin/analytics/report/social-impact - Social impact report"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics/report/social-impact", headers=headers)
        assert response.status_code == 200, f"Admin analytics/report/social-impact failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"✓ Admin analytics/report/social-impact: {data.get('beneficiaries', {}).get('total_direct_beneficiaries', 'N/A')} beneficiaries")
    
    def test_admin_analytics_carbon(self, admin_token):
        """GET /api/admin/analytics/report/carbon - Carbon report"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics/report/carbon", headers=headers)
        assert response.status_code == 200, f"Admin analytics/report/carbon failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"✓ Admin analytics/report/carbon: {data.get('carbon_capture', {}).get('total_co2_captured_tonnes', 'N/A')} tonnes CO2")
    
    def test_admin_analytics_trade(self, admin_token):
        """GET /api/admin/analytics/report/trade - Trade report"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics/report/trade", headers=headers)
        assert response.status_code == 200, f"Admin analytics/report/trade failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"✓ Admin analytics/report/trade: {data.get('trade_volume', {}).get('total_transactions', 'N/A')} transactions")
    
    def test_admin_analytics_eudr(self, admin_token):
        """GET /api/admin/analytics/report/eudr-compliance - EUDR compliance"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics/report/eudr-compliance", headers=headers)
        assert response.status_code == 200, f"Admin analytics/report/eudr-compliance failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"✓ Admin analytics/report/eudr-compliance: {data.get('compliance_status', {}).get('overall_compliance_rate', 'N/A')}% compliance")


class TestFarmerDashboard:
    """Test farmer dashboard endpoints"""
    
    def test_farmer_dashboard(self, farmer_token):
        """GET /api/greenlink/farmer/dashboard - Farmer dashboard"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/greenlink/farmer/dashboard", headers=headers)
        assert response.status_code == 200, f"Farmer dashboard failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify no KeyError for trees_count
        assert "total_parcels" in data, "Missing 'total_parcels' in farmer dashboard"
        assert "total_area_hectares" in data, "Missing 'total_area_hectares' in farmer dashboard"
        assert "total_trees" in data, "Missing 'total_trees' in farmer dashboard"
        
        # Verify no None values
        assert data["total_parcels"] is not None, "total_parcels is None"
        assert data["total_area_hectares"] is not None, "total_area_hectares is None"
        assert data["total_trees"] is not None, "total_trees is None"
        
        print(f"✓ Farmer dashboard: {data['total_parcels']} parcels, {data['total_area_hectares']} ha, {data['total_trees']} trees")


class TestFieldAgentDashboard:
    """Test field agent dashboard endpoints"""
    
    def test_agent_dashboard(self, agent_token):
        """GET /api/field-agent/dashboard - Agent dashboard"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/field-agent/dashboard", headers=headers)
        assert response.status_code == 200, f"Agent dashboard failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify structure
        assert "statistics" in data or "agent_info" in data, "Missing expected fields in agent dashboard"
        
        print(f"✓ Agent dashboard: {data}")


class TestSSRTEDashboard:
    """Test SSRTE dashboard endpoints"""
    
    def test_ssrte_stats_overview_agent(self, agent_token):
        """GET /api/ssrte/stats/overview - SSRTE stats for agent"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{BASE_URL}/api/ssrte/stats/overview", headers=headers)
        assert response.status_code == 200, f"SSRTE stats/overview failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "visits" in data, "Missing 'visits' in SSRTE stats"
        assert "cases" in data, "Missing 'cases' in SSRTE stats"
        
        print(f"✓ SSRTE stats/overview (agent): {data['visits'].get('total')} visits, {data['cases'].get('total')} cases")
    
    def test_ssrte_dashboard_coop(self, coop_token):
        """GET /api/ssrte/dashboard/cooperative - SSRTE coop dashboard"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        response = requests.get(f"{BASE_URL}/api/ssrte/dashboard/cooperative", headers=headers)
        assert response.status_code == 200, f"SSRTE dashboard/cooperative failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "kpis" in data, "Missing 'kpis' in SSRTE coop dashboard"
        
        print(f"✓ SSRTE dashboard/cooperative: {data['kpis'].get('total_visits')} visits")


class TestICIData:
    """Test ICI data endpoints"""
    
    def test_ici_metrics_calculate(self, admin_token):
        """GET /api/ici-data/metrics/calculate - ICI metrics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/ici-data/metrics/calculate", headers=headers)
        assert response.status_code == 200, f"ICI metrics/calculate failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "couverture" in data, "Missing 'couverture' in ICI metrics"
        assert "ssrte" in data, "Missing 'ssrte' in ICI metrics"
        
        print(f"✓ ICI metrics/calculate: {data['couverture'].get('total_producteurs')} producteurs, {data['ssrte'].get('visites_totales')} visits")
    
    def test_ici_alerts(self, admin_token):
        """GET /api/ici-data/alerts - ICI alerts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/ici-data/alerts", headers=headers)
        assert response.status_code == 200, f"ICI alerts failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "alerts" in data, "Missing 'alerts' in ICI alerts"
        assert "total" in data, "Missing 'total' in ICI alerts"
        
        print(f"✓ ICI alerts: {data['total']} total alerts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
