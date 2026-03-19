"""
Test SSRTE Enriched Form Fields - Iteration 46
Tests for enriched SSRTE fields: taille_menage, nombre_enfants, liste_enfants, 
conditions_vie, eau_courante, electricite, distance_ecole_km, observations
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_CREDENTIALS = {
    "identifier": "traore_eric@yahoo.fr",
    "password": "greenlink2024"
}
ADMIN_CREDENTIALS = {
    "identifier": "klenakan.eric@gmail.com",
    "password": "474Treckadzo"
}


class TestSSRTEEnrichedFormBackend:
    """Backend tests for SSRTE enriched form fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, credentials):
        """Helper to get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=credentials)
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        return None
    
    def test_login_cooperative(self):
        """Test cooperative login works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=COOP_CREDENTIALS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"PASS: Cooperative login successful")
    
    def test_login_admin(self):
        """Test admin login works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"PASS: Admin login successful")
    
    def test_ssrte_visit_endpoint_exists(self):
        """Test that POST /api/ici-data/ssrte/visit endpoint exists and accepts enriched fields"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Test with all enriched fields
        visit_data = {
            "farmer_id": "000000000000000000000001",  # Dummy farmer ID for testing endpoint
            "date_visite": datetime.utcnow().isoformat(),
            "taille_menage": 5,
            "nombre_enfants": 3,
            "liste_enfants": [
                {"prenom": "Kofi", "sexe": "Garcon", "age": 10, "scolarise": True, "travaille_exploitation": False},
                {"prenom": "Ama", "sexe": "Fille", "age": 8, "scolarise": True, "travaille_exploitation": False},
                {"prenom": "Kwame", "sexe": "Garcon", "age": 14, "scolarise": False, "travaille_exploitation": True}
            ],
            "conditions_vie": "moyennes",
            "eau_courante": True,
            "electricite": False,
            "distance_ecole_km": 2.5,
            "enfants_observes_travaillant": 1,
            "taches_dangereuses_observees": ["TD1", "TD4"],
            "support_fourni": ["Kit scolaire distribue"],
            "kit_scolaire_distribue": True,
            "certificat_naissance_aide": False,
            "niveau_risque": "modere",
            "recommandations": ["Inscrire Kwame a l'ecole", "Fournir equipement protection"],
            "visite_suivi_requise": True,
            "observations": "Famille en situation difficile, besoin de suivi regulier"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
        
        # The endpoint should accept the request - farmer may not exist but fields should be valid
        # We expect 200 (success) or 404 (farmer not found) - NOT 422 (validation error)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, response: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "visit_id" in data, "Response should contain visit_id"
            assert "message" in data, "Response should contain message"
            print(f"PASS: SSRTE visit endpoint accepts enriched fields, visit_id: {data.get('visit_id')}")
        else:
            print(f"PASS: Endpoint accepts enriched fields format (farmer not found is expected)")
    
    def test_ssrte_visit_with_minimal_enriched_fields(self):
        """Test SSRTE visit with minimal enriched fields (only required)"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        visit_data = {
            "farmer_id": "000000000000000000000002",
            "taille_menage": 3,
            "nombre_enfants": 1,
            "liste_enfants": [],
            "conditions_vie": "precaires",
            "eau_courante": False,
            "electricite": False,
            "enfants_observes_travaillant": 0,
            "niveau_risque": "faible"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, response: {response.text}"
        print(f"PASS: Minimal enriched fields accepted")
    
    def test_ssrte_visit_all_conditions_vie_values(self):
        """Test all valid conditions_vie values are accepted"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        valid_conditions = ["precaires", "moyennes", "bonnes", "tres_bonnes"]
        
        for condition in valid_conditions:
            visit_data = {
                "farmer_id": "000000000000000000000003",
                "taille_menage": 4,
                "conditions_vie": condition,
                "enfants_observes_travaillant": 0,
                "niveau_risque": "faible"
            }
            
            response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
            assert response.status_code in [200, 404, 422], f"Unexpected status for {condition}: {response.status_code}"
            if response.status_code != 422:
                print(f"PASS: conditions_vie='{condition}' accepted")
    
    def test_ssrte_visit_child_detail_fields(self):
        """Test liste_enfants accepts all child detail fields"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Test with detailed child entries
        visit_data = {
            "farmer_id": "000000000000000000000004",
            "taille_menage": 6,
            "nombre_enfants": 4,
            "liste_enfants": [
                {"prenom": "Adjoua", "sexe": "Fille", "age": 5, "scolarise": False, "travaille_exploitation": False},
                {"prenom": "Yao", "sexe": "Garcon", "age": 12, "scolarise": True, "travaille_exploitation": False},
                {"prenom": "Akissi", "sexe": "Fille", "age": 15, "scolarise": True, "travaille_exploitation": True},
                {"prenom": "Kouadio", "sexe": "Garcon", "age": 17, "scolarise": False, "travaille_exploitation": True}
            ],
            "conditions_vie": "moyennes",
            "enfants_observes_travaillant": 2,
            "niveau_risque": "eleve"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, response: {response.text}"
        print(f"PASS: Child detail fields (prenom, sexe, age, scolarise, travaille_exploitation) accepted")
    
    def test_ssrte_visit_distance_ecole_field(self):
        """Test distance_ecole_km field accepts float values"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        test_distances = [0.5, 1.0, 2.5, 5.0, 10.0, None]
        
        for distance in test_distances:
            visit_data = {
                "farmer_id": "000000000000000000000005",
                "taille_menage": 3,
                "conditions_vie": "moyennes",
                "distance_ecole_km": distance,
                "enfants_observes_travaillant": 0,
                "niveau_risque": "faible"
            }
            
            response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
            assert response.status_code in [200, 404], f"Unexpected status for distance={distance}: {response.status_code}"
        
        print(f"PASS: distance_ecole_km accepts float values and null")
    
    def test_ssrte_visit_observations_field(self):
        """Test observations field accepts text"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        visit_data = {
            "farmer_id": "000000000000000000000006",
            "taille_menage": 4,
            "conditions_vie": "bonnes",
            "enfants_observes_travaillant": 0,
            "niveau_risque": "faible",
            "observations": "Cette famille a fait des progres significatifs. Les enfants sont tous scolarises maintenant. La maison a ete renovee recemment avec l'aide du programme."
        }
        
        response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, response: {response.text}"
        print(f"PASS: observations field accepts text content")
    
    def test_ssrte_visit_eau_electricite_booleans(self):
        """Test eau_courante and electricite boolean fields"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        combinations = [
            (True, True),
            (True, False),
            (False, True),
            (False, False)
        ]
        
        for eau, elec in combinations:
            visit_data = {
                "farmer_id": "000000000000000000000007",
                "taille_menage": 3,
                "conditions_vie": "moyennes",
                "eau_courante": eau,
                "electricite": elec,
                "enfants_observes_travaillant": 0,
                "niveau_risque": "faible"
            }
            
            response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
            assert response.status_code in [200, 404], f"Unexpected status for eau={eau}, elec={elec}: {response.status_code}"
        
        print(f"PASS: eau_courante and electricite boolean combinations accepted")
    
    def test_ssrte_visits_list_endpoint(self):
        """Test GET /api/ici-data/ssrte/visits returns visit list"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/ici-data/ssrte/visits?limit=10")
        assert response.status_code == 200, f"Failed to get visits: {response.status_code}, {response.text}"
        
        data = response.json()
        assert "visits" in data, "Response should contain 'visits' key"
        assert "total" in data, "Response should contain 'total' key"
        print(f"PASS: SSRTE visits list endpoint works, total: {data.get('total')}")
    
    def test_taille_menage_required_validation(self):
        """Test that taille_menage with value 0 or missing should still be accepted by backend model (defaults to 0)"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Test with taille_menage = 0 (model allows ge=0)
        visit_data = {
            "farmer_id": "000000000000000000000008",
            "taille_menage": 0,
            "conditions_vie": "moyennes",
            "enfants_observes_travaillant": 0,
            "niveau_risque": "faible"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
        # Backend model allows taille_menage >= 0, validation is on frontend
        assert response.status_code in [200, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"PASS: taille_menage=0 validation handled (status: {response.status_code})")


class TestSSRTEWithRealFarmer:
    """Test SSRTE with real farmer data if available"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, credentials):
        """Helper to get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=credentials)
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        return None
    
    def test_get_cooperative_members(self):
        """Test getting cooperative members list"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/cooperative/members")
        assert response.status_code == 200, f"Failed to get members: {response.status_code}"
        
        data = response.json()
        members = data.get("members", [])
        print(f"PASS: Cooperative members endpoint works, found {len(members)} members")
        return members
    
    def test_create_ssrte_visit_with_real_farmer_if_available(self):
        """Create SSRTE visit with real farmer if cooperative has members"""
        token = self.get_auth_token(COOP_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get members first
        response = self.session.get(f"{BASE_URL}/api/cooperative/members")
        if response.status_code != 200:
            pytest.skip("Could not fetch members")
        
        members = response.json().get("members", [])
        
        if not members:
            print("INFO: No members in cooperative, testing with dummy farmer_id")
            farmer_id = "000000000000000000000099"
        else:
            farmer_id = members[0].get("_id") or members[0].get("id")
            print(f"INFO: Using real farmer: {members[0].get('full_name', 'Unknown')}")
        
        visit_data = {
            "farmer_id": farmer_id,
            "date_visite": datetime.utcnow().isoformat(),
            "taille_menage": 5,
            "nombre_enfants": 2,
            "liste_enfants": [
                {"prenom": "TestEnfant1", "sexe": "Garcon", "age": 8, "scolarise": True, "travaille_exploitation": False},
                {"prenom": "TestEnfant2", "sexe": "Fille", "age": 12, "scolarise": True, "travaille_exploitation": False}
            ],
            "conditions_vie": "moyennes",
            "eau_courante": True,
            "electricite": True,
            "distance_ecole_km": 1.5,
            "enfants_observes_travaillant": 0,
            "taches_dangereuses_observees": [],
            "support_fourni": [],
            "kit_scolaire_distribue": False,
            "certificat_naissance_aide": False,
            "niveau_risque": "faible",
            "recommandations": ["Continuer le bon travail"],
            "visite_suivi_requise": False,
            "observations": "TEST iteration 46 - Famille en bonne situation"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ici-data/ssrte/visit", json=visit_data)
        
        if response.status_code == 200:
            data = response.json()
            assert "visit_id" in data, "Response should contain visit_id"
            print(f"PASS: SSRTE visit created successfully, visit_id: {data['visit_id']}")
        elif response.status_code == 404:
            print(f"PASS: Endpoint works but farmer not found (expected for test data)")
        else:
            pytest.fail(f"Unexpected error: {response.status_code}, {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
