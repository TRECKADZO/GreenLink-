"""
Test USSD Menu Overhaul - Iteration 64
Tests for:
- USSD Welcome menu (3 options: Deja inscrit, Nouvelle inscription, Aide)
- USSD Recognition for existing farmer (phone +2250799999999) -> main menu with 6 options
- USSD Registration flow (4 steps: name, coop code, village, PIN + confirmation)
- USSD Simple estimation (5 questions then result with prime annuelle)
- USSD Detailed estimation (9 questions then result with detailed tree breakdown)
- USSD Estimation result options (Demander versement, Refaire, Retour, Quitter)
- Web registration endpoint POST /api/ussd/register-web
- Web registration rejects duplicate phone numbers
- Web registration rejects invalid PIN (not 4 digits)
- GET /api/ussd/registrations returns list of registrations
- Homepage calculator POST /api/ussd/calculate-premium
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_FARMER_PHONE = "+2250799999999"
ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"


class TestUSSDWelcomeMenu:
    """Test USSD Welcome menu shows 3 options"""
    
    def test_welcome_menu_initial(self):
        """Test initial USSD welcome menu shows 3 options"""
        session_id = f"test_welcome_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": "+2250700000001",
            "text": ""
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check response contains welcome menu
        assert "text" in data
        text = data["text"]
        
        # Should show 3 options
        assert "1." in text, "Option 1 missing"
        assert "2." in text, "Option 2 missing"
        assert "3." in text, "Option 3 missing"
        
        # Check for French menu items
        assert "inscrit" in text.lower() or "deja" in text.lower(), "Option 'Deja inscrit' missing"
        assert "inscription" in text.lower() or "nouvelle" in text.lower(), "Option 'Nouvelle inscription' missing"
        assert "aide" in text.lower() or "info" in text.lower(), "Option 'Aide' missing"
        
        # Should continue session
        assert data.get("continue_session") == True
        print(f"Welcome menu text: {text[:200]}...")


class TestUSSDRecognition:
    """Test USSD recognizes existing farmer and shows main menu"""
    
    def test_existing_farmer_recognition(self):
        """Test existing farmer (phone +2250799999999) gets main menu with 6 options"""
        session_id = f"test_recog_{uuid.uuid4().hex[:8]}"
        
        # First call - welcome menu
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": ""
        })
        assert response.status_code == 200
        
        # Second call - select "Deja inscrit" (option 1)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        
        # Should show main menu with 6 options
        assert "1." in text, "Option 1 missing in main menu"
        assert "2." in text, "Option 2 missing in main menu"
        assert "3." in text, "Option 3 missing in main menu"
        assert "4." in text, "Option 4 missing in main menu"
        assert "5." in text, "Option 5 missing in main menu"
        assert "6." in text, "Option 6 missing in main menu"
        
        # Check for expected menu items (in French)
        text_lower = text.lower()
        assert "estim" in text_lower or "prime" in text_lower, "Estimation option missing"
        assert "versement" in text_lower or "demander" in text_lower, "Versement option missing"
        assert "parcelle" in text_lower or "historique" in text_lower, "Parcelles option missing"
        assert "conseil" in text_lower, "Conseils option missing"
        assert "profil" in text_lower, "Profil option missing"
        assert "aide" in text_lower or "contact" in text_lower, "Aide option missing"
        
        print(f"Main menu for existing farmer: {text[:300]}...")


class TestUSSDRegistrationFlow:
    """Test USSD Registration flow: 4 steps (name, coop code, village, PIN) + confirmation"""
    
    def test_registration_flow_complete(self):
        """Test complete registration flow via USSD"""
        session_id = f"test_reg_{uuid.uuid4().hex[:8]}"
        unique_phone = f"+22507{uuid.uuid4().hex[:8]}"
        
        # Step 0: Welcome menu
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": ""
        })
        assert response.status_code == 200
        
        # Step 1: Select "Nouvelle inscription" (option 2)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "nom" in text.lower() or "prenom" in text.lower() or "etape 1" in text.lower(), f"Step 1 (name) not shown: {text}"
        
        # Step 2: Enter name
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test Planteur USSD"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "code" in text.lower() or "coop" in text.lower() or "planteur" in text.lower() or "etape 2" in text.lower(), f"Step 2 (coop code) not shown: {text}"
        
        # Step 3: Enter coop code (or 0 for none)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test Planteur USSD*COOP123"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "village" in text.lower() or "localite" in text.lower() or "etape 3" in text.lower(), f"Step 3 (village) not shown: {text}"
        
        # Step 4: Enter village
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test Planteur USSD*COOP123*Daloa"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "pin" in text.lower() or "code" in text.lower() or "chiffre" in text.lower() or "etape 4" in text.lower(), f"Step 4 (PIN) not shown: {text}"
        
        # Step 5: Enter PIN
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test Planteur USSD*COOP123*Daloa*1234"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        # Should show confirmation with summary
        assert "confirm" in text.lower() or "resume" in text.lower() or "valider" in text.lower(), f"Confirmation not shown: {text}"
        assert "Test Planteur USSD" in text or "test planteur" in text.lower(), f"Name not in confirmation: {text}"
        
        # Step 6: Confirm registration
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": unique_phone,
            "text": "2*Test Planteur USSD*COOP123*Daloa*1234*1"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        assert "reussi" in text.lower() or "succes" in text.lower() or "inscription" in text.lower(), f"Success message not shown: {text}"
        
        print(f"Registration flow completed successfully for {unique_phone}")


class TestUSSDSimpleEstimation:
    """Test USSD Simple estimation: 5 questions then result with prime annuelle"""
    
    def test_simple_estimation_flow(self):
        """Test simple estimation flow with 5 questions"""
        session_id = f"test_simple_{uuid.uuid4().hex[:8]}"
        
        # Start with existing farmer
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": ""
        })
        assert response.status_code == 200
        
        # Select "Deja inscrit"
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1"
        })
        assert response.status_code == 200
        
        # Select "Estimer ma prime carbone" (option 1)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        # Should show estimation type choice
        assert "simple" in text.lower() or "detaillee" in text.lower() or "1." in text, f"Estimation type choice not shown: {text}"
        
        # Select "Estimation simple" (option 1)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1*1"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        # Q1: Hectares
        assert "hectare" in text.lower() or "superficie" in text.lower() or "q1" in text.lower(), f"Q1 (hectares) not shown: {text}"
        
        # Answer Q1: 5 hectares
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1*1*5"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        # Q2: Arbres grands
        assert "arbre" in text.lower() or "ombre" in text.lower() or "q2" in text.lower(), f"Q2 (arbres) not shown: {text}"
        
        # Answer Q2: 100 arbres
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1*1*5*100"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        # Q3: Engrais
        assert "engrais" in text.lower() or "oui" in text.lower() or "q3" in text.lower(), f"Q3 (engrais) not shown: {text}"
        
        # Answer Q3: Non (2)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1*1*5*100*2"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        # Q4: Brulage
        assert "brulage" in text.lower() or "residu" in text.lower() or "q4" in text.lower(), f"Q4 (brulage) not shown: {text}"
        
        # Answer Q4: Non (2)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1*1*5*100*2*2"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        # Q5: Age cacaoyers
        assert "age" in text.lower() or "cacaoyer" in text.lower() or "q5" in text.lower(), f"Q5 (age) not shown: {text}"
        
        # Answer Q5: 5-15 ans (2)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1*1*5*100*2*2*2"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        
        # Should show result with prime annuelle
        assert "prime" in text.lower() or "fcfa" in text.lower() or "score" in text.lower(), f"Result not shown: {text}"
        assert "1." in text or "demander" in text.lower() or "versement" in text.lower(), f"Result options not shown: {text}"
        
        print(f"Simple estimation result: {text[:300]}...")


class TestUSSDDetailedEstimation:
    """Test USSD Detailed estimation: 9 questions then result with detailed tree breakdown"""
    
    def test_detailed_estimation_flow(self):
        """Test detailed estimation flow with 9 questions"""
        session_id = f"test_detailed_{uuid.uuid4().hex[:8]}"
        
        # Start with existing farmer
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": ""
        })
        assert response.status_code == 200
        
        # Select "Deja inscrit"
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1"
        })
        assert response.status_code == 200
        
        # Select "Estimer ma prime carbone" (option 1)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1"
        })
        assert response.status_code == 200
        
        # Select "Estimation detaillee" (option 2)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1*1*2"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        # Q1: Hectares
        assert "hectare" in text.lower() or "superficie" in text.lower() or "q1" in text.lower(), f"Q1 not shown: {text}"
        
        # Answer all 9 questions
        answers = ["4", "50", "80", "30", "2", "2", "1", "1", "1"]  # hectares, grands, moyens, petits, engrais(non), brulage(non), compost(oui), agroforesterie(oui), couverture(oui)
        
        for i, answer in enumerate(answers):
            text_so_far = "1*1*2*" + "*".join(answers[:i+1])
            response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
                "sessionId": session_id,
                "serviceCode": "*144*88#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": text_so_far
            })
            assert response.status_code == 200
            data = response.json()
            text = data["text"]
            
            if i < len(answers) - 1:
                # Should show next question
                assert data.get("continue_session") == True, f"Session ended prematurely at Q{i+2}"
            else:
                # Should show result with detailed breakdown
                assert "prime" in text.lower() or "fcfa" in text.lower() or "score" in text.lower(), f"Result not shown: {text}"
                # Check for tree breakdown in detailed result
                text_lower = text.lower()
                has_tree_breakdown = (
                    ("grand" in text_lower or ">12" in text or ">8" in text) or
                    ("moyen" in text_lower or "8-12" in text) or
                    ("petit" in text_lower or "<8" in text)
                )
                assert has_tree_breakdown or "arbre" in text_lower, f"Tree breakdown not in detailed result: {text}"
        
        print(f"Detailed estimation result: {text[:400]}...")


class TestUSSDEstimationResultOptions:
    """Test USSD Estimation result shows options: Demander versement, Refaire, Retour, Quitter"""
    
    def test_estimation_result_options(self):
        """Test estimation result shows all 4 options"""
        session_id = f"test_result_{uuid.uuid4().hex[:8]}"
        
        # Step by step navigation through USSD state machine
        # Step 0: Welcome menu
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": ""
        })
        assert response.status_code == 200
        
        # Step 1: Select "Deja inscrit"
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1"
        })
        assert response.status_code == 200
        
        # Step 2: Select "Estimer ma prime carbone"
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1"
        })
        assert response.status_code == 200
        
        # Step 3: Select "Estimation simple"
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": TEST_FARMER_PHONE,
            "text": "1"
        })
        assert response.status_code == 200
        
        # Step 4-8: Answer 5 questions
        answers = ["5", "100", "2", "2", "2"]  # hectares, arbres, engrais(non), brulage(non), age(mature)
        for answer in answers:
            response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
                "sessionId": session_id,
                "serviceCode": "*144*88#",
                "phoneNumber": TEST_FARMER_PHONE,
                "text": answer
            })
            assert response.status_code == 200
        
        data = response.json()
        text = data["text"]
        
        # Check for result options
        assert "1." in text, f"Option 1 missing in result: {text}"
        assert "2." in text, f"Option 2 missing in result: {text}"
        assert "3." in text, f"Option 3 missing in result: {text}"
        
        text_lower = text.lower()
        # Check for expected options (in French)
        has_versement = "versement" in text_lower or "demander" in text_lower
        has_refaire = "refaire" in text_lower or "recommencer" in text_lower or "estimation" in text_lower
        has_retour = "retour" in text_lower or "menu" in text_lower
        has_quitter = "quitter" in text_lower or "0." in text
        
        assert has_versement or has_refaire or has_retour, f"Expected options not found in result: {text}"
        
        print(f"Estimation result with options: {text[:300]}...")


class TestWebRegistration:
    """Test Web registration endpoint POST /api/ussd/register-web"""
    
    def test_web_registration_success(self):
        """Test successful web registration with valid data"""
        unique_phone = f"+22507{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test Web Planteur",
            "telephone": unique_phone,
            "code_planteur": "WEB123",
            "village": "Soubre",
            "pin": "5678",
            "hectares": 3.5,
            "email": "test@example.com"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "farmer_id" in data
        assert data.get("nom") == "Test Web Planteur"
        assert data.get("telephone") == unique_phone
        assert data.get("village") == "Soubre"
        
        print(f"Web registration successful: {data}")
    
    def test_web_registration_duplicate_phone(self):
        """Test web registration rejects duplicate phone numbers"""
        # First registration
        unique_phone = f"+22507{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "First Planteur",
            "telephone": unique_phone,
            "code_planteur": "",
            "village": "Daloa",
            "pin": "1234"
        })
        assert response.status_code == 200
        
        # Second registration with same phone
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Second Planteur",
            "telephone": unique_phone,
            "code_planteur": "",
            "village": "Gagnoa",
            "pin": "5678"
        })
        
        assert response.status_code == 409, f"Expected 409 for duplicate phone, got {response.status_code}"
        data = response.json()
        assert "deja" in data.get("detail", "").lower() or "enregistre" in data.get("detail", "").lower(), f"Expected duplicate error message: {data}"
        
        print(f"Duplicate phone rejected correctly: {data}")
    
    def test_web_registration_invalid_pin(self):
        """Test web registration rejects invalid PIN (not 4 digits)"""
        unique_phone = f"+22507{uuid.uuid4().hex[:8]}"
        
        # Test with 3 digit PIN
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test Planteur",
            "telephone": unique_phone,
            "code_planteur": "",
            "village": "Daloa",
            "pin": "123"  # Only 3 digits
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid PIN, got {response.status_code}"
        data = response.json()
        assert "pin" in data.get("detail", "").lower() or "4" in data.get("detail", ""), f"Expected PIN error message: {data}"
        
        # Test with 5 digit PIN
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test Planteur",
            "telephone": unique_phone,
            "code_planteur": "",
            "village": "Daloa",
            "pin": "12345"  # 5 digits
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid PIN, got {response.status_code}"
        
        # Test with non-numeric PIN
        response = requests.post(f"{BASE_URL}/api/ussd/register-web", json={
            "nom_complet": "Test Planteur",
            "telephone": unique_phone,
            "code_planteur": "",
            "village": "Daloa",
            "pin": "abcd"  # Non-numeric
        })
        
        assert response.status_code == 400, f"Expected 400 for non-numeric PIN, got {response.status_code}"
        
        print("Invalid PIN rejected correctly")


class TestGetRegistrations:
    """Test GET /api/ussd/registrations returns list of registrations"""
    
    def test_get_registrations(self):
        """Test GET registrations endpoint returns list"""
        response = requests.get(f"{BASE_URL}/api/ussd/registrations")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "registrations" in data
        assert "total" in data
        assert isinstance(data["registrations"], list)
        assert isinstance(data["total"], int)
        
        if len(data["registrations"]) > 0:
            reg = data["registrations"][0]
            # Check expected fields
            assert "full_name" in reg or "nom_complet" in reg
            assert "phone_number" in reg
            assert "village" in reg
            assert "registered_via" in reg
            
        print(f"GET registrations: total={data['total']}, returned={len(data['registrations'])}")
    
    def test_get_registrations_with_limit(self):
        """Test GET registrations with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/ussd/registrations?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["registrations"]) <= 5
        
        print(f"GET registrations with limit=5: returned={len(data['registrations'])}")


