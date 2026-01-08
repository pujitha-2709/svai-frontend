// ... (Your existing imports and configuration remain here) ...
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser,
  Auth
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBzzr3SYV5SSR_axUnphbOlqO2idiCp1rM",
  authDomain: "skillswap-40c7f.firebaseapp.com",
  projectId: "skillswap-40c7f",
  storageBucket: "skillswap-40c7f.firebasestorage.app",
  messagingSenderId: "749119792076",
  appId: "1:749119792076:web:4ab4c4e127db2835117369",
  measurementId: "G-0GQXJ2L1CK"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let isMock = true;

try {
  if (firebaseConfig.apiKey !== "AIzaSyBzzr3SYV5SSR_axUnphbOlqO2idiCp1rM") {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    isMock = false;
  } else {
    isMock = true;
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
  isMock = true;
}

// --- INTERFACE ---
export interface AuthResult {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  error?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mapFirebaseUser = (firebaseUser: FirebaseUser): AuthResult['user'] => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
};

// --- METHODS ---

export const firebaseService = {
  isMock,

  // Sign Up
  register: async (email: string, password: string): Promise<AuthResult> => {
    if (isMock || !auth) {
      await delay(800);
      // Simulate success unless email is "error@example.com"
      if (email.includes('error')) {
        return { user: null, error: "Mock registration failed: Email already in use." };
      }
      return {
        user: {
          uid: 'mock-uid-' + Math.random().toString(36).substring(2, 9),
          email: email,
          displayName: null,
          photoURL: null,
        },
      };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return {
        user: mapFirebaseUser(userCredential.user),
      };
    } catch (error) {
      console.error("Firebase registration error:", error);
      // Handle Firebase error codes for user-friendly messages
      return {
        user: null,
        error: (error as { code?: string, message: string }).message,
      };
    }
  },

  // Log In
  login: async (email: string, password: string): Promise<AuthResult> => {
    if (isMock || !auth) {
      await delay(800);
      if (email.includes('error')) {
        return { user: null, error: "Mock login failed: Invalid credentials." };
      }
      return {
        user: {
          uid: 'mock-uid-login',
          email: email,
          displayName: 'Mock User',
          photoURL: null,
        },
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        user: mapFirebaseUser(userCredential.user),
      };
    } catch (error) {
      console.error("Firebase login error:", error);
      return {
        user: null,
        error: (error as { code?: string, message: string }).message,
      };
    }
  },

  // Sign In with Google
  loginWithGoogle: async (): Promise<AuthResult> => {
    if (isMock || !auth) {
      await delay(800);
      return {
        user: {
          uid: 'mock-uid-google',
          email: 'mock.google@example.com',
          displayName: 'Mock Google User',
          photoURL: 'mock-url',
        },
      };
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // The signed-in user info.
      const user = result.user;
      return {
        user: mapFirebaseUser(user),
      };
    } catch (error) {
      console.error("Firebase Google sign-in error:", error);
      return {
        user: null,
        error: (error as { code?: string, message: string }).message,
      };
    }
  },

  // Log Out
  logout: async (): Promise<{ success: boolean; error?: string }> => {
    if (isMock || !auth) {
      await delay(400);
      return { success: true };
    }

    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error("Firebase logout error:", error);
      return { success: false, error: (error as Error).message };
    }
  },
};