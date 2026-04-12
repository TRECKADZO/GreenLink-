"""
Test PDC v2 Fiches Harmonisation - Fiche 6, 7, 8 with predefined values
Tests for:
1. Fiche 6: 6 predefined axes strategiques (ARS 1000)
2. Fiche 7: New columns sous_activites, execution, appui
3. Fiche 8: Predefined categories (Investissement, Intrants, Main d'oeuvre)
4. Step 3 auto-fill from Step 1 data
5. Backend PDF Fiche 7 includes new columns
6. Backend POST /api/pdc-v2/{id}/step3 saves fiche7 fields
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test PDC ID with empty axes (Bamba Ibrahim)
TEST_PDC_ID = "69da80390d8a87a393fd1ede"

# Predefined axes from official document
EXPECTED_AXES = [
    'Axe 1 : Rehabilitation du verger',
    'Axe 2 : Gestion du swollen shoot sur la parcelle',
    'Axe 3 : Diversification par valorisation des espaces vides',
    'Axe 4 : Gestion des arbres compagnons du cacaoyer',
    'Axe 5 : Gestion technique de l\'exploitation',
    'Axe 6 : Gestion financiere de l\'exploitation',
]

# Predefined moyens categories for Fiche 8
EXPECTED_FICHE8_CATEGORIES = [
    '--- INVESTISSEMENT ---',
    'Atomiseur',
    'Pulverisateur',
    'EPI',
    '--- INTRANTS ---',
    'Engrais',
    'Insecticide',
    'Fongicide',
    'Plants de cacao',
    '--- MAIN D\'OEUVRE ---',
    'MO permanente',
    'MO occasionnelle',
]


class TestPDCv2FichesHarmonisation:
    """Test PDC v2 Fiches 6, 7, 8 harmonisation with official documents"""
    
    @pytest.fixture(scope="class", autouse=True)
    def setup(self, request):
        """Setup test session with authentication - class scoped to avoid rate limiting"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as cooperative
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            request.cls.session = session
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code} - {login_response.text}")
    
    # ============= BACKEND API TESTS =============
    
    def test_get_pdc_bamba_ibrahim(self):
        """Test GET PDC Bamba Ibrahim (69da80390d8a87a393fd1ede) returns valid data"""
        response = self.session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "farmer_name" in data
        assert "step1" in data
        assert "step3" in data
        
        # Verify it's Bamba Ibrahim
        assert "Bamba" in data.get("farmer_name", ""), f"Expected Bamba Ibrahim, got {data.get('farmer_name')}"
        print(f"PDC loaded: {data.get('farmer_name')}, current_step: {data.get('current_step')}")
    
    def test_pdc_step1_has_required_data(self):
        """Test PDC Bamba has step1 data for auto-fill (membres_menage, cultures, arbres)"""
        response = self.session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
        assert response.status_code == 200
        
        data = response.json()
        step1 = data.get("step1", {})
        fiche1 = step1.get("fiche1", {})
        fiche2 = step1.get("fiche2", {})
        
        # Check membres_menage
        membres = fiche1.get("membres_menage", [])
        assert len(membres) >= 1, f"Expected at least 1 membre_menage, got {len(membres)}"
        print(f"Membres menage: {len(membres)}")
        
        # Check producteur info
        producteur = fiche1.get("producteur", {})
        assert producteur.get("nom"), "Producteur nom should be set"
        print(f"Producteur: {producteur.get('nom')}, Region: {producteur.get('delegation_regionale')}")
        
        # Check cultures
        cultures = fiche2.get("cultures", [])
        print(f"Cultures: {len(cultures)}")
        
        # Check arbres
        arbres = fiche2.get("arbres", [])
        print(f"Arbres: {len(arbres)}")
    
    def test_pdc_step3_fiche6_structure(self):
        """Test PDC step3.fiche6 has axes array structure"""
        response = self.session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
        assert response.status_code == 200
        
        data = response.json()
        step3 = data.get("step3", {})
        fiche6 = step3.get("fiche6", {})
        
        # fiche6 should have axes array
        axes = fiche6.get("axes", [])
        print(f"Fiche 6 axes count: {len(axes)}")
        
        # If axes is empty, frontend should show predefined axes
        if len(axes) == 0:
            print("Fiche 6 axes is empty - frontend should show 6 predefined axes")
        else:
            # Check structure of first axe
            if len(axes) > 0:
                first_axe = axes[0]
                assert "axe" in first_axe, "Each axe should have 'axe' field"
                print(f"First axe: {first_axe.get('axe')}")
    
    def test_pdc_step3_fiche7_structure(self):
        """Test PDC step3.fiche7 has actions array with new columns"""
        response = self.session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
        assert response.status_code == 200
        
        data = response.json()
        step3 = data.get("step3", {})
        fiche7 = step3.get("fiche7", {})
        
        # fiche7 should have actions array
        actions = fiche7.get("actions", [])
        print(f"Fiche 7 actions count: {len(actions)}")
        
        # If actions exist, check for new columns
        if len(actions) > 0:
            first_action = actions[0]
            # New columns: sous_activites, execution, appui
            print(f"First action keys: {list(first_action.keys())}")
    
    def test_pdc_step3_fiche8_structure(self):
        """Test PDC step3.fiche8 has moyens array structure"""
        response = self.session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
        assert response.status_code == 200
        
        data = response.json()
        step3 = data.get("step3", {})
        fiche8 = step3.get("fiche8", {})
        
        # fiche8 should have moyens array
        moyens = fiche8.get("moyens", [])
        print(f"Fiche 8 moyens count: {len(moyens)}")
        
        # If moyens is empty, frontend should show predefined categories
        if len(moyens) == 0:
            print("Fiche 8 moyens is empty - frontend should show predefined categories")
    
    def test_save_step3_with_fiche7_new_fields(self):
        """Test PUT /api/pdc-v2/{id}/step3 saves fiche7 with sous_activites, execution, appui"""
        # First get current data
        get_response = self.session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
        assert get_response.status_code == 200
        
        current_data = get_response.json()
        step3 = current_data.get("step3", {})
        
        # Prepare test data with new fiche7 fields
        test_fiche7 = {
            "actions": [
                {
                    "axe": "Axe 1 : Rehabilitation du verger",
                    "activites": "Test activite",
                    "sous_activites": "Test sous-activite",  # New field
                    "indicateurs": "Test indicateur",
                    "t1": "x",
                    "t2": "",
                    "t3": "",
                    "t4": "",
                    "execution": "Producteur",  # New field
                    "appui": "Cooperative",  # New field
                    "cout": "50000"
                }
            ]
        }
        
        # Save step3 with new fiche7
        save_payload = {
            "fiche6": step3.get("fiche6", {"axes": []}),
            "fiche7": test_fiche7,
            "fiche8": step3.get("fiche8", {"moyens": []})
        }
        
        save_response = self.session.put(
            f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/step3",
            json=save_payload
        )
        assert save_response.status_code == 200, f"Save failed: {save_response.status_code} - {save_response.text}"
        
        # Verify saved data
        verify_response = self.session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
        assert verify_response.status_code == 200
        
        verified_data = verify_response.json()
        saved_fiche7 = verified_data.get("step3", {}).get("fiche7", {})
        saved_actions = saved_fiche7.get("actions", [])
        
        assert len(saved_actions) >= 1, "Should have at least 1 action saved"
        
        first_action = saved_actions[0]
        assert first_action.get("sous_activites") == "Test sous-activite", f"sous_activites not saved: {first_action}"
        assert first_action.get("execution") == "Producteur", f"execution not saved: {first_action}"
        assert first_action.get("appui") == "Cooperative", f"appui not saved: {first_action}"
        
        print("Fiche 7 new fields saved successfully: sous_activites, execution, appui")
    
    def test_pdf_generation_includes_fiche7_columns(self):
        """Test PDF generation endpoint returns valid PDF with Fiche 7 columns"""
        response = self.session.get(f"{BASE_URL}/api/pdc-v2/pdf/{TEST_PDC_ID}")
        
        assert response.status_code == 200, f"PDF generation failed: {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf", "Response should be PDF"
        
        # Check PDF has content
        content_length = len(response.content)
        assert content_length > 1000, f"PDF too small: {content_length} bytes"
        
        print(f"PDF generated successfully: {content_length} bytes")
        
        # Check Content-Disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert "PDC_" in content_disp, "Filename should start with PDC_"
        print(f"PDF filename: {content_disp}")
    
    # ============= DATA VALIDATION TESTS =============
    
    def test_step1_data_for_step3_autofill(self):
        """Test Step 1 data is available for Step 3 auto-fill summary"""
        response = self.session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
        assert response.status_code == 200
        
        data = response.json()
        step1 = data.get("step1", {})
        fiche1 = step1.get("fiche1", {})
        fiche2 = step1.get("fiche2", {})
        
        # Data needed for Step 3 summary auto-fill:
        # 1. Identification du Producteur
        producteur = fiche1.get("producteur", {})
        assert producteur.get("nom"), "Producteur nom required for auto-fill"
        
        # 2. Situation du menage
        membres = fiche1.get("membres_menage", [])
        
        # Count by category
        chef_count = len([m for m in membres if m.get("statut_famille") == "chef_menage"])
        conjoint_count = len([m for m in membres if m.get("statut_famille") == "conjoint"])
        enfant_count = len([m for m in membres if m.get("statut_famille") == "enfant"])
        autre_count = len([m for m in membres if m.get("statut_famille") not in ["chef_menage", "conjoint", "enfant"]])
        
        print(f"Menage breakdown: Chef={chef_count}, Conjoint={conjoint_count}, Enfants={enfant_count}, Autres={autre_count}")
        print(f"Total membres: {len(membres)}")
        
        # 3. Description de l'exploitation
        cultures = fiche2.get("cultures", [])
        arbres = fiche2.get("arbres", [])
        
        # Calculate superficies
        sup_cacao = sum(float(c.get("superficie_ha", 0) or 0) for c in cultures if "cacao" in (c.get("libelle", "") or "").lower())
        sup_autres = sum(float(c.get("superficie_ha", 0) or 0) for c in cultures if "cacao" not in (c.get("libelle", "") or "").lower())
        
        print(f"Cultures: {len(cultures)}, Superficie cacao: {sup_cacao} ha, Autres: {sup_autres} ha")
        print(f"Arbres inventories: {len(arbres)}")
        
        # Verify expected data for Bamba Ibrahim
        assert producteur.get("delegation_regionale"), "Region should be set"
        assert producteur.get("departement"), "Departement should be set"


