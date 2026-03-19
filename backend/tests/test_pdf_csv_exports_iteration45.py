"""
PDF and CSV Export Tests - Iteration 45
Testing all PDF/CSV export endpoints for GreenLink cooperative dashboard

Credentials used:
- Cooperative 1 (Alain yao / no members): traore_eric@yahoo.fr / greenlink2024
- Cooperative 2 (COOP-GAGNOA / has members): +2250505000001 / greenlink2024
- Admin: klenakan.eric@gmail.com / 474Treckadzo

Key bugs fixed in this iteration:
1. certifications=None causing join error in EUDR PDF (cooperative.py line 1524)
2. Unicode chars (accents, bullets) in fpdf causing crashes in ICI PDF (ici_pdf_reports.py)
3. Missing generate_ssrte_report method in pdf_service.py
4. Missing ici_pdf_reports router in server.py
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_ALAIN_EMAIL = "traore_eric@yahoo.fr"
COOP_ALAIN_PASSWORD = "greenlink2024"

COOP_GAGNOA_PHONE = "+2250505000001"
COOP_GAGNOA_PASSWORD = "greenlink2024"
COOP_GAGNOA_ID = "69a22d7bf64360df4cbb7acc"

ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"


@pytest.fixture(scope="module")
def coop_alain_token():
    """Get token for Alain yao cooperative (no members)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_ALAIN_EMAIL,
        "password": COOP_ALAIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not login as Alain yao coop: {response.text}")


@pytest.fixture(scope="module")
def coop_gagnoa_token():
    """Get token for COOP-GAGNOA cooperative (has members)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_GAGNOA_PHONE,
        "password": COOP_GAGNOA_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not login as COOP-GAGNOA: {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not login as admin: {response.text}")


class TestCooperativeEUDRPDF:
    """Test EUDR PDF report generation - Bug fix: certifications=None"""

    def test_eudr_pdf_endpoint_returns_pdf(self, coop_alain_token):
        """GET /api/cooperative/reports/eudr/pdf with cooperative token should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/reports/eudr/pdf",
            headers={"Authorization": f"Bearer {coop_alain_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF header starts with %PDF
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), f"Response does not start with %PDF header"
        assert len(pdf_content) > 1000, "PDF content seems too small"
        print(f"✓ EUDR PDF generated successfully: {len(pdf_content)} bytes")


