from test_config import ADMIN_EMAIL, ADMIN_PASSWORD, COOP_EMAIL, COOP_PASSWORD, BASE_URL

"""
"""
Test French Key Harmonization - Iteration 52
Test French Key Harmonization - Iteration 52
Tests that all API response keys have been properly renamed from English to French.
Tests that all API response keys have been properly renamed from English to French.
"""
"""

import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOPERATIVE_CREDS = {"identifier": COOP_EMAIL, "password": "greenlink2024"}


class TestAuthentication:
    """Test authentication to get tokens for subsequent tests"""
    
    def test_cooperative_login(self):
        """Test cooperative login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        # Store token for other tests
        TestAuthentication.coop_token = data["access_token"]
        print(f"✓ Cooperative login successful, token obtained")


class TestCooperativeDashboardFrenchKeys:
    """Test GET /api/cooperative/dashboard returns French keys"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        if not hasattr(TestAuthentication, 'coop_token'):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
            TestAuthentication.coop_token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {TestAuthentication.coop_token}"}
    
    def test_dashboard_parcelles_french_keys(self):
        """Test dashboard returns parcelles with French keys"""
        response = requests.get(f"{BASE_URL}/api/cooperative/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Check parcelles section exists
        assert "parcelles" in data, "Response should contain 'parcelles' key"
        parcelles = data["parcelles"]
        
        # Check French keys in parcelles
        assert "superficie_totale" in parcelles, "parcelles should have 'superficie_totale' (not 'total_hectares')"
        assert "score_carbone_moyen" in parcelles, "parcelles should have 'score_carbone_moyen' (not 'average_carbon_score')"
        assert "co2_total" in parcelles, "parcelles should have 'co2_total'"
        
        # Verify English keys are NOT present
        assert "total_hectares" not in parcelles, "parcelles should NOT have English key 'total_hectares'"
        assert "average_carbon_score" not in parcelles, "parcelles should NOT have English key 'average_carbon_score'"
        
        print(f"✓ Dashboard parcelles French keys verified:")
        print(f"  - superficie_totale: {parcelles.get('superficie_totale')}")
        print(f"  - score_carbone_moyen: {parcelles.get('score_carbone_moyen')}")
        print(f"  - co2_total: {parcelles.get('co2_total')}")


class TestCooperativeParcelsAllFrenchKeys:
    """Test GET /api/cooperative/parcels/all returns French keys"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        if not hasattr(TestAuthentication, 'coop_token'):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
            TestAuthentication.coop_token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {TestAuthentication.coop_token}"}
    
    def test_parcels_all_french_keys(self):
        """Test parcels/all returns French keys for each parcel"""
        response = requests.get(f"{BASE_URL}/api/cooperative/parcels/all", headers=self.headers)
        assert response.status_code == 200, f"Parcels/all failed: {response.text}"
        data = response.json()
        
        # Check compteurs_statut exists (French for status_counts)
        assert "compteurs_statut" in data, "Response should have 'compteurs_statut' (not 'status_counts')"
        assert "status_counts" not in data, "Response should NOT have English key 'status_counts'"
        
        # Check parcelles array exists
        assert "parcelles" in data, "Response should have 'parcelles' array"
        parcelles = data["parcelles"]
        
        if len(parcelles) > 0:
            parcel = parcelles[0]
            
            # Check French keys in parcel objects
            assert "nom_producteur" in parcel, "Parcel should have 'nom_producteur' (not 'farmer_name')"
            assert "superficie" in parcel, "Parcel should have 'superficie' (not 'area_hectares')"
            assert "type_culture" in parcel, "Parcel should have 'type_culture' (not 'crop_type')"
            assert "score_carbone" in parcel, "Parcel should have 'score_carbone' (not 'carbon_score')"
            assert "statut_verification" in parcel, "Parcel should have 'statut_verification' (not 'verification_status')"
            
            # Verify English keys are NOT present
            assert "farmer_name" not in parcel, "Parcel should NOT have English key 'farmer_name'"
            assert "area_hectares" not in parcel, "Parcel should NOT have English key 'area_hectares'"
            assert "crop_type" not in parcel, "Parcel should NOT have English key 'crop_type'"
            assert "carbon_score" not in parcel, "Parcel should NOT have English key 'carbon_score'"
            assert "verification_status" not in parcel, "Parcel should NOT have English key 'verification_status'"
            
            print(f"✓ Parcels/all French keys verified for {len(parcelles)} parcels:")
            print(f"  - nom_producteur: {parcel.get('nom_producteur')}")
            print(f"  - superficie: {parcel.get('superficie')}")
            print(f"  - type_culture: {parcel.get('type_culture')}")
            print(f"  - score_carbone: {parcel.get('score_carbone')}")
            print(f"  - statut_verification: {parcel.get('statut_verification')}")
        else:
            print("⚠ No parcels found to verify keys, but endpoint works")
        
        print(f"✓ compteurs_statut: {data.get('compteurs_statut')}")


class TestCooperativeMembersFrenchKeys:
    """Test GET /api/cooperative/members returns French keys"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        if not hasattr(TestAuthentication, 'coop_token'):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
            TestAuthentication.coop_token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {TestAuthentication.coop_token}"}
    
    def test_members_french_keys(self):
        """Test members endpoint returns French keys for each member"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=self.headers)
        assert response.status_code == 200, f"Members failed: {response.text}"
        data = response.json()
        
        assert "members" in data, "Response should have 'members' array"
        members = data["members"]
        
        if len(members) > 0:
            member = members[0]
            
            # Check French keys in member objects
            assert "nombre_parcelles" in member, "Member should have 'nombre_parcelles' (not 'parcels_count')"
            assert "superficie_totale" in member, "Member should have 'superficie_totale' (not 'total_hectares')"
            assert "score_carbone_moyen" in member, "Member should have 'score_carbone_moyen' (not 'average_carbon_score')"
            
            # Verify English keys are NOT present
            assert "parcels_count" not in member, "Member should NOT have English key 'parcels_count'"
            assert "total_hectares" not in member, "Member should NOT have English key 'total_hectares'"
            assert "average_carbon_score" not in member, "Member should NOT have English key 'average_carbon_score'"
            
            print(f"✓ Members French keys verified for {len(members)} members:")
            print(f"  - nombre_parcelles: {member.get('nombre_parcelles')}")
            print(f"  - superficie_totale: {member.get('superficie_totale')}")
            print(f"  - score_carbone_moyen: {member.get('score_carbone_moyen')}")
        else:
            print("⚠ No members found to verify keys, but endpoint works")


class TestSSRTEVisitsFrenchKeys:
    """Test GET /api/ssrte/visits returns French keys"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        if not hasattr(TestAuthentication, 'coop_token'):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
            TestAuthentication.coop_token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {TestAuthentication.coop_token}"}
    
    def test_ssrte_visits_french_keys(self):
        """Test SSRTE visits endpoint returns French keys"""
        response = requests.get(f"{BASE_URL}/api/ssrte/visits", headers=self.headers)
        assert response.status_code == 200, f"SSRTE visits failed: {response.text}"
        data = response.json()
        
        assert "visits" in data, "Response should have 'visits' array"
        visits = data["visits"]
        
        if len(visits) > 0:
            visit = visits[0]
            
            # Check French keys in visit objects
            assert "nom_membre" in visit, "Visit should have 'nom_membre' (not 'member_name')"
            assert "date_visite" in visit, "Visit should have 'date_visite' (not 'visit_date')"
            assert "niveau_risque" in visit, "Visit should have 'niveau_risque' (not 'risk_level')"
            assert "enfants_observes" in visit, "Visit should have 'enfants_observes' (not 'children_count')"
            assert "taille_menage" in visit, "Visit should have 'taille_menage' (not 'household_size')"
            
            # Verify English keys are NOT present
            assert "member_name" not in visit, "Visit should NOT have English key 'member_name'"
            assert "visit_date" not in visit, "Visit should NOT have English key 'visit_date'"
            assert "risk_level" not in visit, "Visit should NOT have English key 'risk_level'"
            assert "children_count" not in visit, "Visit should NOT have English key 'children_count'"
            assert "household_size" not in visit, "Visit should NOT have English key 'household_size'"
            
            print(f"✓ SSRTE visits French keys verified for {len(visits)} visits:")
            print(f"  - nom_membre: {visit.get('nom_membre')}")
            print(f"  - date_visite: {visit.get('date_visite')}")
            print(f"  - niveau_risque: {visit.get('niveau_risque')}")
            print(f"  - enfants_observes: {visit.get('enfants_observes')}")
            print(f"  - taille_menage: {visit.get('taille_menage')}")
        else:
            print("⚠ No SSRTE visits found to verify keys, but endpoint works")


class TestSSRTEAnalyticsRouteCollisionFix:
    """Test route collision fix: /api/ssrte/analytics/visits should work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        if not hasattr(TestAuthentication, 'coop_token'):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
            TestAuthentication.coop_token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {TestAuthentication.coop_token}"}
    
    def test_ssrte_analytics_visits_endpoint(self):
        """Test that /api/ssrte/analytics/visits endpoint works (moved from /api/ssrte/visits in ssrte_analytics.py)"""
        response = requests.get(f"{BASE_URL}/api/ssrte/analytics/visits", headers=self.headers)
        assert response.status_code == 200, f"SSRTE analytics/visits failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "visits" in data, "Response should have 'visits' array"
        assert "total" in data, "Response should have 'total' count"
        
        print(f"✓ SSRTE analytics/visits endpoint works (route collision fixed)")
        print(f"  - Total visits: {data.get('total')}")
        
        # Verify French keys in analytics visits too
        visits = data["visits"]
        if len(visits) > 0:
            visit = visits[0]
            # Analytics visits should also have French keys
            assert "nom_producteur" in visit or "nom_membre" in visit, "Analytics visit should have French name key"
            assert "date_visite" in visit, "Analytics visit should have 'date_visite'"
            assert "niveau_risque" in visit, "Analytics visit should have 'niveau_risque'"
            print(f"✓ Analytics visits also use French keys")
    
    def test_ssrte_main_visits_still_works(self):
        """Test that /api/ssrte/visits (main route) still works"""
        response = requests.get(f"{BASE_URL}/api/ssrte/visits", headers=self.headers)
        assert response.status_code == 200, f"SSRTE main visits failed: {response.text}"
        data = response.json()
        
        assert "visits" in data, "Response should have 'visits' array"
        print(f"✓ SSRTE main /visits endpoint still works")


class TestMemberParcelsFrenchKeys:
    """Test GET /api/cooperative/members/{id}/parcels returns French keys"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        if not hasattr(TestAuthentication, 'coop_token'):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
            TestAuthentication.coop_token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {TestAuthentication.coop_token}"}
    
    def test_member_parcels_french_keys(self):
        """Test member parcels endpoint returns French keys"""
        # First get a member ID
        members_response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=self.headers)
        assert members_response.status_code == 200
        members = members_response.json().get("members", [])
        
        if len(members) == 0:
            pytest.skip("No members available to test")
        
        member_id = members[0]["id"]
        
        # Get member's parcels
        response = requests.get(f"{BASE_URL}/api/cooperative/members/{member_id}/parcels", headers=self.headers)
        assert response.status_code == 200, f"Member parcels failed: {response.text}"
        data = response.json()
        
        # Check French keys in response
        assert "membre_id" in data, "Response should have 'membre_id'"
        assert "nom_membre" in data, "Response should have 'nom_membre'"
        assert "total_parcelles" in data, "Response should have 'total_parcelles'"
        assert "superficie_totale" in data, "Response should have 'superficie_totale'"
        assert "co2_total" in data, "Response should have 'co2_total'"
        assert "score_carbone_moyen" in data, "Response should have 'score_carbone_moyen'"
        
        # Check parcelles array
        assert "parcelles" in data, "Response should have 'parcelles' array"
        parcelles = data["parcelles"]
        
        if len(parcelles) > 0:
            parcel = parcelles[0]
            # Check French keys in parcel objects
            assert "localisation" in parcel, "Parcel should have 'localisation'"
            assert "superficie" in parcel, "Parcel should have 'superficie'"
            assert "type_culture" in parcel, "Parcel should have 'type_culture'"
            assert "score_carbone" in parcel, "Parcel should have 'score_carbone'"
            assert "co2_capture" in parcel, "Parcel should have 'co2_capture'"
            assert "statut_verification" in parcel, "Parcel should have 'statut_verification'"
            
            print(f"✓ Member parcels French keys verified:")
            print(f"  - localisation: {parcel.get('localisation')}")
            print(f"  - superficie: {parcel.get('superficie')}")
            print(f"  - type_culture: {parcel.get('type_culture')}")
            print(f"  - score_carbone: {parcel.get('score_carbone')}")
        else:
            print("⚠ No parcels for this member, but endpoint works")


