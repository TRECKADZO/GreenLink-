#!/usr/bin/env python3
"""
GreenLink Agritech Backend API Tests
Tests all backend endpoints for the GreenLink Agritech Clone application.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "https://farm-intelligence-14.preview.emergentagent.com"

class BackendTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_result(self, test_name, success, message="", data=None):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
        
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")
        print()
        
    def test_features_api(self):
        """Test GET /api/features endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/features", timeout=10)
            
            if response.status_code != 200:
                self.log_result("Features API - HTTP Status", False, 
                              f"Expected 200, got {response.status_code}")
                return False
                
            features = response.json()
            
            # Check if we have 7 features
            if len(features) != 7:
                self.log_result("Features API - Count", False, 
                              f"Expected 7 features, got {len(features)}")
                return False
            
            # Check feature structure
            required_fields = ['icon', 'title', 'description', 'order']
            optional_fields = ['badge', 'badgeColor']
            
            for i, feature in enumerate(features):
                # Check required fields
                for field in required_fields:
                    if field not in feature:
                        self.log_result("Features API - Structure", False, 
                                      f"Feature {i+1} missing required field: {field}")
                        return False
                
                # Validate order field is present and is integer
                if not isinstance(feature.get('order'), int):
                    self.log_result("Features API - Order Field", False,
                                  f"Feature {i+1} order field should be integer")
                    return False
            
            # Check if features are sorted by order
            orders = [f['order'] for f in features]
            if orders != sorted(orders):
                self.log_result("Features API - Sorting", False,
                              "Features are not sorted by order field")
                return False
                
            self.log_result("Features API - Complete", True, 
                          f"Successfully retrieved {len(features)} features with correct structure and sorting")
            return True
            
        except Exception as e:
            self.log_result("Features API - Error", False, f"Exception: {str(e)}")
            return False
    
    def test_steps_api(self):
        """Test GET /api/steps endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/steps", timeout=10)
            
            if response.status_code != 200:
                self.log_result("Steps API - HTTP Status", False, 
                              f"Expected 200, got {response.status_code}")
                return False
                
            steps = response.json()
            
            # Check if we have 3 steps
            if len(steps) != 3:
                self.log_result("Steps API - Count", False, 
                              f"Expected 3 steps, got {len(steps)}")
                return False
            
            # Check step structure
            required_fields = ['number', 'icon', 'title', 'description', 'order']
            
            for i, step in enumerate(steps):
                for field in required_fields:
                    if field not in step:
                        self.log_result("Steps API - Structure", False, 
                                      f"Step {i+1} missing required field: {field}")
                        return False
                
                # Validate order field
                if not isinstance(step.get('order'), int):
                    self.log_result("Steps API - Order Field", False,
                                  f"Step {i+1} order field should be integer")
                    return False
            
            # Check sorting by order
            orders = [s['order'] for s in steps]
            if orders != sorted(orders):
                self.log_result("Steps API - Sorting", False,
                              "Steps are not sorted by order field")
                return False
                
            self.log_result("Steps API - Complete", True, 
                          f"Successfully retrieved {len(steps)} steps with correct structure and sorting")
            return True
            
        except Exception as e:
            self.log_result("Steps API - Error", False, f"Exception: {str(e)}")
            return False
    
    def test_crops_api(self):
        """Test GET /api/crops endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/crops", timeout=10)
            
            if response.status_code != 200:
                self.log_result("Crops API - HTTP Status", False, 
                              f"Expected 200, got {response.status_code}")
                return False
                
            crops = response.json()
            
            # Check if we have 6 crops
            if len(crops) != 6:
                self.log_result("Crops API - Count", False, 
                              f"Expected 6 crops, got {len(crops)}")
                return False
            
            # Check crop structure
            required_fields = ['icon', 'title', 'locations', 'color', 'order']
            
            for i, crop in enumerate(crops):
                for field in required_fields:
                    if field not in crop:
                        self.log_result("Crops API - Structure", False, 
                                      f"Crop {i+1} missing required field: {field}")
                        return False
                
                # Validate order field
                if not isinstance(crop.get('order'), int):
                    self.log_result("Crops API - Order Field", False,
                                  f"Crop {i+1} order field should be integer")
                    return False
            
            # Check sorting
            orders = [c['order'] for c in crops]
            if orders != sorted(orders):
                self.log_result("Crops API - Sorting", False,
                              "Crops are not sorted by order field")
                return False
                
            self.log_result("Crops API - Complete", True, 
                          f"Successfully retrieved {len(crops)} crops with correct structure and sorting")
            return True
            
        except Exception as e:
            self.log_result("Crops API - Error", False, f"Exception: {str(e)}")
            return False
    
    def test_producers_api(self):
        """Test GET /api/producers endpoint with and without limit"""
        try:
            # Test without limit
            response = requests.get(f"{BACKEND_URL}/api/producers", timeout=10)
            
            if response.status_code != 200:
                self.log_result("Producers API - HTTP Status", False, 
                              f"Expected 200, got {response.status_code}")
                return False
                
            all_producers = response.json()
            
            # Check if we have 4 producers
            if len(all_producers) != 4:
                self.log_result("Producers API - Count", False, 
                              f"Expected 4 producers, got {len(all_producers)}")
                return False
            
            # Check producer structure
            required_fields = ['name', 'initial', 'crop', 'location', 'color', 'order']
            
            for i, producer in enumerate(all_producers):
                for field in required_fields:
                    if field not in producer:
                        self.log_result("Producers API - Structure", False, 
                                      f"Producer {i+1} missing required field: {field}")
                        return False
                
                # Validate order field
                if not isinstance(producer.get('order'), int):
                    self.log_result("Producers API - Order Field", False,
                                  f"Producer {i+1} order field should be integer")
                    return False
            
            # Check sorting
            orders = [p['order'] for p in all_producers]
            if orders != sorted(orders):
                self.log_result("Producers API - Sorting", False,
                              "Producers are not sorted by order field")
                return False
            
            # Test with limit parameter
            response_limited = requests.get(f"{BACKEND_URL}/api/producers?limit=2", timeout=10)
            
            if response_limited.status_code != 200:
                self.log_result("Producers API - Limit Parameter HTTP", False, 
                              f"Expected 200 for limit query, got {response_limited.status_code}")
                return False
                
            limited_producers = response_limited.json()
            
            if len(limited_producers) != 2:
                self.log_result("Producers API - Limit Parameter", False, 
                              f"Expected 2 producers with limit=2, got {len(limited_producers)}")
                return False
                
            self.log_result("Producers API - Complete", True, 
                          f"Successfully retrieved {len(all_producers)} producers (all) and {len(limited_producers)} producers (limit=2)")
            return True
            
        except Exception as e:
            self.log_result("Producers API - Error", False, f"Exception: {str(e)}")
            return False
    
    def test_testimonials_api(self):
        """Test GET /api/testimonials endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/testimonials", timeout=10)
            
            if response.status_code != 200:
                self.log_result("Testimonials API - HTTP Status", False, 
                              f"Expected 200, got {response.status_code}")
                return False
                
            testimonials = response.json()
            
            # Check if we have 2 testimonials
            if len(testimonials) != 2:
                self.log_result("Testimonials API - Count", False, 
                              f"Expected 2 testimonials, got {len(testimonials)}")
                return False
            
            # Check testimonial structure
            required_fields = ['text', 'author', 'role', 'initial', 'color', 'order']
            
            for i, testimonial in enumerate(testimonials):
                for field in required_fields:
                    if field not in testimonial:
                        self.log_result("Testimonials API - Structure", False, 
                                      f"Testimonial {i+1} missing required field: {field}")
                        return False
                
                # Validate order field
                if not isinstance(testimonial.get('order'), int):
                    self.log_result("Testimonials API - Order Field", False,
                                  f"Testimonial {i+1} order field should be integer")
                    return False
            
            # Check sorting
            orders = [t['order'] for t in testimonials]
            if orders != sorted(orders):
                self.log_result("Testimonials API - Sorting", False,
                              "Testimonials are not sorted by order field")
                return False
                
            self.log_result("Testimonials API - Complete", True, 
                          f"Successfully retrieved {len(testimonials)} testimonials with correct structure and sorting")
            return True
            
        except Exception as e:
            self.log_result("Testimonials API - Error", False, f"Exception: {str(e)}")
            return False
    
    def test_pricing_plans_api(self):
        """Test GET /api/pricing-plans endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/pricing-plans", timeout=10)
            
            if response.status_code != 200:
                self.log_result("Pricing Plans API - HTTP Status", False, 
                              f"Expected 200, got {response.status_code}")
                return False
                
            plans = response.json()
            
            # Check if we have 4 pricing plans
            if len(plans) != 4:
                self.log_result("Pricing Plans API - Count", False, 
                              f"Expected 4 pricing plans, got {len(plans)}")
                return False
            
            # Check pricing plan structure
            required_fields = ['name', 'price', 'period', 'popular', 'features', 'cta', 'ctaVariant', 'order']
            optional_fields = ['badge']
            
            for i, plan in enumerate(plans):
                for field in required_fields:
                    if field not in plan:
                        self.log_result("Pricing Plans API - Structure", False, 
                                      f"Plan {i+1} missing required field: {field}")
                        return False
                
                # Validate specific fields
                if not isinstance(plan.get('popular'), bool):
                    self.log_result("Pricing Plans API - Popular Field", False,
                                  f"Plan {i+1} popular field should be boolean")
                    return False
                
                if not isinstance(plan.get('features'), list):
                    self.log_result("Pricing Plans API - Features Field", False,
                                  f"Plan {i+1} features field should be array")
                    return False
                
                if not isinstance(plan.get('order'), int):
                    self.log_result("Pricing Plans API - Order Field", False,
                                  f"Plan {i+1} order field should be integer")
                    return False
            
            # Check sorting
            orders = [p['order'] for p in plans]
            if orders != sorted(orders):
                self.log_result("Pricing Plans API - Sorting", False,
                              "Pricing plans are not sorted by order field")
                return False
                
            self.log_result("Pricing Plans API - Complete", True, 
                          f"Successfully retrieved {len(plans)} pricing plans with correct structure and sorting")
            return True
            
        except Exception as e:
            self.log_result("Pricing Plans API - Error", False, f"Exception: {str(e)}")
            return False
    
    def test_contact_api(self):
        """Test POST /api/contact endpoint"""
        try:
            # Test data
            test_contact = {
                "name": "Marie Dubois",
                "email": "marie.dubois@agritech.ci", 
                "message": "Je souhaite en savoir plus sur vos solutions de traçabilité pour ma coopérative de cacao à Soubré.",
                "userType": "producteur"
            }
            
            response = requests.post(
                f"{BACKEND_URL}/api/contact", 
                json=test_contact,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_result("Contact API - HTTP Status", False, 
                              f"Expected 200, got {response.status_code}. Response: {response.text}")
                return False
                
            created_contact = response.json()
            
            # Check if response contains the _id field
            if "_id" not in created_contact:
                self.log_result("Contact API - ID Field", False, 
                              "Response should contain _id field")
                return False
            
            # Check if all input fields are returned
            for field in ["name", "email", "message", "userType"]:
                if field not in created_contact:
                    self.log_result("Contact API - Response Fields", False, 
                                  f"Response missing field: {field}")
                    return False
                
                if created_contact[field] != test_contact[field]:
                    self.log_result("Contact API - Data Integrity", False, 
                                  f"Field {field} value mismatch")
                    return False
            
            # Check if createdAt field exists
            if "createdAt" not in created_contact:
                self.log_result("Contact API - CreatedAt Field", False, 
                              "Response should contain createdAt field")
                return False
                
            self.log_result("Contact API - Complete", True, 
                          f"Successfully created contact with ID: {created_contact['_id']}")
            return True
            
        except Exception as e:
            self.log_result("Contact API - Error", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting GreenLink Agritech Backend API Tests")
        print("=" * 60)
        print()
        
        # Run individual tests
        self.test_features_api()
        self.test_steps_api()
        self.test_crops_api()
        self.test_producers_api()
        self.test_testimonials_api()
        self.test_pricing_plans_api()
        self.test_contact_api()
        
        # Print summary
        print("=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests / self.total_tests * 100):.1f}%")
        print("=" * 60)
        
        # Return overall success
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results to file
    with open('/app/test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/test_results.json")
    
    if success:
        print("\n🎉 All backend tests passed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
        sys.exit(1)