import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Extended profile type with all new fields (backwards-compatible)
export interface ProfileData {
  id: string;
  uid?: string;
  // Identity — read both name and full_name for backward compat
  name: string;
  full_name?: string;
  email: string;
  loginId?: string;
  role: 'Student' | 'Teacher' | 'Admin' | string;
  photoURL?: string;
  avatar?: string;
  // Student-specific
  studentId?: string;
  grade?: string;
  syllabus?: string;
  institution?: string;
  language?: string;
  teacherUid?: string;
  teacherCode?: string;
  teacher_code?: string; // backward compat
  // Teacher-specific
  teacherId?: string;
  profession?: string;
  classCode?: string;
  class_code?: string; // backward compat
  failedLoginAttempts?: number;
  // Progress tracking
  progress?: Record<string, number>;
  completedLabs?: string[];
  visitedLabs?: string[];
  // Streak & gamification
  streak?: number;
  lastActiveDate?: string;
  totalTimeSpent?: number;
  // Meta
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields
  recent_lab_id?: string;
  recent_subject_id?: string;
  notes?: string;
  [key: string]: any; // allow additional fields
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  role: string;
  profileData: ProfileData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: '',
  profileData: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Simple in-memory profile cache (lives for 60 seconds)
const profileCache: { data: ProfileData | null; ts: number; uid: string } = { data: null, ts: 0, uid: '' };
const CACHE_TTL_MS = 60_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const applyProfile = (data: ProfileData | null) => {
    setProfileData(data);
    if (data?.role) {
      setRole(data.role);
      if (auth.currentUser) {
        const safeCache = { ...data, role: data.role };
        localStorage.setItem(`ep_profile_${auth.currentUser.uid}`, JSON.stringify(safeCache));
      }
    } else {
      setRole('');
    }
  };

  const fetchProfile = async (userId: string, forceRefresh = false) => {
    // Serve cache immediately so the UI renders without waiting
    const now = Date.now();
    if (!forceRefresh && profileCache.uid === userId && now - profileCache.ts < CACHE_TTL_MS && profileCache.data) {
      applyProfile(profileCache.data);
      setLoading(false);
      return;
    }

    if (profileCache.uid === userId && profileCache.data) {
      applyProfile(profileCache.data);
      setLoading(false);
    }

    const provisionDefaultProfile = async (uid: string): Promise<ProfileData | null> => {
      try {
        // If we're here, authUser exists but Firestore doc doesn't.
        // We use the current auth user info to create a basic profile.
        const authUser = auth.currentUser;
        if (!authUser) return null;

        const email = authUser.email || '';
        const role = 'Student';

        const newProfile: any = {
          uid,
          name: authUser.displayName || 'Student',
          full_name: authUser.displayName || 'Student',
          email: email,
          role: role,
          photoURL: authUser.photoURL || '',
          progress: { physics: 0, chemistry: 0, biology: 0, math: 0, cs: 0 },
          completedLabs: [],
          visitedLabs: [],
          streak: 0,
          lastActiveDate: '',
          totalTimeSpent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', uid), newProfile);
        return { ...newProfile, id: uid };
      } catch (err) {
        console.error('[Auth] Failed to provision default profile:', err);
        return null;
      }
    };

    try {
      const profilePromise = getDoc(doc(db, 'users', userId));
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
      });
      const docSnap = await Promise.race([profilePromise, timeout]) as any;

      if (docSnap.exists()) {
        const raw = docSnap.data();
        const data: ProfileData = {
          id: docSnap.id,
          ...raw,
          name: raw.name || raw.full_name || '',
          full_name: raw.full_name || raw.name || '',
          classCode: raw.classCode || raw.class_code || '',
          class_code: raw.class_code || raw.classCode || '',
          teacherCode: raw.teacherCode || raw.teacher_code || '',
          teacher_code: raw.teacher_code || raw.teacherCode || '',
        };
        // Update cache
        profileCache.data = data;
        profileCache.ts = Date.now();
        profileCache.uid = userId;
        applyProfile(data);
      } else {
        // PROFILE REPAIR: Try to create the missing doc
        const repaired = await provisionDefaultProfile(userId);
        if (repaired) {
          profileCache.data = repaired;
          profileCache.ts = Date.now();
          profileCache.uid = userId;
          applyProfile(repaired);
        } else {
          applyProfile(null);
        }
      }

    } catch (e) {
      console.error('Error fetching profile:', e);
      // Don't wipe existing data on network error — keep showing cached
      if (!profileCache.data) applyProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid, true); // force re-fetch, bypass cache
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // QUICK LOAD: Load from localStorage immediately
        try {
          const cached = localStorage.getItem(`ep_profile_${firebaseUser.uid}`);
          if (cached) {
            const data = JSON.parse(cached);
            if (data && data.id === firebaseUser.uid) {
              applyProfile({ ...data, role: '' });
            }
          }
        } catch (e) {}

        // Background sync
        fetchProfile(firebaseUser.uid).catch(() => {
          if (loading) setLoading(false);
        });
      } else {
        setUser(null);
        setRole('');
        setProfileData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      if (user) {
        localStorage.removeItem(`ep_profile_${user.uid}`);
      }
      await firebaseSignOut(auth);
    } finally {
      // Clear cache so next login always fetches fresh data
      profileCache.data = null;
      profileCache.ts = 0;
      profileCache.uid = '';
      setUser(null);
      setRole('');
      setProfileData(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session: null, role, profileData, loading, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