class TestParcelDetailsFrenchKeys:
    """Test GET /api/cooperative/parcels/{id}/details returns French keys"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        if not hasattr(TestAuthentication, 'coop_token'):
            response = requests.post(f"{BASE_URL}/api/auth/login", json=COOPERATIVE_CREDS)
            TestAuthentication.coop_token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {TestAuthentication.coop_token}"}
    
    def test_parcel_details_french_keys(self):
        """Test parcel details endpoint returns French keys"""
        # First get a parcel ID
        parcels_response = requests.get(f"{BASE_URL}/api/cooperative/parcels/all", headers=self.headers)
        assert parcels_response.status_code == 200
        parcelles = parcels_response.json().get("parcelles", [])
        
        if len(parcelles) == 0:
            pytest.skip("No parcels available to test")
        
        parcel_id = parcelles[0]["id"]
        
        # Get parcel details
        response = requests.get(f"{BASE_URL}/api/cooperative/parcels/{parcel_id}/details", headers=self.headers)
        assert response.status_code == 200, f"Parcel details failed: {response.text}"
        data = response.json()
        
        # Check French keys in response
        assert "localisation" in data, "Response should have 'localisation'"
        assert "superficie" in data, "Response should have 'superficie'"
        assert "type_culture" in data, "Response should have 'type_culture'"
        assert "score_carbone" in data, "Response should have 'score_carbone'"
        assert "co2_capture" in data, "Response should have 'co2_capture'"
        assert "statut_verification" in data, "Response should have 'statut_verification'"
        assert "coordonnees_gps" in data, "Response should have 'coordonnees_gps'"
        assert "conforme_eudr" in data, "Response should have 'conforme_eudr'"
        
        # Check producteur section
        assert "producteur" in data, "Response should have 'producteur' section"
        producteur = data["producteur"]
        assert "nom" in producteur, "Producteur should have 'nom'"
        
        print(f"✓ Parcel details French keys verified:")
        print(f"  - localisation: {data.get('localisation')}")
        print(f"  - superficie: {data.get('superficie')}")
        print(f"  - score_carbone: {data.get('score_carbone')}")
        print(f"  - statut_verification: {data.get('statut_verification')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
