from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
ARS 1000 - PDF Generation & Smart Recommendations Testing
ARS 1000 - PDF Generation & Smart Recommendations Testing
Iteration 117 - GreenLink Agritech
Iteration 117 - GreenLink Agritech


Tests:
Tests:
1. POST /api/ars1000/agroforesterie/recommandations - Smart tree recommendation from raw data
1. POST /api/ars1000/agroforesterie/recommandations - Smart tree recommendation from raw data
2. GET /api/ars1000/agroforesterie/recommandations/farmer/{farmer_id} - Smart tree recommendation for a specific farmer
2. GET /api/ars1000/agroforesterie/recommandations/farmer/{farmer_id} - Smart tree recommendation for a specific farmer
3. GET /api/ars1000/pdf/pdc/{pdc_id} - Generate PDC PDF (10 pages ARS 1000 format)
3. GET /api/ars1000/pdf/pdc/{pdc_id} - Generate PDC PDF (10 pages ARS 1000 format)
4. GET /api/ars1000/pdf/rapport-essai/{lot_id} - Generate rapport d'essai PDF (ARS 1000-2)
4. GET /api/ars1000/pdf/rapport-essai/{lot_id} - Generate rapport d'essai PDF (ARS 1000-2)
5. GET /api/ars1000/pdf/tracabilite/{lot_id} - Generate traceability sheet PDF
5. GET /api/ars1000/pdf/tracabilite/{lot_id} - Generate traceability sheet PDF
"""
"""

import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pdc-cocoa-preview.preview.emergentagent.com')

# Test credentials
COOPERATIVE_CREDS = {"identifier": COOP_EMAIL, "password": "test123456"}
AGENT_CREDS = {"identifier": "testagent@test.ci", "password": "test123456"}
FARMER_CREDS = {"identifier": "testplanteur@test.ci", "password": "test123456"}


