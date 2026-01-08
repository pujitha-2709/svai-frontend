import requests
import json

def test_backend_quiz_generation():
    """Test the backend quiz generation API"""
    base_url = "http://localhost:3000"  # Updated to port 3000
    
    print("=== Testing Backend Quiz Generation ===\n")
    
    # Test data
    test_cases = [
        {"skill": "SQL", "difficulty": "beginner"},
        {"skill": "SQL", "difficulty": "intermediate"},
        {"skill": "SQL", "difficulty": "advanced"},
        {"skill": "SQL", "difficulty": "expert"}
    ]
    
    for test_case in test_cases:
        print(f"Testing: {test_case['skill']} - {test_case['difficulty']}")
        
        try:
            response = requests.post(
                f"{base_url}/api/quiz/generate",
                json=test_case,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                questions = data.get('questions', [])
                
                print(f"  ✅ Questions: {len(questions)}/10")
                
                if len(questions) == 10:
                    print("  ✅ Correct number of questions generated")
                    
                    # Check if questions are scenario-based (our new engine)
                    first_question = questions[0].get('question', '')
                    if 'scenario' in first_question.lower() or 'you are' in first_question.lower():
                        print("  ✅ Using new scenario-based engine")
                    else:
                        print("  ⚠️  Using old Mistral engine")
                        
                else:
                    print(f"  ❌ Expected 10 questions, got {len(questions)}")
                
                # Validate question structure
                for i, question in enumerate(questions[:2]):  # Check first 2 questions
                    print(f"    Question {i+1}: {len(question.get('options', []))} options")
                    
            else:
                print(f"  ❌ Error: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Request failed: {e}")
        
        print()
    
    print("=== Test Complete ===")

if __name__ == "__main__":
    test_backend_quiz_generation()