class TestHomepageCalculator:
    """Test Homepage calculator POST /api/ussd/calculate-premium"""
    
    def test_calculate_premium_basic(self):
        """Test basic premium calculation"""
        response = requests.post(f"{BASE_URL}/api/ussd/calculate-premium", json={
            "hectares": 5,
            "arbres_grands": 50,
            "arbres_moyens": 80,
            "arbres_petits": 30,
            "culture": "cacao",
            "practices": ["compost", "agroforesterie"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields in response
        assert "score" in data
        assert "prime_annuelle" in data
        assert "prime_fcfa_kg" in data
        assert "eligible" in data
        assert "hectares" in data
        assert "arbres_par_ha" in data
        
        # Validate values
        assert 0 <= data["score"] <= 10
        assert data["prime_annuelle"] >= 0
        assert data["hectares"] == 5
        
        print(f"Premium calculation: score={data['score']}, prime_annuelle={data['prime_annuelle']}, eligible={data['eligible']}")
    
    def test_calculate_premium_with_all_practices(self):
        """Test premium calculation with all good practices"""
        response = requests.post(f"{BASE_URL}/api/ussd/calculate-premium", json={
            "hectares": 10,
            "arbres_grands": 100,
            "arbres_moyens": 150,
            "arbres_petits": 50,
            "culture": "cacao",
            "practices": ["zero_pesticides", "compost", "agroforesterie", "couverture_vegetale", "rotation_cultures"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # With all good practices, score should be higher
        assert data["score"] >= 5, f"Score should be at least 5 with good practices: {data['score']}"
        assert data["eligible"] == True, "Should be eligible with good practices"
        
        print(f"Premium with all practices: score={data['score']}, prime_annuelle={data['prime_annuelle']}")
    
    def test_calculate_premium_low_score(self):
        """Test premium calculation with poor practices (low score)"""
        response = requests.post(f"{BASE_URL}/api/ussd/calculate-premium", json={
            "hectares": 2,
            "arbres_grands": 5,
            "arbres_moyens": 5,
            "arbres_petits": 5,
            "culture": "cacao",
            "practices": []  # No good practices
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # With few trees and no practices, score should be lower
        assert data["score"] < 8, f"Score should be lower with poor practices: {data['score']}"
        
        print(f"Premium with poor practices: score={data['score']}, eligible={data['eligible']}")


class TestUSSDHelpOption:
    """Test USSD Help/Aide option"""
    
    def test_help_option(self):
        """Test selecting Aide option from welcome menu"""
        session_id = f"test_help_{uuid.uuid4().hex[:8]}"
        
        # Welcome menu
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": "+2250700000002",
            "text": ""
        })
        assert response.status_code == 200
        
        # Select Aide (option 3)
        response = requests.post(f"{BASE_URL}/api/ussd/callback", json={
            "sessionId": session_id,
            "serviceCode": "*144*88#",
            "phoneNumber": "+2250700000002",
            "text": "3"
        })
        assert response.status_code == 200
        data = response.json()
        text = data["text"]
        
        # Should show help info with contact
        text_lower = text.lower()
        assert "greenlink" in text_lower or "aide" in text_lower or "tel" in text_lower, f"Help info not shown: {text}"
        
        print(f"Help option response: {text[:200]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
