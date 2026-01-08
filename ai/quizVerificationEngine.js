import { ChatMistralAI } from '@langchain/mistralai';
import { PromptTemplate } from '@langchain/core/prompts';

const mistral = new ChatMistralAI({
  model: 'mistral-small',
  temperature: 0.3, // Lower temperature for more consistent, accurate results
  apiKey: process.env.MISTRAL_API_KEY,
});

// Quiz cache for performance optimization
const quizCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes for verification quizzes

const getCacheKey = (skillName, difficulty, verificationMode, questionCount) => {
  return `${skillName}-${difficulty}-${verificationMode}-${questionCount}`;
};

const getCachedQuiz = (skillName, difficulty, verificationMode, questionCount) => {
  const key = getCacheKey(skillName, difficulty, verificationMode, questionCount);
  const cached = quizCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Cache hit for verification quiz: ${skillName} (${difficulty})`);
    return cached.quiz;
  }
  
  return null;
};

const setCachedQuiz = (skillName, difficulty, verificationMode, questionCount, quiz) => {
  const key = getCacheKey(skillName, difficulty, verificationMode, questionCount);
  quizCache.set(key, {
    quiz,
    timestamp: Date.now()
  });
  
  // Clean old cache entries periodically
  if (quizCache.size > 50) {
    const now = Date.now();
    for (const [cacheKey, cached] of quizCache.entries()) {
      if (now - cached.timestamp > CACHE_TTL) {
        quizCache.delete(cacheKey);
      }
    }
  }
};

// Timer rules by difficulty level
const getTimerRange = (difficulty) => {
  const ranges = {
    'beginner': { min: 45, max: 60 },
    'intermediate': { min: 60, max: 90 },
    'advanced': { min: 90, max: 120 },
    'expert': { min: 120, max: 180 }
  };
  return ranges[difficulty] || ranges['intermediate'];
};

// Generate realistic timer for each question type and difficulty
const generateTimer = (questionType, difficulty) => {
  const range = getTimerRange(difficulty);
  const baseTime = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  
  // Adjust timer based on question complexity
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
    'Trade-off / Architecture Decision': 25
  };
  
  const adjustment = complexityAdjustments[questionType] || 0;
  return Math.max(range.min, Math.min(range.max, baseTime + adjustment));
};

// Verification quiz prompt template
const verificationQuizPrompt = PromptTemplate.fromTemplate(`You are a backend AI-powered Quiz Verification & Validation Engine used for certifying and verifying real user skills.

Your output is consumed directly by backend services. Accuracy, strictness, and validation are mandatory.

════════════════════════════
PRIMARY OBJECTIVE
════════════════════════════
Generate a SKILL VERIFICATION QUIZ that accurately determines whether a user is truly proficient in the given skill.

This quiz is NOT for learning. This quiz is for PASS / FAIL VERIFICATION.

════════════════════════════
INPUT PARAMETERS
════════════════════════════
- skill_name: {skill_name}
- difficulty: {difficulty}
- verification_mode: {verification_mode}
- question_count: {question_count}

════════════════════════════
ABSOLUTE RULES (NO EXCEPTIONS)
════════════════════════════
1. Generate EXACTLY {question_count} questions.
2. ALL questions MUST be SCENARIO-BASED.
3. NO theory, definitions, or memorization questions.
4. Each question MUST test real-world application.
5. Each question MUST have an individual timer.
6. Output MUST be VALID JSON ONLY (no text, no markdown).
7. Quiz MUST be suitable for skill verification and certification.
8. Zero ambiguity in correct answers.

════════════════════════════
MANDATORY QUESTION TYPES
════════════════════════════
Generate EXACTLY ONE question from EACH category:

1. Concept Application
2. Debugging / Error Identification
3. Performance Optimization
4. Real-World Decision Making
5. Best Practices Selection
6. Edge Case Handling
7. Security / Risk Awareness
8. Data Interpretation / Output Prediction
9. Tool / Feature Selection
10. Trade-off / Architecture Decision

════════════════════════════
TIMER RULES (SECONDS)
════════════════════════════
- Beginner: 45–60
- Intermediate: 60–90
- Advanced: 90–120
- Expert: 120–180

Each question MUST include a realistic timer sufficient for reading and decision-making.

════════════════════════════
DIFFICULTY ENFORCEMENT
════════════════════════════
Beginner: Simple real-world usage and mistakes
Intermediate: Practical execution, debugging, optimization
Advanced: Performance tuning, edge cases, impact analysis
Expert: Architecture, scalability, security, risk trade-offs

════════════════════════════
QUESTION DESIGN CONSTRAINTS
════════════════════════════
- Scenario length: 3–5 concise lines
- Clear decision-focused question
- Exactly 4 realistic options
- EXACTLY ONE correct answer
- Short factual explanation
- No repeated scenarios
- No vague, generic, or obvious options

════════════════════════════
VERIFICATION STRICTNESS
════════════════════════════
- Questions must be difficult enough to filter fake expertise
- Guessing should result in failure
- Real professionals should clearly outperform beginners
- Prefer practical correctness over creativity

════════════════════════════
OUTPUT FORMAT (JSON ONLY)
════════════════════════════
{{"skill": "{skill_name}", "difficulty": "{difficulty}", "verification_mode": "{verification_mode}", "pass_criteria": {{"minimum_score_percent": 80, "minimum_correct_answers": 8, "timeouts_allowed": 1}}, "questions": [{{"question_type": "<mandatory type>", "scenario": "<real-world scenario>", "question": "<decision-based question>", "time_limit_seconds": <integer>, "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "Option X", "explanation": "<brief justification>"}}]}}

════════════════════════════
HARD CONSTRAINTS
════════════════════════════
- Do NOT mention AI, quizzes, exams, or assessments
- Do NOT include hints or learning explanations
- Do NOT include more or fewer than {question_count} questions
- If skill_name = SQL → scenarios MUST be strictly SQL-only
- Accuracy, realism, and verification quality are mandatory`);

/**
 * Generate a strict skill verification quiz
 */
export const generateVerificationQuiz = async (skillName, difficulty, verificationMode = 'strict', questionCount = 10) => {
  const startTime = Date.now();
  
  try {
    // Check cache first for performance
    const cachedQuiz = getCachedQuiz(skillName, difficulty, verificationMode, questionCount);
    if (cachedQuiz) {
      console.log(`Verification quiz generated in ${Date.now() - startTime}ms (cached)`);
      return cachedQuiz;
    }
    
    // Validate inputs
    const validDifficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!validDifficulties.includes(difficulty)) {
      throw new Error(`Invalid difficulty: ${difficulty}. Must be one of: ${validDifficulties.join(', ')}`);
    }
    
    if (verificationMode !== 'strict') {
      throw new Error(`Only strict verification mode is supported. Got: ${verificationMode}`);
    }
    
    if (![10].includes(questionCount)) {
      throw new Error(`Only 10 questions are supported for verification. Got: ${questionCount}`);
    }
    
    console.log(`Generating verification quiz for ${skillName} (${difficulty})`);
    
    // Generate the quiz using Mistral AI
    const formattedPrompt = await verificationQuizPrompt.format({
      skill_name: skillName,
      difficulty: difficulty,
      verification_mode: verificationMode,
      question_count: questionCount
    });
    
    const response = await mistral.invoke(formattedPrompt);
    const content = response.content;
    
    if (!content) {
      throw new Error('No content received from Mistral AI');
    }
    
    // Parse and validate the response
    let cleanContent = content.replace(/```json\n?|```/g, '').trim();
    
    console.log(`DEBUG: Raw content from Mistral:`, content.substring(0, 500));
    console.log(`DEBUG: Clean content:`, cleanContent.substring(0, 500));
    
    // Fix common JSON issues
    cleanContent = cleanContent
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\t/g, '\\t');  // Escape tabs
    
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
      console.error('Raw content:', content);
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }
    
    // Validate the quiz structure
    validateVerificationQuiz(quizData, skillName, difficulty, questionCount);
    
    // Cache the results
    setCachedQuiz(skillName, difficulty, verificationMode, questionCount, quizData);
    
    const generationTime = Date.now() - startTime;
    console.log(`Verification quiz generated in ${generationTime}ms (Mistral AI)`);
    
    return quizData;
    
  } catch (error) {
    console.error('Verification quiz generation error:', error);
    throw new Error(`Failed to generate verification quiz: ${error.message}`);
  }
};

/**
 * Validate the verification quiz structure and content
 */
const validateVerificationQuiz = (quizData, skillName, difficulty, questionCount) => {
  // Check top-level structure
  if (!quizData.skill || quizData.skill !== skillName) {
    throw new Error('Invalid quiz: skill name mismatch');
  }
  
  if (!quizData.difficulty || quizData.difficulty !== difficulty) {
    throw new Error('Invalid quiz: difficulty mismatch');
  }
  
  if (!quizData.verification_mode || quizData.verification_mode !== 'strict') {
    throw new Error('Invalid quiz: verification mode must be strict');
  }
  
  if (!quizData.questions || !Array.isArray(quizData.questions)) {
    throw new Error('Invalid quiz: missing questions array');
  }
  
  if (quizData.questions.length !== questionCount) {
    throw new Error(`Invalid quiz: expected ${questionCount} questions, got ${quizData.questions.length}`);
  }
  
  // Check pass criteria
  if (!quizData.pass_criteria) {
    throw new Error('Invalid quiz: missing pass criteria');
  }
  
  if (quizData.pass_criteria.minimum_score_percent !== 80 || 
      quizData.pass_criteria.minimum_correct_answers !== 8 ||
      quizData.pass_criteria.timeouts_allowed !== 1) {
    throw new Error('Invalid quiz: pass criteria must be 80% score, 8 correct answers, 1 timeout');
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
    'Trade-off / Architecture Decision'
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
    
    if (!question.correct_answer) {
      throw new Error(`Question ${i + 1}: missing correct_answer`);
    }
    
    // Handle different correct_answer formats
    let correctAnswer = question.correct_answer;
    let correctIndex = -1;
    
    if (/^Option [A-D]$/.test(correctAnswer)) {
      // Standard format: "Option A"
      correctIndex = correctAnswer.charCodeAt(7) - 'A'.charCodeAt(0);
    } else if (Array.isArray(question.options)) {
      // Try to find the correct answer in options
      correctIndex = question.options.findIndex(opt => opt === correctAnswer);
      if (correctIndex === -1) {
        // If not found, try to match partial content
        correctIndex = question.options.findIndex(opt => 
          opt.toLowerCase().includes(correctAnswer.toLowerCase()) ||
          correctAnswer.toLowerCase().includes(opt.toLowerCase())
        );
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

export default generateVerificationQuiz;
