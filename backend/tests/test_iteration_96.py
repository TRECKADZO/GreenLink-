"""
Iteration 96 Backend Tests - GreenLink Agritech
Testing: Registration, SSRTE, REDD, Farmer History endpoints
"""
import pytest
import requests
import os
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FIELD_AGENT_EMAIL = "testagent@test.ci"
FIELD_AGENT_PASSWORD = "test123456"
FARMER_EMAIL = "testplanteur@test.ci"
FARMER_PASSWORD = "test123456"

# Test farmer ID (the test farmer account)
TEST_FARMER_ID = "69d26d0474d244372789cc7f"


def generate_unique_phone():
    """Generate a unique 10-digit phone number for testing"""
    return f"07{random.randint(10000000, 99999999)}"


def get_agent_token():
    """Get authentication token for field agent"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": FIELD_AGENT_EMAIL,
        "password": FIELD_AGENT_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    return None


def get_farmer_token():
    """Get authentication token for farmer"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": FARMER_EMAIL,
        "password": FARMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    return None


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_field_agent_success(self):
        """Test field agent login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FIELD_AGENT_EMAIL,
            "password": FIELD_AGENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data
        assert data.get("user", {}).get("user_type") == "field_agent"
    
    def test_login_farmer_success(self):
        """Test farmer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data
        assert data.get("user", {}).get("user_type") in ["producteur", "farmer"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "invalid@test.ci",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestUSSDRegisterWeb:
    """Tests for POST /api/ussd/register-web endpoint"""
    
    def test_register_farmer_success(self):
        """Test successful farmer registration via register-web"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        unique_phone = generate_unique_phone()
        response = requests.post(
            f"{BASE_URL}/api/ussd/register-web",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "nom_complet": f"Test Farmer {unique_phone[-4:]}",
                "telephone": unique_phone,
                "cooperative_code": "TEST-COOP",
                "village": "Test Village",
                "pin": "1234",
                "hectares": "2.5"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "farmer_id" in data or "code_planteur" in data
        print(f"Registered farmer with phone: {unique_phone}")
    
    def test_register_farmer_missing_name(self):
        """Test registration fails without name"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/register-web",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "telephone": generate_unique_phone(),
                "pin": "1234"
            }
        )
        assert response.status_code == 400
    
    def test_register_farmer_missing_phone(self):
        """Test registration fails without phone"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/register-web",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "nom_complet": "Test Farmer",
                "pin": "1234"
            }
        )
        assert response.status_code == 400
    
    def test_register_farmer_invalid_pin(self):
        """Test registration fails with invalid PIN"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.post(
            f"{BASE_URL}/api/ussd/register-web",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "nom_complet": "Test Farmer",
                "telephone": generate_unique_phone(),
                "pin": "12"  # Too short
            }
        )
        assert response.status_code == 400
    
    def test_register_farmer_duplicate_phone(self):
        """Test registration fails with duplicate phone"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        phone = generate_unique_phone()
        # First registration
        requests.post(
            f"{BASE_URL}/api/ussd/register-web",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "nom_complet": "Test Farmer First",
                "telephone": phone,
                "pin": "1234"
            }
        )
        # Second registration with same phone
        response = requests.post(
            f"{BASE_URL}/api/ussd/register-web",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "nom_complet": "Test Farmer Second",
                "telephone": phone,
                "pin": "5678"
            }
        )
        assert response.status_code == 409


class TestSSRTEVisit:
    """Tests for POST /api/ici-data/ssrte/visit endpoint"""
    
    def test_ssrte_visit_success(self):
        """Test successful SSRTE visit recording"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/ssrte/visit",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "farmer_id": TEST_FARMER_ID,
                "date_visite": "2026-01-05T10:00:00Z",
                "taille_menage": 5,
                "nombre_enfants": 3,
                "liste_enfants": [
                    {"prenom": "Kouadio", "sexe": "Garcon", "age": 10, "scolarise": True, "travaille_exploitation": False},
                    {"prenom": "Aya", "sexe": "Fille", "age": 8, "scolarise": True, "travaille_exploitation": False}
                ],
                "conditions_vie": "moyennes",
                "eau_courante": False,
                "electricite": True,
                "distance_ecole_km": 2.5,
                "enfants_observes_travaillant": 0,
                "taches_dangereuses_observees": [],
                "support_fourni": ["Kit scolaire distribue"],
                "niveau_risque": "faible",
                "recommandations": ["Continuer la scolarisation"],
                "visite_suivi_requise": False,
                "observations": "Famille bien organisee"
            }
        )
        assert response.status_code in [200, 201], f"SSRTE visit failed: {response.text}"
        data = response.json()
        assert "visit_id" in data or "message" in data
        print(f"SSRTE visit recorded: {data}")
    
    def test_ssrte_visit_missing_farmer_id(self):
        """Test SSRTE visit fails without farmer_id"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.post(
            f"{BASE_URL}/api/ici-data/ssrte/visit",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "taille_menage": 5,
                "nombre_enfants": 2,
                "niveau_risque": "faible"
            }
        )
        assert response.status_code in [400, 422]


class TestREDDTrackingVisit:
    """Tests for POST /api/redd/tracking/visit endpoint"""
    
    def test_redd_visit_success(self):
        """Test successful REDD tracking visit"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.post(
            f"{BASE_URL}/api/redd/tracking/visit",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "farmer_id": TEST_FARMER_ID,
                "farmer_name": "Test Farmer REDD",
                "farmer_phone": generate_unique_phone(),
                "practices_verified": [
                    {"code": "AGF1", "name": "Arbres d'ombrage", "category": "agroforesterie", "status": "conforme"},
                    {"code": "AGF2", "name": "Systeme agroforestier", "category": "agroforesterie", "status": "partiellement"},
                    {"code": "SOL1", "name": "Paillage et compostage", "category": "gestion_sols", "status": "conforme"},
                    {"code": "ZD1", "name": "Intensification durable", "category": "zero_deforestation", "status": "conforme"}
                ],
                "superficie_verifiee": 3.5,
                "arbres_comptes": 45,
                "observations": "Bonne pratique agroforestiere",
                "recommandations": "Continuer le compostage",
                "suivi_requis": False
            }
        )
        assert response.status_code in [200, 201], f"REDD visit failed: {response.text}"
        data = response.json()
        assert "redd_score" in data or "visit_id" in data or "message" in data
        print(f"REDD visit recorded: {data}")
    
    def test_redd_visit_missing_farmer_id(self):
        """Test REDD visit fails without farmer_id"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.post(
            f"{BASE_URL}/api/redd/tracking/visit",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "farmer_name": "Test Farmer",
                "practices_verified": []
            }
        )
        assert response.status_code in [400, 422]


class TestFarmerHistory:
    """Tests for GET /api/ici-data/farmers/{farmer_id}/history endpoint"""
    
    def test_farmer_history_success(self):
        """Test getting farmer history"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{TEST_FARMER_ID}/history",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "farmer_id" in data
        assert "ssrte_visits" in data or "ici_profile" in data
        print(f"Farmer history: {data}")
    
    def test_farmer_history_unauthorized(self):
        """Test farmer history without auth"""
        response = requests.get(
            f"{BASE_URL}/api/ici-data/farmers/{TEST_FARMER_ID}/history"
        )
        assert response.status_code in [401, 403]


