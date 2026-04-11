"""
PDC v2 GPS Tracking Feature Tests
Tests for the GPS tracking mode in ParcelMapGarmin component
- Backend API tests for carte_parcelle data persistence
- Polygon and arbres_ombrage data structure validation
- PDF generation with map section
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test PDC ID with map data (KINDA YABRE)
TEST_PDC_ID = "69d96ef8a99d36666f85edb2"

# Cooperative credentials
COOP_EMAIL = os.environ.get("TEST_COOP_EMAIL", "bielaghana@gmail.com")
COOP_PASSWORD = os.environ.get("TEST_COOP_PASSWORD", "test123456")


@pytest.fixture(scope="module")
def auth_session():
    """Setup authenticated session for all tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as cooperative
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"identifier": COOP_EMAIL, "password": COOP_PASSWORD}
    )
    
    if login_response.status_code == 200:
        token = login_response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    else:
        pytest.skip(f"Authentication failed: {login_response.status_code}")


def test_01_login_cooperative():
    """Test cooperative login"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"identifier": COOP_EMAIL, "password": COOP_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    print(f"✓ Cooperative login successful")


def test_02_get_pdc_with_carte_parcelle(auth_session):
    """Test GET /api/pdc-v2/{id} returns carte_parcelle with polygon and arbres_ombrage"""
    response = auth_session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
    assert response.status_code == 200, f"Failed to get PDC: {response.text}"
    
    data = response.json()
    assert "step1" in data
    assert "fiche2" in data["step1"]
    
    fiche2 = data["step1"]["fiche2"]
    assert "carte_parcelle" in fiche2, "carte_parcelle missing from fiche2"
    
    carte = fiche2["carte_parcelle"]
    assert "polygon" in carte, "polygon missing from carte_parcelle"
    assert "arbres_ombrage" in carte, "arbres_ombrage missing from carte_parcelle"
    
    print(f"✓ PDC has carte_parcelle structure")
    print(f"  - Polygon vertices: {len(carte.get('polygon', []))}")
    print(f"  - Trees: {len(carte.get('arbres_ombrage', []))}")


def test_03_carte_parcelle_polygon_structure(auth_session):
    """Test polygon data structure (array of [lat, lng] coordinates)"""
    response = auth_session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
    assert response.status_code == 200
    
    carte = response.json()["step1"]["fiche2"]["carte_parcelle"]
    polygon = carte.get("polygon", [])
    
    if len(polygon) > 0:
        # Each vertex should be [lat, lng]
        for i, vertex in enumerate(polygon):
            assert isinstance(vertex, list), f"Vertex {i} should be a list"
            assert len(vertex) == 2, f"Vertex {i} should have 2 coordinates"
            assert isinstance(vertex[0], (int, float)), f"Vertex {i} lat should be numeric"
            assert isinstance(vertex[1], (int, float)), f"Vertex {i} lng should be numeric"
        print(f"✓ Polygon has {len(polygon)} valid vertices")
    else:
        print("⚠ Polygon is empty (no vertices)")


def test_04_carte_parcelle_arbres_structure(auth_session):
    """Test arbres_ombrage data structure"""
    response = auth_session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
    assert response.status_code == 200
    
    carte = response.json()["step1"]["fiche2"]["carte_parcelle"]
    arbres = carte.get("arbres_ombrage", [])
    
    if len(arbres) > 0:
        for i, arbre in enumerate(arbres):
            assert "lat" in arbre, f"Tree {i} missing lat"
            assert "lng" in arbre, f"Tree {i} missing lng"
            assert isinstance(arbre["lat"], (int, float)), f"Tree {i} lat should be numeric"
            assert isinstance(arbre["lng"], (int, float)), f"Tree {i} lng should be numeric"
        print(f"✓ {len(arbres)} trees with valid coordinates")
    else:
        print("⚠ No trees in carte_parcelle")


def test_05_save_step1_with_polygon_data(auth_session):
    """Test PUT /api/pdc-v2/{id}/step1 saves polygon data (simulating GPS tracking result)"""
    # First get current data
    get_response = auth_session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
    assert get_response.status_code == 200
    
    current_data = get_response.json()
    fiche2 = current_data["step1"]["fiche2"]
    
    # Simulate GPS tracking result - add a new polygon point
    current_polygon = fiche2.get("carte_parcelle", {}).get("polygon", [])
    
    # Create test polygon with 5 points (simulating GPS tracking)
    test_polygon = [
        [6.8001, -5.3001],
        [6.8002, -5.3002],
        [6.8003, -5.3003],
        [6.8004, -5.3004],
        [6.8005, -5.3005]
    ]
    
    # Update fiche2 with new polygon
    fiche2["carte_parcelle"] = {
        **fiche2.get("carte_parcelle", {}),
        "polygon": test_polygon
    }
    
    # Save
    save_response = auth_session.put(
        f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/step1",
        json={"fiche2": fiche2}
    )
    assert save_response.status_code == 200, f"Save failed: {save_response.text}"
    
    # Verify saved
    verify_response = auth_session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
    saved_polygon = verify_response.json()["step1"]["fiche2"]["carte_parcelle"]["polygon"]
    assert len(saved_polygon) == 5, f"Expected 5 vertices, got {len(saved_polygon)}"
    
    print(f"✓ Polygon data saved successfully (5 vertices)")
    
    # Restore original polygon
    fiche2["carte_parcelle"]["polygon"] = current_polygon
    auth_session.put(
        f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/step1",
        json={"fiche2": fiche2}
    )
    print(f"✓ Original polygon restored ({len(current_polygon)} vertices)")


def test_06_save_step1_with_arbres_data(auth_session):
    """Test PUT /api/pdc-v2/{id}/step1 saves arbres_ombrage data"""
    # Get current data
    get_response = auth_session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
    assert get_response.status_code == 200
    
    current_data = get_response.json()
    fiche2 = current_data["step1"]["fiche2"]
    current_arbres = fiche2.get("carte_parcelle", {}).get("arbres_ombrage", [])
    
    # Add a test tree
    test_arbres = current_arbres + [{
        "lat": 6.8010,
        "lng": -5.3010,
        "nom": "Test Tree",
        "numero": len(current_arbres) + 1
    }]
    
    fiche2["carte_parcelle"] = {
        **fiche2.get("carte_parcelle", {}),
        "arbres_ombrage": test_arbres
    }
    
    # Save
    save_response = auth_session.put(
        f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/step1",
        json={"fiche2": fiche2}
    )
    assert save_response.status_code == 200, f"Save failed: {save_response.text}"
    
    # Verify
    verify_response = auth_session.get(f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}")
    saved_arbres = verify_response.json()["step1"]["fiche2"]["carte_parcelle"]["arbres_ombrage"]
    assert len(saved_arbres) == len(test_arbres), f"Expected {len(test_arbres)} trees, got {len(saved_arbres)}"
    
    print(f"✓ Arbres data saved successfully ({len(saved_arbres)} trees)")
    
    # Restore original
    fiche2["carte_parcelle"]["arbres_ombrage"] = current_arbres
    auth_session.put(
        f"{BASE_URL}/api/pdc-v2/{TEST_PDC_ID}/step1",
        json={"fiche2": fiche2}
    )
    print(f"✓ Original arbres restored ({len(current_arbres)} trees)")


def test_07_pdf_generation(auth_session):
    """Test GET /api/pdc-v2/pdf/{id} generates valid PDF"""
    response = auth_session.get(f"{BASE_URL}/api/pdc-v2/pdf/{TEST_PDC_ID}")
    assert response.status_code == 200, f"PDF generation failed: {response.text}"
    
    # Check content type
    content_type = response.headers.get("Content-Type", "")
    assert "application/pdf" in content_type, f"Expected PDF, got {content_type}"
    
    # Check PDF size (should be substantial)
    pdf_size = len(response.content)
    assert pdf_size > 10000, f"PDF too small ({pdf_size} bytes)"
    
    # Check PDF header
    assert response.content[:4] == b'%PDF', "Invalid PDF header"
    
    print(f"✓ PDF generated successfully ({pdf_size} bytes)")


def test_08_pdc_list_endpoint(auth_session):
    """Test GET /api/pdc-v2/list still works (regression)"""
    response = auth_session.get(f"{BASE_URL}/api/pdc-v2/list")
    assert response.status_code == 200, f"List failed: {response.text}"
    
    data = response.json()
    assert "pdcs" in data
    assert "total" in data
    
    print(f"✓ PDC list works: {data['total']} PDCs found")


def test_09_pdc_stats_endpoint(auth_session):
    """Test GET /api/pdc-v2/stats/overview still works (regression)"""
    response = auth_session.get(f"{BASE_URL}/api/pdc-v2/stats/overview")
    assert response.status_code == 200, f"Stats failed: {response.text}"
    
    data = response.json()
    assert "total" in data
    assert "valides" in data
    
    print(f"✓ PDC stats works: {data['total']} total, {data['valides']} validated")


def test_10_new_pdc_has_carte_parcelle_schema(auth_session):
    """Test that new PDC creation includes carte_parcelle in schema"""
    # Get available members first
    members_response = auth_session.get(f"{BASE_URL}/api/pdc-v2/members/available")
    if members_response.status_code != 200 or not members_response.json():
        pytest.skip("No available members for PDC creation test")
    
    members = members_response.json()
    if len(members) == 0:
        pytest.skip("No available members for PDC creation test")
    
    # Create new PDC
    test_member_id = members[0]["id"]
    create_response = auth_session.post(
        f"{BASE_URL}/api/pdc-v2",
        json={"farmer_id": test_member_id}
    )
    
    if create_response.status_code == 409:
        pytest.skip("Member already has active PDC")
    
    assert create_response.status_code == 200, f"Create failed: {create_response.text}"
    
    new_pdc = create_response.json()
    assert "step1" in new_pdc
    assert "fiche2" in new_pdc["step1"]
    
    fiche2 = new_pdc["step1"]["fiche2"]
    assert "carte_parcelle" in fiche2, "New PDC missing carte_parcelle"
    
    carte = fiche2["carte_parcelle"]
    assert "polygon" in carte, "New PDC carte_parcelle missing polygon"
    assert "arbres_ombrage" in carte, "New PDC carte_parcelle missing arbres_ombrage"
    assert carte["polygon"] == [], "New PDC polygon should be empty"
    assert carte["arbres_ombrage"] == [], "New PDC arbres_ombrage should be empty"
    
    print(f"✓ New PDC has correct carte_parcelle schema")
    
    # Clean up - delete the test PDC
    delete_response = auth_session.delete(f"{BASE_URL}/api/pdc-v2/{new_pdc['id']}")
    assert delete_response.status_code == 200
    print(f"✓ Test PDC cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
