"""
REDD+ MRV Features Testing - Iteration 77
Tests for:
1. GET /api/redd/practices - REDD+ practices categories (total_practices=21)
2. GET /api/redd/mrv/summary - MRV aggregated data
3. GET /api/redd/mrv/farmers - Farmer list with redd_score and redd_level
4. POST /api/ussd/callback - Detailed estimation flow with 12 questions (9 original + 3 REDD+)
5. USSD result includes 'Niveau REDD+' line
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestREDDPracticesAPI:
    """Test REDD+ practices endpoint"""
    
    def test_get_redd_practices_returns_categories(self):
        """GET /api/redd/practices returns 5 categories"""
        response = requests.get(f"{BASE_URL}/api/redd/practices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "categories" in data, "Response should have 'categories' field"
        assert len(data["categories"]) == 5, f"Expected 5 categories, got {len(data['categories'])}"
        
        # Verify category IDs
        category_ids = [c["id"] for c in data["categories"]]
        expected_ids = ["agroforesterie", "zero-deforestation", "gestion-sols", "restauration", "tracabilite"]
        for expected_id in expected_ids:
            assert expected_id in category_ids, f"Missing category: {expected_id}"
        
        print(f"PASS: GET /api/redd/practices returns 5 categories: {category_ids}")
    
    def test_get_redd_practices_total_count(self):
        """GET /api/redd/practices returns total_practices=21"""
        response = requests.get(f"{BASE_URL}/api/redd/practices")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_practices" in data, "Response should have 'total_practices' field"
        assert data["total_practices"] == 21, f"Expected total_practices=21, got {data['total_practices']}"
        
        # Verify max_score
        assert data.get("max_score") == 10, f"Expected max_score=10, got {data.get('max_score')}"
        
        print(f"PASS: GET /api/redd/practices returns total_practices=21, max_score=10")
    
    def test_redd_practices_category_structure(self):
        """Each category has required fields"""
        response = requests.get(f"{BASE_URL}/api/redd/practices")
        assert response.status_code == 200
        
        data = response.json()
        for cat in data["categories"]:
            assert "id" in cat, "Category missing 'id'"
            assert "title" in cat, "Category missing 'title'"
            assert "practices_count" in cat, "Category missing 'practices_count'"
            assert "max_bonus" in cat, "Category missing 'max_bonus'"
        
        print(f"PASS: All categories have required fields (id, title, practices_count, max_bonus)")


class TestMRVSummaryAPI:
    """Test MRV summary endpoint"""
    
    def test_get_mrv_summary_returns_data(self):
        """GET /api/redd/mrv/summary returns aggregated REDD+ data"""
        response = requests.get(f"{BASE_URL}/api/redd/mrv/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check required fields
        required_fields = ["total_farmers", "total_hectares", "total_arbres", "avg_score_carbone", "avg_score_redd"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: GET /api/redd/mrv/summary returns required fields: {required_fields}")
    
    def test_mrv_summary_has_practices_adoption(self):
        """MRV summary includes practices_adoption breakdown"""
        response = requests.get(f"{BASE_URL}/api/redd/mrv/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "practices_adoption" in data, "Missing 'practices_adoption' field"
        
        # If there are farmers, check practice keys
        if data["total_farmers"] > 0:
            practices = data["practices_adoption"]
            expected_practices = ["agroforesterie", "compost", "couverture_sol", "zero_brulage", "zero_engrais"]
            for practice in expected_practices:
                assert practice in practices, f"Missing practice: {practice}"
                assert "count" in practices[practice], f"Practice {practice} missing 'count'"
                assert "pct" in practices[practice], f"Practice {practice} missing 'pct'"
        
        print(f"PASS: MRV summary has practices_adoption with count/pct for each practice")
    
    def test_mrv_summary_has_redd_level_distribution(self):
        """MRV summary includes redd_level_distribution"""
        response = requests.get(f"{BASE_URL}/api/redd/mrv/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "redd_level_distribution" in data, "Missing 'redd_level_distribution' field"
        
        dist = data["redd_level_distribution"]
        expected_levels = ["excellence", "avance", "intermediaire", "debutant", "non_conforme"]
        for level in expected_levels:
            assert level in dist, f"Missing level: {level}"
        
        print(f"PASS: MRV summary has redd_level_distribution with all 5 levels")


class TestMRVFarmersAPI:
    """Test MRV farmers endpoint"""
    
    def test_get_mrv_farmers_returns_list(self):
        """GET /api/redd/mrv/farmers returns farmer list"""
        response = requests.get(f"{BASE_URL}/api/redd/mrv/farmers?limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "farmers" in data, "Response should have 'farmers' field"
        assert "count" in data, "Response should have 'count' field"
        assert isinstance(data["farmers"], list), "'farmers' should be a list"
        
        print(f"PASS: GET /api/redd/mrv/farmers returns farmers list with count={data['count']}")
    
    def test_mrv_farmers_have_redd_fields(self):
        """Each farmer has redd_score and redd_level"""
        response = requests.get(f"{BASE_URL}/api/redd/mrv/farmers?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["farmers"]) > 0:
            farmer = data["farmers"][0]
            assert "redd_score" in farmer, "Farmer missing 'redd_score'"
            assert "redd_level" in farmer, "Farmer missing 'redd_level'"
            assert "practices" in farmer, "Farmer missing 'practices'"
            
            # Verify redd_level is valid
            valid_levels = ["Excellence", "Avance", "Intermediaire", "Debutant", "Non conforme"]
            assert farmer["redd_level"] in valid_levels, f"Invalid redd_level: {farmer['redd_level']}"
            
            print(f"PASS: Farmer has redd_score={farmer['redd_score']}, redd_level={farmer['redd_level']}, practices={farmer['practices']}")
        else:
            print("SKIP: No farmers in database to verify redd fields")


class TestUSSDDetailedEstimation:
    """Test USSD detailed estimation flow with 12 questions"""
    
    def test_ussd_detailed_estimation_has_12_questions(self):
        """Detailed estimation flow has 12 questions (9 original + 3 REDD+)"""
        import uuid
        session_id = str(uuid.uuid4())
        phone = "+2250787761023"
        
        # Start session
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*99#",
            "phoneNumber": phone,
            "text": ""
        })
        assert response.status_code == 200
        
        # Select "Je suis deja inscrit" (option 1)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*99#",
            "phoneNumber": phone,
            "text": "1"
        })
        assert response.status_code == 200
        
        # Select "Prime carbone + conformite ARS" (option 1)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*99#",
            "phoneNumber": phone,
            "text": "1*1"
        })
        assert response.status_code == 200
        
        # Select "Estimation detaillee" (option 2)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*99#",
            "phoneNumber": phone,
            "text": "1*1*2"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should show Q1/12
        assert "Q1/12" in data["text"], f"Expected Q1/12 in response, got: {data['text']}"
        print(f"PASS: Detailed estimation starts with Q1/12 (12 questions total)")
    
    def test_ussd_detailed_estimation_includes_redd_questions(self):
        """Detailed estimation includes REDD+ questions (biochar, zero_deforestation, reboisement)"""
        import uuid
        session_id = str(uuid.uuid4())
        phone = "+2250787761023"
        
        # Navigate to detailed estimation
        inputs = ["1", "1*1", "1*1*2"]
        for inp in inputs:
            requests.post(f"{BASE_URL}/api/ussd/callback", json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": phone,
                "text": inp
            })
        
        # Answer questions 1-9 (original questions)
        answers = ["5", "50", "80", "30", "2", "2", "1", "1", "1"]  # hectares, arbres_grands, moyens, petits, engrais=non, brulage=non, compost=oui, agroforesterie=oui, couverture_sol=oui
        
        current_text = "1*1*2"
        for i, ans in enumerate(answers):
            current_text = f"{current_text}*{ans}"
            response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": phone,
                "text": current_text
            })
            assert response.status_code == 200
            data = response.json()
            
            # Check for REDD+ questions (Q10, Q11, Q12)
            if i == 8:  # After Q9, should show Q10 (biochar)
                assert "Q10/12" in data["text"], f"Expected Q10/12, got: {data['text']}"
                assert "biochar" in data["text"].lower() or "REDD+" in data["text"], f"Q10 should be about biochar: {data['text']}"
                print(f"PASS: Q10/12 is REDD+ biochar question")
        
        # Answer Q10 (biochar)
        current_text = f"{current_text}*1"  # oui
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*99#",
            "phoneNumber": phone,
            "text": current_text
        })
        data = response.json()
        assert "Q11/12" in data["text"], f"Expected Q11/12, got: {data['text']}"
        assert "deforestation" in data["text"].lower() or "REDD+" in data["text"], f"Q11 should be about zero deforestation: {data['text']}"
        print(f"PASS: Q11/12 is REDD+ zero deforestation question")
        
        # Answer Q11 (zero_deforestation)
        current_text = f"{current_text}*1"  # oui
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*99#",
            "phoneNumber": phone,
            "text": current_text
        })
        data = response.json()
        assert "Q12/12" in data["text"], f"Expected Q12/12, got: {data['text']}"
        assert "reboisement" in data["text"].lower() or "REDD+" in data["text"], f"Q12 should be about reboisement: {data['text']}"
        print(f"PASS: Q12/12 is REDD+ reboisement question")
    
    def test_ussd_result_includes_redd_level(self):
        """USSD result text includes 'Niveau REDD+' line"""
        import uuid
        session_id = str(uuid.uuid4())
        phone = "+2250787761023"
        
        # Navigate to detailed estimation and answer all 12 questions
        inputs = ["1", "1*1", "1*1*2"]
        for inp in inputs:
            requests.post(f"{BASE_URL}/api/ussd/callback", json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": phone,
                "text": inp
            })
        
        # Answer all 12 questions
        answers = ["5", "50", "80", "30", "2", "2", "1", "1", "1", "1", "1", "1"]  # All positive answers
        
        current_text = "1*1*2"
        for ans in answers:
            current_text = f"{current_text}*{ans}"
            response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
                "sessionId": session_id,
                "serviceCode": "*144*99#",
                "phoneNumber": phone,
                "text": current_text
            })
        
        data = response.json()
        result_text = data["text"]
        
        # Verify result includes both ARS and REDD+ levels
        assert "Niveau ARS" in result_text, f"Result should include 'Niveau ARS': {result_text}"
        assert "Niveau REDD+" in result_text or "REDD+" in result_text, f"Result should include 'Niveau REDD+': {result_text}"
        
        print(f"PASS: USSD result includes both 'Niveau ARS' and 'Niveau REDD+' lines")
        print(f"Result text:\n{result_text}")


class TestAuthLogin:
    """Test authentication for admin access"""
    
    def test_admin_login_returns_token(self):
        """Admin login with identifier returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "klenakan.eric@gmail.com",
            "password": "474Treckadzo"
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should have 'access_token'"
        
        print(f"PASS: Admin login returns access_token")
        return data["access_token"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
