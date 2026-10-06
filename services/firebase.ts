import { initializeApp, getApps, initializeApp as initApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { 
  getFirestore,
  doc, setDoc, getDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, getDocs, onSnapshot,
  orderBy, limit, arrayUnion,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ── Firebase Config ────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY?.replace(/"/g, ''),
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.replace(/"/g, ''),
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID?.replace(/"/g, ''),
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.replace(/"/g, ''),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.replace(/"/g, ''),
  appId:             import.meta.env.VITE_FIREBASE_APP_ID?.replace(/"/g, ''),
};

// ── Validate all required keys are present ───────────────────────
const requiredKeys = [
  'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId',
] as const;

const missingKeys = requiredKeys.filter(k => {
  const v = firebaseConfig[k];
  return !v || v.startsWith('VITE_') || v === '""' || v === '';
});

if (missingKeys.length > 0) {
  console.error(
    `[E-Prayog] ❌ Firebase config is INCOMPLETE.\n` +
    `Missing environment variables: ${missingKeys.map(k => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join(', ')}\n` +
    `→ On Netlify: Site Settings → Environment Variables\n` +
    `→ On Vercel: Project Settings → Environment Variables\n` +
    `→ Locally: Add to your .env file\n` +
    `Auth will not work until these are set.`
  );
  // Apply fallback dummy config to prevent a hard crash
  Object.assign(firebaseConfig, {
    apiKey:            firebaseConfig.apiKey            || 'dummy-api-key-to-prevent-crash',
    authDomain:        firebaseConfig.authDomain        || 'dummy.firebaseapp.com',
    projectId:         firebaseConfig.projectId         || 'dummy-project',
    storageBucket:     firebaseConfig.storageBucket     || 'dummy.appspot.com',
    messagingSenderId: firebaseConfig.messagingSenderId || '123456789',
    appId:             firebaseConfig.appId             || '1:123456789:web:abcdef123456',
  });
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use standard getFirestore — we do our own caching via localStorage in AuthContext
export const db = getFirestore(app);

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Set auth persistence so user stays logged in across sessions
setPersistence(auth, browserLocalPersistence).catch(console.warn);

// ── Secondary app for teacher creation (keeps Admin logged in) ─
export const getSecondaryApp = () => {
  const SECONDARY_APP = '[secondary]';
  const existing = getApps().find(a => a.name === SECONDARY_APP);
  if (existing) return existing;
  return initApp(firebaseConfig, SECONDARY_APP);
};

export default app;

// ── Auth Helpers ───────────────────────────────────────────────

/**
 * Normalize a teacher/admin special ID to a valid Firebase email.
 * "mrrao@tchr.e-prayog" → "mrrao-tchr-e-prayog@eprayog-auth.com"
 */
export const normalizeTeacherEmail = (id: string): string =>
  id.replace('@', '-').replace(/\./g, '-') + '@eprayog-auth.com';

export const isTeacherLoginId = (id: string): boolean =>
  id.endsWith('@tchr.e-prayog');

export const isAdminLoginId = (id: string): boolean =>
  id.endsWith('@admin.e-prayog');

// ── ID Generation ──────────────────────────────────────────────

export const generateStudentId = (name: string): string => {
  const firstName = (name.split(' ')[0] || 'student').toLowerCase().replace(/[^a-z]/g, '');
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${firstName || 'student'}-EP-${num}`;
};

export const generateTeacherId = (name: string): string => {
  const firstName = (name.split(' ')[0] || 'teacher').toLowerCase().replace(/[^a-z]/g, '');
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${firstName || 'teacher'}-TCH-${num}`;
};

export const generateTeacherCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ── Streak Tracking ────────────────────────────────────────────

export const updateStreak = async (uid: string): Promise<void> => {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return;
    const data = snap.data();
    const today = new Date().toISOString().split('T')[0];
    const lastActive = data.lastActiveDate || '';
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = data.streak || 0;
    if (lastActive === today) return;
    else if (lastActive === yesterday) newStreak += 1;
    else newStreak = 1;
    await updateDoc(doc(db, 'users', uid), {
      streak: newStreak,
      lastActiveDate: today,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('updateStreak error:', e);
  }
};

// ── Lab Progress ───────────────────────────────────────────────

const SUBJECT_LAB_COUNTS: Record<string, number> = {
  physics: 12, chemistry: 10, biology: 8, math: 6, cs: 6,
};

export const recalculateProgress = async (uid: string, subjectId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'labProgress', uid, 'labs'),
      where('subjectId', '==', subjectId),
      where('status', '==', 'completed')
    );
    const snap = await getDocs(q);
    const completedCount = snap.size;
    const total = SUBJECT_LAB_COUNTS[subjectId] || 1;
    const percentage = Math.round((completedCount / total) * 100);
    await updateDoc(doc(db, 'users', uid), {
      [`progress.${subjectId}`]: percentage,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('recalculateProgress error:', e);
  }
};

// ── Student Queries ────────────────────────────────────────────

export const getStudentLabProgress = async (uid: string) => {
  const snap = await getDocs(collection(db, 'labProgress', uid, 'labs'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getLabProgress = async (uid: string, labId: string) => {
  const snap = await getDoc(doc(db, 'labProgress', uid, 'labs', labId));
  return snap.exists() ? snap.data() : null;
};

export const updateLabProgress = async (uid: string, labId: string, data: Partial<any>) => {
  await setDoc(doc(db, 'labProgress', uid, 'labs', labId), data, { merge: true });
};

// ── Teacher Queries ────────────────────────────────────────────

export const getStudentsUnderTeacher = (teacherUid: string, callback: (students: any[]) => void) => {
  const q = query(
    collection(db, 'users'),
    where('teacherUid', '==', teacherUid),
    where('role', '==', 'Student')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.warn('Teacher students snapshot error:', err));
};

export const resolveTeacherCode = async (code: string): Promise<{ uid: string; name: string } | null> => {
  const snap = await getDoc(doc(db, 'teacherCodes', code.toUpperCase()));
  if (!snap.exists()) return null;
  return { uid: snap.data().teacherUid, name: snap.data().teacherName || '' };
};

export const linkStudentToTeacher = async (studentUid: string, teacherUid: string, code: string, teacherName: string) => {
  await updateDoc(doc(db, 'users', studentUid), { teacherUid, teacherCode: code });
  await setDoc(doc(db, 'teachers', teacherUid, 'students', studentUid), {
    joinedAt: new Date().toISOString(), studentUid,
  }, { merge: true });
};

export const removeStudentFromClass = async (studentUid: string, teacherUid: string) => {
  await updateDoc(doc(db, 'users', studentUid), { teacherUid: '', teacherCode: '' });
  try {
    await deleteDoc(doc(db, 'teachers', teacherUid, 'students', studentUid));
  } catch { /* ok if doesn't exist */ }
};

export const saveTeacherCode = async (uid: string, code: string, teacherName: string) => {
  await setDoc(doc(db, 'teacherCodes', code), { teacherUid: uid, teacherName, createdAt: new Date().toISOString() }, { merge: true });
  await updateDoc(doc(db, 'users', uid), { classCode: code });
  await setDoc(doc(db, 'teachers', uid), { classCode: code }, { merge: true });
};

// ── Admin Queries ──────────────────────────────────────────────

export const getUsersByRole = async (role: string) => {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToUsersByRole = (role: string, callback: (users: any[]) => void) => {
  const q = query(collection(db, 'users'), where('role', '==', role));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.warn('subscribeToUsersByRole error:', err));
};

export const removeUser = async (uid: string) => {
  await updateDoc(doc(db, 'users', uid), {
    role: 'Removed',
    removedAt: new Date().toISOString(),
  });
};

export const updateUserData = async (uid: string, data: Partial<any>) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: new Date().toISOString() });
};

// ── Feedback ───────────────────────────────────────────────────

export const subscribeToFeedbacks = (callback: (feedbacks: any[]) => void) => {
  const q = query(collection(db, 'feedbacks'), orderBy('submittedAt', 'desc'), limit(100));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.warn('subscribeToFeedbacks error:', err));
};

export const updateFeedbackStatus = async (id: string, status: string) => {
  await updateDoc(doc(db, 'feedbacks', id), { status });
};

export const submitFeedback = async (uid: string, data: {
  name: string; email: string; role: string;
  category: string; message: string; rating: number;
}) => {
  await addDoc(collection(db, 'feedbacks'), {
    uid, ...data,
    submittedAt: new Date().toISOString(),
    status: 'open',
  });
};

// ── Password Reset Requests ────────────────────────────────────

export const subscribeToPendingResets = (callback: (reqs: any[]) => void) => {
  const q = query(collection(db, 'passwordResetRequests'), where('status', '==', 'pending'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.warn('subscribeToPendingResets error:', err));
};

export const resolveResetRequest = async (requestId: string, teacherUid: string, newPassword: string) => {
  // Store new password signal in Firestore (teacher's login page will pick it up)
  await setDoc(doc(db, 'passwordResets', teacherUid), {
    newPassword,
    status: 'ready',
    resolvedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, 'passwordResetRequests', requestId), {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  });
};

// ── Activity Feed ──────────────────────────────────────────────

export const logActivity = async (event: Record<string, any>): Promise<void> => {
  try {
    await addDoc(collection(db, 'activityFeed'), {
      ...event,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Silent fail — never break main flow
  }
};

export const subscribeToAllActivity = (callback: (events: any[]) => void) => {
  const q = query(collection(db, 'activityFeed'), orderBy('timestamp', 'desc'), limit(500));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.warn('subscribeToAllActivity error:', err));
};

export const subscribeToTeacherActivity = (
  studentUids: string[],
  callback: (events: any[]) => void
) => {
  if (studentUids.length === 0) { callback([]); return () => {}; }
  const q = query(
    collection(db, 'activityFeed'),
    where('actorUid', 'in', studentUids.slice(0, 30)),
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.warn('subscribeToTeacherActivity error:', err));
};

// ── File Upload ────────────────────────────────────────────────

export const uploadProfilePhoto = async (uid: string, file: File): Promise<string> => {
  const storageRef = ref(storage, `profilePhotos/${uid}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Re-export Firestore primitives needed by other files
export { arrayUnion, doc, collection, query, where, getDocs, getDoc, setDoc, updateDoc, addDoc, deleteDoc };