class TestFieldAgentDashboard:
    """Tests for field agent dashboard endpoints"""
    
    def test_field_agent_dashboard(self):
        """Test field agent dashboard loads"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/field-agent/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "statistics" in data or "agent_info" in data
    
    def test_field_agent_my_farmers(self):
        """Test field agent my-farmers endpoint"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "farmers" in data


class TestFarmerDashboard:
    """Tests for farmer dashboard endpoints"""
    
    def test_farmer_dashboard(self):
        """Test farmer dashboard loads"""
        token = get_farmer_token()
        assert token, "Failed to get farmer token"
        
        response = requests.get(
            f"{BASE_URL}/api/greenlink/farmer/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert any(key in data for key in ["total_parcelles", "score_carbone_moyen", "superficie_totale"])


class TestUSSDRegistrations:
    """Tests for USSD registrations list endpoint"""
    
    def test_get_registrations(self):
        """Test getting recent registrations"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/ussd/registrations?limit=10",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "registrations" in data


class TestAgentSearch:
    """Tests for agent search endpoint"""
    
    def test_search_farmer_by_phone(self):
        """Test searching farmer by phone"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/agent/search?phone=+2250101010101",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "found" in data
    
    def test_search_invalid_phone(self):
        """Test search with invalid phone format"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/agent/search?phone=abc",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400


class TestREDDTrackingStats:
    """Tests for REDD tracking stats endpoint"""
    
    def test_redd_tracking_stats(self):
        """Test REDD tracking stats endpoint"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/redd/tracking/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert any(key in data for key in ["total_visits", "avg_redd_score", "avg_conformity"])


class TestREDDTrackingVisits:
    """Tests for REDD tracking visits list endpoint"""
    
    def test_redd_tracking_visits_list(self):
        """Test REDD tracking visits list"""
        token = get_agent_token()
        assert token, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/redd/tracking/visits",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "visits" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
