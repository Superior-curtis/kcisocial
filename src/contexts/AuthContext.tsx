import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { ensureUserDocument, isSchoolEmail, listenToUserProfile, ensureAIAssistantUser } from "@/lib/firestore";
import { User, UserRole } from "@/types";
import { toast } from "@/hooks/use-toast";
import { voipNotificationService, type IncomingCall } from "@/services/voipNotificationService";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  // Impersonation
  impersonatingUser: User | null;
  actualUser: User | null;
  startImpersonation: (userId: string, impersonatedUser: User) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
  // VoIP
  incomingCall: IncomingCall | null;
  acceptIncomingCall: () => void;
  declineIncomingCall: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actualUser, setActualUser] = useState<User | null>(null);
  const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      profileUnsubRef.current?.();
      if (!authUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        if (!isSchoolEmail(authUser.email)) {
          await signOut(auth);
          toast({
            title: "Access denied",
            description: "Please sign in with your @kcis.com.tw account.",
            variant: "destructive",
          });
          setUser(null);
          setIsLoading(false);
          return;
        }

        const profile = await ensureUserDocument(authUser);
        setUser(profile);

        // Initialize AI assistant user if enabled
        try {
          const enableAiAssistantBootstrap = String(import.meta.env.VITE_ENABLE_AI_ASSISTANT_BOOTSTRAP || '').toLowerCase() === 'true';
          if (enableAiAssistantBootstrap) {
            await ensureAIAssistantUser();
          }
        } catch (err) {
          console.warn('Failed to initialize AI assistant user:', err);
        }

        profileUnsubRef.current = listenToUserProfile(authUser.uid, (liveProfile) => {
          if (liveProfile) setUser(liveProfile);
        });
      } catch (error) {
        const err = error as any;
        console.error("Auth bootstrap failed", error);
        
        // Handle Firestore permission errors gracefully
        if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
          console.warn("Firestore permission denied, but user is authenticated. Continuing...");
          // Create a minimal user object to allow continued access
          const isAdminEmail = authUser.email?.toLowerCase() === 'huachen0625@gmail.com';
          const minimalUser: User = {
            id: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || 'User',
            username: (authUser.displayName || 'user').replace(/\s+/g, '').toLowerCase(),
            avatar: authUser.photoURL || undefined,
            appTheme: undefined,
            profileBackground: undefined,
            role: isAdminEmail ? 'admin' : 'student',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: new Date(),
          };
          setUser(minimalUser);
          // Still try to subscribe to user profile updates
          profileUnsubRef.current = listenToUserProfile(authUser.uid, (liveProfile) => {
            if (liveProfile) setUser(liveProfile);
          });
        } else {
          toast({ title: "Authentication error", description: (error as Error).message, variant: "destructive" });
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
      profileUnsubRef.current?.();
    };
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const authUser = result.user;
        if (!isSchoolEmail(authUser.email)) {
          await signOut(auth);
          throw new Error("Only @kcis.com.tw accounts are allowed.");
        }
        const profile = await ensureUserDocument(authUser);
        setUser(profile);
      } catch (popupError) {
        if ((popupError as any)?.code === 'auth/popup-blocked') {
          console.error('Popup was blocked by browser');
          throw new Error('Login popup was blocked by browser. Enable popups and try again.');
        }
        throw popupError;
      }
    } catch (error) {
      const err = error as any;
      console.error("Login failed", error);
      
      // Handle Firestore permission errors gracefully
      if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
        console.warn("Firestore permission denied, but user is authenticated. Continuing...");
        const authUser = auth.currentUser;
        if (authUser) {
          const isAdminEmail = authUser.email?.toLowerCase() === 'huachen0625@gmail.com';
          const minimalUser: User = {
            id: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || 'User',
            username: (authUser.displayName || 'user').replace(/\s+/g, '').toLowerCase(),
            avatar: authUser.photoURL || undefined,
            appTheme: undefined,
            profileBackground: undefined,
            role: isAdminEmail ? 'admin' : 'student',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: new Date(),
          };
          setUser(minimalUser);
          return;
        }
      }
      
      toast({ title: "Login failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const authUser = result.user;
      const profile = await ensureUserDocument(authUser);
      setUser(profile);
      toast({ title: "Login successful", description: "Welcome back, developer!", duration: 2000 });
    } catch (error) {
      console.error("Email login failed", error);
      toast({ title: "Login failed", description: (error as Error).message, variant: "destructive" });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  const startImpersonation = (userId: string, impersonatedUser: User) => {
    setActualUser(user);
    setImpersonatingUser(impersonatedUser);
    setUser(impersonatedUser);
    localStorage.setItem('impersonatingUserId', userId);
    localStorage.setItem('impersonatingUserData', JSON.stringify(impersonatedUser));
  };

  const stopImpersonation = () => {
    if (actualUser) {
      setUser(actualUser);
    }
    setActualUser(null);
    setImpersonatingUser(null);
    localStorage.removeItem('impersonatingUserId');
    localStorage.removeItem('impersonatingUserData');
  };

  // Restore impersonation state from localStorage when app loads
  useEffect(() => {
    if (user && !actualUser && !impersonatingUser) {
      const storedImpersonatingData = localStorage.getItem('impersonatingUserData');
      if (storedImpersonatingData) {
        try {
          const impersonatedData = JSON.parse(storedImpersonatingData);
          // Convert createdAt string back to Date
          if (typeof impersonatedData.createdAt === 'string') {
            impersonatedData.createdAt = new Date(impersonatedData.createdAt);
          }
          setActualUser(user);
          setImpersonatingUser(impersonatedData);
          setUser(impersonatedData);
        } catch (err) {
          console.warn('Failed to restore impersonation state:', err);
          localStorage.removeItem('impersonatingUserId');
          localStorage.removeItem('impersonatingUserData');
        }
      }
    }
  }, [user, actualUser, impersonatingUser]);

  // Global VoIP notification listener
  useEffect(() => {
    if (!user) return;

    const enableVoipNotifications = String(import.meta.env.VITE_ENABLE_VOIP_NOTIFICATIONS || '').toLowerCase() === 'true';
    if (!enableVoipNotifications) {
      return;
    }

    try {
      console.log('[Auth] Starting global VoIP listener for user:', user.id);
      voipNotificationService.requestPermission();
      
      voipNotificationService.startListening(user.id, (call) => {
        console.log('[Auth] Incoming call:', call);
        setIncomingCall(call);
      });
    } catch (error) {
      console.error('[Auth] Failed to start VoIP listener:', error);
    }

    return () => {
      try {
        console.log('[Auth] Stopping global VoIP listener');
        voipNotificationService.stopListening();
      } catch (error) {
        console.error('[Auth] Failed to stop VoIP listener:', error);
      }
    };
  }, [user]);

  const acceptIncomingCall = () => {
    setIncomingCall(null);
    // Navigation to chat page will be handled by the caller
  };

  const declineIncomingCall = async () => {
    if (incomingCall) {
      await voipNotificationService.declineCall(incomingCall.callId);
      setIncomingCall(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithEmail,
        logout,
        hasPermission,
        impersonatingUser,
        actualUser,
        startImpersonation,
        stopImpersonation,
        isImpersonating: !!impersonatingUser,
        incomingCall,
        acceptIncomingCall,
        declineIncomingCall,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
