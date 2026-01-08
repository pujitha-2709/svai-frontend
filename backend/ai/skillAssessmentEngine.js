import { ChatMistralAI } from '@langchain/mistralai';

const mistral = new ChatMistralAI({
  model: 'mistral-small',
  temperature: 0.3,
  apiKey: process.env.MISTRAL_API_KEY,
});

const quizCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

const getCacheKey = (skillName, level, questionCount) => {
  return `${skillName}-${level}-${questionCount}`;
};

const getCachedQuiz = (skillName, level, questionCount) => {
  const key = getCacheKey(skillName, level, questionCount);
  const cached = quizCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Cache hit for quiz: ${skillName} (${level})`);
    return cached.quiz;
  }
  
  return null;
};

const setCachedQuiz = (skillName, level, questionCount, quiz) => {
  const key = getCacheKey(skillName, level, questionCount);
  quizCache.set(key, {
    quiz,
    timestamp: Date.now()
  });
  
  if (quizCache.size > 50) {
    const now = Date.now();
    for (const [cacheKey, cached] of quizCache.entries()) {
      if (now - cached.timestamp > CACHE_TTL) {
        quizCache.delete(cacheKey);
      }
    }
  }
};

const getTimeLimits = (level) => {
  const timeMap = {
    'beginner': { perQuestion: 30, total: 300 },
    'intermediate': { perQuestion: 45, total: 450 },
    'advanced': { perQuestion: 60, total: 600 },
    'expert': { perQuestion: 90, total: 900 }
  };
  
  return timeMap[level] || timeMap['intermediate'];
};

const getDifficultyRequirements = (skillName, level) => {
  const isProgrammingLanguage = ['JavaScript', 'Python', 'Java', 'TypeScript', 'SQL', 'React', 'Vue', 'Angular', 'Node.js', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin'].includes(skillName);
  
  if (level === 'beginner') {
    return isProgrammingLanguage ? `
BEGINNER LEVEL - Basic Code Scenarios:
- Focus on fundamental syntax and simple program structure
- Scenarios should involve basic coding tasks and common beginner mistakes
- Test basic understanding and simple code execution
- MUST include actual code snippets in questions and options
- Time limit: 30 seconds per question
- Example: "You need to write a simple ${skillName} function to..."
- Code example: "def calculate_sum(a, b): return a + b"` :
    `
BEGINNER LEVEL - Basic Scenarios:
- Focus on fundamental usage and common mistakes
- Scenarios should involve simple, real-world tasks
- Test basic understanding and simple execution
- Time limit: 30 seconds per question
- Example: "You need to perform a basic task with ${skillName}..."`;
  }

  if (level === 'intermediate') {
    return isProgrammingLanguage ? `
INTERMEDIATE LEVEL - Code Debugging Scenarios:
- Focus on applied usage, debugging, and code optimization
- Scenarios should involve multi-step problems and debugging challenges
- Test practical execution and common pitfalls
- MUST include actual code snippets with bugs to fix
- Time limit: 45 seconds per question
- Example: "You're working on a ${skillName} project and encounter a bug in..."` :
    `
INTERMEDIATE LEVEL - Complex Scenarios:
- Focus on applied usage and contextual reasoning
- Scenarios should involve multi-step problems and debugging
- Test practical execution and common pitfalls
- Time limit: 45 seconds per question
- Example: "You're working on a ${skillName} project and encounter an issue..."`;
  }

  if (level === 'advanced') {
    return isProgrammingLanguage ? `
ADVANCED LEVEL - Code Optimization Scenarios:
- Focus on edge cases, performance, and code optimization
- Scenarios should involve complex architectural decisions and optimization
- Test advanced problem-solving and best practices
- MUST include performance-critical code snippets and optimization challenges
- Time limit: 60 seconds per question
- Example: "You're designing a high-performance ${skillName} system that must handle..."` :
    `
ADVANCED LEVEL - Expert Scenarios:
- Focus on edge cases, performance, and optimization
- Scenarios should involve complex architectural decisions
- Test advanced problem-solving and best practices
- Time limit: 60 seconds per question
- Example: "You're designing a high-performance ${skillName} system that must handle..."`;
  }

  return `
EXPERT LEVEL - Production Architecture Scenarios:
- Focus on architecture, scalability, and failure handling
- Scenarios should involve production-level challenges and trade-offs
- Test strategic decision-making and system design
- MUST include mission-critical code snippets and architectural patterns
- Time limit: 90 seconds per question
- Example: "You're responsible for a mission-critical ${skillName} application serving millions of users..."`;
};

const getQuestionTypesForLevel = (level) => {
  const baseTypes = [
    'Conceptual Understanding',
    'Scenario-Based Decision Making',
    'Real-World Problem Solving',
    'Case Study / Situational Judgment',
    'Error Identification / Debugging',
    'Best-Practice Selection',
    'Output Prediction',
    'Tool / Workflow Usage'
  ];
  
  if (level === 'advanced' || level === 'expert') {
    baseTypes.push('Optimization / Trade-off Analysis');
  }
  
  if (level === 'expert') {
    baseTypes.push('Architecture / Strategy Decision');
  }
  
  return baseTypes;
};

const validateQuizStructure = (quiz, skillName, level) => {
  if (!quiz || typeof quiz !== 'object') {
    throw new Error('Invalid quiz format: not an object');
  }

  if (!quiz.skill || quiz.skill !== skillName) {
    throw new Error(`Quiz skill mismatch: expected ${skillName}, got ${quiz.skill}`);
  }

  if (!quiz.level || quiz.level !== level) {
    throw new Error(`Quiz level mismatch: expected ${level}, got ${quiz.level}`);
  }

  if (!Array.isArray(quiz.questions) || quiz.questions.length !== 10) {
    throw new Error(`Invalid quiz: must have exactly 10 questions, got ${quiz.questions?.length || 0}`);
  }

  const validQuestionTypes = getQuestionTypesForLevel(level);
  
  quiz.questions.forEach((question, index) => {
    if (!question.question || typeof question.question !== 'string') {
      throw new Error(`Question ${index + 1}: missing or invalid question text`);
    }

    if (!question.questionType || typeof question.questionType !== 'string') {
      throw new Error(`Question ${index + 1}: missing questionType`);
    }

    const isValidType = validQuestionTypes.some(validType => 
      question.questionType.toLowerCase().includes(validType.toLowerCase()) ||
      validType.toLowerCase().includes(question.questionType.toLowerCase()) ||
      (question.questionType.toLowerCase().includes('architecture') && validType.toLowerCase().includes('architecture')) ||
      (question.questionType.toLowerCase().includes('strategy') && validType.toLowerCase().includes('strategy')) ||
      (question.questionType.toLowerCase().includes('optimization') && validType.toLowerCase().includes('optimization')) ||
      (question.questionType.toLowerCase().includes('trade') && validType.toLowerCase().includes('trade')) ||
      (question.questionType.toLowerCase().includes('tool') && validType.toLowerCase().includes('tool')) ||
      (question.questionType.toLowerCase().includes('workflow') && validType.toLowerCase().includes('workflow')) ||
      (question.questionType.toLowerCase().includes('debug') && validType.toLowerCase().includes('debug')) ||
      (question.questionType.toLowerCase().includes('error') && validType.toLowerCase().includes('error')) ||
      (question.questionType.toLowerCase().includes('concept') && validType.toLowerCase().includes('concept')) ||
      (question.questionType.toLowerCase().includes('scenario') && validType.toLowerCase().includes('scenario')) ||
      (question.questionType.toLowerCase().includes('case') && validType.toLowerCase().includes('case')) ||
      (question.questionType.toLowerCase().includes('best') && validType.toLowerCase().includes('best')) ||
      (question.questionType.toLowerCase().includes('practice') && validType.toLowerCase().includes('practice')) ||
      (question.questionType.toLowerCase().includes('output') && validType.toLowerCase().includes('output')) ||
      (question.questionType.toLowerCase().includes('problem') && validType.toLowerCase().includes('problem')) ||
      (question.questionType.toLowerCase().includes('solving') && validType.toLowerCase().includes('solving'))
    );
    
    if (!isValidType) {
      throw new Error(`Question ${index + 1}: invalid questionType "${question.questionType}" for level ${level}. Valid types: ${validQuestionTypes.join(', ')}`);
    }

    if (!question.options || typeof question.options !== 'object') {
      throw new Error(`Question ${index + 1}: missing options object`);
    }

    if (!question.options.A || !question.options.B || !question.options.C || !question.options.D) {
      throw new Error(`Question ${index + 1}: missing required options A, B, C, D`);
    }

    if (!question.correctAnswer || !['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
      throw new Error(`Question ${index + 1}: invalid correctAnswer "${question.correctAnswer}"`);
    }

    if (!question.subSkill || typeof question.subSkill !== 'string') {
      throw new Error(`Question ${index + 1}: missing subSkill`);
    }

    const isPractical = [
      'You are', 'You need', 'You\'re working', 'Imagine', 'Consider', 'Given', 'In a', 'When', 'If you',
      'Your team', 'A client', 'The system', 'An application', 'A user', 'The database', 'The server',
      'During', 'After', 'Before', 'While', 'As part of', 'For a', 'With respect to',
      'A production', 'The application', 'The system', 'Your code', 'The function',
      'what would', 'how would', 'which approach', 'what is the best', 'how should', 'what should',
      'which method', 'what strategy', 'how can', 'what would be', 'which option', 'what action',
      'what is', 'how to', 'which', 'what', 'how', 'why', 'when', 'where'
    ].some(indicator => 
      question.question.toLowerCase().includes(indicator.toLowerCase())
    );
    
    const isSkillRelated = question.question.toLowerCase().includes(skillName.toLowerCase());
    
    if (!isPractical) {
      console.log(`DEBUG: Question ${index + 1}: "${question.question.substring(0, 100)}..."`);
      throw new Error(`Question ${index + 1}: must be practical and skill-focused`);
    }
  });

  return true;
};

export const generateSkillAssessmentQuiz = async (skillName, level, questionCount = 10) => {
  const startTime = Date.now();
  
  try {
    const cachedQuiz = getCachedQuiz(skillName, level, questionCount);

    if (cachedQuiz) {
      console.log(`Quiz generated in ${Date.now() - startTime}ms (cached)`);
      return cachedQuiz;
    }

    if (questionCount !== 10) {
      throw new Error(`Only 10 questions are supported. Got: ${questionCount}`);
    }
    
    const timeLimits = getTimeLimits(level);
    const questionTypes = getQuestionTypesForLevel(level);
    
    console.log(`Generating skill assessment quiz for ${skillName} (${level})`);
    
    const prompt = `You are an expert Skill Assessment Engine specializing in TOUGH, STRICT scenario-based evaluations.

Your task is to generate a HIGH-QUALITY, ACCURATE, and SKILL-SPECIFIC quiz 
used strictly for validating a user's REAL proficiency in ${skillName}.

-------------------------
INPUT PARAMETERS
-------------------------
Skill Name: ${skillName}
User Level Requested: ${level}

-------------------------
STRICT RULES (MANDATORY)
-------------------------

1. DO NOT include questions unrelated to the given skill.
2. DO NOT mix non-core sub-skills.
3. If the skill is ambiguous, DISAMBIGUATE internally.
4. Questions MUST test practical ability, not trivia.
5. Avoid theory-only or definition-based questions.
6. Difficulty must EXACTLY match the requested level.
7. Each question must have ONLY ONE correct answer.
8. Incorrect options must be realistic but incorrect.
9. No repeated question patterns.
10. NO explanation text unless requested.
11. Question types must NOT introduce skill leakage.
12. If a question type is not suitable for the skill, SKIP it.

-------------------------
DIFFICULTY-BASED SCENARIO REQUIREMENTS
-------------------------

${getDifficultyRequirements(skillName, level)}

-------------------------
QUESTION TYPES TO INCLUDE
-------------------------

You MUST include a MIX of the following question types,
adapted appropriately to the skill and level:

${questionTypes.map((type, index) => `${index + 1}. ${type}`).join('\n')}

Each question must specify its questionType.

-------------------------
SCENARIO DESIGN REQUIREMENTS
-------------------------

- Each scenario must be 3-5 concise lines describing a REAL situation
- Scenarios must be specific to ${skillName} and the ${level} level
- Questions must test DECISION-MAKING, not memorization
- Options must be realistic and plausible distractors
- Only ONE option can be completely correct
- CRITICAL: For programming languages, INCLUDE ACTUAL CODE SNIPPETS in the question text
- Code snippets should be realistic and relevant to the scenario

-------------------------
QUIZ STRUCTURE
-------------------------

Generate EXACTLY 10 questions.

Each question must include:
- questionType
- Question text (decision-focused)
- 4 multiple-choice options (A, B, C, D)
- Correct answer key
- Skill sub-area tested (1 short phrase)

-------------------------
TIMER RULES
-------------------------

Time per question: ${timeLimits.perQuestion} seconds
Total time: ${timeLimits.total} seconds

-------------------------
OUTPUT FORMAT (STRICT JSON)
-------------------------

{
  "skill": "${skillName}",
  "level": "${level}",
  "totalQuestions": 10,
  "timePerQuestionSeconds": ${timeLimits.perQuestion},
  "totalTimeSeconds": ${timeLimits.total},
  "questions": [
    {
      "questionType": "Scenario-Based Decision",
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A",
      "subSkill": "..."
    }
  ]
}

-------------------------
FINAL VALIDATION CHECK
-------------------------
Before outputting:
- Verify all questions align ONLY with the given skill.
- Confirm all question types are appropriate.
- Ensure difficulty matches the selected level.
- Ensure scenarios are challenging and realistic.
- Ensure timing values are correct.
- If any mismatch exists, REWRITE the question.
- Output ONLY valid JSON. No markdown. No extra text.

Generate exactly 10 challenging scenario-based questions covering the appropriate question types:`;

    const response = await mistral.invoke(prompt);
    const content = response.content;

    let cleanContent = content.trim();
    
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let quiz;
    try {
      quiz = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw content:', content);
      console.error('Cleaned content:', cleanContent);
      throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
    }

    validateQuizStructure(quiz, skillName, level);

    setCachedQuiz(skillName, level, questionCount, quiz);

    const generationTime = Date.now() - startTime;
    console.log(`Skill assessment quiz generated in ${generationTime}ms`);
    
    return quiz;
    
  } catch (error) {
    console.error('Error generating skill assessment quiz:', error);
    throw error;
  }
};