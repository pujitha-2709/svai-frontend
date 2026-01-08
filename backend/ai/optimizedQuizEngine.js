import { ChatMistralAI } from '@langchain/mistralai';

const mistral = new ChatMistralAI({
  model: 'mistral-small',
  temperature: 0.3, // Lower temperature for consistent, accurate results
  apiKey: process.env.MISTRAL_API_KEY,
});

// Quiz cache for performance
const quizCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const getCacheKey = (skillName, difficulty, questionCount) => {
  return `${skillName}-${difficulty}-${questionCount}`;
};

const getCachedQuiz = (skillName, difficulty, questionCount) => {
  const key = getCacheKey(skillName, difficulty, questionCount);
  const cached = quizCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Cache hit for quiz: ${skillName} (${difficulty})`);
    return cached.quiz;
  }
  
  return null;
};

const setCachedQuiz = (skillName, difficulty, questionCount, quiz) => {
  const key = getCacheKey(skillName, difficulty, questionCount);
  quizCache.set(key, {
    quiz,
    timestamp: Date.now()
  });
  
  // Clean old cache entries
  if (quizCache.size > 50) {
    const now = Date.now();
    for (const [cacheKey, cached] of quizCache.entries()) {
      if (now - cached.timestamp > CACHE_TTL) {
        quizCache.delete(cacheKey);
      }
    }
  }
};

// Generate timer based on difficulty and question type
const generateTimer = (difficulty, questionType) => {
  const baseRanges = {
    'beginner': { min: 45, max: 60 },
    'intermediate': { min: 60, max: 90 },
    'advanced': { min: 90, max: 120 }
  };
  
  const range = baseRanges[difficulty] || baseRanges['intermediate'];
  const baseTime = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  
  // Adjust based on question complexity
  const complexityAdjustments = {
    'Concept Application': 0,
    'Debugging / Error Identification': 10,
    'Performance Optimization': 15,
    'Real-World Decision Making': 5,
    'Best Practices Selection': 0,
    'Edge Case Handling': 20,
    'Security / Risk Awareness': 15,
    'Data Interpretation / Output Prediction': 10,
    'Tool / Feature Selection': 5,
    'Trade-off / Decision Analysis': 25
  };
  
  const adjustment = complexityAdjustments[questionType] || 0;
  return Math.max(range.min, Math.min(range.max, baseTime + adjustment));
};

/**
 * Generate a quiz using Mistral AI
 */
export const generateOptimizedQuiz = async (skillName, difficulty, questionCount = 10) => {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cachedQuiz = getCachedQuiz(skillName, difficulty, questionCount);
    if (cachedQuiz) {
      console.log(`Quiz generated in ${Date.now() - startTime}ms (cached)`);
      return cachedQuiz;
    }
    
    // Validate inputs
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (!validDifficulties.includes(difficulty)) {
      throw new Error(`Invalid difficulty: ${difficulty}`);
    }
    
    if (questionCount !== 10) {
      throw new Error(`Only 10 questions are supported. Got: ${questionCount}`);
    }
    
    console.log(`Generating quiz for ${skillName} (${difficulty})`);
    
    // Build the comprehensive prompt
    const prompt = `You are a backend AI Quiz Generation Engine powered by Mistral AI.
Your output is consumed directly by backend services.

PRIMARY OBJECTIVE:
Generate a real-world, scenario-based quiz to assess practical skill knowledge.
This quiz is NOT for learning — it is for evaluation.

INPUT PARAMETERS:
- skill_name: ${skillName}
- difficulty: ${difficulty}
- question_count: ${questionCount}

ABSOLUTE RULES (NO EXCEPTIONS):
1. Generate EXACTLY ${questionCount} questions.
2. ALL questions MUST be scenario-based.
3. NO theory, definitions, or memorization questions.
4. Each question MUST include a strict time limit.
5. One question = one timer.
6. Output MUST be valid JSON ONLY.
7. Each question MUST have exactly ONE correct answer.
8. Difficulty must be strictly respected.

MANDATORY QUESTION TYPES (EXACTLY ONE OF EACH):
1. Concept Application
2. Debugging / Error Identification
3. Performance Optimization
4. Real-World Decision Making
5. Best Practices Selection
6. Edge Case Handling
7. Security / Risk Awareness
8. Data Interpretation / Output Prediction
9. Tool / Feature Selection
10. Trade-off / Decision Analysis

TIMER RULES (SECONDS):
- Beginner: 45–60 seconds
- Intermediate: 60–90 seconds
- Advanced: 90–120 seconds

Timers must be realistic for reading and thinking.

DIFFICULTY BEHAVIOR:
${difficulty === 'beginner' ? 'Simple use cases and common mistakes' :
  difficulty === 'intermediate' ? 'Practical execution, debugging, optimization' :
  difficulty === 'advanced' ? 'Performance tuning, scalability, edge cases' : 'Expert level challenges'}

QUESTION DESIGN CONSTRAINTS:
- Scenario length: 3–5 concise lines
- Clear decision-focused question
- Exactly 4 realistic options
- EXACTLY ONE correct answer
- Short factual explanation
- No repeated scenarios
- No vague or obvious options

OUTPUT FORMAT (JSON ONLY):
{
  "skill": "${skillName}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question_type": "<mandatory type>",
      "scenario": "<real-world scenario>",
      "question": "<decision-based question>",
      "time_limit_seconds": <integer>,
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct_answer": "Option X",
      "explanation": "<brief justification>"
    }
  ]
}

