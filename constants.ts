import { User } from './types';

// Default placeholder avatar (Generic User Icon)
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=6366f1&color=fff&name=";

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&top=longHair,longHairBob,longHairBun',
    skillsKnown: [
      { id: 's1', name: 'React', verified: true, score: 95 },
      { id: 's2', name: 'TypeScript', verified: true, score: 85 }
    ],
    skillsToLearn: ['Rust', 'GraphQL'],
    bio: 'Frontend enthusiast building scalable apps. Always happy to help with React patterns.',
    rating: 4.8
  },
  {
    id: 'u2',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&top=shortHair,shortHairCaesar,shortHairDreads01',
    skillsKnown: [
      { id: 's3', name: 'Rust', verified: true, score: 80 },
      { id: 's4', name: 'Python', verified: true, score: 92 }
    ],
    skillsToLearn: ['React', 'Design Systems'],
    bio: 'Backend dev looking to improve UI skills. I can teach you how to build robust APIs.',
    rating: 4.9
  },
  {
    id: 'u3',
    name: 'Emily Zhang',
    email: 'emily@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily&top=longHair,longHairBob',
    skillsKnown: [
      { id: 's5', name: 'UI/UX Design', verified: true, score: 98 },
      { id: 's6', name: 'Figma', verified: true, score: 96 }
    ],
    skillsToLearn: ['Frontend Development', 'React'],
    bio: 'Designer learning to code. I can help you make your apps look beautiful!',
    rating: 5.0
  },
  {
    id: 'u4',
    name: 'David Kim',
    email: 'david@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David&top=shortHair,shortHairCaesar',
    skillsKnown: [
      { id: 's7', name: 'DevOps', verified: true, score: 90 },
      { id: 's8', name: 'AWS', verified: true, score: 88 }
    ],
    skillsToLearn: ['Machine Learning', 'Python'],
    bio: 'Cloud architect interested in AI/ML.',
    rating: 4.7
  }
];

export const INITIAL_USER: User = {
  id: 'temp',
  name: 'Guest',
  email: 'guest@example.com',
  avatar: DEFAULT_AVATAR + 'Guest',
  skillsKnown: [],
  skillsToLearn: [],
  bio: '',
  rating: 0
};