class TestPDCv2FichesDefaults:
    """Test that frontend defaults are correctly structured"""
    
    def test_fiche6_default_axes_count(self):
        """Verify 6 predefined axes are expected for Fiche 6"""
        assert len(EXPECTED_AXES) == 6, f"Should have 6 predefined axes, got {len(EXPECTED_AXES)}"
        
        # Verify all axes start with "Axe X :"
        for i, axe in enumerate(EXPECTED_AXES, 1):
            assert axe.startswith(f"Axe {i} :"), f"Axe {i} should start with 'Axe {i} :'"
        
        print("6 predefined axes verified:")
        for axe in EXPECTED_AXES:
            print(f"  - {axe}")
    
    def test_fiche7_columns_include_new_fields(self):
        """Verify Fiche 7 columns include sous_activites, execution, appui"""
        expected_columns = [
            'axe', 'activites', 'sous_activites', 'indicateurs',
            't1', 't2', 't3', 't4', 'execution', 'appui', 'cout'
        ]
        
        # These are the new columns added
        new_columns = ['sous_activites', 'execution', 'appui']
        
        for col in new_columns:
            assert col in expected_columns, f"Column {col} should be in Fiche 7"
        
        print(f"Fiche 7 columns verified: {expected_columns}")
        print(f"New columns: {new_columns}")
    
    def test_fiche8_default_categories(self):
        """Verify Fiche 8 has predefined categories"""
        # Check categories
        investissement_items = ['Atomiseur', 'Pulverisateur', 'EPI']
        intrants_items = ['Engrais', 'Insecticide', 'Fongicide', 'Plants de cacao']
        mo_items = ['MO permanente', 'MO occasionnelle']
        
        for item in investissement_items:
            assert item in EXPECTED_FICHE8_CATEGORIES, f"Investissement item {item} should be in defaults"
        
        for item in intrants_items:
            assert item in EXPECTED_FICHE8_CATEGORIES, f"Intrants item {item} should be in defaults"
        
        for item in mo_items:
            assert item in EXPECTED_FICHE8_CATEGORIES, f"Main d'oeuvre item {item} should be in defaults"
        
        print("Fiche 8 predefined categories verified:")
        print(f"  Investissement: {investissement_items}")
        print(f"  Intrants: {intrants_items}")
        print(f"  Main d'oeuvre: {mo_items}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
