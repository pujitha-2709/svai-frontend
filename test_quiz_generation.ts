import { aiQuizGenerator, QuizOutput } from './services/quizGenerationService';

function testQuizGeneration(): void {
  console.log('=== Testing TypeScript Quiz Generation ===\n');
  
  try {
    // Test SQL beginner level
    const quiz: QuizOutput = aiQuizGenerator.generateQuiz('SQL', 'beginner');
    
    // Validate structure
    console.log(`✅ Skill: ${quiz.skill}`);
    console.log(`✅ Difficulty: ${quiz.difficulty}`);
    console.log(`✅ Questions: ${quiz.questions.length}/10`);
    
    // Validate all question types are present
    const questionTypes = quiz.questions.map(q => q.question_type);
    console.log(`✅ Question Types: ${questionTypes.length}/10`);
    
    // Validate each question
    quiz.questions.forEach((question, index) => {
      console.log(`\nQuestion ${index + 1}: ${question.question_type}`);
      console.log(`  Timer: ${question.time_limit_seconds}s`);
      console.log(`  Options: ${question.options.length}`);
      console.log(`  Correct: ${question.correct_answer}`);
      
      // Validate timer range for beginner
      if (question.time_limit_seconds < 45 || question.time_limit_seconds > 60) {
        throw new Error(`Invalid timer for beginner: ${question.time_limit_seconds}`);
      }
    });
    
    // Test different difficulty levels
    console.log('\n=== Testing Difficulty Levels ===');
    const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
    
    difficulties.forEach(difficulty => {
      const testQuiz = aiQuizGenerator.generateQuiz('SQL', difficulty);
      const timers = testQuiz.questions.map(q => q.time_limit_seconds);
      const minTimer = Math.min(...timers);
      const maxTimer = Math.max(...timers);
      
      const expectedMin = difficulty === 'beginner' ? 45 : difficulty === 'intermediate' ? 60 : difficulty === 'advanced' ? 90 : 120;
      const expectedMax = difficulty === 'beginner' ? 60 : difficulty === 'intermediate' ? 90 : difficulty === 'advanced' ? 120 : 180;
      
      console.log(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}: ${minTimer}-${maxTimer}s (expected: ${expectedMin}-${expectedMax}s)`);
      
      if (minTimer < expectedMin || maxTimer > expectedMax) {
        throw new Error(`Invalid timer range for ${difficulty}`);
      }
    });
    
    console.log('\n✅ All tests passed!');
    
    // Output JSON sample
    console.log('\n=== JSON Output Sample ===');
    console.log(JSON.stringify(quiz, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testQuizGeneration();
