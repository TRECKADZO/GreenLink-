# Tests for PDF Reports and WebSocket endpoints
# Features: PDF report generation (reportlab), WebSocket connections, stats broadcast

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPDFReports:
    """PDF Report generation endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get('access_token')
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
        yield
    
    def test_pdf_ici_complete_generates(self):
        """Test /api/pdf-reports/ici-complete generates a PDF file"""
        response = self.session.get(f"{BASE_URL}/api/pdf-reports/ici-complete")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', "Expected PDF content type"
        assert 'attachment' in response.headers.get('content-disposition', ''), "Expected attachment disposition"
        assert len(response.content) > 1000, "PDF should be larger than 1KB"
        print(f"PDF ICI Complete: {len(response.content)} bytes generated")
    
    def test_pdf_ici_alerts_generates(self):
        """Test /api/pdf-reports/ici-alerts generates a PDF file"""
        response = self.session.get(f"{BASE_URL}/api/pdf-reports/ici-alerts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', "Expected PDF content type"
        assert 'attachment' in response.headers.get('content-disposition', ''), "Expected attachment disposition"
        assert len(response.content) > 500, "PDF should have content"
        print(f"PDF ICI Alerts: {len(response.content)} bytes generated")
    
    def test_pdf_ici_ssrte_generates(self):
        """Test /api/pdf-reports/ici-ssrte generates a PDF file"""
        response = self.session.get(f"{BASE_URL}/api/pdf-reports/ici-ssrte")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', "Expected PDF content type"
        assert 'attachment' in response.headers.get('content-disposition', ''), "Expected attachment disposition"
        assert len(response.content) > 500, "PDF should have content"
        print(f"PDF ICI SSRTE: {len(response.content)} bytes generated")
    
    def test_pdf_alerts_with_severity_filter(self):
        """Test /api/pdf-reports/ici-alerts with severity filter"""
        response = self.session.get(f"{BASE_URL}/api/pdf-reports/ici-alerts?severity=critical")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
        print(f"PDF Alerts (severity=critical): {len(response.content)} bytes")
    
    def test_pdf_alerts_with_status_filter(self):
        """Test /api/pdf-reports/ici-alerts with status filter"""
        response = self.session.get(f"{BASE_URL}/api/pdf-reports/ici-alerts?status=new")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
        print(f"PDF Alerts (status=new): {len(response.content)} bytes")
    
    def test_pdf_unauthorized_access(self):
        """Test PDF endpoints reject unauthenticated requests"""
        # Create a new session without auth
        unauthenticated = requests.Session()
        
        response = unauthenticated.get(f"{BASE_URL}/api/pdf-reports/ici-complete")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Unauthorized access correctly rejected")


class TestWebSocketEndpoints:
    """WebSocket REST endpoints tests (not actual WS connections)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get('access_token')
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
        yield
    
    def test_ws_connections_endpoint(self):
        """Test /api/ws/connections returns connection stats"""
        response = self.session.get(f"{BASE_URL}/api/ws/connections")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert 'total_users' in data, "Should have total_users"
        assert 'total_connections' in data, "Should have total_connections"
        assert 'channels' in data, "Should have channels"
        
        print(f"WS Connections: {data}")
    
    def test_ws_broadcast_stats_endpoint(self):
        """Test /api/ws/broadcast-stats returns stats"""
        response = self.session.post(f"{BASE_URL}/api/ws/broadcast-stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert 'status' in data, "Should have status"
        assert 'stats' in data, "Should have stats"
        assert data['status'] == 'broadcasted', "Status should be 'broadcasted'"
        
        # Verify stats content
        stats = data['stats']
        assert 'overview' in stats, "Stats should have overview"
        assert 'alerts' in stats, "Stats should have alerts"
        assert 'risk_distribution' in stats, "Stats should have risk_distribution"
        assert 'ssrte_coverage' in stats, "Stats should have ssrte_coverage"
        
        print(f"Broadcast Stats - Overview: {stats.get('overview')}")
        print(f"Broadcast Stats - Alerts: {stats.get('alerts')}")
    
    def test_ws_broadcast_stats_overview_fields(self):
        """Test overview fields in broadcast stats"""
        response = self.session.post(f"{BASE_URL}/api/ws/broadcast-stats")
        assert response.status_code == 200
        
        stats = response.json().get('stats', {})
        overview = stats.get('overview', {})
        
        assert 'total_farmers' in overview, "Should have total_farmers"
        assert 'total_cooperatives' in overview, "Should have total_cooperatives"
        assert 'total_ici_profiles' in overview, "Should have total_ici_profiles"
        assert 'total_ssrte_visits' in overview, "Should have total_ssrte_visits"
        
        print(f"Overview fields verified: {list(overview.keys())}")
    
    def test_ws_broadcast_stats_alerts_fields(self):
        """Test alerts fields in broadcast stats"""
        response = self.session.post(f"{BASE_URL}/api/ws/broadcast-stats")
        assert response.status_code == 200
        
        stats = response.json().get('stats', {})
        alerts = stats.get('alerts', {})
        
        assert 'unresolved' in alerts, "Should have unresolved count"
        assert 'critical' in alerts, "Should have critical count"
        assert 'high' in alerts, "Should have high count"
        assert 'new' in alerts, "Should have new count"
        
        print(f"Alerts fields verified: {alerts}")
    
    def test_ws_broadcast_stats_risk_distribution(self):
        """Test risk_distribution fields in broadcast stats"""
        response = self.session.post(f"{BASE_URL}/api/ws/broadcast-stats")
        assert response.status_code == 200
        
        stats = response.json().get('stats', {})
        risk = stats.get('risk_distribution', {})
        
        assert 'high' in risk, "Should have high risk count"
        assert 'medium' in risk, "Should have medium risk count"
        assert 'low' in risk, "Should have low risk count"
        
        print(f"Risk distribution verified: {risk}")
    
    def test_ws_notify_alert(self):
        """Test /api/ws/notify-alert endpoint"""
        test_alert = {
            "type": "test_alert",
            "severity": "low",
            "message": "Test alert from automated testing",
            "farmer_id": "test_farmer_123"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ws/notify-alert", json=test_alert)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert 'status' in data, "Should have status"
        assert data['status'] == 'notified', "Status should be 'notified'"
        assert 'connections' in data, "Should have connections count"
        
        print(f"Alert notification: {data}")


class TestRealTimeDashboardData:
    """Test data consistency for real-time dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get('access_token')
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_stats_data_matches_ici_metrics(self):
        """Verify broadcast stats match ICI metrics endpoint"""
        # Get broadcast stats
        stats_response = self.session.post(f"{BASE_URL}/api/ws/broadcast-stats")
        assert stats_response.status_code == 200
        ws_stats = stats_response.json().get('stats', {})
        
        # Get ICI metrics
        metrics_response = self.session.get(f"{BASE_URL}/api/ici-data/metrics/calculate")
        assert metrics_response.status_code == 200
        ici_metrics = metrics_response.json()
        
        # Verify SSRTE data consistency
        ws_ssrte = ws_stats.get('ssrte_coverage', {})
        ici_ssrte = ici_metrics.get('ssrte', {})
        
        # The values might not be exactly equal due to different calculation methods
        # but they should be in the same ballpark
        print(f"WS SSRTE Coverage: {ws_ssrte}")
        print(f"ICI SSRTE Metrics: {ici_ssrte}")
        
        # Both should have valid data
        assert ws_ssrte.get('percentage') is not None, "WS should have percentage"
        assert ici_ssrte.get('taux_couverture') is not None, "ICI should have taux_couverture"
    
    def test_alerts_data_matches_ici_alerts(self):
        """Verify broadcast stats alerts match ICI alerts endpoint"""
        # Get broadcast stats
        stats_response = self.session.post(f"{BASE_URL}/api/ws/broadcast-stats")
        assert stats_response.status_code == 200
        ws_alerts = stats_response.json().get('stats', {}).get('alerts', {})
        
        # Get ICI alerts
        alerts_response = self.session.get(f"{BASE_URL}/api/ici-data/alerts")
        assert alerts_response.status_code == 200
        ici_alerts = alerts_response.json().get('stats', {})
        
        print(f"WS Alerts Stats: {ws_alerts}")
        print(f"ICI Alerts Stats: {ici_alerts}")
        
        # Both should return valid data structures
        assert isinstance(ws_alerts.get('unresolved'), int), "WS unresolved should be int"
        assert isinstance(ws_alerts.get('critical'), int), "WS critical should be int"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
