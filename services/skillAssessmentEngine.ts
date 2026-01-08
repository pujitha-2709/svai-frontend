interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  subSkill: string;
}

interface QuizResponse {
  skill: string;
  level: string;
  questions: QuizQuestion[];
}

type SkillCategory = 'Technical' | 'Creative' | 'Academic' | 'Vocational' | 'Soft Skill';
type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

class SkillAssessmentEngine {
  private readonly SKILL_DISAMBIGUATION_MAP: Record<string, string> = {
    'java': 'Java Programming Language',
    'javascript': 'JavaScript Programming',
    'python': 'Python Programming',
    'react': 'React Framework',
    'css': 'CSS Styling',
    'html': 'HTML Markup',
    'sql': 'SQL Database',
    'aws': 'AWS Cloud Computing',
    'docker': 'Docker Containerization',
    'kubernetes': 'Kubernetes Orchestration',
    'cooking': 'Cooking and Culinary Arts',
    'baking': 'Baking and Pastry',
    'yoga': 'Yoga Practice',
    'spanish': 'Spanish Language',
    'marketing': 'Digital Marketing',
    'carpentry': 'Carpentry and Woodworking',
    'basketball': 'Basketball Sport',
    'accounting': 'Accounting and Finance',
    'leadership': 'Leadership Skills',
    'communication': 'Communication Skills'
  };

  private readonly DOMAIN_PROMPTS: Record<string, Record<DifficultyLevel, string>> = {
    programming: {
      Beginner: 'Generate 5 BEGINNER-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on basic syntax, fundamental concepts, and simple usage patterns.',
      Intermediate: 'Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on practical applications, problem-solving scenarios, and context-based decisions.',
      Advanced: 'Generate 5 ADVANCED-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on optimization, edge cases, best practices, and performance considerations.',
      Expert: 'Generate 5 EXPERT-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on architecture decisions, trade-offs, failure handling, and real production scenarios.'
    },
    cooking: {
      Beginner: 'Generate 5 BEGINNER-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on basic cooking techniques, kitchen safety, fundamental ingredients, and simple recipes.',
      Intermediate: 'Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on recipe execution, flavor combinations, cooking methods, and food preparation techniques.',
      Advanced: 'Generate 5 ADVANCED-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on complex techniques, recipe development, international cuisines, and kitchen management.',
      Expert: 'Generate 5 EXPERT-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on food science, advanced culinary techniques, menu planning, and professional kitchen operations.'
    },
    language: {
      Beginner: 'Generate 5 BEGINNER-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on basic vocabulary, fundamental grammar, simple phrases, and introductory concepts.',
      Intermediate: 'Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on conversational patterns, intermediate grammar, cultural context, and practical communication.',
      Advanced: 'Generate 5 ADVANCED-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on nuanced vocabulary, complex grammar, cultural nuances, and advanced communication.',
      Expert: 'Generate 5 EXPERT-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on literary analysis, advanced linguistic structures, cultural context, and professional communication.'
    },
    business: {
      Beginner: 'Generate 5 BEGINNER-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on basic concepts, fundamental principles, and introductory business knowledge.',
      Intermediate: 'Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on practical applications, real-world scenarios, and business decision-making.',
      Advanced: 'Generate 5 ADVANCED-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on strategic thinking, complex scenarios, and advanced business concepts.',
      Expert: 'Generate 5 EXPERT-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on executive decisions, industry analysis, and complex business strategy.'
    },
    health: {
      Beginner: 'Generate 5 BEGINNER-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on basic techniques, safety guidelines, fundamental concepts, and introductory knowledge.',
      Intermediate: 'Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on practical applications, program design, and intermediate techniques.',
      Advanced: 'Generate 5 ADVANCED-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on advanced techniques, exercise science, and complex applications.',
      Expert: 'Generate 5 EXPERT-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on professional training methods, advanced concepts, and specialized knowledge.'
    },
    creative: {
      Beginner: 'Generate 5 BEGINNER-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on fundamental techniques, basic principles, and introductory creative concepts.',
      Intermediate: 'Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on practical applications, creative processes, and intermediate techniques.',
      Advanced: 'Generate 5 ADVANCED-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on advanced techniques, creative theory, and professional practices.',
      Expert: 'Generate 5 EXPERT-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on industry standards, complex problem-solving, and advanced creative workflows.'
    },
    technical: {
      Beginner: 'Generate 5 BEGINNER-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on basic concepts, fundamental knowledge, and introductory technical principles.',
      Intermediate: 'Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on practical applications, problem-solving, and real-world scenarios.',
      Advanced: 'Generate 5 ADVANCED-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on optimization, best practices, and complex technical concepts.',
      Expert: 'Generate 5 EXPERT-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on architecture, system design, trade-offs, and production scenarios.'
    },
    general: {
      Beginner: 'Generate 5 BEGINNER-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on basic concepts and fundamental understanding.',
      Intermediate: 'Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on practical applications and real-world scenarios.',
      Advanced: 'Generate 5 ADVANCED-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on complex concepts and advanced knowledge.',
      Expert: 'Generate 5 EXPERT-LEVEL multiple-choice questions about "{SKILL_NAME}" focusing on specialized knowledge and professional expertise.'
    }
  };

