import json
from typing import Dict, List, Any

class SkillMatchingEngine:
    """
    AI Skill Matching Engine with strict matching rules.
    
    Only returns perfect matches between learners and mentors based on:
    1. Exact skill name match (case-insensitive)
    2. Mentor must be verified in that skill
    3. Verification must include passed proficiency test
    4. Verification status must be "verified"
    """
    
    def match_skills(self, learner_skill: str, mentor_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Match learner skill with verified mentors.
        
        Args:
            learner_skill: The skill name requested by the learner
            mentor_data: List of mentor dictionaries with user info and skills
            
        Returns:
            JSON response with matching results
        """
        # Normalize learner skill for case-insensitive comparison
        normalized_learner_skill = learner_skill.strip().lower()
        
        # Find matches based on strict criteria
        matches = []
        
        for mentor in mentor_data:
            # Check if mentor has the exact skill (case-insensitive)
            mentor_skill = mentor.get('skill_name', '').strip().lower()
            
            if mentor_skill == normalized_learner_skill:
                # Check verification status
                verification_status = mentor.get('verification_status', '').strip().lower()
                
                # Must be explicitly verified
                if verification_status == 'verified':
                    # Create match object
                    match = {
                        'user_id': mentor.get('user_id'),
                        'skill': mentor.get('skill_name'),
                        'verification_score': mentor.get('verification_score', 0),
                        'experience_level': mentor.get('experience_level', 'Unknown')
                    }
                    matches.append(match)
        
        # Prepare response
        if matches:
            response = {
                'matched': True,
                'skill': learner_skill,
                'matches': matches,
                'message': f'Found {len(matches)} verified mentor(s) for {learner_skill}'
            }
        else:
            response = {
                'matched': False,
                'skill': learner_skill,
                'matches': [],
                'message': f'No verified mentors found for {learner_skill}. Only exact skill matches with verified status are returned.'
            }
        
        return response
    
    def batch_match(self, learner_skills: List[str], mentor_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Match multiple learner skills against mentor data.
        
        Args:
            learner_skills: List of skill names requested by learners
            mentor_data: List of mentor dictionaries with user info and skills
            
        Returns:
            List of JSON responses for each skill
        """
        results = []
        for skill in learner_skills:
            result = self.match_skills(skill, mentor_data)
            results.append(result)
        return results


# Example usage and test cases
if __name__ == "__main__":
    # Initialize the engine
    engine = SkillMatchingEngine()
    
    # Sample mentor data
    sample_mentors = [
        {
            'user_id': 'mentor001',
            'skill_name': 'SQL',
            'verification_status': 'verified',
            'verification_score': 95,
            'experience_level': 'Expert'
        },
        {
            'user_id': 'mentor002',
            'skill_name': 'MySQL',
            'verification_status': 'verified',
            'verification_score': 88,
            'experience_level': 'Advanced'
        },
        {
            'user_id': 'mentor003',
            'skill_name': 'SQL',
            'verification_status': 'unverified',
            'verification_score': 75,
            'experience_level': 'Intermediate'
        },
        {
            'user_id': 'mentor004',
            'skill_name': 'Python',
            'verification_status': 'verified',
            'verification_score': 92,
            'experience_level': 'Expert'
        },
        {
            'user_id': 'mentor005',
            'skill_name': 'sql',  # Different case
            'verification_status': 'verified',
            'verification_score': 90,
            'experience_level': 'Advanced'
        }
    ]
    
    # Test cases
    test_cases = [
        'SQL',
        'Python',
        'MySQL',
        'JavaScript',
        'sql'  # Different case
    ]
    
    print("=== Skill Matching Engine Test Results ===\n")
    
    for skill in test_cases:
        result = engine.match_skills(skill, sample_mentors)
        print(f"Learner Skill: {skill}")
        print(json.dumps(result, indent=2))
        print("-" * 50)
