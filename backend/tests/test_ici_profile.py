from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
ICI Profile Backend API Tests
ICI Profile Backend API Tests
Tests for ICI (Indice Composite de l'Enfant) profile functionality:
Tests for ICI (Indice Composite de l'Enfant) profile functionality:
- POST /api/ici-data/farmers/{farmer_id}/ici-profile (create/update profile with children data)
- POST /api/ici-data/farmers/{farmer_id}/ici-profile (create/update profile with children data)
- GET /api/ici-data/farmers/{farmer_id}/ici-profile (retrieve profile)
- GET /api/ici-data/farmers/{farmer_id}/ici-profile (retrieve profile)
- Field agent and cooperative access permissions
- Field agent and cooperative access permissions
- Risk score calculation based on children data
- Risk score calculation based on children data
"""
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOPERATIVE_CREDENTIALS = {
    "identifier": COOP_EMAIL,
    "password": "greenlink2024"
}

FIELD_AGENT_CREDENTIALS = {
    "identifier": "+2250709005301",
    "password": "greenlink2024"
}

# Known IDs from previous testing
AGENT_ID = "69b98dda122dd07c63479438"  # Kone Alphone
FARMER_ID = "69b98dda122dd07c6347943a"  # Balde ibo


@pytest.fixture(scope="module")
def coop_token():
    """Get cooperative auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=COOPERATIVE_CREDENTIALS
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Cooperative login failed")


@pytest.fixture(scope="module")
def agent_token():
    """Get field agent auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=FIELD_AGENT_CREDENTIALS
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Field agent login failed")


@pytest.fixture
def coop_headers(coop_token):
    """Auth headers for cooperative"""
    return {
        "Authorization": f"Bearer {coop_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def agent_headers(agent_token):
    """Auth headers for field agent"""
    return {
        "Authorization": f"Bearer {agent_token}",
        "Content-Type": "application/json"
    }


class TestICIProfileEndpoints:
    """Test ICI Profile CRUD operations"""

    def test_get_ici_profile_as_cooperative(self, coop_headers):
        """Test GET /api/ici-data/farmers/{farmer_id}/ici-profile as cooperative"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=coop_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "farmer_id" in data or "profile_complete" in data or "household_children" in data
        print(f"✓ GET ICI profile (cooperative): Status {response.status_code}")
        print(f"  Profile data keys: {list(data.keys())[:10]}")

    def test_get_ici_profile_as_field_agent(self, agent_headers):
        """Test GET /api/ici-data/farmers/{farmer_id}/ici-profile as field agent"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=agent_headers
        )
        assert response.status_code == 200, f"Field agent should have access. Got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"✓ GET ICI profile (field_agent): Status {response.status_code}")
        print(f"  Profile data available: {bool(data)}")

    def test_post_ici_profile_with_children_details(self, coop_headers):
        """Test POST /api/ici-data/farmers/{farmer_id}/ici-profile with liste_enfants"""
        # Test data with 3 children as specified in requirements
        profile_data = {
            "taille_menage": 5,
            "genre": "homme",
            "niveau_education": "primaire",
            "peut_lire_ecrire": True,
            "utilise_pesticides": False,
            "formation_securite_recue": True,
            "membre_groupe_epargne": False,
            "household_children": {
                "total_enfants": 3,
                "enfants_5_11_ans": 1,
                "enfants_12_14_ans": 1,
                "enfants_15_17_ans": 1,
                "enfants_scolarises": 2,
                "enfants_travaillant_exploitation": 1,
                "taches_effectuees": [],
                "liste_enfants": [
                    {
                        "prenom": "Aminata",
                        "sexe": "Fille",
                        "age": 8,
                        "scolarise": True,
                        "travaille_exploitation": False
                    },
                    {
                        "prenom": "Ibrahim",
                        "sexe": "Garcon",
                        "age": 13,
                        "scolarise": True,
                        "travaille_exploitation": True
                    },
                    {
                        "prenom": "Fatou",
                        "sexe": "Fille",
                        "age": 16,
                        "scolarise": False,
                        "travaille_exploitation": False
                    }
                ]
            },
            "labor_force": {
                "travailleurs_permanents": 2,
                "travailleurs_saisonniers": 3,
                "travailleurs_avec_contrat": 1,
                "salaire_journalier_moyen_xof": 3500,
                "utilise_main_oeuvre_familiale": True
            }
        }

        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=coop_headers,
            json=profile_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "farmer_id" in data
        assert data["farmer_id"] == FARMER_ID
        
        # Verify risk_score is calculated
        assert "risk_score" in data
        assert isinstance(data["risk_score"], (int, float))
        
        # Verify niveau_risque is set
        assert "niveau_risque" in data
        assert data["niveau_risque"] in ["FAIBLE", "MODÉRÉ", "ÉLEVÉ"]
        
        print(f"✓ POST ICI profile (cooperative): Status {response.status_code}")
        print(f"  Risk score: {data.get('risk_score')}, Level: {data.get('niveau_risque')}")

    def test_post_ici_profile_as_field_agent(self, agent_headers):
        """Test that field_agent can POST /api/ici-data/farmers/{farmer_id}/ici-profile"""
        profile_data = {
            "taille_menage": 4,
            "household_children": {
                "total_enfants": 2,
                "enfants_scolarises": 2,
                "enfants_travaillant_exploitation": 0,
                "liste_enfants": [
                    {
                        "prenom": "TestChild1",
                        "sexe": "Garcon",
                        "age": 10,
                        "scolarise": True,
                        "travaille_exploitation": False
                    },
                    {
                        "prenom": "TestChild2",
                        "sexe": "Fille",
                        "age": 7,
                        "scolarise": True,
                        "travaille_exploitation": False
                    }
                ]
            }
        }

        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=agent_headers,
            json=profile_data
        )
        # Field agent should have access per the route
        assert response.status_code == 200, f"Field agent should have POST access. Got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ POST ICI profile (field_agent): Status {response.status_code}")

    def test_get_ici_profile_returns_liste_enfants(self, coop_headers):
        """Test GET returns saved liste_enfants data"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=coop_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Check if profile has household_children with liste_enfants
        if "household_children" in data:
            hc = data["household_children"]
            assert "liste_enfants" in hc, "liste_enfants should be in household_children"
            
            liste = hc.get("liste_enfants", [])
            print(f"✓ GET ICI profile returns liste_enfants with {len(liste)} children")
            
            # Verify child detail structure if children exist
            if liste:
                child = liste[0]
                assert "prenom" in child, "Child should have prenom"
                assert "sexe" in child, "Child should have sexe"
                assert "age" in child, "Child should have age"
                assert "scolarise" in child, "Child should have scolarise"
                assert "travaille_exploitation" in child, "Child should have travaille_exploitation"
                print(f"  First child: {child.get('prenom')}, {child.get('sexe')}, age {child.get('age')}")
        else:
            # Profile might not exist yet or has different structure
            print(f"  Profile keys: {list(data.keys())}")

    def test_ici_profile_risk_score_calculation(self, coop_headers):
        """Test that risk_score is calculated correctly based on children data"""
        # Create profile with working children (should increase risk)
        profile_with_working_children = {
            "taille_menage": 6,
            "formation_securite_recue": False,  # No safety training (+10 risk)
            "household_children": {
                "total_enfants": 2,
                "enfants_5_11_ans": 1,
                "enfants_12_14_ans": 1,
                "enfants_scolarises": 0,
                "enfants_travaillant_exploitation": 2,  # Children working (+30 risk)
                "taches_effectuees": ["TD3"],  # Dangerous task (+15 risk)
                "liste_enfants": [
                    {
                        "prenom": "ChildA",
                        "sexe": "Garcon",
                        "age": 9,  # 5-11 age range
                        "scolarise": False,
                        "travaille_exploitation": True
                    },
                    {
                        "prenom": "ChildB",
                        "sexe": "Fille",
                        "age": 14,
                        "scolarise": False,
                        "travaille_exploitation": True
                    }
                ]
            }
        }

        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=coop_headers,
            json=profile_with_working_children
        )
        assert response.status_code == 200
        
        data = response.json()
        risk_score = data.get("risk_score", 0)
        niveau_risque = data.get("niveau_risque", "")
        
        # With working children in 5-11 range + no safety training + dangerous task
        # Risk should be elevated
        print(f"✓ Risk calculation test: score={risk_score}, level={niveau_risque}")
        
        # Score should be > 0 with working children
        assert risk_score > 0, "Risk score should increase with working children"

    def test_ici_profile_unauthorized_without_token(self):
        """Test that ICI endpoints require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile"
        )
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403 without token, got {response.status_code}"
        print(f"✓ Unauthorized access blocked: Status {response.status_code}")

    def test_ici_profile_farmer_not_found(self, coop_headers):
        """Test GET ICI profile for non-existent farmer"""
        fake_farmer_id = "000000000000000000000000"
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{fake_farmer_id}/ici-profile",
            headers=coop_headers
        )
        # Should return profile_complete: False or 404
        # Based on code, it returns message: "Profil ICI non encore renseigné"
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            # Should indicate profile doesn't exist
            assert "profile_complete" in data or "message" in data
        print(f"✓ Non-existent farmer handled: Status {response.status_code}")


class TestICIChildDetailModel:
    """Test ChildDetail model validation"""

    def test_child_detail_sexe_values(self, coop_headers):
        """Test that sexe accepts Fille/Garcon values"""
        profile_data = {
            "taille_menage": 3,
            "household_children": {
                "total_enfants": 2,
                "liste_enfants": [
                    {"prenom": "Girl", "sexe": "Fille", "age": 10, "scolarise": True, "travaille_exploitation": False},
                    {"prenom": "Boy", "sexe": "Garcon", "age": 12, "scolarise": True, "travaille_exploitation": False}
                ]
            }
        }

        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=coop_headers,
            json=profile_data
        )
        assert response.status_code == 200, f"Should accept Fille/Garcon. Got {response.status_code}: {response.text}"
        print(f"✓ ChildDetail sexe values (Fille/Garcon) accepted")

    def test_child_age_validation(self, coop_headers):
        """Test that age is validated (0-17 range)"""
        profile_data = {
            "taille_menage": 2,
            "household_children": {
                "total_enfants": 1,
                "liste_enfants": [
                    {"prenom": "InvalidAge", "sexe": "Garcon", "age": 25, "scolarise": False, "travaille_exploitation": False}
                ]
            }
        }

        response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=coop_headers,
            json=profile_data
        )
        # Should fail validation (age max is 17)
        assert response.status_code == 422, f"Should reject age > 17. Got {response.status_code}"
        print(f"✓ Age validation working: Status {response.status_code}")


class TestICIProfileRetrievalWithTestData:
    """Test that existing test data (3 children) can be retrieved"""

    def test_verify_test_data_children(self, coop_headers):
        """Verify the test data has expected 3 children: Aminata, Ibrahim, Fatou"""
        # First, set up the test data
        setup_profile = {
            "taille_menage": 5,
            "household_children": {
                "total_enfants": 3,
                "enfants_scolarises": 2,
                "enfants_travaillant_exploitation": 1,
                "liste_enfants": [
                    {"prenom": "Aminata", "sexe": "Fille", "age": 8, "scolarise": True, "travaille_exploitation": False},
                    {"prenom": "Ibrahim", "sexe": "Garcon", "age": 13, "scolarise": True, "travaille_exploitation": True},
                    {"prenom": "Fatou", "sexe": "Fille", "age": 16, "scolarise": False, "travaille_exploitation": False}
                ]
            }
        }

        # Save the test data
        post_response = requests.post(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=coop_headers,
            json=setup_profile
        )
        assert post_response.status_code == 200, f"Setup failed: {post_response.text}"

        # Now retrieve and verify
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{FARMER_ID}/ici-profile",
            headers=coop_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        hc = data.get("household_children", {})
        liste = hc.get("liste_enfants", [])
        
        assert len(liste) == 3, f"Expected 3 children, got {len(liste)}"
        
        # Check expected names
        names = [c.get("prenom") for c in liste]
        assert "Aminata" in names, "Aminata should be in children list"
        assert "Ibrahim" in names, "Ibrahim should be in children list"
        assert "Fatou" in names, "Fatou should be in children list"
        
        # Check summary counts
        assert hc.get("total_enfants") == 3
        assert hc.get("enfants_scolarises") == 2
        assert hc.get("enfants_travaillant_exploitation") == 1
        
        print(f"✓ Test data verified: {names}")
        print(f"  Scolarises: {hc.get('enfants_scolarises')}, Travaillant: {hc.get('enfants_travaillant_exploitation')}, Total: {hc.get('total_enfants')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