HARD CONSTRAINTS:
- Do NOT mention AI, quizzes, exams, or assessments
- Do NOT include hints or learning content
- Do NOT output text outside JSON
- Do NOT generate more or fewer than ${questionCount} questions
- If skill_name = SQL → scenarios MUST be strictly SQL-related
- Accuracy and realism are mandatory

Generate exactly ${questionCount} scenario-based questions covering all 10 mandatory types:`;

    // Call Mistral AI
    const response = await mistral.invoke(prompt);
    const content = response.content;
    
    if (!content) {
      throw new Error('No content received from Mistral AI');
    }
    
    console.log(`DEBUG: Raw response length: ${content.length}`);
    
    // Clean and parse JSON
    let cleanContent = content
      .replace(/```json\n?|```/g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .trim();
    
    // Ensure proper JSON structure
    if (!cleanContent.startsWith('{')) {
      cleanContent = '{' + cleanContent;
    }
    if (!cleanContent.endsWith('}')) {
      cleanContent = cleanContent + '}';
    }
    
    let quizData;
    try {
      quizData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }
    
    // Validate the quiz structure
    validateQuizStructure(quizData, skillName, difficulty, questionCount);
    
    // Cache the results
    setCachedQuiz(skillName, difficulty, questionCount, quizData);
    
    const generationTime = Date.now() - startTime;
    console.log(`Quiz generated in ${generationTime}ms (Mistral AI)`);
    
    return quizData;
    
  } catch (error) {
    console.error('Quiz generation error:', error);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
};

/**
 * Validate the quiz structure and content
 */
const validateQuizStructure = (quizData, skillName, difficulty, questionCount) => {
  // Check top-level structure
  if (!quizData.skill || quizData.skill !== skillName) {
    throw new Error('Invalid quiz: skill name mismatch');
  }
  
  if (!quizData.difficulty || quizData.difficulty !== difficulty) {
    throw new Error('Invalid quiz: difficulty mismatch');
  }
  
  if (!quizData.questions || !Array.isArray(quizData.questions)) {
    throw new Error('Invalid quiz: missing questions array');
  }
  
  if (quizData.questions.length !== questionCount) {
    throw new Error(`Invalid quiz: expected ${questionCount} questions, got ${quizData.questions.length}`);
  }
  
  // Validate each question
  const mandatoryTypes = [
    'Concept Application',
    'Debugging / Error Identification',
    'Performance Optimization',
    'Real-World Decision Making',
    'Best Practices Selection',
    'Edge Case Handling',
    'Security / Risk Awareness',
    'Data Interpretation / Output Prediction',
    'Tool / Feature Selection',
    'Trade-off / Decision Analysis'
  ];
  
  const foundTypes = new Set();
  
  for (let i = 0; i < quizData.questions.length; i++) {
    const question = quizData.questions[i];
    
    // Check mandatory fields
    if (!question.question_type || !mandatoryTypes.includes(question.question_type)) {
      throw new Error(`Question ${i + 1}: invalid or missing question_type`);
    }
    
    if (foundTypes.has(question.question_type)) {
      throw new Error(`Question ${i + 1}: duplicate question_type: ${question.question_type}`);
    }
    foundTypes.add(question.question_type);
    
    if (!question.scenario || typeof question.scenario !== 'string' || question.scenario.length < 50) {
      throw new Error(`Question ${i + 1}: scenario must be at least 50 characters`);
    }
    
    if (!question.question || typeof question.question !== 'string' || question.question.length < 20) {
      throw new Error(`Question ${i + 1}: question must be at least 20 characters`);
    }
    
    if (!Number.isInteger(question.time_limit_seconds) || question.time_limit_seconds < 30 || question.time_limit_seconds > 300) {
      throw new Error(`Question ${i + 1}: invalid time_limit_seconds`);
    }
    
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error(`Question ${i + 1}: must have exactly 4 options`);
    }
    
    // Handle different correct_answer formats
    let correctAnswer = question.correct_answer;
    let correctIndex = -1;
    
    if (/^Option [A-D]$/.test(correctAnswer)) {
      // Standard format: "Option A"
      correctIndex = correctAnswer.charCodeAt(7) - 'A'.charCodeAt(0);
    } else {
      // Find the correct answer in options (SQL queries, text, etc.)
      correctIndex = question.options.findIndex(opt => opt === correctAnswer);
      if (correctIndex === -1) {
        // Try to match partial content
        correctIndex = question.options.findIndex(opt => 
          opt.toLowerCase().includes(correctAnswer.toLowerCase()) ||
          correctAnswer.toLowerCase().includes(opt.toLowerCase())
        );
      }
      
      // If still not found, default to 0 but log it
      if (correctIndex === -1) {
        console.log(`DEBUG: Could not find correct answer in options, defaulting to 0`);
        correctIndex = 0;
      }
    }
    
    if (correctIndex < 0 || correctIndex >= question.options.length) {
      console.log(`DEBUG: Question ${i + 1} - correct_answer: "${correctAnswer}"`);
      console.log(`DEBUG: Question ${i + 1} - options:`, question.options);
      throw new Error(`Question ${i + 1}: correct_answer not found in options`);
    }
    
    if (!question.explanation || typeof question.explanation !== 'string' || question.explanation.length < 10) {
      throw new Error(`Question ${i + 1}: explanation must be at least 10 characters`);
    }
  }
  
  // Ensure all mandatory types are covered
  if (foundTypes.size !== mandatoryTypes.length) {
    throw new Error(`Quiz must include all ${mandatoryTypes.length} mandatory question types`);
  }
  
  console.log(`✅ Quiz validation passed for ${skillName} (${difficulty})`);
};

export default generateOptimizedQuiz;
