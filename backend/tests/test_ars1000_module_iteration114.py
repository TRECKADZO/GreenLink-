"""
ARS 1000 Module Tests - Iteration 114
Testing PDC, Lots/Traceability, Certification, and Agroforestry endpoints

Test credentials:
- Cooperative: bielaghana@gmail.com / test123456
- Farmer: testplanteur@test.ci / test123456
- Agent: testagent@test.ci / test123456
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============= FIXTURES =============

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def cooperative_token(api_client):
    """Get cooperative authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": "bielaghana@gmail.com",
        "password": "test123456"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip("Cooperative authentication failed")


@pytest.fixture(scope="module")
def farmer_token(api_client):
    """Get farmer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": "testplanteur@test.ci",
        "password": "test123456"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip("Farmer authentication failed")


@pytest.fixture(scope="module")
def agent_token(api_client):
    """Get field agent authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": "testagent@test.ci",
        "password": "test123456"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip("Agent authentication failed")


@pytest.fixture
def coop_headers(cooperative_token):
    """Headers with cooperative auth"""
    return {
        "Authorization": f"Bearer {cooperative_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def farmer_headers(farmer_token):
    """Headers with farmer auth"""
    return {
        "Authorization": f"Bearer {farmer_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def agent_headers(agent_token):
    """Headers with agent auth"""
    return {
        "Authorization": f"Bearer {agent_token}",
        "Content-Type": "application/json"
    }


# ============= AUTH TESTS =============

class TestAuthentication:
    """Test authentication for all roles"""

    def test_cooperative_login(self, api_client):
        """Test cooperative login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"PASSED: Cooperative login - user_type: {data.get('user', {}).get('user_type')}")

    def test_farmer_login(self, api_client):
        """Test farmer login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "testplanteur@test.ci",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"PASSED: Farmer login - user_type: {data.get('user', {}).get('user_type')}")

    def test_agent_login(self, api_client):
        """Test field agent login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "testagent@test.ci",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"PASSED: Agent login - user_type: {data.get('user', {}).get('user_type')}")


# ============= PDC TESTS =============

class TestPDCEndpoints:
    """Test PDC (Plan de Développement Cacaoyère) endpoints"""

    def test_farmer_get_my_pdc(self, api_client, farmer_headers):
        """GET /api/ars1000/pdc/my-pdc - Farmer gets their PDC"""
        response = api_client.get(f"{BASE_URL}/api/ars1000/pdc/my-pdc", headers=farmer_headers)
        # Can be 200 (has PDC) or 200 with null (no PDC)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASSED: Farmer get my-pdc - response: {response.json()}")

    def test_cooperative_get_all_pdcs(self, api_client, coop_headers):
        """GET /api/ars1000/pdc/cooperative/all - List all cooperative PDCs"""
        response = api_client.get(f"{BASE_URL}/api/ars1000/pdc/cooperative/all", headers=coop_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "pdcs" in data
        print(f"PASSED: Cooperative get all PDCs - total: {data['total']}, pdcs count: {len(data['pdcs'])}")

    def test_cooperative_get_pdc_stats(self, api_client, coop_headers):
        """GET /api/ars1000/pdc/cooperative/stats - PDC statistics"""
        response = api_client.get(f"{BASE_URL}/api/ars1000/pdc/cooperative/stats", headers=coop_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "brouillons" in data
        assert "soumis" in data
        assert "valides" in data
        assert "pourcentage_conformite_moyen" in data
        print(f"PASSED: PDC stats - total: {data['total']}, brouillons: {data['brouillons']}, soumis: {data['soumis']}, valides: {data['valides']}")

    def test_farmer_create_pdc(self, api_client, farmer_headers):
        """POST /api/ars1000/pdc - Create a new PDC"""
        # First check if farmer already has a PDC
        check_response = api_client.get(f"{BASE_URL}/api/ars1000/pdc/my-pdc", headers=farmer_headers)
        existing_pdc = check_response.json()
        
        if existing_pdc:
            print(f"SKIPPED: Farmer already has PDC with id: {existing_pdc.get('id')}")
            pytest.skip("Farmer already has an active PDC")
        
        pdc_data = {
            "identification": {
                "nom": "TEST_Planteur",
                "prenoms": "Test",
                "genre": "homme",
                "numero_identification": "TEST123456",
                "telephone": "+2250101010101",
                "localite": "Test Village",
                "village": "Test Village",
                "sous_prefecture": "Test SP",
                "department": "Test Dept",
                "region": "Test Region",
                "membre_groupe": False,
                "statut_foncier": "proprietaire"
            },
            "menage": {
                "taille_menage": 5,
                "nombre_femmes": 2,
                "nombre_enfants": 3,
                "enfants_scolarises": 2,
                "travailleurs_permanents": 1,
                "travailleurs_temporaires": 2,
                "depenses_mensuelles": 150000,
                "acces_banque": True,
                "mobile_money": True
            },
            "parcelles": [
                {
                    "nom_parcelle": "TEST_Parcelle_1",
                    "superficie_ha": 2.5,
                    "latitude": 5.3456,
                    "longitude": -4.1234,
                    "annee_creation": 2015,
                    "age_arbres_ans": 10,
                    "densite_arbres_ha": 1100,
                    "variete_cacao": "Amelonado",
                    "rendement_estime_kg_ha": 450,
                    "etat_sanitaire": "bon"
                }
            ],
            "arbres_ombrage": {
                "nombre_total": 75,
                "densite_par_ha": 30,
                "especes": ["Fraké", "Fromager", "Iroko"],
                "nombre_especes": 3,
                "strate_haute": 25,
                "strate_moyenne": 30,
                "strate_basse": 20,
                "conforme_agroforesterie": True
            },
            "materiel_agricole": {
                "outils": ["machette", "sécateur", "pulvérisateur"],
                "equipements_protection": ["bottes", "gants", "masque"],
                "produits_phytosanitaires": [],
                "engrais": ["compost"],
                "acces_intrants": True
            },
            "matrice_strategique": {
                "objectif_rendement_kg_ha": 600,
                "horizon_annees": 5,
                "risques_identifies": ["sécheresse", "maladies"],
                "actions_prioritaires": ["renouvellement", "taille", "fertilisation"],
                "cout_total_estime": 500000
            },
            "notes": "TEST PDC created by automated test"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ars1000/pdc", headers=farmer_headers, json=pdc_data)
        
        if response.status_code == 409:
            print(f"SKIPPED: PDC already exists for this farmer")
            pytest.skip("PDC already exists")
        
        assert response.status_code == 200, f"Failed to create PDC: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["statut"] == "brouillon"
        assert data["pourcentage_conformite"] > 0
        print(f"PASSED: Created PDC - id: {data['id']}, conformite: {data['pourcentage_conformite']}%")


# ============= LOTS/TRACEABILITY TESTS =============

class TestLotsEndpoints:
    """Test Lots/Traceability endpoints"""

    def test_cooperative_create_lot(self, api_client, coop_headers):
        """POST /api/ars1000/lots - Create a new lot"""
        lot_data = {
            "poids_total_kg": 500,
            "origine_village": "TEST_Village",
            "campagne": f"{datetime.now().year}-{datetime.now().year + 1}",
            "segregation_physique": True,
            "controles_qualite": {
                "humidite": {"taux_humidite": 7.5},
                "tamisage": {"taux_debris": 1.0},
                "corps_etrangers": {"taux_corps_etrangers": 0.5},
                "epreuve_coupe": {
                    "nombre_feves": 300,
                    "moisies_pct": 0.8,
                    "ardoisees_pct": 2.5,
                    "insectes_germees_pct": 4.0
                },
                "fermentation": {"type_fermentation": "bonne"}
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/ars1000/lots", headers=coop_headers, json=lot_data)
        assert response.status_code == 200, f"Failed to create lot: {response.text}"
        data = response.json()
        assert "id" in data
        assert "lot_code" in data
        assert data["poids_total_kg"] == 500
        assert data["controles_qualite"]["conforme_global"] is True  # Should be conforme with these values
        print(f"PASSED: Created lot - code: {data['lot_code']}, conforme: {data['controles_qualite']['conforme_global']}, grade: {data['controles_qualite']['epreuve_coupe']['grade']}")
        return data["id"]

    def test_cooperative_get_lots(self, api_client, coop_headers):
        """GET /api/ars1000/lots - List all lots"""
        response = api_client.get(f"{BASE_URL}/api/ars1000/lots", headers=coop_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "lots" in data
        print(f"PASSED: Get lots - total: {data['total']}, lots count: {len(data['lots'])}")

    def test_cooperative_get_lots_stats(self, api_client, coop_headers):
        """GET /api/ars1000/lots/stats/overview - Lot statistics"""
        response = api_client.get(f"{BASE_URL}/api/ars1000/lots/stats/overview", headers=coop_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_lots" in data
        assert "lots_conformes" in data
        assert "poids_total_kg" in data
        assert "score_qualite_moyen" in data
        print(f"PASSED: Lots stats - total: {data['total_lots']}, conformes: {data['lots_conformes']}, poids: {data['poids_total_kg']}kg")

    def test_cooperative_generate_rapport_essai(self, api_client, coop_headers):
        """POST /api/ars1000/lots/{id}/rapport-essai - Generate test report"""
        # First get a lot
        lots_response = api_client.get(f"{BASE_URL}/api/ars1000/lots", headers=coop_headers)
        lots_data = lots_response.json()
        
        if lots_data["total"] == 0:
            pytest.skip("No lots available to generate report")
        
        lot_id = lots_data["lots"][0]["id"]
        response = api_client.post(f"{BASE_URL}/api/ars1000/lots/{lot_id}/rapport-essai", headers=coop_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "lot_code" in data
        assert "date_generation" in data
        assert "resultats" in data
        assert "norme_reference" in data
        print(f"PASSED: Generated rapport essai for lot: {data['lot_code']}")


# ============= CERTIFICATION TESTS =============

class TestCertificationEndpoints:
    """Test Certification endpoints"""

    def test_cooperative_get_certification_dashboard(self, api_client, coop_headers):
        """GET /api/ars1000/certification/dashboard - Certification dashboard"""
        response = api_client.get(f"{BASE_URL}/api/ars1000/certification/dashboard", headers=coop_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "certification" in data
        assert "niveau_suggere" in data
        assert "niveau_info" in data
        assert "stats" in data
        print(f"PASSED: Certification dashboard - niveau: {data['certification']['niveau']}, suggere: {data['niveau_suggere']}, conformite_global: {data['stats']['conformite_global']}%")

    def test_cooperative_add_audit(self, api_client, coop_headers):
        """POST /api/ars1000/certification/audit - Add audit record"""
        audit_data = {
            "type_audit": "initial",
            "date_audit": datetime.now().isoformat(),
            "auditeur": "TEST_Auditeur",
            "scope": "Certification ARS 1000",
            "resultats": "Audit initial satisfaisant",
            "recommandations": "Améliorer la traçabilité",
            "decision": "favorable"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ars1000/certification/audit", headers=coop_headers, json=audit_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "audit" in data
        print(f"PASSED: Added audit - type: {data['audit']['type_audit']}, decision: {data['audit']['decision']}")

    def test_cooperative_add_non_conformite(self, api_client, coop_headers):
        """POST /api/ars1000/certification/non-conformite - Add non-conformity"""
        nc_data = {
            "code": "NC-TEST-001",
            "description": "TEST Non-conformité mineure",
            "type": "mineure",
            "exigence_ref": "ARS 1000-1 §4.2",
            "actions_correctives": "Formation du personnel"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ars1000/certification/non-conformite", headers=coop_headers, json=nc_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "nc" in data
        assert "id" in data["nc"]
        print(f"PASSED: Added non-conformite - type: {data['nc']['type']}, code: {data['nc']['code']}")

    def test_cooperative_add_reclamation(self, api_client, coop_headers):
        """POST /api/ars1000/certification/reclamation - Add complaint"""
        rec_data = {
            "objet": "TEST Réclamation qualité",
            "description": "Test de réclamation automatisé",
            "plaignant": "TEST_Client",
            "priorite": "moyenne"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ars1000/certification/reclamation", headers=coop_headers, json=rec_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "reclamation" in data
        print(f"PASSED: Added reclamation - objet: {data['reclamation']['objet']}, priorite: {data['reclamation']['priorite']}")

    def test_cooperative_add_risque(self, api_client, coop_headers):
        """POST /api/ars1000/certification/risque - Add risk"""
        risque_data = {
            "activite": "TEST Activité audit",
            "risque_identifie": "Conflit d'intérêt potentiel",
            "causes": "Relations commerciales préexistantes",
            "consequences": "Perte d'impartialité",
            "probabilite": 2,
            "gravite": 3,
            "mesures_attenuation": "Déclaration d'intérêts obligatoire"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ars1000/certification/risque", headers=coop_headers, json=risque_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "risque" in data
        assert "score" in data["risque"]
        print(f"PASSED: Added risque - score: {data['risque']['score']}, activite: {data['risque']['activite']}")


# ============= AGROFORESTRY TESTS =============

class TestAgroforestryEndpoints:
    """Test Agroforestry (Arbres d'ombrage) endpoints"""

    def test_cooperative_add_arbre_ombrage(self, api_client, coop_headers):
        """POST /api/ars1000/certification/arbres-ombrage - Add shade tree"""
        arbre_data = {
            "espece": "TEST_Fraké",
            "nombre": 15,
            "strate": "haute",
            "hauteur_m": 25.0,
            "diametre_cm": 45.0
        }
        
        response = api_client.post(f"{BASE_URL}/api/ars1000/certification/arbres-ombrage", headers=coop_headers, json=arbre_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["espece"] == "TEST_Fraké"
        assert data["nombre"] == 15
        print(f"PASSED: Added arbre ombrage - espece: {data['espece']}, nombre: {data['nombre']}, strate: {data['strate']}")

    def test_cooperative_get_arbres_ombrage(self, api_client, coop_headers):
        """GET /api/ars1000/certification/arbres-ombrage - List shade trees"""
        response = api_client.get(f"{BASE_URL}/api/ars1000/certification/arbres-ombrage", headers=coop_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "arbres" in data
        print(f"PASSED: Get arbres ombrage - total: {data['total']}")

    def test_cooperative_get_arbres_stats(self, api_client, coop_headers):
        """GET /api/ars1000/certification/arbres-ombrage/stats - Agroforestry stats"""
        response = api_client.get(f"{BASE_URL}/api/ars1000/certification/arbres-ombrage/stats", headers=coop_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_arbres" in data
        assert "nombre_especes" in data
        assert "densite_par_ha" in data
        assert "conforme_agroforesterie" in data
        assert "conformite_details" in data
        print(f"PASSED: Agroforestry stats - total: {data['total_arbres']}, especes: {data['nombre_especes']}, densite: {data['densite_par_ha']}/ha, conforme: {data['conforme_agroforesterie']}")


# ============= PDC WORKFLOW TESTS =============

class TestPDCWorkflow:
    """Test PDC submission and validation workflow"""

    def test_pdc_submit_workflow(self, api_client, farmer_headers, coop_headers):
        """Test PDC submit and validate workflow"""
        # Get farmer's PDC
        my_pdc_response = api_client.get(f"{BASE_URL}/api/ars1000/pdc/my-pdc", headers=farmer_headers)
        pdc = my_pdc_response.json()
        
        if not pdc:
            pytest.skip("No PDC to test workflow")
        
        pdc_id = pdc["id"]
        current_status = pdc["statut"]
        
        print(f"PDC current status: {current_status}")
        
        # If brouillon, try to submit
        if current_status == "brouillon":
            submit_response = api_client.post(f"{BASE_URL}/api/ars1000/pdc/{pdc_id}/submit", headers=farmer_headers)
            assert submit_response.status_code == 200, f"Failed to submit: {submit_response.text}"
            submitted_pdc = submit_response.json()
            assert submitted_pdc["statut"] == "soumis"
            print(f"PASSED: PDC submitted - new status: {submitted_pdc['statut']}")
        
        # If soumis, cooperative can validate
        if current_status == "soumis" or (current_status == "brouillon"):
            # Refresh PDC status
            refresh_response = api_client.get(f"{BASE_URL}/api/ars1000/pdc/my-pdc", headers=farmer_headers)
            refreshed_pdc = refresh_response.json()
            
            if refreshed_pdc and refreshed_pdc["statut"] == "soumis":
                validate_response = api_client.post(f"{BASE_URL}/api/ars1000/pdc/{pdc_id}/validate", headers=coop_headers)
                assert validate_response.status_code == 200, f"Failed to validate: {validate_response.text}"
                validated_pdc = validate_response.json()
                assert validated_pdc["statut"] == "valide"
                print(f"PASSED: PDC validated - new status: {validated_pdc['statut']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
