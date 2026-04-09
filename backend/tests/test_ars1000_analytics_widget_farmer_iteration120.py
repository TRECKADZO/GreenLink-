"""
Iteration 120 - ARS 1000 Analytics, Widget, Farmer Features Testing
Tests for:
1. GET /api/ars1000/recoltes/analytics - Analytics dashboard for harvests
2. GET /api/ars1000/certification/dashboard - Widget data (total_pdc, pdc_valides, total_kg_recoltes)
3. POST /api/ars1000/certification/reclamation - Farmer can submit reclamations
4. GET /api/ars1000/certification/reclamations/farmer - Farmer-specific reclamations
5. POST /api/ars1000/agroforesterie/protection-env - Farmer can add protection measures
6. GET /api/ars1000/agroforesterie/protection-env - Filters by farmer_id for farmer users
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cocoa-agritech.preview.emergentagent.com')

# Test credentials
COOPERATIVE_EMAIL = "bielaghana@gmail.com"
COOPERATIVE_PASSWORD = "test123456"
FARMER_EMAIL = "testplanteur@test.ci"
FARMER_PASSWORD = "test123456"


class TestARS1000AnalyticsWidgetFarmer:
    """Test suite for ARS 1000 Analytics, Widget, and Farmer features"""
    
    coop_token = None
    farmer_token = None
    test_reclamation_id = None
    test_protection_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for tests"""
        if not TestARS1000AnalyticsWidgetFarmer.coop_token:
            TestARS1000AnalyticsWidgetFarmer.coop_token = self._login(COOPERATIVE_EMAIL, COOPERATIVE_PASSWORD)
        if not TestARS1000AnalyticsWidgetFarmer.farmer_token:
            TestARS1000AnalyticsWidgetFarmer.farmer_token = self._login(FARMER_EMAIL, FARMER_PASSWORD)
    
    def _login(self, email, password):
        """Helper to login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": email, "password": password},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        elif response.status_code == 429:
            pytest.skip("Rate limited - restart backend to clear")
        return None
    
    def _coop_headers(self):
        return {"Authorization": f"Bearer {self.coop_token}", "Content-Type": "application/json"}
    
    def _farmer_headers(self):
        return {"Authorization": f"Bearer {self.farmer_token}", "Content-Type": "application/json"}
    
    # ============= ANALYTICS ENDPOINT TESTS =============
    
    def test_01_analytics_endpoint_returns_expected_structure(self):
        """GET /api/ars1000/recoltes/analytics - Returns volume_par_campagne, qualite_par_parcelle, distribution_grades, evolution_mensuelle, top_planteurs"""
        if not self.coop_token:
            pytest.skip("Cooperative login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/analytics",
            headers=self._coop_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all expected keys are present
        assert "volume_par_campagne" in data, "Missing volume_par_campagne"
        assert "qualite_par_parcelle" in data, "Missing qualite_par_parcelle"
        assert "distribution_grades" in data, "Missing distribution_grades"
        assert "evolution_mensuelle" in data, "Missing evolution_mensuelle"
        assert "top_planteurs" in data, "Missing top_planteurs"
        
        # Verify data types
        assert isinstance(data["volume_par_campagne"], list), "volume_par_campagne should be a list"
        assert isinstance(data["qualite_par_parcelle"], list), "qualite_par_parcelle should be a list"
        assert isinstance(data["distribution_grades"], list), "distribution_grades should be a list"
        assert isinstance(data["evolution_mensuelle"], list), "evolution_mensuelle should be a list"
        assert isinstance(data["top_planteurs"], list), "top_planteurs should be a list"
        
        print(f"Analytics endpoint returned: {len(data['volume_par_campagne'])} campaigns, {len(data['distribution_grades'])} grades, {len(data['top_planteurs'])} top farmers")
    
    def test_02_analytics_volume_par_campagne_structure(self):
        """Verify volume_par_campagne has correct fields"""
        if not self.coop_token:
            pytest.skip("Cooperative login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/analytics",
            headers=self._coop_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["volume_par_campagne"]:
            item = data["volume_par_campagne"][0]
            assert "campagne" in item, "Missing campagne field"
            assert "total_kg" in item, "Missing total_kg field"
            assert "count" in item, "Missing count field"
            print(f"Volume par campagne sample: {item}")
    
    def test_03_analytics_distribution_grades_structure(self):
        """Verify distribution_grades has correct fields"""
        if not self.coop_token:
            pytest.skip("Cooperative login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/analytics",
            headers=self._coop_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["distribution_grades"]:
            item = data["distribution_grades"][0]
            assert "grade" in item, "Missing grade field"
            assert "count" in item, "Missing count field"
            assert "total_kg" in item, "Missing total_kg field"
            print(f"Distribution grades sample: {item}")
    
    # ============= CERTIFICATION DASHBOARD (WIDGET) TESTS =============
    
    def test_04_certification_dashboard_returns_widget_data(self):
        """GET /api/ars1000/certification/dashboard - Returns total_pdc, pdc_valides, total_kg_recoltes for widget"""
        if not self.coop_token:
            pytest.skip("Cooperative login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/certification/dashboard",
            headers=self._coop_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify widget-specific fields
        assert "total_pdc" in data, "Missing total_pdc for widget"
        assert "pdc_valides" in data, "Missing pdc_valides for widget"
        assert "total_kg_recoltes" in data, "Missing total_kg_recoltes for widget"
        
        # Verify certification object
        assert "certification" in data, "Missing certification object"
        cert = data["certification"]
        assert "niveau" in cert, "Missing niveau in certification"
        assert "pourcentage_conformite_global" in cert, "Missing pourcentage_conformite_global"
        
        print(f"Widget data: total_pdc={data['total_pdc']}, pdc_valides={data['pdc_valides']}, total_kg_recoltes={data['total_kg_recoltes']}")
        print(f"Certification niveau: {cert['niveau']}, conformite: {cert['pourcentage_conformite_global']}%")
    
    def test_05_certification_dashboard_stats_structure(self):
        """Verify stats object in certification dashboard"""
        if not self.coop_token:
            pytest.skip("Cooperative login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/certification/dashboard",
            headers=self._coop_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data, "Missing stats object"
        stats = data["stats"]
        
        # Verify stats fields
        expected_stats = ["total_pdcs", "pdc_valides", "conformite_ars1", "total_lots", "conformite_ars2", "conformite_global", "total_arbres_ombrage", "nombre_especes", "nc_ouvertes", "total_kg_recoltes"]
        for field in expected_stats:
            assert field in stats, f"Missing {field} in stats"
        
        print(f"Stats: {stats}")
    
    # ============= FARMER RECLAMATION TESTS =============
    
    def test_06_farmer_can_submit_reclamation(self):
        """POST /api/ars1000/certification/reclamation - Farmer role can submit"""
        if not self.farmer_token:
            pytest.skip("Farmer login failed")
        
        reclamation_data = {
            "objet": "TEST_Reclamation_Farmer_Iteration120",
            "description": "Test reclamation submitted by farmer for iteration 120 testing",
            "plaignant": "Producteur",
            "priorite": "moyenne"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ars1000/certification/reclamation",
            json=reclamation_data,
            headers=self._farmer_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Missing message in response"
        assert "reclamation" in data, "Missing reclamation in response"
        
        rec = data["reclamation"]
        assert rec["objet"] == reclamation_data["objet"], "Objet mismatch"
        assert rec["source"] == "agriculteur", "Source should be 'agriculteur' for farmer"
        assert "farmer_id" in rec, "Missing farmer_id"
        assert rec["farmer_id"] != "", "farmer_id should not be empty"
        
        TestARS1000AnalyticsWidgetFarmer.test_reclamation_id = rec.get("id")
        print(f"Farmer reclamation created: id={rec.get('id')}, source={rec['source']}")
    
    def test_07_farmer_can_get_own_reclamations(self):
        """GET /api/ars1000/certification/reclamations/farmer - Returns farmer-specific reclamations"""
        if not self.farmer_token:
            pytest.skip("Farmer login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/certification/reclamations/farmer",
            headers=self._farmer_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "reclamations" in data, "Missing reclamations in response"
        assert isinstance(data["reclamations"], list), "reclamations should be a list"
        
        # Check if our test reclamation is in the list
        if self.test_reclamation_id:
            found = any(r.get("id") == self.test_reclamation_id for r in data["reclamations"])
            assert found, "Test reclamation not found in farmer's reclamations"
        
        print(f"Farmer has {len(data['reclamations'])} reclamations")
    
    # ============= FARMER PROTECTION ENVIRONNEMENTALE TESTS =============
    
    def test_08_farmer_can_add_protection_env(self):
        """POST /api/ars1000/agroforesterie/protection-env - Farmer can add with farmer_id and parcelle_nom"""
        if not self.farmer_token:
            pytest.skip("Farmer login failed")
        
        protection_data = {
            "type_protection": "cours_eau",
            "description": "TEST_Protection_Iteration120 - Bande enherbée le long du cours d'eau",
            "parcelle_nom": "Parcelle Test Iteration 120",
            "mesures_prises": ["Bande enherbée", "Haie vive"],
            "distance_cours_eau_m": 15.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ars1000/agroforesterie/protection-env",
            json=protection_data,
            headers=self._farmer_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "Missing id in response"
        assert "message" in data, "Missing message in response"
        assert "conforme_distance_eau" in data, "Missing conforme_distance_eau"
        
        # Distance >= 10m should be conforme
        assert data["conforme_distance_eau"] == True, "Distance 15m should be conforme"
        
        TestARS1000AnalyticsWidgetFarmer.test_protection_id = data["id"]
        print(f"Protection env created: id={data['id']}, conforme={data['conforme_distance_eau']}")
    
    def test_09_farmer_can_get_own_protection_env(self):
        """GET /api/ars1000/agroforesterie/protection-env - Filters by farmer_id for farmer users"""
        if not self.farmer_token:
            pytest.skip("Farmer login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/agroforesterie/protection-env",
            headers=self._farmer_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "mesures" in data, "Missing mesures in response"
        assert "total" in data, "Missing total in response"
        assert "par_type" in data, "Missing par_type in response"
        
        assert isinstance(data["mesures"], list), "mesures should be a list"
        
        # Check if our test protection is in the list
        if self.test_protection_id:
            # Note: The endpoint returns mesures without _id, so we check by description
            found = any("TEST_Protection_Iteration120" in (m.get("description", "") or "") for m in data["mesures"])
            assert found, "Test protection not found in farmer's mesures"
        
        print(f"Farmer has {data['total']} protection measures, par_type: {data['par_type']}")
    
    def test_10_protection_env_non_conforme_distance(self):
        """POST /api/ars1000/agroforesterie/protection-env - Distance < 10m returns non conforme"""
        if not self.farmer_token:
            pytest.skip("Farmer login failed")
        
        protection_data = {
            "type_protection": "cours_eau",
            "description": "TEST_Protection_NonConforme_Iteration120 - Distance insuffisante",
            "parcelle_nom": "Parcelle Test Non Conforme",
            "distance_cours_eau_m": 5.0  # Less than 10m
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ars1000/agroforesterie/protection-env",
            json=protection_data,
            headers=self._farmer_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Distance < 10m should be non conforme
        assert data["conforme_distance_eau"] == False, "Distance 5m should be non conforme"
        print(f"Non-conforme protection created: conforme={data['conforme_distance_eau']}")
    
    def test_11_protection_env_reforestation_type(self):
        """POST /api/ars1000/agroforesterie/protection-env - Reforestation type with especes_plantees"""
        if not self.farmer_token:
            pytest.skip("Farmer login failed")
        
        protection_data = {
            "type_protection": "reforestation",
            "description": "TEST_Reforestation_Iteration120 - Plantation d'arbres",
            "parcelle_nom": "Parcelle Reforestation Test",
            "superficie_reboisee_ha": 0.5,
            "especes_plantees": ["Fraké", "Iroko", "Teck"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ars1000/agroforesterie/protection-env",
            json=protection_data,
            headers=self._farmer_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "Missing id in response"
        # Reforestation type should not have conforme_distance_eau
        assert data.get("conforme_distance_eau") is None, "Reforestation should not have conforme_distance_eau"
        print(f"Reforestation protection created: id={data['id']}")
    
    # ============= COOPERATIVE ACCESS TESTS =============
    
    def test_12_cooperative_can_access_analytics(self):
        """Cooperative can access analytics endpoint"""
        if not self.coop_token:
            pytest.skip("Cooperative login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/analytics",
            headers=self._coop_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("Cooperative can access analytics endpoint")
    
    def test_13_farmer_can_access_analytics(self):
        """Farmer can access analytics endpoint (filtered to their data)"""
        if not self.farmer_token:
            pytest.skip("Farmer login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/analytics",
            headers=self._farmer_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Farmer should not see top_planteurs (only for coop/admin)
        # But the endpoint should still return the key (empty list for farmers)
        assert "top_planteurs" in data
        print(f"Farmer analytics: {len(data.get('volume_par_campagne', []))} campaigns")
    
    # ============= DATA VALIDATION TESTS =============
    
    def test_14_analytics_evolution_mensuelle_structure(self):
        """Verify evolution_mensuelle has correct fields"""
        if not self.coop_token:
            pytest.skip("Cooperative login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/analytics",
            headers=self._coop_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["evolution_mensuelle"]:
            item = data["evolution_mensuelle"][0]
            assert "mois" in item, "Missing mois field"
            assert "total_kg" in item, "Missing total_kg field"
            assert "count" in item, "Missing count field"
            assert "avg_qualite" in item, "Missing avg_qualite field"
            print(f"Evolution mensuelle sample: {item}")
    
    def test_15_analytics_top_planteurs_structure(self):
        """Verify top_planteurs has correct fields (for cooperative)"""
        if not self.coop_token:
            pytest.skip("Cooperative login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/recoltes/analytics",
            headers=self._coop_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["top_planteurs"]:
            item = data["top_planteurs"][0]
            assert "nom" in item, "Missing nom field"
            assert "total_kg" in item, "Missing total_kg field"
            assert "count" in item, "Missing count field"
            assert "avg_qualite" in item, "Missing avg_qualite field"
            print(f"Top planteurs sample: {item}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
