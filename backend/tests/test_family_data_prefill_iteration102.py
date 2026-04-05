"""
Test family-data endpoint for cross-fiche pre-filling (Iteration 102)
Tests the GET /api/ici-data/farmers/{farmer_id}/family-data endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFamilyDataEndpoint:
    """Tests for the family-data endpoint that merges ICI + SSRTE data"""
    
    def test_family_data_with_existing_farmer(self):
        """Test family-data returns merged ICI+SSRTE data for farmer with existing fiches"""
        farmer_id = "69d27ef947797cbad7193b8a"  # Konan Yao Pierre
        response = requests.get(f"{BASE_URL}/api/ici-data/farmers/{farmer_id}/family-data")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify farmer_id
        assert data["farmer_id"] == farmer_id
        
        # Verify taille_menage = 6 (from SSRTE visit)
        assert data["taille_menage"] == 6, f"Expected taille_menage=6, got {data['taille_menage']}"
        
        # Verify nombre_enfants = 3
        assert data["nombre_enfants"] == 3, f"Expected nombre_enfants=3, got {data['nombre_enfants']}"
        
        # Verify source is ici+ssrte (merged data)
        assert data["source"] == "ici+ssrte", f"Expected source='ici+ssrte', got {data['source']}"
        
        # Verify liste_enfants has 3 children
        assert len(data["liste_enfants"]) == 3, f"Expected 3 children, got {len(data['liste_enfants'])}"
        
        # Verify conditions_vie
        assert data["conditions_vie"] == "moyennes", f"Expected conditions_vie='moyennes', got {data['conditions_vie']}"
        
        # Verify other fields exist
        assert "eau_courante" in data
        assert "electricite" in data
        assert "distance_ecole_km" in data
        
        print(f"✓ Family data for farmer {farmer_id}: taille_menage={data['taille_menage']}, nombre_enfants={data['nombre_enfants']}, source={data['source']}")
    
    def test_family_data_with_unknown_farmer(self):
        """Test family-data returns empty data for farmer with no fiches"""
        farmer_id = "000000000000000000000000"  # Non-existent farmer
        response = requests.get(f"{BASE_URL}/api/ici-data/farmers/{farmer_id}/family-data")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify farmer_id
        assert data["farmer_id"] == farmer_id
        
        # Verify empty data
        assert data["taille_menage"] == 0, f"Expected taille_menage=0, got {data['taille_menage']}"
        assert data["nombre_enfants"] == 0, f"Expected nombre_enfants=0, got {data['nombre_enfants']}"
        assert data["liste_enfants"] == [], f"Expected empty liste_enfants, got {data['liste_enfants']}"
        assert data["conditions_vie"] == "", f"Expected empty conditions_vie, got {data['conditions_vie']}"
        
        # Verify source is null (no data found)
        assert data["source"] is None, f"Expected source=None, got {data['source']}"
        
        print(f"✓ Family data for unknown farmer returns empty data with source=None")
    
    def test_family_data_children_details(self):
        """Test that children details are correctly returned"""
        farmer_id = "69d27ef947797cbad7193b8a"
        response = requests.get(f"{BASE_URL}/api/ici-data/farmers/{farmer_id}/family-data")
        
        assert response.status_code == 200
        data = response.json()
        
        children = data["liste_enfants"]
        assert len(children) == 3
        
        # Verify child structure
        for child in children:
            assert "prenom" in child
            assert "sexe" in child
            assert "age" in child
            assert "scolarise" in child
            assert "travaille_exploitation" in child
        
        # Verify specific children (from SSRTE visit data)
        child_names = [c["prenom"] for c in children]
        assert "Awa" in child_names, "Expected child 'Awa' in list"
        assert "Moussa" in child_names, "Expected child 'Moussa' in list"
        assert "Fatou" in child_names, "Expected child 'Fatou' in list"
        
        print(f"✓ Children details verified: {child_names}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
