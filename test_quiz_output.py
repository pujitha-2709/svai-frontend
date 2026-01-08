import json
from ai_quiz_generator import AIQuizGenerator

def test_quiz_generation():
    """Test the quiz generation engine with validation"""
    generator = AIQuizGenerator()
    
    # Test SQL beginner level
    print("=== Testing Quiz Generation ===\n")
    
    quiz = generator.generate_quiz("SQL", "beginner")
    
    # Validate JSON structure
    required_fields = ["skill", "difficulty", "questions"]
    for field in required_fields:
        assert field in quiz, f"Missing required field: {field}"
    
    # Validate exactly 10 questions
    assert len(quiz["questions"]) == 10, f"Expected 10 questions, got {len(quiz['questions'])}"
    
    # Validate all question types are present
    question_types = [q["question_type"] for q in quiz["questions"]]
    expected_types = generator.QUESTION_TYPES
    
    print(f"Generated question types: {question_types}")
    print(f"Expected types: {expected_types}")
    
    # Validate each question structure
    for i, question in enumerate(quiz["questions"]):
        print(f"\nQuestion {i+1}: {question['question_type']}")
        
        # Required fields
        required_q_fields = ["question_type", "scenario", "question", "time_limit_seconds", "options", "correct_answer", "explanation"]
        for field in required_q_fields:
            assert field in question, f"Question {i+1} missing field: {field}"
        
        # Validate options
        assert len(question["options"]) == 4, f"Question {i+1} should have 4 options"
        assert question["correct_answer"] in ["Option A", "Option B", "Option C", "Option D"], f"Invalid correct answer format"
        
        # Validate timer range for beginner
        assert 45 <= question["time_limit_seconds"] <= 60, f"Invalid timer for beginner: {question['time_limit_seconds']}"
        
        print(f"  ✓ Timer: {question['time_limit_seconds']}s")
        print(f"  ✓ Options: {len(question['options'])}")
        print(f"  ✓ Correct: {question['correct_answer']}")
    
    # Test JSON serialization
    json_output = json.dumps(quiz, indent=2)
    print(f"\n✅ JSON output valid ({len(json_output)} characters)")
    
    # Test different difficulty levels
    print("\n=== Testing Different Difficulty Levels ===")
    
    for difficulty in ["beginner", "intermediate", "advanced", "expert"]:
        quiz_test = generator.generate_quiz("SQL", difficulty)
        timers = [q["time_limit_seconds"] for q in quiz_test["questions"]]
        min_timer, max_timer = generator.TIMER_LIMITS[difficulty]
        
        print(f"{difficulty.capitalize()}: {min(timers)}-{max(timers)}s (expected: {min_timer}-{max_timer}s)")
        
        # Validate timer ranges
        for timer in timers:
            assert min_timer <= timer <= max_timer, f"Invalid timer for {difficulty}: {timer}"
    
    print("\n✅ All tests passed!")
    return quiz

if __name__ == "__main__":
    quiz = test_quiz_generation()
    
    # Save sample output
    with open("sample_quiz_output.json", "w") as f:
        json.dump(quiz, f, indent=2)
    
    print("\nSample quiz saved to 'sample_quiz_output.json'")
