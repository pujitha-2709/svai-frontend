import { User, ExchangeRequest, Message, ExchangeFeedback } from '../types';
import { suggestSkillsDirect, generateRoadmapDirect } from './mistralDirectService';

const API_BASE_URL = '/api';

// Helper to simulate delay for "real" feel (reduced for better performance)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Safe UUID generator that works even if crypto.randomUUID is not available
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }

  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16);
    (crypto as any).getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Session storage for current user
const SESSION_KEY = 'skillvouch_session';

export const apiService = {

  // --- SESSION ---
  getCurrentSession: (): User | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  },

  setSession: (user: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  logout: async () => {
    await delay(50); // Reduced from 300ms
    localStorage.removeItem(SESSION_KEY);
  },

  // --- USER MGMT ---
  getUsers: async (): Promise<User[]> => {
    await delay(50); // Reduced from 300ms
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`);
      if (!response.ok) return undefined;
      return response.json();
    } catch {
      return undefined;
    }
  },

  saveUser: async (user: User) => {
    // No delay for save operations to make them feel instant
    const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!response.ok) throw new Error('Failed to save user');
    
    // Update session if it's the current user
    const session = apiService.getCurrentSession();
    if (session && session.id === user.id) {
      apiService.setSession(user);
    }
  },

  // --- AUTH ---
  login: async (email: string, password: string): Promise<User> => {
    await delay(100); // Reduced from 500ms
    const users = await apiService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Simple password check (In a real app, use hashing)
    if (user && user.password === password) {
      apiService.setSession(user);
      return user;
    }
    throw new Error("Invalid email or password");
  },

  signup: async (name: string, email: string, password: string): Promise<User> => {
    await delay(200); // Reduced from 800ms
    
    // Check if user already exists
    const users = await apiService.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email already exists");
    }

    // Default Avatar (Initial Initials/Placeholder)
    const avatarUrl = `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(name)}`;
    
    const newUser: User = {
      id: generateId(),
      name: name.trim(),
      email: email.trim(),
      password: password,
      bio: '',
      avatar: avatarUrl,
      skillsKnown: [],
      skillsToLearn: [],
      rating: 5.0
    };

    await apiService.saveUser(newUser);
    return newUser;
  },

  googleLogin: async (): Promise<User> => {
    await delay(800);
    // Simulate Google Login
    const mockUser: User = {
        id: 'google_' + Date.now(),
        name: 'Google User',
        email: `google_${Date.now()}@example.com`,
        password: '',
        avatar: `https://ui-avatars.com/api/?background=random&name=Google+User`,
        bio: 'Signed in via Google',
        skillsKnown: [],
        skillsToLearn: [],
        rating: 5
    };
    await apiService.saveUser(mockUser);
    return mockUser;
  },

  // --- REQUESTS ---
  createExchangeRequest: async (request: ExchangeRequest) => {
    await delay(50); // Reduced from 300ms
    const response = await fetch(`${API_BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('Failed to create request');
  },

  getRequestsForUser: async (userId: string): Promise<ExchangeRequest[]> => {
    await delay(50); // Reduced from 300ms
    const response = await fetch(`${API_BASE_URL}/requests?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch requests');
    return response.json();
  },

  updateExchangeRequestStatus: async (id: string, status: ExchangeRequest['status']): Promise<{ success: true; status: ExchangeRequest['status']; completedAt?: number; }> => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Failed to update request status');
    return response.json();
  },

  // --- FEEDBACK ---
  submitExchangeFeedback: async (feedback: Omit<ExchangeFeedback, 'id' | 'createdAt'> & Partial<Pick<ExchangeFeedback, 'id' | 'createdAt'>>): Promise<ExchangeFeedback> => {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    });
    if (!response.ok) throw new Error('Failed to submit feedback');
    return response.json();
  },

  getReceivedFeedback: async (userId: string): Promise<ExchangeFeedback[]> => {
    const response = await fetch(`${API_BASE_URL}/feedback/received?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch feedback');
    return response.json();
  },

  getFeedbackStats: async (userId: string): Promise<{ avgStars: number; count: number }> => {
    const response = await fetch(`${API_BASE_URL}/feedback/stats?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch feedback stats');
    return response.json();
  },

  // --- MESSAGING ---
  sendMessage: async (senderId: string, receiverId: string, content: string): Promise<Message> => {
    // No delay for instant messaging
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, receiverId, content })
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const response = await fetch(`${API_BASE_URL}/messages/unread-count?userId=${userId}`);
    if (!response.ok) return 0;
    const result = await response.json();
    return result.count || 0;
  },

  markAsRead: async (userId: string, senderId: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/mark-as-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, senderId })
    });
    if (!response.ok) throw new Error('Failed to mark messages as read');
  },

  getConversation: async (user1Id: string, user2Id: string): Promise<Message[]> => {
    const response = await fetch(`${API_BASE_URL}/messages/conversation?user1Id=${user1Id}&user2Id=${user2Id}`);
    if (!response.ok) throw new Error('Failed to fetch conversation');
    return response.json();
  },

  subscribeToConversation: (user1Id: string, user2Id: string, callback: (messages: Message[]) => void) => {
    const checkMessages = async () => {
        try {
            const conversation = await apiService.getConversation(user1Id, user2Id);
            callback(conversation);
        } catch (error) {
            console.error('Error fetching conversation:', error);
        }
    };

    checkMessages(); // Initial
    const interval = setInterval(checkMessages, 1000); // Polling every 1s for "real-time" feel
    return () => clearInterval(interval);
  },

  getConversations: async (userId: string): Promise<User[]> => {
    await delay(50); // Reduced from 300ms
    const response = await fetch(`${API_BASE_URL}/conversations?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  },

  // --- QUIZ ---
  generateQuiz: async (skill: string, difficulty: string) => {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1}: Generating quiz for ${skill} (${difficulty})`);
        
        const response = await fetch('/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill, difficulty })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error (attempt ${retryCount + 1}):`, response.status, errorText);
          
          if (retryCount === maxRetries - 1) {
            throw new Error(`Failed to generate quiz: ${response.status} ${errorText}`);
          }
          
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        
        const data = await response.json();
        console.log('Quiz generated successfully:', data);
        return data;
        
      } catch (error) {
        console.error(`Quiz generation error (attempt ${retryCount + 1}):`, error);
        
        if (retryCount === maxRetries - 1) {
          throw new Error('Failed to generate quiz. Please try again.');
        }
        
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    throw new Error('Failed to generate quiz after multiple attempts');
  },

  // --- SKILL SUGGESTION ---
  suggestSkills: async (currentSkills: string[], currentGoals: string[] = []) => {
    try {
      const skills = await suggestSkillsDirect(currentSkills, currentGoals);
      return { skills };
    } catch (error) {
      console.error('Skill suggestion failed:', error);
      throw new Error('Failed to suggest skills');
    }
  },

  // --- ROADMAP GENERATION ---
  generateRoadmap: async (skill: string) => {
    try {
      const roadmap = await generateRoadmapDirect(skill);
      return { roadmap };
    } catch (error) {
      console.error('Roadmap generation failed:', error);
      throw new Error('Failed to generate roadmap');
    }
  }
};
