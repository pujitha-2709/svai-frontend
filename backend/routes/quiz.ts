import express from 'express';
import { generateQuiz } from '../ai/mistralQuiz.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { skill, difficulty } = req.body;

  if (!skill || typeof skill !== 'string') {
    return res.status(400).json({ 
      error: 'skill is required and must be a string' 
    });
  }

  if (!difficulty || typeof difficulty !== 'string') {
    return res.status(400).json({ 
      error: 'difficulty is required and must be a string' 
    });
  }

  const validDifficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
  if (!validDifficulties.includes(difficulty)) {
    return res.status(400).json({ 
      error: 'difficulty must be one of: beginner, intermediate, advanced, expert' 
    });
  }

  try {
    const questions = await generateQuiz(skill, difficulty, 10); // Changed from 5 to 10
    
    // Convert to frontend format with correctAnswerIndex
    const formattedQuestions = questions.map(q => ({
      question: q.question,
      codeSnippet: '', // Optional - can be added later
      options: q.options,
      correctAnswerIndex: q.options.indexOf(q.correctAnswer)
    }));

    res.json({ questions: formattedQuestions });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz',
      details: error.message 
    });
  }
});

export default router;