class TestCooperativeCarbonPDF:
    """Test Carbon report PDF generation"""

    def test_carbon_pdf_endpoint_returns_pdf(self, coop_alain_token):
        """GET /api/cooperative/reports/carbon/pdf with cooperative token should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/reports/carbon/pdf",
            headers={"Authorization": f"Bearer {coop_alain_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF header
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ Carbon PDF generated successfully: {len(pdf_content)} bytes")


class TestCarbonPremiumsExports:
    """Test Carbon Premiums report PDF and CSV exports"""

    def test_carbon_premiums_report_pdf(self, coop_alain_token):
        """GET /api/cooperative/carbon-premiums/report-pdf should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-premiums/report-pdf",
            headers={"Authorization": f"Bearer {coop_alain_token}"},
            params={"month": 3, "year": 2026}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ Carbon Premiums PDF generated: {len(pdf_content)} bytes")

    def test_carbon_premiums_export_csv(self, coop_alain_token):
        """GET /api/cooperative/carbon-premiums/export-csv should return valid CSV"""
        response = requests.get(
            f"{BASE_URL}/api/cooperative/carbon-premiums/export-csv",
            headers={"Authorization": f"Bearer {coop_alain_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "text/plain" in content_type, f"Expected CSV, got: {content_type}"
        
        csv_content = response.text
        # CSV should have header row
        assert len(csv_content) > 0, "CSV content is empty"
        print(f"✓ Carbon Premiums CSV exported: {len(csv_content)} chars")


class TestFarmerCardsPDF:
    """Test Farmer cards PDF export - requires cooperative with members"""

    def test_farmer_cards_pdf_with_members(self, coop_gagnoa_token):
        """GET /api/farmer-cards/export-pdf should return valid PDF for cooperative with members"""
        response = requests.get(
            f"{BASE_URL}/api/farmer-cards/export-pdf",
            headers={"Authorization": f"Bearer {coop_gagnoa_token}"},
            params={"cards_per_page": 6}
        )
        
        # Might return 200 or 404 if no members have parcels
        if response.status_code == 404:
            print(f"⚠ Farmer cards PDF: No eligible members found (expected if no member has parcels)")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ Farmer Cards PDF generated: {len(pdf_content)} bytes")


class TestICIPDFReports:
    """Test ICI PDF Reports - Bug fix: Unicode chars causing fpdf crashes"""

    def test_ici_summary_report_pdf(self, admin_token):
        """GET /api/ici-pdf/summary-report should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/ici-pdf/summary-report",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ ICI Summary PDF generated: {len(pdf_content)} bytes")

    def test_ici_cooperative_report_pdf(self, admin_token):
        """GET /api/ici-pdf/cooperative-report/{coop_id} should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/ici-pdf/cooperative-report/{COOP_GAGNOA_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ ICI Cooperative PDF generated: {len(pdf_content)} bytes")

    def test_ici_weekly_report_pdf(self, admin_token):
        """GET /api/ici-pdf/weekly-report should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/ici-pdf/weekly-report",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ ICI Weekly PDF generated: {len(pdf_content)} bytes")


class TestICIExportCSV:
    """Test ICI CSV Exports"""

    def test_ici_alerts_csv(self, admin_token):
        """GET /api/ici-export/alerts/csv should return valid CSV"""
        response = requests.get(
            f"{BASE_URL}/api/ici-export/alerts/csv",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "text/plain" in content_type
        print(f"✓ ICI Alerts CSV exported: {len(response.text)} chars")

    def test_ici_ssrte_visits_csv(self, admin_token):
        """GET /api/ici-export/ssrte-visits/csv should return valid CSV"""
        response = requests.get(
            f"{BASE_URL}/api/ici-export/ssrte-visits/csv",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "text/plain" in content_type
        print(f"✓ ICI SSRTE Visits CSV exported: {len(response.text)} chars")

    def test_ici_profiles_csv(self, admin_token):
        """GET /api/ici-export/profiles/csv should return valid CSV"""
        response = requests.get(
            f"{BASE_URL}/api/ici-export/profiles/csv",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "text/plain" in content_type
        print(f"✓ ICI Profiles CSV exported: {len(response.text)} chars")


class TestSSRTEReports:
    """Test SSRTE PDF and CSV exports - Bug fix: missing generate_ssrte_report method"""

    def test_ssrte_report_pdf(self, admin_token):
        """GET /api/ssrte/reports/pdf/{cooperative_id} should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/reports/pdf/{COOP_GAGNOA_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ SSRTE PDF generated: {len(pdf_content)} bytes")

    def test_ssrte_report_csv(self, admin_token):
        """GET /api/ssrte/reports/csv/{cooperative_id} should return valid CSV"""
        response = requests.get(
            f"{BASE_URL}/api/ssrte/reports/csv/{COOP_GAGNOA_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "text/plain" in content_type
        print(f"✓ SSRTE CSV exported: {len(response.text)} chars")


class TestPDFReportsEndpoints:
    """Test /api/pdf-reports/* endpoints"""

    def test_pdf_reports_ici_complete(self, admin_token):
        """GET /api/pdf-reports/ici-complete should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/pdf-reports/ici-complete",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ PDF Reports ICI Complete: {len(pdf_content)} bytes")

    def test_pdf_reports_ici_alerts(self, admin_token):
        """GET /api/pdf-reports/ici-alerts should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/pdf-reports/ici-alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ PDF Reports ICI Alerts: {len(pdf_content)} bytes")

    def test_pdf_reports_ici_ssrte(self, admin_token):
        """GET /api/pdf-reports/ici-ssrte should return valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/pdf-reports/ici-ssrte",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"✓ PDF Reports ICI SSRTE: {len(pdf_content)} bytes")


class TestLoginRegression:
    """Regression tests for login functionality"""

    def test_login_cooperative_email(self):
        """POST /api/auth/login with cooperative email works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_ALAIN_EMAIL,
            "password": COOP_ALAIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("user_type") == "cooperative"
        print(f"✓ Login with cooperative email works")

    def test_login_cooperative_phone(self):
        """POST /api/auth/login with cooperative phone works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_GAGNOA_PHONE,
            "password": COOP_GAGNOA_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("user_type") == "cooperative"
        print(f"✓ Login with cooperative phone works")

    def test_login_admin(self):
        """POST /api/auth/login with admin email works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("user_type") in ["admin", "super_admin"]
        print(f"✓ Login with admin email works")
