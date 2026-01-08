import { ChatMistralAI } from '@langchain/mistralai';
import { PromptTemplate } from '@langchain/core/prompts';
import { aiQuizGenerator } from '../services/quizGenerationService.js';

const mistral = new ChatMistralAI({
  model: 'mistral-small',
  temperature: 0.4,
  apiKey: process.env.MISTRAL_API_KEY,
});

const quizPrompt = PromptTemplate.fromTemplate(`
Generate exactly {count} multiple-choice questions about {skill} at {difficulty} level.

Return ONLY this JSON structure:
{{
  "questions": [
    {{
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A"
    }}
  ]
}}

Requirements:
- Each question must have exactly 4 options
- Only ONE correct answer per question
- correctAnswer must match an option exactly
- No explanations, no markdown, only JSON
- Questions must be relevant to {skill}
- Difficulty: {difficulty}

Generate {count} questions:`);

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface QuizResponse {
  questions: QuizQuestion[];
}

export const generateQuiz = async (
  skill: string,
  difficulty: string,
  count: number = 10  // Changed default from 5 to 10
): Promise<QuizQuestion[]> => {
  try {
    // Use our new AI Quiz Generation Engine for scenario-based questions
    if (skill.toUpperCase() === 'SQL' && ['beginner', 'intermediate', 'advanced', 'expert'].includes(difficulty.toLowerCase())) {
      const quizOutput = aiQuizGenerator.generateQuiz(skill, difficulty);
      
      // Convert to the expected format
      const questions: QuizQuestion[] = quizOutput.questions.map(q => ({
        question: q.scenario + '\n\n' + q.question,
        options: q.options,
        correctAnswer: q.correct_answer
      }));
      
      // Ensure we have exactly 10 questions
      if (questions.length !== 10) {
        throw new Error(`Expected 10 questions, got ${questions.length}`);
      }
      
      return questions;
    }
    
    // Fallback to Mistral for other skills
    const formattedPrompt = await quizPrompt.format({
      skill,
      difficulty,
      count: count.toString(),
    });

    const response = await mistral.invoke(formattedPrompt);
    const content = response.content as string;

    // Parse JSON response
    const cleanContent = content.replace(/```json\n?|```/g, '').trim();
    const quizData: QuizResponse = JSON.parse(cleanContent);

    // Validate response structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error('Invalid quiz structure');
    }

    if (quizData.questions.length !== count) {
      throw new Error(`Expected ${count} questions, got ${quizData.questions.length}`);
    }

    // Validate each question
    quizData.questions.forEach((q, index) => {
      if (!q.question || typeof q.question !== 'string') {
        throw new Error(`Question ${index + 1}: Invalid question text`);
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Question ${index + 1}: Must have exactly 4 options`);
      }
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        throw new Error(`Question ${index + 1}: Invalid correct answer`);
      }
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(`Question ${index + 1}: Correct answer not found in options`);
      }
    });

    return quizData.questions;
  } catch (error) {
    console.error('Quiz generation error:', error);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
};
