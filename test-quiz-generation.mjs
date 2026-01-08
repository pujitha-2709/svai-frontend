// Test script for enhanced quiz generation
// This script tests the enhanced Mistral service with various skills including cooking

import { generateQuiz } from './services/mistralService.js';

const testSkills = [
  { name: 'cooking', difficulty: 'intermediate' },
  { name: 'baking', difficulty: 'advanced' },
  { name: 'culinary arts', difficulty: 'expert' },
  { name: 'javascript', difficulty: 'intermediate' },
  { name: 'react', difficulty: 'advanced' },
  { name: 'yoga', difficulty: 'beginner' },
  { name: 'spanish language', difficulty: 'intermediate' },
  { name: 'digital marketing', difficulty: 'advanced' },
  { name: 'carpentry', difficulty: 'intermediate' },
  { name: 'basketball', difficulty: 'expert' }
];

async function testQuizGeneration() {
  console.log('Testing enhanced quiz generation system...\n');
  
  for (const skill of testSkills) {
    try {
      console.log(`📝 Generating ${skill.difficulty} quiz for: ${skill.name}`);
      console.log('='.repeat(50));
      
      const questions = await generateQuiz(skill.name, skill.difficulty);
      
      console.log(`✅ Successfully generated ${questions.length} questions:\n`);
      
      questions.forEach((q, index) => {
        console.log(`Question ${index + 1}:`);
        console.log(`📋 ${q.question}`);
        
        if (q.codeSnippet) {
          console.log(`💻 Context: ${q.codeSnippet}`);
        }
        
        console.log('Options:');
        q.options.forEach((option, optIndex) => {
          const marker = optIndex === q.correctAnswerIndex ? '✅' : '⭕';
          console.log(`  ${marker} ${String.fromCharCode(65 + optIndex)}. ${option}`);
        });
        console.log('');
      });
      
      console.log('✨ Quiz generation successful!\n');
      console.log('─'.repeat(80) + '\n');
      
    } catch (error) {
      console.error(`❌ Failed to generate quiz for ${skill.name}:`, error.message);
      console.log('');
    }
  }
  
  console.log('🎉 Quiz generation testing completed!');
}

// Export for use in other modules
export { testQuizGeneration, testSkills };

// Run tests if this file is executed directly
testQuizGeneration().catch(console.error);