  private detectSkillDomain(skillName: string): string {
    const lowerSkill = skillName.toLowerCase();
    
    const domainKeywords: Record<string, string[]> = {
      programming: ['javascript', 'python', 'java', 'react', 'css', 'html', 'sql', 'programming', 'coding', 'software', 'development', 'algorithm', 'data', 'system', 'network', 'database', 'api', 'frontend', 'backend'],
      cooking: ['cooking', 'culinary', 'food', 'recipe', 'kitchen', 'baking', 'chef', 'meal', 'ingredient', 'flavor', 'cuisine', 'dish', 'restaurant'],
      language: ['spanish', 'english', 'french', 'german', 'language', 'translation', 'grammar', 'vocabulary', 'speaking', 'writing'],
      business: ['marketing', 'management', 'sales', 'finance', 'strategy', 'leadership', 'entrepreneurship', 'business', 'consulting', 'negotiation'],
      health: ['yoga', 'fitness', 'meditation', 'nutrition', 'exercise', 'health', 'wellness', 'training', 'therapy'],
      creative: ['design', 'art', 'music', 'writing', 'content', 'creative', 'visual', 'media', 'photography', 'video'],
      technical: ['aws', 'docker', 'kubernetes', 'cloud', 'security', 'cybersecurity', 'devops', 'infrastructure', 'deployment'],
      sports: ['basketball', 'football', 'soccer', 'tennis', 'golf', 'swimming', 'running', 'cycling', 'athletics']
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => lowerSkill.includes(keyword))) {
        return domain;
      }
    }

    return 'general';
  }

  private disambiguateSkill(skillName: string): string {
    const normalizedSkill = skillName.toLowerCase().trim();
    return this.SKILL_DISAMBIGUATION_MAP[normalizedSkill] || skillName;
  }

  private generatePrompt(skillName: string, level: DifficultyLevel): string {
    const disambiguatedSkill = this.disambiguateSkill(skillName);
    const domain = this.detectSkillDomain(skillName);
    const basePrompt = this.DOMAIN_PROMPTS[domain]?.[level] || this.DOMAIN_PROMPTS.general[level];
    
    return `${basePrompt.replace('{SKILL_NAME}', disambiguatedSkill)}

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${disambiguatedSkill} - no mixing with adjacent skills
6. Difficulty must EXACTLY match ${level} level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "${level}",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`;
  }

  async generateQuiz(skillName: string, category: SkillCategory, level: DifficultyLevel): Promise<QuizResponse> {
    const prompt = this.generatePrompt(skillName, level);
    
    try {
      const response = await fetch('/api/mistral/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          skillName,
          level,
          category
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.questions || !Array.isArray(result.questions) || result.questions.length !== 5) {
        throw new Error('Invalid response format');
      }

      const validatedQuestions = result.questions.map((q: any) => ({
        question: q.question,
        options: {
          A: q.options.A,
          B: q.options.B,
          C: q.options.C,
          D: q.options.D
        },
        correctAnswer: q.correctAnswer,
        subSkill: q.subSkill || 'General'
      }));

      return {
        skill: skillName,
        level,
        questions: validatedQuestions
      };

    } catch (error) {
      console.error('Quiz generation failed:', error);
      throw new Error(`Failed to generate quiz for ${skillName}: ${error.message}`);
    }
  }

  validateQuizResponse(response: any): boolean {
    if (!response.skill || !response.level || !Array.isArray(response.questions)) {
      return false;
    }

    if (response.questions.length !== 5) {
      return false;
    }

    return response.questions.every((q: any) => {
      return q.question && 
             q.options && 
             typeof q.options === 'object' &&
             ['A', 'B', 'C', 'D'].every(key => key in q.options) &&
             ['A', 'B', 'C', 'D'].includes(q.correctAnswer) &&
             q.subSkill;
    });
  }
}

export const skillAssessmentEngine = new SkillAssessmentEngine();
export type { QuizQuestion, QuizResponse, SkillCategory, DifficultyLevel };
