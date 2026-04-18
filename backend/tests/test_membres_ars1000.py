"""
Test Module: Membres ARS 1000 - Registre des Producteurs
Tests for the 5 sections of the ARS 1000 registry:
1. Identification du Producteur
2. Informations sur la Cacaoyere
3. Informations de Production
4. Travailleurs Agricoles Permanents
5. Composition du Menage
Also tests coop-info endpoints for ARS 1000 cooperative fields.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_EMAIL = "bielaghana@gmail.com"
COOP_PASSWORD = "test123456"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for cooperative user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": COOP_EMAIL,
        "password": COOP_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestMembresAdhesion:
    """Test POST /api/membres/adhesion - Create member with all ARS 1000 fields"""
    
    def test_create_adhesion_with_all_5_sections(self, api_client):
        """Create a member with all 5 ARS 1000 sections populated"""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            # Section 1: IDENTIFICATION DU PRODUCTEUR
            "section": "Section Test",
            "nom": f"TEST_Nom_{unique_id}",
            "prenom": f"Prenom_{unique_id}",
            "numero_enregistrement": f"ENR-{unique_id}",
            "cni_number": f"CNI-{unique_id}",
            "date_naissance": "1985-05-15",
            "sexe": "M",
            "contact": f"+2250700{unique_id[:6]}",
            "localite": "Village Test",
            # Section 2: INFORMATIONS SUR LA CACAOYERE
            "nombre_champs": 3,
            "code_cacaoyere": f"CAC-{unique_id}",
            "date_creation_cacaoyere": "2010-01-01",
            "date_enregistrement": "2024-01-15",
            "superficie_ha": 5.5,
            "culture": "Cacao",
            "densite_pieds": 1200,
            "polygone_disponible": "oui",
            "gps_latitude": "-5.2345",
            "gps_longitude": "4.0123",
            "autres_cultures": "Cafe, Hevea",
            "date_audit_interne": "2024-06-01",
            # Section 3: INFORMATIONS DE PRODUCTION
            "recolte_precedente_kg": 1500.0,
            "volume_vendu_precedent_kg": 1400.0,
            "estimation_rendement_kg_ha": 300.0,
            "volume_certifier_kg": 1200.0,
            # Section 4: TRAVAILLEURS AGRICOLES PERMANENTS
            "nb_travailleurs": 2,
            "travailleurs_liste": [
                {"nom": "Travailleur1", "prenom": "Jean", "sexe": "M", "date_naissance": "1990-03-20"},
                {"nom": "Travailleur2", "prenom": "Marie", "sexe": "F", "date_naissance": "1992-07-10"}
            ],
            # Section 5: COMPOSITION DU MENAGE
            "membres_menage": [
                {
                    "nom": "Menage1", "prenom": "Awa", "sexe": "F", "date_naissance": "1988-01-01",
                    "qualite_filiation": "Conjoint(e)", "frequentation_ecole": "non",
                    "raison_non_scolarisation": "Adulte", "nom_ecole": "", "classe": ""
                },
                {
                    "nom": "Menage2", "prenom": "Kouame", "sexe": "M", "date_naissance": "2015-09-01",
                    "qualite_filiation": "Enfant", "frequentation_ecole": "oui",
                    "raison_non_scolarisation": "", "nom_ecole": "Ecole Primaire Test", "classe": "CE2"
                }
            ],
            # BULLETIN
            "signature_producteur": True,
            "temoin_1_nom": "Temoin Un",
            "temoin_1_signature": True,
            "temoin_2_nom": "Temoin Deux",
            "temoin_2_signature": True,
            "notes": "Test adhesion ARS 1000"
        }
        
        response = api_client.post(f"{BASE_URL}/api/membres/adhesion", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "adhesion" in data
        assert "code_membre" in data
        
        adhesion = data["adhesion"]
        # Verify Section 1 fields
        assert adhesion.get("nom") == payload["nom"]
        assert adhesion.get("prenom") == payload["prenom"]
        assert adhesion.get("sexe") == "M"
        assert adhesion.get("contact") == payload["contact"]
        
        # Verify Section 2 fields
        assert adhesion.get("nombre_champs") == 3
        assert adhesion.get("superficie_ha") == 5.5
        assert adhesion.get("gps_latitude") == "-5.2345"
        
        # Verify Section 3 fields
        assert adhesion.get("recolte_precedente_kg") == 1500.0
        assert adhesion.get("volume_certifier_kg") == 1200.0
        
        # Verify Section 4 - Travailleurs
        assert adhesion.get("nb_travailleurs") == 2
        assert len(adhesion.get("travailleurs_liste", [])) == 2
        
        # Verify Section 5 - Menage
        assert len(adhesion.get("membres_menage", [])) == 2
        
        print(f"PASSED: Created adhesion with code_membre={data['code_membre']}")
        return data["adhesion"]["adhesion_id"]
    
    def test_create_adhesion_minimal_fields(self, api_client):
        """Create adhesion with only required fields"""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "nom": f"TEST_MinNom_{unique_id}",
            "prenom": f"MinPrenom_{unique_id}",
            "sexe": "F",
            "contact": f"+2250701{unique_id[:6]}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/membres/adhesion", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "success"
        assert "code_membre" in data
        
        # Verify default values
        adhesion = data["adhesion"]
        assert adhesion.get("travailleurs_liste") == []
        assert adhesion.get("membres_menage") == []
        assert adhesion.get("superficie_ha") == 0
        
        print(f"PASSED: Created minimal adhesion with code_membre={data['code_membre']}")


class TestMembresRegistre:
    """Test GET /api/membres/registre - Retrieve members with ARS 1000 fields"""
    
    def test_get_registre_returns_all_fields(self, api_client):
        """Verify registre returns all ARS 1000 fields"""
        response = api_client.get(f"{BASE_URL}/api/membres/registre")
        assert response.status_code == 200
        
        data = response.json()
        assert "membres" in data
        assert "total" in data
        
        if data["total"] > 0:
            membre = data["membres"][0]
            # Check Section 1 fields exist
            assert "nom" in membre or "full_name" in membre
            assert "sexe" in membre
            assert "contact" in membre or "phone_number" in membre
            
            # Check Section 2 fields exist
            assert "superficie_ha" in membre or "hectares_approx" in membre
            
            # Check Section 4 & 5 fields exist
            assert "travailleurs_liste" in membre
            assert "membres_menage" in membre
            
            print(f"PASSED: Registre returned {data['total']} members with ARS 1000 fields")
        else:
            print("PASSED: Registre endpoint works (no members yet)")
    
    def test_registre_search_filter(self, api_client):
        """Test search filter on registre"""
        response = api_client.get(f"{BASE_URL}/api/membres/registre?search=TEST_")
        assert response.status_code == 200
        
        data = response.json()
        assert "membres" in data
        print(f"PASSED: Search filter returned {data['total']} results")


class TestCoopInfoARS:
    """Test GET/PUT /api/membres/coop-info - Cooperative ARS 1000 info"""
    
    def test_get_coop_info(self, api_client):
        """Get cooperative ARS 1000 info"""
        response = api_client.get(f"{BASE_URL}/api/membres/coop-info")
        assert response.status_code == 200
        
        data = response.json()
        assert "info" in data
        
        info = data["info"]
        # Verify ARS 1000 fields are present
        assert "campagne" in info
        assert "sigle" in info or info.get("sigle") == ""
        assert "siege" in info or info.get("siege") == ""
        assert "nb_sections" in info
        assert "nb_magasins_stockage" in info
        assert "nb_cacaoyeres" in info
        assert "niveau_certification" in info
        
        print(f"PASSED: Got coop-info with campagne={info.get('campagne')}")
    
    def test_update_coop_info(self, api_client):
        """Update cooperative ARS 1000 info"""
        payload = {
            "campagne": "2024/2025",
            "sigle": "TEST-COOP",
            "siege": "Yamoussoukro",
            "nb_sections": 5,
            "nb_magasins_stockage": 3,
            "nb_cacaoyeres": 150,
            "niveau_certification": "Argent"
        }
        
        response = api_client.put(f"{BASE_URL}/api/membres/coop-info", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "success"
        assert "info" in data
        
        info = data["info"]
        assert info.get("sigle") == "TEST-COOP"
        assert info.get("nb_sections") == 5
        assert info.get("niveau_certification") == "Argent"
        
        print("PASSED: Updated coop-info successfully")
    
    def test_get_coop_info_after_update(self, api_client):
        """Verify coop-info persisted after update"""
        response = api_client.get(f"{BASE_URL}/api/membres/coop-info")
        assert response.status_code == 200
        
        data = response.json()
        info = data["info"]
        assert info.get("sigle") == "TEST-COOP"
        
        print("PASSED: Coop-info persisted correctly")


class TestExportExcel:
    """Test GET /api/membres/export/excel - Excel export with ARS 1000 headers"""
    
    def test_export_excel_returns_file(self, api_client):
        """Verify Excel export works"""
        response = api_client.get(f"{BASE_URL}/api/membres/export/excel")
        assert response.status_code == 200
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type
        
        # Check content disposition
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp
        assert "registre_membres_ars1000.xlsx" in content_disp
        
        # Check file has content
        assert len(response.content) > 0
        
        print(f"PASSED: Excel export returned {len(response.content)} bytes")


class TestReferenceSections:
    """Test GET /api/membres/reference/sections - Registry structure"""
    
    def test_get_sections_structure(self, api_client):
        """Verify sections structure matches ARS 1000"""
        response = api_client.get(f"{BASE_URL}/api/membres/reference/sections")
        assert response.status_code == 200
        
        data = response.json()
        assert "sections" in data
        
        sections = data["sections"]
        # Verify all 5 sections exist
        assert "identification" in sections
        assert "cacaoyere" in sections
        assert "production" in sections
        assert "travailleurs" in sections
        assert "menage" in sections
        
        # Verify identification section has correct fields
        id_section = sections["identification"]
        assert id_section.get("titre") == "IDENTIFICATION DU PRODUCTEUR"
        assert len(id_section.get("champs", [])) >= 8
        
        print("PASSED: Reference sections structure is correct")


class TestAdhesionsList:
    """Test GET /api/membres/adhesions - List adhesions"""
    
    def test_list_adhesions(self, api_client):
        """List all adhesions"""
        response = api_client.get(f"{BASE_URL}/api/membres/adhesions")
        assert response.status_code == 200
        
        data = response.json()
        assert "adhesions" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "total" in stats
        assert "en_cours" in stats
        assert "valides" in stats
        
        print(f"PASSED: Listed {stats['total']} adhesions")


class TestDashboard:
    """Test GET /api/membres/dashboard - Dashboard KPIs"""
    
    def test_get_dashboard(self, api_client):
        """Get membres dashboard"""
        response = api_client.get(f"{BASE_URL}/api/membres/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "kpis" in data
        
        kpis = data["kpis"]
        assert "total" in kpis
        assert "valides" in kpis
        assert "hommes" in kpis
        assert "femmes" in kpis
        assert "total_hectares" in kpis
        
        print(f"PASSED: Dashboard KPIs - total={kpis['total']}, hectares={kpis['total_hectares']}")


# Cleanup test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(api_client):
    """Cleanup TEST_ prefixed data after tests"""
    yield
    # Note: In production, we'd delete test data here
    # For now, we leave it as the data is useful for frontend testing


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
