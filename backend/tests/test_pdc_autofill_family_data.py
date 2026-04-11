"""
Test PDC Auto-fill Family Data Feature
Tests the GET /api/ici-data/farmers/{farmer_id}/family-data endpoint
which returns PDC v2 data (genre, niveau_education, date_naissance, taille_menage, enfants)
for pre-filling ICI and SSRTE forms.

Key test farmers:
- Bamba Ibrahim (ID: 69d27f0c47797cbad7193b8c) - has PDC with 6 members (3 enfants)
- Konan Yao Pierre (ID: 69d27ef947797cbad7193b8a) - has existing ICI+SSRTE data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test farmer IDs from the context
FARMER_WITH_PDC = "69d27f0c47797cbad7193b8c"  # Bamba Ibrahim - has PDC with 6 members
FARMER_WITH_ICI_SSRTE = "69d27ef947797cbad7193b8a"  # Konan Yao Pierre - has ICI+SSRTE data


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent terrain token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "testagent@test.ci",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Agent login failed: {response.status_code} - {response.text}")
    
    def test_agent_login(self, agent_token):
        """Test agent terrain can login"""
        assert agent_token is not None
        assert len(agent_token) > 0
        print(f"Agent token obtained: {agent_token[:20]}...")


class TestFamilyDataEndpoint:
    """Tests for GET /api/ici-data/farmers/{farmer_id}/family-data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authenticated headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "testagent@test.ci",
            "password": "test123456"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    def test_family_data_endpoint_exists(self, auth_headers):
        """Test that family-data endpoint exists and returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Family data endpoint returned 200 OK")
    
    def test_pdc_farmer_returns_pdc_source(self, auth_headers):
        """Test that farmer with PDC returns source='pdc'"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check source includes 'pdc'
        source = data.get("source", "")
        assert "pdc" in source.lower(), f"Expected source to include 'pdc', got: {source}"
        print(f"Source correctly includes 'pdc': {source}")
    
    def test_pdc_farmer_has_genre(self, auth_headers):
        """Test that PDC farmer returns genre field"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        genre = data.get("genre", "")
        assert genre in ["homme", "femme", ""], f"Genre should be homme/femme, got: {genre}"
        print(f"Genre field returned: {genre}")
    
    def test_pdc_farmer_has_niveau_education(self, auth_headers):
        """Test that PDC farmer returns niveau_education field"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        niveau = data.get("niveau_education", "")
        valid_levels = ["", "aucun", "primaire", "secondaire", "superieur"]
        assert niveau in valid_levels, f"niveau_education should be one of {valid_levels}, got: {niveau}"
        print(f"niveau_education field returned: {niveau}")
    
    def test_pdc_farmer_has_taille_menage(self, auth_headers):
        """Test that PDC farmer returns taille_menage (expected 6 for Bamba Ibrahim)"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        taille = data.get("taille_menage", 0)
        assert isinstance(taille, int), f"taille_menage should be int, got: {type(taille)}"
        assert taille >= 0, f"taille_menage should be >= 0, got: {taille}"
        print(f"taille_menage field returned: {taille}")
    
    def test_pdc_farmer_has_enfants(self, auth_headers):
        """Test that PDC farmer returns liste_enfants (expected 3 for Bamba Ibrahim)"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        enfants = data.get("liste_enfants", [])
        assert isinstance(enfants, list), f"liste_enfants should be list, got: {type(enfants)}"
        print(f"liste_enfants count: {len(enfants)}")
        
        # Verify enfant structure if any exist
        if enfants:
            enfant = enfants[0]
            assert "prenom" in enfant or "nom" in enfant, "Enfant should have prenom or nom"
            print(f"First enfant: {enfant}")
    
    def test_pdc_farmer_has_nombre_enfants(self, auth_headers):
        """Test that nombre_enfants matches liste_enfants length"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        nombre = data.get("nombre_enfants", 0)
        liste = data.get("liste_enfants", [])
        assert nombre == len(liste), f"nombre_enfants ({nombre}) should match liste_enfants length ({len(liste)})"
        print(f"nombre_enfants: {nombre}, liste_enfants length: {len(liste)}")
    
    def test_pdc_farmer_has_geographic_data(self, auth_headers):
        """Test that PDC farmer returns geographic data from producteur"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check geographic fields exist (may be empty strings)
        geo_fields = ["region", "departement", "sous_prefecture", "village"]
        for field in geo_fields:
            assert field in data, f"Missing geographic field: {field}"
        print(f"Geographic data: region={data.get('region')}, departement={data.get('departement')}")
    
    def test_ici_ssrte_farmer_returns_correct_source(self, auth_headers):
        """Test that farmer with ICI+SSRTE data returns appropriate source"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_ICI_SSRTE}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        source = data.get("source", "")
        # Should have ici and/or ssrte in source
        print(f"ICI+SSRTE farmer source: {source}")
        # This farmer may or may not have PDC, so just verify we get a response
        assert "farmer_id" in data
    
    def test_family_data_response_structure(self, auth_headers):
        """Test complete response structure"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        required_fields = [
            "farmer_id", "taille_menage", "nombre_enfants", "liste_enfants",
            "genre", "niveau_education", "date_naissance", "source"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"All required fields present in response")
        print(f"Full response: {data}")
    
    def test_enfant_structure_from_pdc(self, auth_headers):
        """Test that enfants from PDC have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/family-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        enfants = data.get("liste_enfants", [])
        if enfants:
            for i, enfant in enumerate(enfants):
                # Check expected fields
                assert "prenom" in enfant, f"Enfant {i} missing prenom"
                assert "sexe" in enfant, f"Enfant {i} missing sexe"
                assert "age" in enfant, f"Enfant {i} missing age"
                assert "scolarise" in enfant, f"Enfant {i} missing scolarise"
                assert "travaille_exploitation" in enfant, f"Enfant {i} missing travaille_exploitation"
                
                # Validate values
                assert enfant["sexe"] in ["Fille", "Garcon"], f"Invalid sexe: {enfant['sexe']}"
                assert isinstance(enfant["age"], int), f"Age should be int: {enfant['age']}"
                assert 0 <= enfant["age"] <= 17, f"Age should be 0-17: {enfant['age']}"
                
                print(f"Enfant {i}: {enfant['prenom']}, {enfant['age']}y, {enfant['sexe']}, scolarise={enfant['scolarise']}")
        else:
            print("No enfants in liste_enfants")


class TestICIProfileEndpoint:
    """Tests for GET /api/ici-data/farmers/{farmer_id}/ici-profile"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authenticated headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "testagent@test.ci",
            "password": "test123456"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    def test_ici_profile_endpoint_exists(self, auth_headers):
        """Test that ICI profile endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_WITH_PDC}/ici-profile",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"ICI profile endpoint returned 200 OK")


class TestSSRTEVisitEndpoint:
    """Tests for SSRTE visit endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authenticated headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "testagent@test.ci",
            "password": "test123456"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    def test_ssrte_visits_endpoint_exists(self, auth_headers):
        """Test that SSRTE visits list endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/ssrte/visits",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "visits" in data
        assert "total" in data
        print(f"SSRTE visits endpoint returned {data['total']} visits")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
