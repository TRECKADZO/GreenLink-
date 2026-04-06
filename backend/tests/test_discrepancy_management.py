"""
Test Suite: Gestion des Ecarts (Discrepancy Management)
Tests for discrepancy classification, premium impact, and cooperative dashboard.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_EMAIL = "bielaghana@gmail.com"
COOP_PASSWORD = "test123456"
AGENT_EMAIL = "testagent@test.ci"
AGENT_PASSWORD = "test123456"
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"

# Known discrepancy IDs from context
KNOWN_IMPORTANT_ECART_ID = "69d3e0b2241a91003b526aa3"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def coop_token(api_client):
    """Get cooperative authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Cooperative login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def agent_token(api_client):
    """Get field agent authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": AGENT_EMAIL,
        "password": AGENT_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Agent login failed: {response.status_code} - {response.text}")


class TestDiscrepancyCooperativeEndpoint:
    """Tests for GET /api/ecarts/cooperative"""

    def test_get_cooperative_discrepancies_success(self, api_client, coop_token):
        """Test cooperative can fetch discrepancies with stats"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "ecarts" in data, "Response should contain 'ecarts' list"
        assert "stats" in data, "Response should contain 'stats' object"
        assert "total" in data, "Response should contain 'total' count"
        assert "page" in data, "Response should contain 'page' number"
        assert "pages" in data, "Response should contain 'pages' count"
        
        # Verify stats structure
        stats = data["stats"]
        assert "faible" in stats, "Stats should have 'faible' classification"
        assert "moyen" in stats, "Stats should have 'moyen' classification"
        assert "important" in stats, "Stats should have 'important' classification"
        
        # Each stat should have count and perte_prime
        for classification in ["faible", "moyen", "important"]:
            assert "count" in stats[classification], f"Stats[{classification}] should have 'count'"
            assert "perte_prime" in stats[classification], f"Stats[{classification}] should have 'perte_prime'"
        
        print(f"✓ Cooperative discrepancies fetched: {data['total']} total")
        print(f"  Stats: faible={stats['faible']['count']}, moyen={stats['moyen']['count']}, important={stats['important']['count']}")

    def test_filter_by_classification_important(self, api_client, coop_token):
        """Test filtering discrepancies by 'important' classification"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?classification=important",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        # All returned ecarts should be 'important'
        for ecart in ecarts:
            assert ecart.get("classification_globale") == "important", \
                f"Expected 'important', got '{ecart.get('classification_globale')}'"
        
        print(f"✓ Filter by 'important' works: {len(ecarts)} ecarts returned")

    def test_filter_by_classification_faible(self, api_client, coop_token):
        """Test filtering discrepancies by 'faible' classification"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?classification=faible",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        for ecart in ecarts:
            assert ecart.get("classification_globale") == "faible", \
                f"Expected 'faible', got '{ecart.get('classification_globale')}'"
        
        print(f"✓ Filter by 'faible' works: {len(ecarts)} ecarts returned")

    def test_filter_by_classification_moyen(self, api_client, coop_token):
        """Test filtering discrepancies by 'moyen' classification"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?classification=moyen",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        for ecart in ecarts:
            assert ecart.get("classification_globale") == "moyen", \
                f"Expected 'moyen', got '{ecart.get('classification_globale')}'"
        
        print(f"✓ Filter by 'moyen' works: {len(ecarts)} ecarts returned")

    def test_pagination(self, api_client, coop_token):
        """Test pagination parameters"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?page=1&limit=5",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1
        assert len(data.get("ecarts", [])) <= 5
        
        print(f"✓ Pagination works: page={data['page']}, returned {len(data.get('ecarts', []))} items")

    def test_admin_can_access_all_discrepancies(self, api_client, admin_token):
        """Test admin can access discrepancies (no coop_id filter)"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"✓ Admin can access all discrepancies: {data['total']} total")

    def test_unauthorized_access_denied(self, api_client, agent_token):
        """Test field agent cannot access cooperative discrepancies"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        # Field agents should get 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Field agent correctly denied access to cooperative discrepancies")


