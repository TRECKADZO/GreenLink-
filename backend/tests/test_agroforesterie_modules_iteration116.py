"""
Test ARS 1000 Agroforesterie Modules - Iteration 116
Tests for:
- Species database (44 compatible + 10 banned)
- Species filters (strate, usage, search)
- Nursery calendar
- Advanced diagnostic
- Environmental protection CRUD
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicSpeciesEndpoints:
    """Public endpoints - no auth required"""
    
    def test_get_all_species(self):
        """GET /api/ars1000/agroforesterie/especes - Full species list"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "especes_compatibles" in data
        assert "total_compatibles" in data
        assert "total_interdites" in data
        assert "strates" in data
        
        # Verify 44 compatible species
        assert data["total_compatibles"] == 44
        assert len(data["especes_compatibles"]) == 44
        
        # Verify species structure
        first_species = data["especes_compatibles"][0]
        assert "id" in first_species
        assert "nom_scientifique" in first_species
        assert "nom_local" in first_species
        assert "strate" in first_species
        assert "hauteur_max_m" in first_species
        assert "reproduction" in first_species
        assert "duree_pepiniere_mois" in first_species
        assert "fructification" in first_species
        assert "usages" in first_species
        assert "compatible_cacao" in first_species
        
        print(f"✓ GET /especes: {data['total_compatibles']} compatible species returned")
    
    def test_filter_by_strate_3(self):
        """GET /api/ars1000/agroforesterie/especes?strate=3 - Filter by strate 3"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes?strate=3")
        assert response.status_code == 200
        data = response.json()
        
        # All returned species should be strate 3
        for species in data["especes_compatibles"]:
            assert species["strate"] == "3"
        
        # Should have 14 strate 3 species
        assert data["total_compatibles"] == 14
        print(f"✓ Strate 3 filter: {data['total_compatibles']} species")
    
    def test_filter_by_strate_2(self):
        """GET /api/ars1000/agroforesterie/especes?strate=2 - Filter by strate 2"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes?strate=2")
        assert response.status_code == 200
        data = response.json()
        
        for species in data["especes_compatibles"]:
            assert species["strate"] == "2"
        
        assert data["total_compatibles"] == 14
        print(f"✓ Strate 2 filter: {data['total_compatibles']} species")
    
    def test_filter_by_strate_1(self):
        """GET /api/ars1000/agroforesterie/especes?strate=1 - Filter by strate 1"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes?strate=1")
        assert response.status_code == 200
        data = response.json()
        
        for species in data["especes_compatibles"]:
            assert species["strate"] == "1"
        
        assert data["total_compatibles"] == 7
        print(f"✓ Strate 1 filter: {data['total_compatibles']} species")
    
    def test_filter_by_usage_alimentation(self):
        """GET /api/ars1000/agroforesterie/especes?usage=Alimentation - Filter by usage"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes?usage=Alimentation")
        assert response.status_code == 200
        data = response.json()
        
        # All returned species should have Alimentation in usages
        for species in data["especes_compatibles"]:
            usages_lower = [u.lower() for u in species["usages"]]
            assert any("alimentation" in u for u in usages_lower)
        
        assert data["total_compatibles"] > 0
        print(f"✓ Usage Alimentation filter: {data['total_compatibles']} species")
    
    def test_filter_by_usage_bois(self):
        """GET /api/ars1000/agroforesterie/especes?usage=Bois - Filter by Bois d'oeuvre"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes?usage=Bois")
        assert response.status_code == 200
        data = response.json()
        
        for species in data["especes_compatibles"]:
            usages_lower = [u.lower() for u in species["usages"]]
            assert any("bois" in u for u in usages_lower)
        
        assert data["total_compatibles"] > 0
        print(f"✓ Usage Bois filter: {data['total_compatibles']} species")
    
    def test_search_by_name_iroko(self):
        """GET /api/ars1000/agroforesterie/especes?search=Iroko - Search by name"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes?search=Iroko")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_compatibles"] == 1
        assert data["especes_compatibles"][0]["nom_local"] == "Iroko"
        assert data["especes_compatibles"][0]["nom_scientifique"] == "Milicia excelsa"
        print(f"✓ Search Iroko: Found {data['total_compatibles']} species")
    
    def test_search_by_scientific_name(self):
        """GET /api/ars1000/agroforesterie/especes?search=Milicia - Search by scientific name"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes?search=Milicia")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_compatibles"] >= 1
        assert any("Milicia" in s["nom_scientifique"] for s in data["especes_compatibles"])
        print(f"✓ Search Milicia: Found {data['total_compatibles']} species")
    
    def test_include_banned_species(self):
        """GET /api/ars1000/agroforesterie/especes?include_interdites=true - Include banned species"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes?include_interdites=true")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_compatibles"] == 44
        assert data["total_interdites"] == 10
        assert len(data["especes_interdites"]) == 10
        
        # Verify banned species structure
        banned = data["especes_interdites"][0]
        assert "id" in banned
        assert "nom_scientifique" in banned
        assert "nom_local" in banned
        assert "raison" in banned
        print(f"✓ Include interdites: {data['total_compatibles']} compatible, {data['total_interdites']} banned")
    
    def test_get_banned_species_only(self):
        """GET /api/ars1000/agroforesterie/especes-interdites - List of 10 banned species"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/especes-interdites")
        assert response.status_code == 200
        data = response.json()
        
        assert "especes" in data
        assert "total" in data
        assert data["total"] == 10
        assert len(data["especes"]) == 10
        
        # Verify known banned species
        banned_names = [s["nom_local"] for s in data["especes"]]
        assert "Baobab" in banned_names
        assert "Fromager" in banned_names
        assert "Papayer" in banned_names
        
        print(f"✓ GET /especes-interdites: {data['total']} banned species")


class TestNurseryCalendar:
    """Nursery calendar endpoint tests"""
    
    def test_get_nursery_calendar(self):
        """GET /api/ars1000/agroforesterie/pepiniere/calendrier - Nursery calendar"""
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/pepiniere/calendrier")
        assert response.status_code == 200
        data = response.json()
        
        assert "calendrier" in data
        assert "total" in data
        assert "stats" in data
        
        # Should have 44 species
        assert data["total"] == 44
        
        # Verify stats
        assert "duree_min_mois" in data["stats"]
        assert "duree_max_mois" in data["stats"]
        assert "par_technique" in data["stats"]
        
        # Verify calendar is sorted by duration
        durations = [e["duree_pepiniere_mois"] for e in data["calendrier"]]
        assert durations == sorted(durations)
        
        # Verify calendar entry structure
        entry = data["calendrier"][0]
        assert "id" in entry
        assert "nom_scientifique" in entry
        assert "nom_local" in entry
        assert "strate" in entry
        assert "duree_pepiniere_mois" in entry
        assert "reproduction" in entry
        assert "fructification" in entry
        
        print(f"✓ Nursery calendar: {data['total']} species, duration {data['stats']['duree_min_mois']}-{data['stats']['duree_max_mois']} months")


class TestProtectedDiagnosticEndpoints:
    """Protected endpoints - require auth"""
    
    @pytest.fixture
    def coop_token(self):
        """Get cooperative auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not authenticate cooperative")
    
    def test_post_diagnostic(self, coop_token):
        """POST /api/ars1000/agroforesterie/diagnostic - Advanced diagnostic"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        payload = {
            "parcelle": {"superficie_ha": 2.5},
            "arbres": {
                "nombre_total": 80,
                "especes": ["Iroko", "Fraké", "Avocatier", "Manguier"],
                "strate_haute": 20,
                "strate_moyenne": 35,
                "strate_basse": 25
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/ars1000/agroforesterie/diagnostic", 
                                 headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify diagnostic structure
        assert "score" in data
        assert "conforme" in data
        assert "criteres" in data
        assert "recommandations" in data
        assert "superficie_ha" in data
        assert "total_arbres" in data
        assert "densite_calculee" in data
        
        # Verify criteria
        assert "densite" in data["criteres"]
        assert "nb_especes" in data["criteres"]
        assert "strate3" in data["criteres"]
        assert "deux_strates" in data["criteres"]
        assert "ombrage_max" in data["criteres"]
        assert "liste_noire" in data["criteres"]
        
        # This should be conformant (score >= 80)
        assert data["score"] >= 80
        assert data["conforme"] == True
        
        print(f"✓ POST /diagnostic: Score {data['score']}%, Conforme: {data['conforme']}")
    
    def test_post_diagnostic_non_conformant(self, coop_token):
        """POST /api/ars1000/agroforesterie/diagnostic - Non-conformant case"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        payload = {
            "parcelle": {"superficie_ha": 2.0},
            "arbres": {
                "nombre_total": 10,  # Too few trees
                "especes": ["Avocatier"],  # Only 1 species
                "strate_haute": 0,
                "strate_moyenne": 5,
                "strate_basse": 5
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/ars1000/agroforesterie/diagnostic", 
                                 headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Should have recommendations
        assert len(data["recommandations"]) > 0
        
        # Density should be non-conformant (10/2 = 5 arbres/ha, need 25-40)
        assert data["criteres"]["densite"]["conforme"] == False
        
        # Species diversity should be non-conformant (1 < 3)
        assert data["criteres"]["nb_especes"]["conforme"] == False
        
        print(f"✓ POST /diagnostic (non-conformant): Score {data['score']}%, {len(data['recommandations'])} recommendations")
    
    def test_get_cooperative_diagnostic(self, coop_token):
        """GET /api/ars1000/agroforesterie/diagnostic/cooperative - Cooperative-wide diagnostic"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/diagnostic/cooperative", 
                                headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_pdcs" in data
        assert "conformes" in data
        assert "non_conformes" in data
        assert "score_moyen" in data
        assert "problemes_frequents" in data
        assert "diagnostics" in data
        
        print(f"✓ GET /diagnostic/cooperative: {data['total_pdcs']} PDCs, {data['conformes']} conformes, avg score {data['score_moyen']}%")


class TestProtectionEnvironnementale:
    """Environmental protection CRUD tests"""
    
    @pytest.fixture
    def coop_token(self):
        """Get cooperative auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not authenticate cooperative")
    
    def test_post_protection_cours_eau(self, coop_token):
        """POST /api/ars1000/agroforesterie/protection-env - Water course protection"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        payload = {
            "type_protection": "cours_eau",
            "description": "TEST Protection cours d'eau - bande enherbée",
            "distance_cours_eau_m": 15,
            "mesures_prises": ["Bande enherbée 10m", "Arbres plantés"]
        }
        
        response = requests.post(f"{BASE_URL}/api/ars1000/agroforesterie/protection-env", 
                                 headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["message"] == "Mesure enregistrée"
        assert data["conforme_distance_eau"] == True  # 15m >= 10m required
        
        print(f"✓ POST /protection-env (cours_eau): ID {data['id']}, conforme: {data['conforme_distance_eau']}")
    
    def test_post_protection_non_conforme(self, coop_token):
        """POST /api/ars1000/agroforesterie/protection-env - Non-conformant distance"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        payload = {
            "type_protection": "cours_eau",
            "description": "TEST Protection trop proche",
            "distance_cours_eau_m": 5,  # Less than 10m required
            "mesures_prises": []
        }
        
        response = requests.post(f"{BASE_URL}/api/ars1000/agroforesterie/protection-env", 
                                 headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["conforme_distance_eau"] == False  # 5m < 10m required
        
        print(f"✓ POST /protection-env (non-conforme): conforme: {data['conforme_distance_eau']}")
    
    def test_post_protection_reforestation(self, coop_token):
        """POST /api/ars1000/agroforesterie/protection-env - Reforestation"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        payload = {
            "type_protection": "reforestation",
            "description": "TEST Reforestation compensatoire",
            "superficie_reboisee_ha": 0.5,
            "especes_plantees": ["Iroko", "Fraké", "Samba"]
        }
        
        response = requests.post(f"{BASE_URL}/api/ars1000/agroforesterie/protection-env", 
                                 headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        print(f"✓ POST /protection-env (reforestation): ID {data['id']}")
    
    def test_get_protection_env_list(self, coop_token):
        """GET /api/ars1000/agroforesterie/protection-env - List protection measures"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        
        response = requests.get(f"{BASE_URL}/api/ars1000/agroforesterie/protection-env", 
                                headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "mesures" in data
        assert "total" in data
        assert "par_type" in data
        
        # Verify par_type structure
        assert "cours_eau" in data["par_type"]
        assert "anti_erosion" in data["par_type"]
        assert "reforestation" in data["par_type"]
        assert "zone_risque" in data["par_type"]
        
        print(f"✓ GET /protection-env: {data['total']} measures, par_type: {data['par_type']}")


class TestDiagnosticWithBannedSpecies:
    """Test diagnostic with banned species detection"""
    
    @pytest.fixture
    def coop_token(self):
        """Get cooperative auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Could not authenticate cooperative")
    
    def test_diagnostic_with_banned_species(self, coop_token):
        """POST /api/ars1000/agroforesterie/diagnostic - With banned species"""
        headers = {"Authorization": f"Bearer {coop_token}"}
        payload = {
            "parcelle": {"superficie_ha": 2.0},
            "arbres": {
                "nombre_total": 60,
                "especes": ["Iroko", "Fraké", "Baobab", "Fromager"],  # Baobab and Fromager are banned
                "strate_haute": 20,
                "strate_moyenne": 25,
                "strate_basse": 15
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/ars1000/agroforesterie/diagnostic", 
                                 headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Should detect banned species
        assert data["criteres"]["liste_noire"]["conforme"] == False
        assert len(data["especes_interdites_detectees"]) > 0
        
        # Should have recommendation to remove banned species
        has_remove_recommendation = any("Retirer" in r or "interdite" in r.lower() for r in data["recommandations"])
        assert has_remove_recommendation
        
        print(f"✓ Diagnostic with banned species: Detected {data['especes_interdites_detectees']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
