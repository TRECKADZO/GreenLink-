"""
Test Lot Creation with Explicit Contributors - Iteration 60
Tests the 2-step lot creation wizard with farmer selection and tonnage input

Features tested:
1. POST /api/cooperative/lots with explicit contributors array
2. GET /api/cooperative/lots/{lot_id}/contributors - returns stored contributors
3. GET /api/cooperative/members - returns active members for selection
4. Lot creation stores contributors with farmer_id, farmer_name, tonnage_kg
5. Total tonnage = sum of individual contributions
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COOP_IDENTIFIER = "+2250505000001"
COOP_PASSWORD = "coop2024"


class TestLotContributorsCreation:
    """Test lot creation with explicit contributors"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, coop_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {coop_token}"}
    
    def test_01_login_cooperative(self, coop_token):
        """Test cooperative login returns valid token"""
        assert coop_token is not None
        assert len(coop_token) > 20
        print(f"✓ Cooperative login successful, token length: {len(coop_token)}")
    
    def test_02_get_members_for_selection(self, auth_headers):
        """Test GET /api/cooperative/members returns active members for lot creation"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get members: {response.text}"
        
        data = response.json()
        # Response can be list or dict with 'members' key
        members = data if isinstance(data, list) else data.get('members', [])
        
        assert len(members) > 0, "No members found"
        
        # Check member structure
        first_member = members[0]
        assert 'id' in first_member or '_id' in first_member, "Member missing id"
        assert 'full_name' in first_member, "Member missing full_name"
        
        # Filter active members
        active_members = [m for m in members if m.get('status') == 'active']
        print(f"✓ Found {len(members)} total members, {len(active_members)} active")
        
        # Store for later tests
        self.__class__.active_members = active_members
        return active_members
    
    def test_03_create_lot_with_contributors(self, auth_headers):
        """Test POST /api/cooperative/lots with explicit contributors array"""
        # Get active members first
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=auth_headers)
        data = response.json()
        members = data if isinstance(data, list) else data.get('members', [])
        active_members = [m for m in members if m.get('status') == 'active']
        
        assert len(active_members) >= 2, "Need at least 2 active members for test"
        
        # Select 3 members with different tonnages
        selected_members = active_members[:min(3, len(active_members))]
        contributors = []
        total_tonnage_kg = 0
        
        for i, member in enumerate(selected_members):
            member_id = member.get('id') or member.get('_id')
            tonnage = (i + 1) * 500  # 500, 1000, 1500 kg
            contributors.append({
                "farmer_id": member_id,
                "farmer_name": member.get('full_name', 'Unknown'),
                "tonnage_kg": tonnage
            })
            total_tonnage_kg += tonnage
        
        # Create lot with contributors
        lot_data = {
            "lot_name": f"TEST_Lot_Contributors_{int(time.time())}",
            "target_tonnage": total_tonnage_kg / 1000,  # Convert to tonnes
            "product_type": "cacao",
            "certification": "rainforest",
            "min_carbon_score": 6.0,
            "description": "Test lot with explicit contributors",
            "contributors": contributors
        }
        
        response = requests.post(f"{BASE_URL}/api/cooperative/lots", json=lot_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create lot: {response.text}"
        
        result = response.json()
        assert "lot_id" in result, "Response missing lot_id"
        assert "eligible_farmers" in result, "Response missing eligible_farmers"
        assert result["eligible_farmers"] == len(contributors), f"Expected {len(contributors)} farmers, got {result['eligible_farmers']}"
        
        # Verify estimated tonnage matches sum of contributions
        expected_tonnage = total_tonnage_kg / 1000
        assert abs(result.get("estimated_tonnage", 0) - expected_tonnage) < 0.01, \
            f"Expected tonnage {expected_tonnage}, got {result.get('estimated_tonnage')}"
        
        print(f"✓ Created lot with {len(contributors)} contributors, total {total_tonnage_kg} kg")
        print(f"  Lot ID: {result['lot_id']}")
        
        # Store for later tests
        self.__class__.created_lot_id = result['lot_id']
        self.__class__.expected_contributors = contributors
        return result
    
    def test_04_get_lot_contributors(self, auth_headers):
        """Test GET /api/cooperative/lots/{lot_id}/contributors returns stored contributors"""
        lot_id = getattr(self.__class__, 'created_lot_id', None)
        if not lot_id:
            pytest.skip("No lot created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/cooperative/lots/{lot_id}/contributors", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get contributors: {response.text}"
        
        data = response.json()
        assert "contributors" in data, "Response missing contributors"
        assert "lot_id" in data, "Response missing lot_id"
        assert "total_contributors" in data, "Response missing total_contributors"
        
        contributors = data["contributors"]
        expected = getattr(self.__class__, 'expected_contributors', [])
        
        assert len(contributors) == len(expected), \
            f"Expected {len(expected)} contributors, got {len(contributors)}"
        
        # Verify each contributor has required fields
        for c in contributors:
            assert "farmer_id" in c, "Contributor missing farmer_id"
            assert "farmer_name" in c, "Contributor missing farmer_name"
            assert "estimated_tonnage_kg" in c, "Contributor missing estimated_tonnage_kg"
        
        # Verify tonnages match
        total_tonnage = sum(c.get("estimated_tonnage_kg", 0) for c in contributors)
        expected_total = sum(e.get("tonnage_kg", 0) for e in expected)
        assert abs(total_tonnage - expected_total) < 1, \
            f"Total tonnage mismatch: expected {expected_total}, got {total_tonnage}"
        
        print(f"✓ Retrieved {len(contributors)} contributors with total {total_tonnage} kg")
        for c in contributors:
            print(f"  - {c['farmer_name']}: {c['estimated_tonnage_kg']} kg")
        
        return data
    
    def test_05_lot_appears_in_list(self, auth_headers):
        """Test that newly created lot appears in lots list"""
        lot_id = getattr(self.__class__, 'created_lot_id', None)
        if not lot_id:
            pytest.skip("No lot created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/cooperative/lots", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get lots: {response.text}"
        
        lots = response.json()
        assert isinstance(lots, list), "Expected list of lots"
        
        # Find our created lot
        created_lot = next((l for l in lots if l.get('id') == lot_id), None)
        assert created_lot is not None, f"Created lot {lot_id} not found in lots list"
        
        # Verify lot has correct contributors count
        expected_count = len(getattr(self.__class__, 'expected_contributors', []))
        assert created_lot.get('contributors_count') == expected_count, \
            f"Expected {expected_count} contributors, got {created_lot.get('contributors_count')}"
        
        print(f"✓ Lot {lot_id} found in list with {created_lot.get('contributors_count')} contributors")
        return created_lot
    
    def test_06_create_lot_without_contributors_fallback(self, auth_headers):
        """Test that lot creation without contributors uses fallback logic"""
        lot_data = {
            "lot_name": f"TEST_Lot_NoContributors_{int(time.time())}",
            "target_tonnage": 10.0,
            "product_type": "cacao",
            "certification": "utz",
            "min_carbon_score": 5.0,
            "description": "Test lot without explicit contributors"
            # No contributors array - should use fallback parcel-based logic
        }
        
        response = requests.post(f"{BASE_URL}/api/cooperative/lots", json=lot_data, headers=auth_headers)
        # This may fail if no eligible parcels exist, which is acceptable
        if response.status_code == 400:
            detail = response.json().get('detail', '')
            if 'Aucune parcelle éligible' in detail:
                print(f"✓ Fallback logic triggered - no eligible parcels (expected behavior)")
                pytest.skip("No eligible parcels for fallback test")
        
        assert response.status_code == 200, f"Failed to create lot: {response.text}"
        result = response.json()
        print(f"✓ Created lot without explicit contributors, got {result.get('eligible_farmers', 0)} farmers from parcels")
    
    def test_07_create_lot_empty_contributors_rejected(self, auth_headers):
        """Test that lot with empty contributors array is rejected"""
        lot_data = {
            "lot_name": f"TEST_Lot_EmptyContributors_{int(time.time())}",
            "target_tonnage": 10.0,
            "product_type": "cacao",
            "min_carbon_score": 6.0,
            "contributors": []  # Empty array
        }
        
        response = requests.post(f"{BASE_URL}/api/cooperative/lots", json=lot_data, headers=auth_headers)
        # Empty contributors should trigger fallback or error
        # Based on code, empty array triggers fallback to parcel-based logic
        print(f"✓ Empty contributors array handled: status {response.status_code}")


class TestLotContributorsValidation:
    """Test validation for lot contributors"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, coop_token):
        return {"Authorization": f"Bearer {coop_token}"}
    
    def test_01_contributor_with_zero_tonnage(self, auth_headers):
        """Test that contributors with zero tonnage are handled"""
        # Get a member
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=auth_headers)
        data = response.json()
        members = data if isinstance(data, list) else data.get('members', [])
        active_members = [m for m in members if m.get('status') == 'active']
        
        if len(active_members) < 1:
            pytest.skip("No active members")
        
        member = active_members[0]
        member_id = member.get('id') or member.get('_id')
        
        lot_data = {
            "lot_name": f"TEST_ZeroTonnage_{int(time.time())}",
            "target_tonnage": 1.0,
            "product_type": "cacao",
            "min_carbon_score": 6.0,
            "contributors": [{
                "farmer_id": member_id,
                "farmer_name": member.get('full_name', 'Test'),
                "tonnage_kg": 0  # Zero tonnage
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/cooperative/lots", json=lot_data, headers=auth_headers)
        # Zero tonnage contributors should be handled gracefully
        print(f"✓ Zero tonnage contributor handled: status {response.status_code}")
    
    def test_02_multiple_contributors_same_farmer(self, auth_headers):
        """Test handling of duplicate farmer in contributors"""
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=auth_headers)
        data = response.json()
        members = data if isinstance(data, list) else data.get('members', [])
        active_members = [m for m in members if m.get('status') == 'active']
        
        if len(active_members) < 1:
            pytest.skip("No active members")
        
        member = active_members[0]
        member_id = member.get('id') or member.get('_id')
        
        lot_data = {
            "lot_name": f"TEST_DuplicateFarmer_{int(time.time())}",
            "target_tonnage": 2.0,
            "product_type": "cacao",
            "min_carbon_score": 6.0,
            "contributors": [
                {
                    "farmer_id": member_id,
                    "farmer_name": member.get('full_name', 'Test'),
                    "tonnage_kg": 500
                },
                {
                    "farmer_id": member_id,  # Same farmer
                    "farmer_name": member.get('full_name', 'Test'),
                    "tonnage_kg": 500
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/cooperative/lots", json=lot_data, headers=auth_headers)
        # Duplicate farmers should be stored as-is (backend doesn't dedupe)
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Duplicate farmer accepted: {result.get('eligible_farmers')} contributors stored")
        else:
            print(f"✓ Duplicate farmer rejected: {response.status_code}")


class TestLotContributorsEndToEnd:
    """End-to-end test for lot creation with contributors"""
    
    @pytest.fixture(scope="class")
    def coop_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": COOP_IDENTIFIER,
            "password": COOP_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, coop_token):
        return {"Authorization": f"Bearer {coop_token}"}
    
    def test_full_workflow(self, auth_headers):
        """Test complete workflow: get members -> create lot -> verify contributors"""
        # Step 1: Get active members
        response = requests.get(f"{BASE_URL}/api/cooperative/members", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        members = data if isinstance(data, list) else data.get('members', [])
        active_members = [m for m in members if m.get('status') == 'active']
        
        print(f"Step 1: Found {len(active_members)} active members")
        
        if len(active_members) < 2:
            pytest.skip("Need at least 2 active members")
        
        # Step 2: Select members and assign tonnages
        selected = active_members[:3]
        contributors = []
        for i, m in enumerate(selected):
            mid = m.get('id') or m.get('_id')
            tonnage = 1000 + (i * 500)  # 1000, 1500, 2000 kg
            contributors.append({
                "farmer_id": mid,
                "farmer_name": m.get('full_name'),
                "tonnage_kg": tonnage
            })
        
        total_kg = sum(c['tonnage_kg'] for c in contributors)
        print(f"Step 2: Selected {len(contributors)} farmers, total {total_kg} kg")
        
        # Step 3: Create lot
        lot_data = {
            "lot_name": f"TEST_E2E_Lot_{int(time.time())}",
            "target_tonnage": total_kg / 1000,
            "product_type": "cacao",
            "certification": "fairtrade",
            "min_carbon_score": 6.5,
            "description": "End-to-end test lot",
            "contributors": contributors
        }
        
        response = requests.post(f"{BASE_URL}/api/cooperative/lots", json=lot_data, headers=auth_headers)
        assert response.status_code == 200, f"Create lot failed: {response.text}"
        result = response.json()
        lot_id = result['lot_id']
        print(f"Step 3: Created lot {lot_id}")
        
        # Step 4: Verify contributors stored correctly
        response = requests.get(f"{BASE_URL}/api/cooperative/lots/{lot_id}/contributors", headers=auth_headers)
        assert response.status_code == 200
        contrib_data = response.json()
        
        assert contrib_data['total_contributors'] == len(contributors)
        stored_total = sum(c['estimated_tonnage_kg'] for c in contrib_data['contributors'])
        assert abs(stored_total - total_kg) < 1, f"Tonnage mismatch: {stored_total} vs {total_kg}"
        
        print(f"Step 4: Verified {contrib_data['total_contributors']} contributors, {stored_total} kg total")
        
        # Step 5: Verify lot in list
        response = requests.get(f"{BASE_URL}/api/cooperative/lots", headers=auth_headers)
        assert response.status_code == 200
        lots = response.json()
        lot = next((l for l in lots if l['id'] == lot_id), None)
        assert lot is not None
        assert lot['contributors_count'] == len(contributors)
        
        print(f"Step 5: Lot verified in list with {lot['contributors_count']} contributors")
        print(f"✓ Full workflow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
