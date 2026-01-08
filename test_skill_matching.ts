import { skillMatchingEngine } from './services/skillMatchingService';
import { User, Skill } from './types';

// Test data
const testUsers: User[] = [
  {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar1.jpg',
    skillsKnown: [
      { id: 's1', name: 'SQL', verified: true, score: 95 },
      { id: 's2', name: 'Python', verified: true, score: 88 },
      { id: 's3', name: 'JavaScript', verified: false, score: 75 }
    ],
    skillsToLearn: ['React', 'Node.js'],
    bio: 'Experienced database administrator and Python developer',
    rating: 4.5
  },
  {
    id: 'user2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: 'https://example.com/avatar2.jpg',
    skillsKnown: [
      { id: 's4', name: 'MySQL', verified: true, score: 92 },
      { id: 's5', name: 'SQL', verified: false, score: 70 },
      { id: 's6', name: 'React', verified: true, score: 85 }
    ],
    skillsToLearn: ['SQL', 'TypeScript'],
    bio: 'Full-stack developer with database expertise',
    rating: 4.8
  },
  {
    id: 'user3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    avatar: 'https://example.com/avatar3.jpg',
    skillsKnown: [
      { id: 's7', name: 'SQL', verified: true, score: 90 },
      { id: 's8', name: 'PostgreSQL', verified: true, score: 87 },
      { id: 's9', name: 'Docker', verified: true, score: 82 }
    ],
    skillsToLearn: ['Kubernetes', 'AWS'],
    bio: 'DevOps engineer specializing in databases',
    rating: 4.2
  }
];

const learnerUser: User = {
  id: 'learner1',
  name: 'Alice Learner',
  email: 'alice@example.com',
  avatar: 'https://example.com/avatar4.jpg',
  skillsKnown: [
    { id: 's10', name: 'HTML', verified: true, score: 80 },
    { id: 's11', name: 'CSS', verified: false, score: 65 }
  ],
  skillsToLearn: ['SQL', 'Python', 'React'],
  bio: 'Beginner developer looking to learn database and web development',
  rating: 3.5
};

// Test the strict matching engine
console.log('=== Testing Skill Matching Engine ===\n');

// Test 1: Exact skill matching for SQL
console.log('Test 1: Finding mentors for "SQL"');
const sqlMentors = skillMatchingEngine.findMentorsForSkill('SQL', testUsers);
console.log(`Found ${sqlMentors.length} mentors for SQL:`);
sqlMentors.forEach(mentor => {
  const sqlSkill = mentor.skillsKnown.find(s => s.name.toLowerCase() === 'sql');
  console.log(`- ${mentor.name}: Verified=${sqlSkill?.verified}, Score=${sqlSkill?.score}`);
});

// Test 2: Strict matching for learner's goals
console.log('\nTest 2: Finding strict mentors for learner goals');
const strictMentors = skillMatchingEngine.findStrictMentors(learnerUser, testUsers);
console.log(`Found ${strictMentors.length} strict mentors for ${learnerUser.name}:`);
strictMentors.forEach(mentor => {
  const matchingSkills = mentor.skillsKnown.filter(skill => 
    learnerUser.skillsToLearn.includes(skill.name) && skill.verified
  );
  console.log(`- ${mentor.name}: ${matchingSkills.map(s => `${s.name} (${s.score}%)`).join(', ')}`);
});

// Test 3: Batch matching
console.log('\nTest 3: Batch matching for multiple skills');
const batchResults = skillMatchingEngine.batchMatch(['SQL', 'Python', 'Java'], testUsers);
batchResults.forEach(result => {
  console.log(`${result.skill}: ${result.matched ? `Found ${result.matches.length} matches` : 'No matches'}`);
  if (result.matched) {
    result.matches.forEach(match => {
      console.log(`  - User ${match.user_id}: ${match.verification_score}% (${match.experience_level})`);
    });
  }
});

// Test 4: Verify strict rules are enforced
console.log('\nTest 4: Verifying strict rules enforcement');
const mysqlResult = skillMatchingEngine.matchSkills('SQL', testUsers);
console.log(`SQL matching results:`);
console.log(`- Matched: ${mysqlResult.matched}`);
console.log(`- Matches: ${mysqlResult.matches.length}`);
console.log(`- Message: ${mysqlResult.message}`);

// Verify only verified SQL mentors are included (not MySQL, not unverified SQL)
const expectedVerifiedSqlMentors = testUsers.filter(user => 
  user.skillsKnown.some(skill => skill.name.toLowerCase() === 'sql' && skill.verified)
);
console.log(`\nExpected ${expectedVerifiedSqlMentors.length} verified SQL mentors`);
console.log(`Actual ${mysqlResult.matches.length} matches found`);

console.log('\n=== Test Complete ===');