class TestDiscrepancyFarmerEndpoint:
    """Tests for GET /api/ecarts/farmer/{farmer_id}"""

    def test_get_farmer_discrepancy_history(self, api_client, coop_token):
        """Test fetching farmer discrepancy history"""
        # First get a farmer_id from existing discrepancies
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?limit=1",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        if not ecarts:
            pytest.skip("No discrepancies found to test farmer history")
        
        farmer_id = ecarts[0].get("farmer_id")
        if not farmer_id:
            pytest.skip("No farmer_id in discrepancy")
        
        # Now fetch farmer history
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/farmer/{farmer_id}",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "historique" in data, "Response should contain 'historique'"
        assert "total" in data, "Response should contain 'total'"
        
        print(f"✓ Farmer discrepancy history fetched: {data['total']} records for farmer {farmer_id}")


class TestDiscrepancyParcelEndpoint:
    """Tests for GET /api/ecarts/parcel/{parcel_id}"""

    def test_get_parcel_discrepancy(self, api_client, coop_token):
        """Test fetching parcel discrepancy details"""
        # First get a parcel_id from existing discrepancies
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?limit=1",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        if not ecarts:
            pytest.skip("No discrepancies found to test parcel endpoint")
        
        parcel_id = ecarts[0].get("parcel_id")
        if not parcel_id:
            pytest.skip("No parcel_id in discrepancy")
        
        # Now fetch parcel discrepancy
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/parcel/{parcel_id}",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "ecart" in data, "Response should contain 'ecart'"
        
        ecart = data["ecart"]
        if ecart:
            assert "ecarts" in ecart, "Ecart should contain 'ecarts' list (field-level discrepancies)"
            assert "classification_globale" in ecart, "Ecart should contain 'classification_globale'"
            assert "impact_prime" in ecart, "Ecart should contain 'impact_prime'"
            print(f"✓ Parcel discrepancy fetched: classification={ecart['classification_globale']}")
        else:
            print("✓ Parcel has no discrepancy (expected for some parcels)")

    def test_parcel_without_discrepancy(self, api_client, coop_token):
        """Test fetching parcel that has no discrepancy"""
        # Use a fake parcel_id
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/parcel/000000000000000000000000",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ecart") is None or data.get("message") == "Aucun ecart enregistre pour cette parcelle"
        print("✓ Non-existent parcel returns null ecart correctly")


