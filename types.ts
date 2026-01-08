
export interface Skill {
  id: string;
  name: string;
  verified: boolean;
  level?: string; // Beginner, Intermediate, Advanced
  score?: number; // 0-100
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Added for auth simulation
  avatar: string; // URL or Base64 string
  skillsKnown: Skill[];
  skillsToLearn: string[];
  bio: string;
  discordLink?: string;
  rating: number; // 1-5
  languages?: string[]; // Languages user speaks
  preferredLanguage?: string; // Preferred language for communication
  availability?: string[]; // Available time slots
}

export interface QuizQuestion {
  question: string;
  codeSnippet?: string; // Optional code block for the user to analyze
  options: string[];
  correctAnswerIndex: number; // 0-3
}

export interface QuizResult {
  passed: boolean;
  score: number;
  badgeEarned?: string;
}

export interface RoadmapItem {
  step: number;
  title: string;
  description: string;
  duration: string;
  resources: string[];
}

export interface MatchRecommendation {
  user: User;
  matchScore: number; // 0-100
  reasoning: string;
  commonInterests: string[];
}

export interface ExchangeRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  offeredSkill: string;
  requestedSkill: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: number;
  completedAt?: number;
}

export interface ExchangeFeedback {
  id: string;
  requestId: string;
  fromUserId: string;
  toUserId: string;
  stars: number; // 1-5
  comment?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

export enum View {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  DASHBOARD = 'DASHBOARD',
  MY_SKILLS = 'MY_SKILLS',
  FIND_PEERS = 'FIND_PEERS',
  ROADMAP = 'ROADMAP',
  PROFILE = 'PROFILE',
  MESSAGES = 'MESSAGES'
}