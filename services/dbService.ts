import { User, ExchangeRequest, Message, ExchangeFeedback } from '../types';
import { apiService } from './apiService';

// Storage Keys
const STORAGE_KEYS = {
  USERS: 'skillvouch_users_v2',
  SESSION: 'skillvouch_session_v2',
  REQUESTS: 'skillvouch_requests_v2',
  MESSAGES: 'skillvouch_messages_v2'
};

// Helper to simulate delay for "real" feel
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

export const dbService = {
  // --- INITIALIZATION ---
  init: () => {
    // No longer needed - using MySQL backend
  },

  // --- SESSION ---
  getCurrentSession: (): User | null => {
    return apiService.getCurrentSession();
  },

  setSession: (user: User) => {
    apiService.setSession(user);
  },

  logout: async () => {
    await apiService.logout();
  },

  // --- USER MGMT ---
  getUsers: async (): Promise<User[]> => {
    return apiService.getUsers();
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    return apiService.getUserById(id);
  },

  saveUser: async (user: User) => {
    await apiService.saveUser(user);
  },

  // --- AUTH ---
  login: async (email: string, password: string): Promise<User> => {
    return apiService.login(email, password);
  },

  // Updated Signup signature: removed location
  signup: async (name: string, email: string, password: string): Promise<User> => {
    return apiService.signup(name, email, password);
  },

  googleLogin: async (): Promise<User> => {
    return apiService.googleLogin();
  },

  // --- REQUESTS ---
  createExchangeRequest: async (request: ExchangeRequest) => {
    await apiService.createExchangeRequest(request);
  },

  getRequestsForUser: async (userId: string): Promise<ExchangeRequest[]> => {
    return apiService.getRequestsForUser(userId);
  },

  updateExchangeRequestStatus: async (id: string, status: ExchangeRequest['status']) => {
    return apiService.updateExchangeRequestStatus(id, status);
  },

  // --- FEEDBACK ---
  submitExchangeFeedback: async (feedback: Omit<ExchangeFeedback, 'id' | 'createdAt'> & Partial<Pick<ExchangeFeedback, 'id' | 'createdAt'>>) => {
    return apiService.submitExchangeFeedback(feedback);
  },

  getReceivedFeedback: async (userId: string): Promise<ExchangeFeedback[]> => {
    return apiService.getReceivedFeedback(userId);
  },

  getFeedbackStats: async (userId: string): Promise<{ avgStars: number; count: number }> => {
    return apiService.getFeedbackStats(userId);
  },

  // --- MESSAGING ---
  sendMessage: async (senderId: string, receiverId: string, content: string): Promise<Message> => {
    return apiService.sendMessage(senderId, receiverId, content);
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    return apiService.getUnreadCount(userId);
  },

  markAsRead: async (userId: string, senderId: string) => {
    await apiService.markAsRead(userId, senderId);
  },

  subscribeToConversation: (user1Id: string, user2Id: string, callback: (messages: Message[]) => void) => {
    return apiService.subscribeToConversation(user1Id, user2Id, callback);
  },

  getConversations: async (userId: string): Promise<User[]> => {
    return apiService.getConversations(userId);
  }
};