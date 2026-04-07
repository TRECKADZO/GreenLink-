# Test suite for Form Completion Tracking feature
# Tests the forms_status and completion data in /api/field-agent/my-farmers endpoint
# Tests: ICI, SSRTE, Parcels, Photos, Register completion statuses

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://redd-carbon-track.preview.emergentagent.com').rstrip('/')

class TestFormCompletionTracking:
    """Form completion tracking feature tests"""
    
    @pytest.fixture(scope="class")
    def field_agent_token(self):
        """Get field agent authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "+2250709005301",
            "password": "greenlink2024"
        })
        assert response.status_code == 200, f"Field agent login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def cooperative_token(self):
        """Get cooperative authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "bielaghana@gmail.com",
            "password": "greenlink2024"
        })
        assert response.status_code == 200, f"Cooperative login failed: {response.text}"
        return response.json().get("access_token")

    # ========== Backend API Tests ==========

    def test_my_farmers_endpoint_returns_200(self, field_agent_token):
        """Test GET /api/field-agent/my-farmers returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_my_farmers_response_structure(self, field_agent_token):
        """Test response contains farmers array, total, and last_updated"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check root structure
        assert "farmers" in data, "Response missing 'farmers' array"
        assert "total" in data, "Response missing 'total' count"
        assert "last_updated" in data, "Response missing 'last_updated' timestamp"
        assert isinstance(data["farmers"], list), "'farmers' should be a list"
        assert data["total"] == len(data["farmers"]), "Total should match farmers count"

    def test_farmer_has_forms_status_field(self, field_agent_token):
        """Test each farmer has forms_status with all 5 form types"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["farmers"]) == 0:
            pytest.skip("No farmers assigned to test")
        
        farmer = data["farmers"][0]
        assert "forms_status" in farmer, "Farmer missing 'forms_status' field"
        
        forms_status = farmer["forms_status"]
        expected_forms = ["ici", "ssrte", "parcels", "photos", "register"]
        for form_id in expected_forms:
            assert form_id in forms_status, f"forms_status missing '{form_id}' form type"
            assert "completed" in forms_status[form_id], f"'{form_id}' missing 'completed' field"
            assert "label" in forms_status[form_id], f"'{form_id}' missing 'label' field"

    def test_farmer_has_completion_field(self, field_agent_token):
        """Test each farmer has completion with completed, total, percentage"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["farmers"]) == 0:
            pytest.skip("No farmers assigned to test")
        
        farmer = data["farmers"][0]
        assert "completion" in farmer, "Farmer missing 'completion' field"
        
        completion = farmer["completion"]
        assert "completed" in completion, "completion missing 'completed' count"
        assert "total" in completion, "completion missing 'total' count"
        assert "percentage" in completion, "completion missing 'percentage'"
        
        # Validate percentage calculation
        expected_pct = round(completion["completed"] / completion["total"] * 100) if completion["total"] > 0 else 0
        assert completion["percentage"] == expected_pct, f"Percentage mismatch: expected {expected_pct}, got {completion['percentage']}"

    def test_ici_completion_status_correct(self, field_agent_token):
        """Test ICI form completion status reflects database state"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Balde ibo - known to have ICI completed
        balde_farmer = next((f for f in data["farmers"] if "balde" in f["full_name"].lower()), None)
        if balde_farmer:
            assert balde_farmer["forms_status"]["ici"]["completed"] == True, "Balde ibo should have ICI completed"
        
        # Find Koffi - known to NOT have ICI completed  
        koffi_farmer = next((f for f in data["farmers"] if "koffi" in f["full_name"].lower()), None)
        if koffi_farmer:
            assert koffi_farmer["forms_status"]["ici"]["completed"] == False, "Koffi should NOT have ICI completed"

    def test_completion_percentage_for_balde_ibo(self, field_agent_token):
        """Test Balde ibo has 40% completion (2/5 forms)"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        balde_farmer = next((f for f in data["farmers"] if "balde" in f["full_name"].lower()), None)
        if balde_farmer:
            assert balde_farmer["completion"]["percentage"] == 40, f"Balde ibo should be 40%, got {balde_farmer['completion']['percentage']}%"
            assert balde_farmer["completion"]["completed"] == 2, f"Balde ibo should have 2 completed forms"

    def test_completion_percentage_for_koffi(self, field_agent_token):
        """Test Koffi has 20% completion (1/5 forms - only register)"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        koffi_farmer = next((f for f in data["farmers"] if "koffi" in f["full_name"].lower()), None)
        if koffi_farmer:
            assert koffi_farmer["completion"]["percentage"] == 20, f"Koffi should be 20%, got {koffi_farmer['completion']['percentage']}%"
            assert koffi_farmer["completion"]["completed"] == 1, f"Koffi should have 1 completed form"
            assert koffi_farmer["forms_status"]["register"]["completed"] == True, "Koffi should have register completed"

    def test_register_completion_based_on_status(self, field_agent_token):
        """Test register completion is based on farmer status=active or is_active=True"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for farmer in data["farmers"]:
            is_registered = farmer.get("status") == "active" or farmer.get("is_active", False)
            register_status = farmer["forms_status"]["register"]["completed"]
            assert register_status == is_registered, f"Register status mismatch for {farmer['full_name']}"

    def test_forms_have_correct_labels(self, field_agent_token):
        """Test each form type has correct French label"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["farmers"]) == 0:
            pytest.skip("No farmers assigned to test")
        
        forms_status = data["farmers"][0]["forms_status"]
        expected_labels = {
            "ici": "Visite ICI",
            "ssrte": "Visite SSRTE", 
            "parcels": "Parcelles",
            "photos": "Photos",
            "register": "Enregistrement"
        }
        for form_id, expected_label in expected_labels.items():
            assert forms_status[form_id]["label"] == expected_label, f"Label for {form_id} should be '{expected_label}'"

    def test_ssrte_and_photos_have_count_field(self, field_agent_token):
        """Test SSRTE and Photos forms include count field"""
        response = requests.get(
            f"{BASE_URL}/api/field-agent/my-farmers",
            headers={"Authorization": f"Bearer {field_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["farmers"]) == 0:
            pytest.skip("No farmers assigned to test")
        
        forms_status = data["farmers"][0]["forms_status"]
        
        # SSRTE should have count
        assert "count" in forms_status["ssrte"], "SSRTE form missing 'count' field"
        assert isinstance(forms_status["ssrte"]["count"], int), "SSRTE count should be integer"
        
        # Photos should have count
        assert "count" in forms_status["photos"], "Photos form missing 'count' field"
        assert isinstance(forms_status["photos"]["count"], int), "Photos count should be integer"
        
        # Parcels should have count
        assert "count" in forms_status["parcels"], "Parcels form missing 'count' field"
        assert isinstance(forms_status["parcels"]["count"], int), "Parcels count should be integer"

    def test_unauthorized_access_rejected(self):
        """Test endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/field-agent/my-farmers")
        # API returns 403 when no token provided (authentication failed)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