class TestARS1000PDFAndRecommendations:
    """Test ARS 1000 PDF generation and smart recommendations"""
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
        if response.status_code == 429:
            pytest.skip("Rate limited - restart backend to clear")
        assert response.status_code == 200, f"Cooperative login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
        if response.status_code == 429:
            pytest.skip("Rate limited - restart backend to clear")
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        """Get farmer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FARMER_CREDS)
        if response.status_code == 429:
            pytest.skip("Rate limited - restart backend to clear")
        assert response.status_code == 200, f"Farmer login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def test_pdc_id(self, cooperative_token):
        """Get or create a test PDC for PDF generation"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        # First try to get existing PDCs
        response = requests.get(f"{BASE_URL}/api/ars1000/pdc/cooperative/all", headers=headers)
        if response.status_code == 200:
            pdcs = response.json().get("pdcs", [])
            if pdcs:
                return pdcs[0].get("id")
        
        # If no PDCs exist, create one via agent-visit
        agent_response = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
        if agent_response.status_code != 200:
            pytest.skip("Cannot get agent token to create test PDC")
        agent_token = agent_response.json().get("access_token")
        
        pdc_data = {
            "farmer_id": "TEST_FARMER_PDF_117",
            "identification": {
                "nom": "TEST_PDF",
                "prenoms": "Planteur",
                "telephone": "+2250101010101",
                "village": "Test Village",
                "region": "Test Region"
            },
            "menage": {"taille_menage": 5, "nombre_enfants": 2},
            "parcelles": [{"nom_parcelle": "Parcelle Test", "superficie_ha": 2.5}],
            "arbres_ombrage": {
                "nombre_total": 75,
                "densite_par_ha": 30,
                "especes": ["Fraké", "Iroko", "Avocatier"],
                "strate_haute": 20,
                "strate_moyenne": 30,
                "strate_basse": 25
            },
            "materiel_agricole": {"outils": ["machette", "sécateur"]},
            "matrice_strategique": {"objectif_rendement_kg_ha": 800}
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/ars1000/pdc/agent-visit",
            headers={"Authorization": f"Bearer {agent_token}", "Content-Type": "application/json"},
            json=pdc_data
        )
        
        if create_response.status_code in [200, 201]:
            return create_response.json().get("id")
        
        pytest.skip("Cannot create test PDC for PDF generation")
    
    @pytest.fixture(scope="class")
    def test_lot_id(self, cooperative_token):
        """Get or create a test lot for PDF generation"""
        headers = {"Authorization": f"Bearer {cooperative_token}", "Content-Type": "application/json"}
        
        # First try to get existing lots
        response = requests.get(f"{BASE_URL}/api/ars1000/lots", headers=headers)
        if response.status_code == 200:
            lots = response.json().get("lots", [])
            if lots:
                return lots[0].get("id")
        
        # Create a test lot
        lot_data = {
            "poids_total_kg": 500,
            "origine_village": "Test Village PDF",
            "campagne": "2024-2025",
            "segregation_physique": True,
            "controles_qualite": {
                "humidite": {"taux_humidite": 7.5},
                "tamisage": {"taux_debris": 1.0},
                "corps_etrangers": {"taux_corps_etrangers": 0.5},
                "epreuve_coupe": {
                    "nombre_feves": 300,
                    "moisies_pct": 0.8,
                    "ardoisees_pct": 2.5,
                    "insectes_germees_pct": 3.0
                },
                "fermentation": {"type_fermentation": "bonne"}
            }
        }
        
        create_response = requests.post(f"{BASE_URL}/api/ars1000/lots", headers=headers, json=lot_data)
        if create_response.status_code in [200, 201]:
            return create_response.json().get("id")
        
        pytest.skip("Cannot create test lot for PDF generation")
    
    # ============= SMART RECOMMENDATIONS TESTS =============
    
    def test_recommandations_post_raw_data(self, cooperative_token):
        """Test POST /api/ars1000/agroforesterie/recommandations with raw data"""
        headers = {"Authorization": f"Bearer {cooperative_token}", "Content-Type": "application/json"}
        
        # Test with non-conformant data (low density, few species)
        data = {
            "parcelle": {"superficie_ha": 3.0},
            "arbres": {
                "nombre_total": 45,  # 15/ha - below minimum 25/ha
                "especes": ["Fraké"],  # Only 1 species - below minimum 3
                "densite_par_ha": 15,
                "strate_haute": 5,
                "strate_moyenne": 0,
                "strate_basse": 0
            },
            "inventaire": []
        }
        
        response = requests.post(f"{BASE_URL}/api/ars1000/agroforesterie/recommandations", headers=headers, json=data)
        
        assert response.status_code == 200, f"Recommandations POST failed: {response.text}"
        result = response.json()
        
        # Verify response structure
        assert "diagnostic" in result, "Missing diagnostic in response"
        assert "recommendations" in result, "Missing recommendations in response"
        assert "plan_plantation" in result, "Missing plan_plantation in response"
        assert "projection" in result, "Missing projection in response"
        
        # Verify recommendations are generated for non-conformant data
        assert len(result["recommendations"]) > 0, "Should have recommendations for non-conformant data"
        
        # Verify projection data
        projection = result["projection"]
        assert "densite_actuelle" in projection
        assert "densite_projetee" in projection
        assert "score_actuel" in projection
        assert "score_projete" in projection
        
        print(f"PASSED: Recommandations POST - {len(result['recommendations'])} recommendations generated")
        print(f"  - Current density: {projection['densite_actuelle']}/ha")
        print(f"  - Projected density: {projection['densite_projetee']}/ha")
        print(f"  - Trees to plant: {result.get('total_arbres_a_planter', 0)}")
    
    def test_recommandations_post_conformant_data(self, cooperative_token):
        """Test POST /api/ars1000/agroforesterie/recommandations with conformant data"""
        headers = {"Authorization": f"Bearer {cooperative_token}", "Content-Type": "application/json"}
        
        # Test with conformant data
        data = {
            "parcelle": {"superficie_ha": 2.0},
            "arbres": {
                "nombre_total": 60,  # 30/ha - within 25-40 range
                "especes": ["Fraké", "Iroko", "Avocatier", "Manguier"],  # 4 species - above minimum 3
                "densite_par_ha": 30,
                "strate_haute": 15,
                "strate_moyenne": 25,
                "strate_basse": 20
            },
            "inventaire": []
        }
        
        response = requests.post(f"{BASE_URL}/api/ars1000/agroforesterie/recommandations", headers=headers, json=data)
        
        assert response.status_code == 200, f"Recommandations POST failed: {response.text}"
        result = response.json()
        
        # Verify diagnostic shows conformant
        diagnostic = result.get("diagnostic", {})
        assert diagnostic.get("score", 0) >= 60, "Conformant data should have high score"
        
        print(f"PASSED: Recommandations POST (conformant) - Score: {diagnostic.get('score')}%")
    
    def test_recommandations_farmer_endpoint(self, cooperative_token, test_pdc_id):
        """Test GET /api/ars1000/agroforesterie/recommandations/farmer/{farmer_id}"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        # First get a farmer_id from an existing PDC
        response = requests.get(f"{BASE_URL}/api/ars1000/pdc/cooperative/all", headers=headers)
        if response.status_code != 200:
            pytest.skip("Cannot get PDCs to find farmer_id")
        
        pdcs = response.json().get("pdcs", [])
        if not pdcs:
            pytest.skip("No PDCs available to test farmer recommendations")
        
        farmer_id = pdcs[0].get("farmer_id")
        if not farmer_id:
            pytest.skip("PDC has no farmer_id")
        
        # Test the farmer recommendations endpoint
        rec_response = requests.get(
            f"{BASE_URL}/api/ars1000/agroforesterie/recommandations/farmer/{farmer_id}",
            headers=headers
        )
        
        assert rec_response.status_code == 200, f"Farmer recommendations failed: {rec_response.text}"
        result = rec_response.json()
        
        # Verify response structure
        assert "diagnostic" in result, "Missing diagnostic"
        assert "recommendations" in result, "Missing recommendations"
        assert "farmer_id" in result, "Missing farmer_id"
        assert "pdc_id" in result, "Missing pdc_id"
        
        print(f"PASSED: Farmer recommendations - farmer_id: {farmer_id}")
        print(f"  - Score: {result.get('diagnostic', {}).get('score', 0)}%")
        print(f"  - Recommendations: {len(result.get('recommendations', []))}")
    
    def test_recommandations_farmer_not_found(self, cooperative_token):
        """Test GET /api/ars1000/agroforesterie/recommandations/farmer/{invalid_id} returns 404"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/ars1000/agroforesterie/recommandations/farmer/NONEXISTENT_FARMER_ID",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404 for nonexistent farmer, got {response.status_code}"
        print("PASSED: Farmer recommendations returns 404 for nonexistent farmer")
    
    # ============= PDF GENERATION TESTS =============
    
    def test_pdf_pdc_generation(self, cooperative_token, test_pdc_id):
        """Test GET /api/ars1000/pdf/pdc/{pdc_id} - Generate PDC PDF"""
        if not test_pdc_id:
            pytest.skip("No test PDC available")
        
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/pdc/{test_pdc_id}", headers=headers)
        
        assert response.status_code == 200, f"PDC PDF generation failed: {response.status_code} - {response.text}"
        
        # Verify it's a PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content-type, got: {content_type}"
        
        # Verify content-disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Missing attachment disposition"
        assert ".pdf" in content_disp, "Missing .pdf in filename"
        
        # Verify PDF content (starts with %PDF)
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        # Verify reasonable size (should be at least a few KB for 10 pages)
        assert len(response.content) > 5000, f"PDF too small: {len(response.content)} bytes"
        
        print(f"PASSED: PDC PDF generation - {len(response.content)} bytes")
        print(f"  - Content-Type: {content_type}")
        print(f"  - Filename: {content_disp}")
    
    def test_pdf_pdc_invalid_id(self, cooperative_token):
        """Test GET /api/ars1000/pdf/pdc/{invalid_id} returns 400"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/pdc/invalid_id", headers=headers)
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
        print("PASSED: PDC PDF returns 400 for invalid ID")
    
    def test_pdf_pdc_not_found(self, cooperative_token):
        """Test GET /api/ars1000/pdf/pdc/{nonexistent_id} returns 404"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        # Use a valid ObjectId format but nonexistent
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/pdc/507f1f77bcf86cd799439011", headers=headers)
        
        assert response.status_code == 404, f"Expected 404 for nonexistent PDC, got {response.status_code}"
        print("PASSED: PDC PDF returns 404 for nonexistent PDC")
    
    def test_pdf_rapport_essai_generation(self, cooperative_token, test_lot_id):
        """Test GET /api/ars1000/pdf/rapport-essai/{lot_id} - Generate rapport d'essai PDF"""
        if not test_lot_id:
            pytest.skip("No test lot available")
        
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/rapport-essai/{test_lot_id}", headers=headers)
        
        assert response.status_code == 200, f"Rapport essai PDF generation failed: {response.status_code} - {response.text}"
        
        # Verify it's a PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content-type, got: {content_type}"
        
        # Verify content-disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Missing attachment disposition"
        assert "Rapport_Essai" in content_disp, "Missing Rapport_Essai in filename"
        
        # Verify PDF content
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"PASSED: Rapport Essai PDF generation - {len(response.content)} bytes")
    
    def test_pdf_rapport_essai_invalid_id(self, cooperative_token):
        """Test GET /api/ars1000/pdf/rapport-essai/{invalid_id} returns 400"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/rapport-essai/invalid_id", headers=headers)
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
        print("PASSED: Rapport Essai PDF returns 400 for invalid ID")
    
    def test_pdf_rapport_essai_not_found(self, cooperative_token):
        """Test GET /api/ars1000/pdf/rapport-essai/{nonexistent_id} returns 404"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/rapport-essai/507f1f77bcf86cd799439011", headers=headers)
        
        assert response.status_code == 404, f"Expected 404 for nonexistent lot, got {response.status_code}"
        print("PASSED: Rapport Essai PDF returns 404 for nonexistent lot")
    
    def test_pdf_tracabilite_generation(self, cooperative_token, test_lot_id):
        """Test GET /api/ars1000/pdf/tracabilite/{lot_id} - Generate traceability sheet PDF"""
        if not test_lot_id:
            pytest.skip("No test lot available")
        
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/tracabilite/{test_lot_id}", headers=headers)
        
        assert response.status_code == 200, f"Tracabilite PDF generation failed: {response.status_code} - {response.text}"
        
        # Verify it's a PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content-type, got: {content_type}"
        
        # Verify content-disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Missing attachment disposition"
        assert "Tracabilite" in content_disp, "Missing Tracabilite in filename"
        
        # Verify PDF content
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"PASSED: Tracabilite PDF generation - {len(response.content)} bytes")
    
    def test_pdf_tracabilite_invalid_id(self, cooperative_token):
        """Test GET /api/ars1000/pdf/tracabilite/{invalid_id} returns 400"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/tracabilite/invalid_id", headers=headers)
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
        print("PASSED: Tracabilite PDF returns 400 for invalid ID")
    
    def test_pdf_tracabilite_not_found(self, cooperative_token):
        """Test GET /api/ars1000/pdf/tracabilite/{nonexistent_id} returns 404"""
        headers = {"Authorization": f"Bearer {cooperative_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/tracabilite/507f1f77bcf86cd799439011", headers=headers)
        
        assert response.status_code == 404, f"Expected 404 for nonexistent lot, got {response.status_code}"
        print("PASSED: Tracabilite PDF returns 404 for nonexistent lot")
    
    # ============= AUTH TESTS =============
    
    def test_pdf_requires_auth(self):
        """Test that PDF endpoints require authentication"""
        # Test without auth header
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/pdc/507f1f77bcf86cd799439011")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/rapport-essai/507f1f77bcf86cd799439011")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        response = requests.get(f"{BASE_URL}/api/ars1000/pdf/tracabilite/507f1f77bcf86cd799439011")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print("PASSED: All PDF endpoints require authentication")
    
    def test_recommandations_requires_auth(self):
        """Test that recommendations endpoints require authentication"""
        # Test POST without auth
        response = requests.post(
            f"{BASE_URL}/api/ars1000/agroforesterie/recommandations",
            json={"parcelle": {}, "arbres": {}}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # Test GET farmer without auth
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/recommandations/farmer/test")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print("PASSED: All recommendations endpoints require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
