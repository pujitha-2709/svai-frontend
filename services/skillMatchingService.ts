import { User, Skill } from '../types';

export interface StrictMatchResult {
  matched: boolean;
  skill: string;
  matches: Array<{
    user_id: string;
    skill: string;
    verification_score: number;
    experience_level: string;
  }>;
  message: string;
}

/**
 * AI Skill Matching Engine with strict matching rules.
 * 
 * Only returns perfect matches between learners and mentors based on:
 * 1. Exact skill name match (case-insensitive)
 * 2. Mentor must be verified in that skill
 * 3. Verification must include passed proficiency test
 * 4. Verification status must be "verified"
 */
export class SkillMatchingEngine {
  /**
   * Match learner skill with verified mentors.
   * 
   * @param learnerSkill - The skill name requested by the learner
   * @param mentorData - List of users with their skills
   * @returns JSON response with matching results
   */
  matchSkills(learnerSkill: string, mentorData: User[]): StrictMatchResult {
    // Normalize learner skill for case-insensitive comparison
    const normalizedLearnerSkill = learnerSkill.trim().toLowerCase();
    
    // Find matches based on strict criteria
    const matches: StrictMatchResult['matches'] = [];
    
    for (const mentor of mentorData) {
      // Check if mentor has the exact skill (case-insensitive)
      const matchingSkills = mentor.skillsKnown.filter(skill => 
        skill.name.trim().toLowerCase() === normalizedLearnerSkill
      );
      
      for (const skill of matchingSkills) {
        // Check verification status
        if (skill.verified) {
          // Create match object
          const match = {
            user_id: mentor.id,
            skill: skill.name,
            verification_score: skill.score || 0,
            experience_level: this.getExperienceLevel(skill.score || 0)
          };
          matches.push(match);
        }
      }
    }
    
    // Prepare response
    if (matches.length > 0) {
      return {
        matched: true,
        skill: learnerSkill,
        matches,
        message: `Found ${matches.length} verified mentor(s) for ${learnerSkill}`
      };
    } else {
      return {
        matched: false,
        skill: learnerSkill,
        matches: [],
        message: `No verified mentors found for ${learnerSkill}. Only exact skill matches with verified status are returned.`
      };
    }
  }
  
  /**
   * Match multiple learner skills against mentor data.
   * 
   * @param learnerSkills - List of skill names requested by learners
   * @param mentorData - List of users with their skills
   * @returns List of JSON responses for each skill
   */
  batchMatch(learnerSkills: string[], mentorData: User[]): StrictMatchResult[] {
    return learnerSkills.map(skill => this.matchSkills(skill, mentorData));
  }
  
  /**
   * Find strict matches for a user's learning goals
   * 
   * @param user - The user looking for mentors
   * @param allUsers - List of all potential mentors
   * @returns Array of users with strict skill matches
   */
  findStrictMentors(user: User, allUsers: User[]): User[] {
    const strictMatches: User[] = [];
    
    for (const mentor of allUsers) {
      if (mentor.id === user.id) continue;
      
      // Check if mentor has any EXACT matches for user's learning goals
      const hasStrictMatch = user.skillsToLearn.some(learningSkill => 
        mentor.skillsKnown.some(mentorSkill => 
          mentorSkill.name.trim().toLowerCase() === learningSkill.trim().toLowerCase() &&
          mentorSkill.verified
        )
      );
      
      if (hasStrictMatch) {
        strictMatches.push(mentor);
      }
    }
    
    return strictMatches;
  }
  
  /**
   * Get strict skill matches for a specific learning goal
   * 
   * @param learningSkill - The skill the user wants to learn
   * @param allUsers - List of all potential mentors
   * @returns Array of users who can teach this exact skill and are verified
   */
  findMentorsForSkill(learningSkill: string, allUsers: User[]): User[] {
    const normalizedSkill = learningSkill.trim().toLowerCase();
    const matches: User[] = [];
    
    for (const mentor of allUsers) {
      const hasExactVerifiedSkill = mentor.skillsKnown.some(skill => 
        skill.name.trim().toLowerCase() === normalizedSkill &&
        skill.verified
      );
      
      if (hasExactVerifiedSkill) {
        matches.push(mentor);
      }
    }
    
    return matches;
  }
  
  /**
   * Convert verification score to experience level
   */
  private getExperienceLevel(score: number): string {
    if (score >= 90) return 'Expert';
    if (score >= 75) return 'Advanced';
    if (score >= 60) return 'Intermediate';
    if (score >= 40) return 'Beginner';
    return 'Novice';
  }
}

// Export singleton instance
export const skillMatchingEngine = new SkillMatchingEngine();
