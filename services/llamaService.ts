import { QuizQuestion, RoadmapItem, User, MatchRecommendation } from "../types";

type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// OpenRouter API Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const LLAMA_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// OpenRouter API call function (Optimized for speed)
const callOpenRouter = async (messages: any[]): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in your .env file');
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'SkillVouch AI'
      },
      body: JSON.stringify({
        model: LLAMA_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000 // Reduced for faster responses
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenRouter API call failed:', error);
    throw error;
  }
};

const postJson = async <T>(url: string, body: unknown): Promise<T> => {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`API error: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`);
  }
  return resp.json() as Promise<T>;
};

// Retry utility with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      // Don't retry on certain error types
      if (error?.status === 400 || error?.status === 401) {
        console.error("Client error, not retrying:", error);
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error("Max retries exceeded, giving up");
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

// 1. Generate Quiz with Llama 3.3 70B via OpenRouter (Fast)
export const generateQuiz = async (skillName: string, difficulty: QuizDifficulty = 'expert'): Promise<QuizQuestion[]> => {
  try {
    const prompt = {
      role: "system",
      content: `Generate 5 unique ${difficulty} quiz questions for ${skillName}. Return JSON:
{
  "questions": [
    {"question": "string", "codeSnippet": "string", "options": ["a","b","c","d"], "correctAnswerIndex": number}
  ]
}`
    };

    const userPrompt = {
      role: "user", 
      content: `Create 5 ${difficulty} questions about ${skillName}. Mix topics: syntax, logic, best practices, debugging. Use code examples.`
    };

    const response = await callOpenRouter([prompt, userPrompt]);
    
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/^```json\s*/gm, '').replace(/^```\s*$/gm, '');
    cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    cleanResponse = cleanResponse.trim();
    
    const parsed = JSON.parse(cleanResponse);
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response format');
    }

    return parsed.questions;
  } catch (error) {
    console.error('Quiz generation failed:', error);
    throw new Error(`Quiz generation failed: ${error.message}`);
  }
};

// 2. Generate Learning Roadmap with Llama 3.3 70B (Fast)
export const generateRoadmap = async (skillName: string): Promise<RoadmapItem[]> => {
  try {
    const prompt = {
      role: "system",
      content: `Generate 6-step learning roadmap for ${skillName}. Return JSON:
{
  "roadmap": [
    {"step": number, "title": "string", "description": "string", "duration": "string", "resources": ["string", "string", "string"]}
  ]
}`
    };

    const userPrompt = {
      role: "user", 
      content: `Create 6-step roadmap for ${skillName}: beginner to advanced. Include practical projects and realistic timeframes. Each step should have 3 learning resources.`
    };

    const response = await callOpenRouter([prompt, userPrompt]);
    
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/^```json\s*/gm, '').replace(/^```\s*$/gm, '');
    cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    cleanResponse = cleanResponse.trim();
    
    const parsed = JSON.parse(cleanResponse);
    
    if (!parsed.roadmap || !Array.isArray(parsed.roadmap)) {
      throw new Error('Invalid roadmap format');
    }

    return parsed.roadmap;
  } catch (error) {
    console.error('Roadmap generation failed:', error);
    // Fallback roadmap if API fails
    return [
      {
        step: 1,
        title: `Getting Started with ${skillName}`,
        description: `Learn the fundamentals and basic concepts of ${skillName}`,
        duration: "1-2 weeks",
        resources: [
          "Official documentation",
          "Beginner tutorials",
          "Practice exercises"
        ]
      },
      {
        step: 2,
        title: `Core ${skillName} Concepts`,
        description: `Deep dive into essential concepts and principles`,
        duration: "2-3 weeks",
        resources: [
          "Video courses",
          "Hands-on projects",
          "Community forums"
        ]
      },
      {
        step: 3,
        title: `Practical Application`,
        description: `Apply your knowledge through real-world projects`,
        duration: "3-4 weeks",
        resources: [
          "Project templates",
          "Code repositories",
          "Mentorship programs"
        ]
      },
      {
        step: 4,
        title: `Advanced Techniques`,
        description: `Master advanced concepts and best practices`,
        duration: "4-6 weeks",
        resources: [
          "Advanced documentation",
          "Expert tutorials",
          "Case studies"
        ]
      },
      {
        step: 5,
        title: `Specialization`,
        description: `Focus on specific areas of expertise within ${skillName}`,
        duration: "6-8 weeks",
        resources: [
          "Specialized courses",
          "Research papers",
          "Professional workshops"
        ]
      },
      {
        step: 6,
        title: `Mastery & Portfolio`,
        description: `Build a comprehensive portfolio and contribute to the community`,
        duration: "8-12 weeks",
        resources: [
          "Portfolio projects",
          "Open source contributions",
          "Speaking opportunities"
        ]
      }
    ];
  }
};

// 3. Analyze Match Compatibility
export const analyzeMatch = async (user1: User, user2: User): Promise<{ score: number; reasoning: string; commonInterests: string[] }> => {
  return postJson<{ score: number; reasoning: string; commonInterests: string[] }>(
    '/api/match/analyze',
    { user1, user2 }
  );
};

// 4. Suggest Skills with Llama 3.3 70B (Fast)
export const suggestSkills = async (currentSkills: string[], currentGoals: string[] = []): Promise<string[]> => {
  try {
    const prompt = {
      role: "system",
      content: `Suggest 5 relevant skills based on user's current skills and goals. Return ONLY a JSON object with this exact format:
{
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
}
No additional text, no explanations, no markdown formatting. Just the JSON object.`
    };

    const userPrompt = {
      role: "user", 
      content: `Current skills: [${currentSkills.join(', ')}]. Goals: [${currentGoals.join(', ')}]. Suggest 5 in-demand skills that complement these.`
    };

    const response = await callOpenRouter([prompt, userPrompt]);
    
    let cleanResponse = response.trim();
    
    // Remove any markdown code blocks
    cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/^```\s*$/gm, '');
    cleanResponse = cleanResponse.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '');
    
    // Remove any explanatory text before or after JSON
    const jsonStart = cleanResponse.indexOf('{');
    const jsonEnd = cleanResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
    }
    
    cleanResponse = cleanResponse.trim();
    
    const parsed = JSON.parse(cleanResponse);
    
    if (!parsed.skills || !Array.isArray(parsed.skills)) {
      throw new Error('Invalid skills format');
    }

    return parsed.skills;
  } catch (error) {
    console.error('Skill suggestion failed:', error);
    // Fallback suggestions if API fails
    const fallbackSkills = [
      'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript',
      'HTML/CSS', 'SQL', 'Git', 'Docker', 'AWS',
      'Machine Learning', 'Data Analysis', 'UI/UX Design', 'Project Management', 'Communication'
    ];
    
    // Filter out skills user already knows and return 5 random ones
    const availableSkills = fallbackSkills.filter(skill => 
      !currentSkills.some(known => known.toLowerCase() === skill.toLowerCase())
    );
    
    // Shuffle and take 5
    const shuffled = availableSkills.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }
};