class TestDiscrepancyValidation:
    """Tests for PUT /api/ecarts/{id}/validate"""

    def test_validate_discrepancy_accept(self, api_client, coop_token):
        """Test cooperative can validate (accept) a discrepancy"""
        # First get a discrepancy that needs validation
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?limit=10",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        # Find one that's pending validation
        pending = [e for e in ecarts if e.get("statut") in ("en_attente_validation", "verification_renforcee")]
        
        if not pending:
            print("⚠ No pending discrepancies to validate - skipping validation test")
            pytest.skip("No pending discrepancies to validate")
        
        ecart_id = pending[0].get("id")
        
        # Validate it
        response = api_client.put(
            f"{BASE_URL}/api/ecarts/{ecart_id}/validate",
            headers={"Authorization": f"Bearer {coop_token}"},
            json={"action": "valider", "commentaire": "Test validation"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("statut") == "valide", f"Expected 'valide', got '{data.get('statut')}'"
        print(f"✓ Discrepancy {ecart_id} validated successfully")

    def test_validate_invalid_id(self, api_client, coop_token):
        """Test validation with invalid discrepancy ID"""
        response = api_client.put(
            f"{BASE_URL}/api/ecarts/invalid_id/validate",
            headers={"Authorization": f"Bearer {coop_token}"},
            json={"action": "valider"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid ID correctly rejected")

    def test_validate_nonexistent_id(self, api_client, coop_token):
        """Test validation with non-existent discrepancy ID"""
        response = api_client.put(
            f"{BASE_URL}/api/ecarts/000000000000000000000000/validate",
            headers={"Authorization": f"Bearer {coop_token}"},
            json={"action": "valider"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent ID correctly returns 404")


class TestDiscrepancyClassificationEngine:
    """Tests for discrepancy classification logic"""

    def test_ecart_structure_in_response(self, api_client, coop_token):
        """Test that ecart records have correct structure"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?limit=5",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        if not ecarts:
            pytest.skip("No discrepancies to verify structure")
        
        for ecart in ecarts:
            # Required fields
            assert "id" in ecart, "Ecart should have 'id'"
            assert "parcel_id" in ecart, "Ecart should have 'parcel_id'"
            assert "classification_globale" in ecart, "Ecart should have 'classification_globale'"
            assert "ecarts" in ecart, "Ecart should have 'ecarts' (field-level list)"
            assert "impact_prime" in ecart, "Ecart should have 'impact_prime'"
            assert "impact_coefficient" in ecart, "Ecart should have 'impact_coefficient'"
            assert "prime_estimee_avant" in ecart, "Ecart should have 'prime_estimee_avant'"
            assert "prime_estimee_apres" in ecart, "Ecart should have 'prime_estimee_apres'"
            assert "statut" in ecart, "Ecart should have 'statut'"
            
            # Verify classification is valid
            assert ecart["classification_globale"] in ("faible", "moyen", "important"), \
                f"Invalid classification: {ecart['classification_globale']}"
            
            # Verify coefficient matches classification
            expected_coefficients = {"faible": 0.95, "moyen": 0.80, "important": 0.50}
            expected = expected_coefficients.get(ecart["classification_globale"])
            actual = ecart["impact_coefficient"]
            assert actual == expected, f"Expected coefficient {expected} for {ecart['classification_globale']}, got {actual}"
            
            # Verify field-level ecarts structure
            for field_ecart in ecart.get("ecarts", []):
                assert "champ" in field_ecart, "Field ecart should have 'champ'"
                assert "label" in field_ecart, "Field ecart should have 'label'"
                assert "declare" in field_ecart, "Field ecart should have 'declare'"
                assert "mesure" in field_ecart, "Field ecart should have 'mesure'"
                assert "ecart_pct" in field_ecart, "Field ecart should have 'ecart_pct'"
                assert "classification" in field_ecart, "Field ecart should have 'classification'"
        
        print(f"✓ All {len(ecarts)} ecarts have correct structure")

    def test_premium_impact_calculation(self, api_client, coop_token):
        """Test that premium impact is correctly calculated"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?limit=10",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        for ecart in ecarts:
            avant = ecart.get("prime_estimee_avant", 0)
            apres = ecart.get("prime_estimee_apres", 0)
            coeff = ecart.get("impact_coefficient", 1.0)
            
            # Verify: apres ≈ avant * coefficient (with some tolerance for rounding)
            if avant > 0:
                expected_apres = round(avant * coeff, 0)
                # Allow 1 XOF tolerance for rounding
                assert abs(apres - expected_apres) <= 1, \
                    f"Premium calculation error: {avant} * {coeff} = {expected_apres}, got {apres}"
        
        print(f"✓ Premium impact calculations verified for {len(ecarts)} ecarts")


class TestDiscrepancyNotifications:
    """Tests for notification creation on discrepancies"""

    def test_ecart_has_notification_flag(self, api_client, coop_token):
        """Test that ecarts have notification_envoyee flag"""
        response = api_client.get(
            f"{BASE_URL}/api/ecarts/cooperative?limit=5",
            headers={"Authorization": f"Bearer {coop_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        ecarts = data.get("ecarts", [])
        
        for ecart in ecarts:
            assert "notification_envoyee" in ecart, "Ecart should have 'notification_envoyee' flag"
        
        print(f"✓ All ecarts have notification flag")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
