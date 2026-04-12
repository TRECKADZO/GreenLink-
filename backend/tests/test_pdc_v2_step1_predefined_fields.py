"""
Test PDC v2 Step 1 - Predefined Fields for Fiches 2, 3, 4
GreenLink Agritech - Iteration 138

Tests:
1. Backend accepts new fields: carres_comptage, sol_elements, new maladies structure
2. Backend saves and returns these fields correctly
3. Verify data persistence with GET after PUT
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment or test_credentials.md
COOP_EMAIL = os.environ.get("TEST_COOP_EMAIL", "bielaghana@gmail.com")
COOP_PASSWORD = os.environ.get("TEST_COOP_PASSWORD", "test123456")

# Module-level session to avoid rate limiting
_session = None
_token = None
_test_pdc_id = None


def get_authenticated_session():
    """Get or create authenticated session (singleton to avoid rate limiting)"""
    global _session, _token
    
    if _session is not None and _token is not None:
        return _session
    
    _session = requests.Session()
    _session.headers.update({"Content-Type": "application/json"})
    
    login_resp = _session.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    
    if login_resp.status_code != 200:
        raise Exception(f"Login failed: {login_resp.text}")
    
    _token = login_resp.json().get("access_token")
    _session.headers.update({"Authorization": f"Bearer {_token}"})
    
    return _session


def get_or_create_test_pdc():
    """Get or create a test PDC (singleton)"""
    global _test_pdc_id
    
    if _test_pdc_id:
        return _test_pdc_id
    
    session = get_authenticated_session()
    
    # Get available members
    members_resp = session.get(f"{BASE_URL}/api/pdc-v2/members/available")
    if members_resp.status_code != 200 or not members_resp.json():
        return None
    
    members = members_resp.json()
    if not members:
        return None
    
    farmer_id = members[0]["id"]
    
    # Create PDC
    create_resp = session.post(f"{BASE_URL}/api/pdc-v2", json={"farmer_id": farmer_id})
    if create_resp.status_code == 409:
        return None  # PDC already exists
    
    if create_resp.status_code == 200:
        _test_pdc_id = create_resp.json()["id"]
        return _test_pdc_id
    
    return None


class TestPDCv2Step1PredefinedFields:
    """Test PDC v2 Step 1 predefined fields for Fiches 2, 3, 4"""
    
    def test_01_get_existing_pdc_structure(self):
        """Test: Verify existing PDC structure has step1 with fiche3 fields"""
        session = get_authenticated_session()
        
        # Use existing PDC Bamba Ibrahim
        pdc_id = "69da80390d8a87a393fd1ede"
        resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert resp.status_code == 200, f"Failed to get PDC: {resp.text}"
        
        pdc = resp.json()
        assert "step1" in pdc, "PDC should have step1"
        assert "fiche3" in pdc["step1"], "step1 should have fiche3"
        
        fiche3 = pdc["step1"]["fiche3"]
        print(f"Fiche3 keys: {list(fiche3.keys())}")
        print(f"carres_comptage present: {'carres_comptage' in fiche3}")
        print(f"sol_elements present: {'sol_elements' in fiche3}")
        print(f"maladies present: {'maladies' in fiche3}")
    
    def test_02_backend_accepts_carres_comptage(self):
        """Test: Backend accepts carres_comptage field in fiche3"""
        session = get_authenticated_session()
        pdc_id = get_or_create_test_pdc()
        
        if not pdc_id:
            pytest.skip("No test PDC available")
        
        # Prepare carres_comptage data (16 rows with 4 columns)
        carres_comptage = [
            {"numero": i+1, "carre1": str(i+1), "carre2": str(i+2), "carre3": str(i+3), "carre4": str(i+4)}
            for i in range(16)
        ]
        
        fiche3_data = {
            "etat_cacaoyere": {"ombrage": "moyen", "canopee": "normal"},
            "carres_comptage": carres_comptage,
            "maladies": [],
            "etat_sol": {"position": "plateau"},
            "sol_elements": [],
            "recolte_post_recolte": {},
            "engrais": [],
            "phytosanitaires": [],
            "gestion_emballages": ""
        }
        
        save_resp = session.put(f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1", json={
            "fiche3": fiche3_data
        })
        assert save_resp.status_code == 200, f"Failed to save step1: {save_resp.text}"
        
        # Verify data persisted
        get_resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert get_resp.status_code == 200
        
        saved_fiche3 = get_resp.json()["step1"]["fiche3"]
        assert "carres_comptage" in saved_fiche3, "carres_comptage should be saved"
        assert len(saved_fiche3["carres_comptage"]) == 16, "Should have 16 carres"
        assert saved_fiche3["carres_comptage"][0]["numero"] == 1, "First carre should be numero 1"
        print("carres_comptage saved and retrieved successfully")
    
    def test_03_backend_accepts_sol_elements(self):
        """Test: Backend accepts sol_elements field in fiche3"""
        session = get_authenticated_session()
        pdc_id = get_or_create_test_pdc()
        
        if not pdc_id:
            pytest.skip("No test PDC available")
        
        # Prepare sol_elements data (3 predefined rows)
        sol_elements = [
            {"element": "Existence de zones erodees", "valeur": "oui", "observations": "Test obs 1"},
            {"element": "Existence de zones a risque d'erosion", "valeur": "non", "observations": ""},
            {"element": "Hydromorphie", "valeur": "oui", "observations": "Zone humide"}
        ]
        
        fiche3_data = {
            "etat_cacaoyere": {"ombrage": "faible"},
            "etat_sol": {"position": "haut_pente"},
            "sol_elements": sol_elements,
            "maladies": [],
            "recolte_post_recolte": {},
            "engrais": [],
            "phytosanitaires": [],
            "gestion_emballages": ""
        }
        
        save_resp = session.put(f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1", json={
            "fiche3": fiche3_data
        })
        assert save_resp.status_code == 200, f"Failed to save: {save_resp.text}"
        
        # Verify
        get_resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert get_resp.status_code == 200
        
        saved_fiche3 = get_resp.json()["step1"]["fiche3"]
        assert "sol_elements" in saved_fiche3, "sol_elements should be saved"
        assert len(saved_fiche3["sol_elements"]) == 3, "Should have 3 sol elements"
        assert saved_fiche3["sol_elements"][0]["element"] == "Existence de zones erodees"
        print("sol_elements saved and retrieved successfully")
    
    def test_04_backend_accepts_new_maladies_structure(self):
        """Test: Backend accepts new maladies structure with maladie/severite/obs_maladie/parametre/valeur/obs_parametre"""
        session = get_authenticated_session()
        pdc_id = get_or_create_test_pdc()
        
        if not pdc_id:
            pytest.skip("No test PDC available")
        
        # New maladies structure (6 predefined rows)
        maladies = [
            {"maladie": "Attaques de mirides", "severite": "2", "obs_maladie": "Faible", "parametre": "Presence de gourmands", "valeur": "3", "obs_parametre": "Moyen"},
            {"maladie": "Attaques de Pourriture Brune", "severite": "1", "obs_maladie": "", "parametre": "Presence de cabosses momifiees", "valeur": "2", "obs_parametre": ""},
            {"maladie": "Attaques de punaises", "severite": "3", "obs_maladie": "Moyen", "parametre": "Presence de plantes epiphytes", "valeur": "1", "obs_parametre": ""},
            {"maladie": "Attaque CSSVD", "severite": "1", "obs_maladie": "", "parametre": "Enherbement", "valeur": "4", "obs_parametre": "Fort"},
            {"maladie": "Attaque Foreurs", "severite": "2", "obs_maladie": "", "parametre": "Presence de loranthus", "valeur": "2", "obs_parametre": ""},
            {"maladie": "Autres (precisez)", "severite": "", "obs_maladie": "", "parametre": "Autres (precisez)", "valeur": "", "obs_parametre": ""}
        ]
        
        fiche3_data = {
            "etat_cacaoyere": {"ombrage": "dense", "canopee": "peu_degrade"},
            "maladies": maladies,
            "etat_sol": {"position": "mi_versant"},
            "sol_elements": [],
            "recolte_post_recolte": {},
            "engrais": [],
            "phytosanitaires": [],
            "gestion_emballages": ""
        }
        
        save_resp = session.put(f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1", json={
            "fiche3": fiche3_data
        })
        assert save_resp.status_code == 200, f"Failed to save: {save_resp.text}"
        
        # Verify
        get_resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert get_resp.status_code == 200
        
        saved_fiche3 = get_resp.json()["step1"]["fiche3"]
        assert "maladies" in saved_fiche3, "maladies should be saved"
        assert len(saved_fiche3["maladies"]) == 6, "Should have 6 maladies"
        
        # Verify new structure keys
        first_maladie = saved_fiche3["maladies"][0]
        assert "maladie" in first_maladie, "Should have 'maladie' key (not 'type')"
        assert "severite" in first_maladie, "Should have 'severite' key"
        assert "obs_maladie" in first_maladie, "Should have 'obs_maladie' key"
        assert "parametre" in first_maladie, "Should have 'parametre' key"
        assert "valeur" in first_maladie, "Should have 'valeur' key"
        assert "obs_parametre" in first_maladie, "Should have 'obs_parametre' key"
        
        assert first_maladie["maladie"] == "Attaques de mirides"
        print("New maladies structure saved and retrieved successfully")
    
    def test_05_fiche2_materiels_16_types(self):
        """Test: Backend accepts fiche2 materiels with 16 predefined equipment types"""
        session = get_authenticated_session()
        pdc_id = get_or_create_test_pdc()
        
        if not pdc_id:
            pytest.skip("No test PDC available")
        
        # 16 predefined materiels
        materiels = [
            {"type": "traitement", "designation": "Pulverisateur", "quantite": "2", "annee_acquisition": "2020", "cout": "50000", "etat_bon": "1", "etat_acceptable": "1", "etat_mauvais": "0"},
            {"type": "traitement", "designation": "Atomiseur", "quantite": "1", "annee_acquisition": "2021", "cout": "150000", "etat_bon": "1", "etat_acceptable": "0", "etat_mauvais": "0"},
            {"type": "traitement", "designation": "EPI", "quantite": "3", "annee_acquisition": "2022", "cout": "25000", "etat_bon": "2", "etat_acceptable": "1", "etat_mauvais": "0"},
            {"type": "transport", "designation": "Tricycle", "quantite": "", "annee_acquisition": "", "cout": "", "etat_bon": "", "etat_acceptable": "", "etat_mauvais": ""},
            {"type": "transport", "designation": "Brouette", "quantite": "2", "annee_acquisition": "2019", "cout": "30000", "etat_bon": "1", "etat_acceptable": "1", "etat_mauvais": "0"},
            {"type": "transport", "designation": "Camion/camionnette", "quantite": "", "annee_acquisition": "", "cout": "", "etat_bon": "", "etat_acceptable": "", "etat_mauvais": ""},
            {"type": "deplacement", "designation": "Velo", "quantite": "1", "annee_acquisition": "2018", "cout": "50000", "etat_bon": "0", "etat_acceptable": "1", "etat_mauvais": "0"},
            {"type": "deplacement", "designation": "Moto", "quantite": "1", "annee_acquisition": "2020", "cout": "800000", "etat_bon": "1", "etat_acceptable": "0", "etat_mauvais": "0"},
            {"type": "deplacement", "designation": "Voiture", "quantite": "", "annee_acquisition": "", "cout": "", "etat_bon": "", "etat_acceptable": "", "etat_mauvais": ""},
            {"type": "sechage", "designation": "Claie/seco", "quantite": "4", "annee_acquisition": "2021", "cout": "20000", "etat_bon": "3", "etat_acceptable": "1", "etat_mauvais": "0"},
            {"type": "sechage", "designation": "Aire cimentee", "quantite": "1", "annee_acquisition": "2015", "cout": "500000", "etat_bon": "1", "etat_acceptable": "0", "etat_mauvais": "0"},
            {"type": "sechage", "designation": "Sechoir solaire", "quantite": "", "annee_acquisition": "", "cout": "", "etat_bon": "", "etat_acceptable": "", "etat_mauvais": ""},
            {"type": "fermentation", "designation": "Bac de fermentation", "quantite": "2", "annee_acquisition": "2020", "cout": "100000", "etat_bon": "2", "etat_acceptable": "0", "etat_mauvais": "0"},
            {"type": "outillage", "designation": "Machette, emondoir", "quantite": "5", "annee_acquisition": "2022", "cout": "15000", "etat_bon": "3", "etat_acceptable": "2", "etat_mauvais": "0"},
            {"type": "outillage", "designation": "Materiel de recolte", "quantite": "3", "annee_acquisition": "2021", "cout": "25000", "etat_bon": "2", "etat_acceptable": "1", "etat_mauvais": "0"},
            {"type": "outillage", "designation": "Tronconneuse", "quantite": "1", "annee_acquisition": "2019", "cout": "250000", "etat_bon": "0", "etat_acceptable": "1", "etat_mauvais": "0"},
        ]
        
        fiche2_data = {
            "coordonnees_gps": {"waypoint_o": "W001", "n": "N001"},
            "carte_parcelle": {"polygon": [], "arbres_ombrage": []},
            "cultures": [],
            "materiels": materiels,
            "arbres": []
        }
        
        save_resp = session.put(f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1", json={
            "fiche2": fiche2_data
        })
        assert save_resp.status_code == 200, f"Failed to save: {save_resp.text}"
        
        # Verify
        get_resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert get_resp.status_code == 200
        
        saved_fiche2 = get_resp.json()["step1"]["fiche2"]
        assert "materiels" in saved_fiche2, "materiels should be saved"
        assert len(saved_fiche2["materiels"]) == 16, "Should have 16 materiels"
        
        # Verify designations
        designations = [m["designation"] for m in saved_fiche2["materiels"]]
        assert "Pulverisateur" in designations
        assert "Atomiseur" in designations
        assert "EPI" in designations
        assert "Tronconneuse" in designations
        print("16 predefined materiels saved and retrieved successfully")
    
    def test_06_fiche4_epargne_4_types(self):
        """Test: Backend accepts fiche4 epargne with 4 predefined types"""
        session = get_authenticated_session()
        pdc_id = get_or_create_test_pdc()
        
        if not pdc_id:
            pytest.skip("No test PDC available")
        
        # 4 predefined epargne types
        epargne = [
            {"type": "mobile_money", "a_compte": "oui", "argent_compte": "oui", "financement": "non", "montant_financement": ""},
            {"type": "microfinance", "a_compte": "non", "argent_compte": "", "financement": "", "montant_financement": ""},
            {"type": "banque", "a_compte": "oui", "argent_compte": "non", "financement": "oui", "montant_financement": "500000"},
            {"type": "autre", "a_compte": "non", "argent_compte": "", "financement": "", "montant_financement": ""}
        ]
        
        fiche4_data = {
            "epargne": epargne,
            "production_cacao": [],
            "autres_revenus": [],
            "depenses": [],
            "main_oeuvre": []
        }
        
        save_resp = session.put(f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1", json={
            "fiche4": fiche4_data
        })
        assert save_resp.status_code == 200, f"Failed to save: {save_resp.text}"
        
        # Verify
        get_resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert get_resp.status_code == 200
        
        saved_fiche4 = get_resp.json()["step1"]["fiche4"]
        assert "epargne" in saved_fiche4, "epargne should be saved"
        assert len(saved_fiche4["epargne"]) == 4, "Should have 4 epargne types"
        
        types = [e["type"] for e in saved_fiche4["epargne"]]
        assert "mobile_money" in types
        assert "microfinance" in types
        assert "banque" in types
        assert "autre" in types
        print("4 predefined epargne types saved and retrieved successfully")
    
    def test_07_fiche4_production_cacao_3_years(self):
        """Test: Backend accepts fiche4 production_cacao with 3 predefined years"""
        session = get_authenticated_session()
        pdc_id = get_or_create_test_pdc()
        
        if not pdc_id:
            pytest.skip("No test PDC available")
        
        # 3 predefined years (N-1, N-2, N-3)
        current_year = datetime.now().year
        production_cacao = [
            {"annee": str(current_year - 1), "production_kg": "1500", "revenu_brut": "1500000"},
            {"annee": str(current_year - 2), "production_kg": "1200", "revenu_brut": "1200000"},
            {"annee": str(current_year - 3), "production_kg": "1000", "revenu_brut": "1000000"}
        ]
        
        fiche4_data = {
            "epargne": [],
            "production_cacao": production_cacao,
            "autres_revenus": [],
            "depenses": [],
            "main_oeuvre": []
        }
        
        save_resp = session.put(f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1", json={
            "fiche4": fiche4_data
        })
        assert save_resp.status_code == 200, f"Failed to save: {save_resp.text}"
        
        # Verify
        get_resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert get_resp.status_code == 200
        
        saved_fiche4 = get_resp.json()["step1"]["fiche4"]
        assert "production_cacao" in saved_fiche4, "production_cacao should be saved"
        assert len(saved_fiche4["production_cacao"]) == 3, "Should have 3 years"
        
        years = [p["annee"] for p in saved_fiche4["production_cacao"]]
        assert str(current_year - 1) in years, f"Should have year {current_year - 1}"
        assert str(current_year - 2) in years, f"Should have year {current_year - 2}"
        assert str(current_year - 3) in years, f"Should have year {current_year - 3}"
        print("3 predefined production years saved and retrieved successfully")
    
    def test_08_fiche4_depenses_7_types(self):
        """Test: Backend accepts fiche4 depenses with 7 predefined types"""
        session = get_authenticated_session()
        pdc_id = get_or_create_test_pdc()
        
        if not pdc_id:
            pytest.skip("No test PDC available")
        
        # 7 predefined depenses types
        depenses = [
            {"depense": "Scolarite", "periodicite": "annee", "montant_moyen_an": "500000"},
            {"depense": "Nourriture", "periodicite": "mois", "montant_moyen_an": "1200000"},
            {"depense": "Sante", "periodicite": "annee", "montant_moyen_an": "200000"},
            {"depense": "Electricite", "periodicite": "trimestre", "montant_moyen_an": "120000"},
            {"depense": "Eau courante", "periodicite": "mois", "montant_moyen_an": "60000"},
            {"depense": "Funerailles", "periodicite": "annee", "montant_moyen_an": "100000"},
            {"depense": "Mariage, bapteme", "periodicite": "annee", "montant_moyen_an": "150000"}
        ]
        
        fiche4_data = {
            "epargne": [],
            "production_cacao": [],
            "autres_revenus": [],
            "depenses": depenses,
            "main_oeuvre": []
        }
        
        save_resp = session.put(f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1", json={
            "fiche4": fiche4_data
        })
        assert save_resp.status_code == 200, f"Failed to save: {save_resp.text}"
        
        # Verify
        get_resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert get_resp.status_code == 200
        
        saved_fiche4 = get_resp.json()["step1"]["fiche4"]
        assert "depenses" in saved_fiche4, "depenses should be saved"
        assert len(saved_fiche4["depenses"]) == 7, "Should have 7 depenses types"
        
        depense_names = [d["depense"] for d in saved_fiche4["depenses"]]
        assert "Scolarite" in depense_names
        assert "Nourriture" in depense_names
        assert "Sante" in depense_names
        assert "Electricite" in depense_names
        assert "Eau courante" in depense_names
        assert "Funerailles" in depense_names
        assert "Mariage, bapteme" in depense_names
        print("7 predefined depenses types saved and retrieved successfully")
    
    def test_09_fiche3_ombrage_canopee_position_options(self):
        """Test: Backend accepts ombrage (Faible/Moyen/Dense), canopee (4 options), position (with Plateau)"""
        session = get_authenticated_session()
        pdc_id = get_or_create_test_pdc()
        
        if not pdc_id:
            pytest.skip("No test PDC available")
        
        # Test all options in one request
        fiche3_data = {
            "etat_cacaoyere": {
                "ombrage": "dense",  # Faible/Moyen/Dense
                "canopee": "peu_degrade",  # Normal/Dense/Peu degrade/Degrade
                "dispositif_plantation": "en_lignes",
                "plages_vides": "peu"
            },
            "etat_sol": {
                "position": "plateau"  # Plateau/Haut de pente/Mi versant/Bas de pente
            },
            "maladies": [],
            "sol_elements": [],
            "recolte_post_recolte": {},
            "engrais": [],
            "phytosanitaires": [],
            "gestion_emballages": ""
        }
        
        save_resp = session.put(f"{BASE_URL}/api/pdc-v2/{pdc_id}/step1", json={
            "fiche3": fiche3_data
        })
        assert save_resp.status_code == 200, f"Failed to save: {save_resp.text}"
        
        # Verify
        get_resp = session.get(f"{BASE_URL}/api/pdc-v2/{pdc_id}")
        assert get_resp.status_code == 200
        
        saved_fiche3 = get_resp.json()["step1"]["fiche3"]
        
        # Verify ombrage
        assert saved_fiche3["etat_cacaoyere"]["ombrage"] == "dense", "Ombrage should be dense"
        
        # Verify canopee
        assert saved_fiche3["etat_cacaoyere"]["canopee"] == "peu_degrade", "Canopee should be peu_degrade"
        
        # Verify position with Plateau
        assert saved_fiche3["etat_sol"]["position"] == "plateau", "Position should be plateau"
        
        print("Ombrage/Canopee/Position options saved and retrieved successfully")


def cleanup_test_pdc():
    """Cleanup test PDC after all tests"""
    global _test_pdc_id, _session
    
    if _test_pdc_id and _session:
        try:
            _session.delete(f"{BASE_URL}/api/pdc-v2/{_test_pdc_id}")
            print(f"Cleaned up test PDC: {_test_pdc_id}")
        except:
            pass


if __name__ == "__main__":
    try:
        pytest.main([__file__, "-v", "--tb=short"])
    finally:
        cleanup_test_pdc()
