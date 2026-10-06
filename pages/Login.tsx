import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import {
  auth, db, googleProvider,
  normalizeTeacherEmail, isTeacherLoginId, isAdminLoginId,
  generateStudentId, updateStreak, logActivity,
} from '../services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, addDoc } from 'firebase/firestore';
import { Mail, Lock, User, Eye, EyeOff, LogIn, ArrowRight, ArrowLeft, GraduationCap, Building } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { useLang } from '../services/LanguageContext';

const MotionDiv = motion.div as any;

function friendlyError(err: any): string {
  const msg = err?.message || err?.code || '';
  if (msg.includes('unauthorized-domain')) return 'This domain is not authorised by Firebase. Add your site domain in Firebase Console → Authentication → Settings → Authorized domains.';
  if (msg.includes('invalid-api-key') || msg.includes('api-key-not-valid')) return 'Firebase API key is invalid or missing. Check your environment variables on your hosting platform (Netlify/Vercel).';
  if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) return 'Invalid ID or password. Please try again.';
  if (msg.includes('email-already-in-use')) return 'An account with this email already exists.';
  if (msg.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (msg.includes('invalid-email')) return 'Please enter a valid email address.';
  if (msg.includes('too-many-requests')) return 'Too many attempts. Please wait a moment.';
  if (msg.includes('operation-not-allowed')) return 'Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.';
  if (msg.includes('popup-closed')) return 'Sign-in popup was closed. Please try again.';
  if (msg.includes('popup-blocked')) return 'Popup was blocked. Please allow popups for this site.';
  if (msg.includes('account-exists-with-different-credential')) return 'An account with this email exists using a different sign-in method.';
  if (msg.includes('network-request-failed')) return 'Network error. Check your internet connection. If deployed, verify all Firebase environment variables are set on your hosting platform.';
  return msg || 'Something went wrong. Please try again.';
}

const Login: React.FC = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, role: authRole, loading: authLoading } = useAuth();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  // Signup state (2-step)
  const [signupStep, setSignupStep] = useState(1);
  const [signupData, setSignupData] = useState({
    name: '', grade: '2nd PUC / Class 12', institution: '', language: 'English',
  });

  // Auto-detect login type from ID
  const loginType = isTeacherLoginId(loginId) ? 'teacher'
    : isAdminLoginId(loginId) ? 'admin'
    : 'student';

  // Redirect if already logged in: wait for role to be fully resolved
  useEffect(() => {
    if (!authLoading && authUser && authRole) {
      const from = (location.state as any)?.from;
      if (from) {
        navigate(from, { replace: true });
      } else {
        redirectByRole(authRole);
      }
    }
  }, [authUser, authRole, authLoading]);

  const redirectByRole = (role: string) => {
    if (role === 'Admin') navigate('/admin-dashboard', { replace: true });
    else if (role === 'Teacher') navigate('/teacher-dashboard', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await handleStudentSignup();
      } else {
        await handleLogin();
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    // Determine the actual Firebase email to use
    let firebaseEmail = loginId;
    if (isTeacherLoginId(loginId) || isAdminLoginId(loginId)) {
      firebaseEmail = normalizeTeacherEmail(loginId);
    }

    const cred = await signInWithEmailAndPassword(auth, firebaseEmail, password);

    // Read role for activity logging only: navigation is handled by useEffect
    // once AuthContext finishes loading the profile
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    const role = snap.exists() ? snap.data().role : 'Student';

    // Fire-and-forget: don't await these so they don't delay navigation
    updateStreak(cred.user.uid).catch(() => {});
    logActivity({
      type: 'user_login', actorUid: cred.user.uid,
      actorName: snap.exists() ? (snap.data().name || '') : '',
      actorEmail: loginId, actorRole: role,
      metadata: { method: 'email' }, visibility: 'admin',
    }).catch(() => {});

    // Do NOT navigate here: let the useEffect above handle it
    // once AuthContext resolves the role from Firestore
  };


  const handleGoogleLogin = async () => {
    if (loginType !== 'student') {
      setError('Google login is not available for Teacher/Admin accounts.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const studentId = generateStudentId(user.displayName || 'user');
        await setDoc(docRef, {
          uid: user.uid, name: user.displayName || 'Student', full_name: user.displayName || 'Student',
          email: user.email, role: 'Student', photoURL: user.photoURL || '',
          studentId, grade: '', syllabus: '', institution: '', language: 'English',
          teacherUid: '', teacherCode: '',
          progress: { physics: 0, chemistry: 0, biology: 0, math: 0, cs: 0 },
          completedLabs: [], visitedLabs: [],
          streak: 1, lastActiveDate: new Date().toISOString().split('T')[0], totalTimeSpent: 0,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        await logActivity({
          type: 'user_signup', actorUid: user.uid,
          actorName: user.displayName || '', actorEmail: user.email || '',
          actorRole: 'Student', metadata: { method: 'google' }, visibility: 'admin',
        });
      } else {
        const data = docSnap.data();
        if (data.role === 'Teacher' || data.role === 'Admin') {
          await signOut(auth);
          throw new Error('Teacher and Admin accounts cannot use Google login.');
        }
        // Update name/photo from Google if not customized
        const updates: any = { updatedAt: new Date().toISOString() };
        if (!data.name || data.name === 'Student' || data.name === 'User') {
          updates.name = user.displayName || data.name;
          updates.full_name = user.displayName || data.full_name;
        }
        if (!data.photoURL && user.photoURL) updates.photoURL = user.photoURL;
        await updateDoc(docRef, updates);
        await updateStreak(user.uid);
      }
      const from = (location.state as any)?.from;
      navigate(from || '/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSignup = async () => {
    if (signupStep === 1) {
      if (!signupData.name || !loginId || !password) throw new Error('Please fill all fields');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      setSignupStep(2);
      setLoading(false);
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, loginId, password);
    await updateProfile(cred.user, { displayName: signupData.name });
    const studentId = generateStudentId(signupData.name);
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid, name: signupData.name, full_name: signupData.name,
      email: loginId, role: 'Student', photoURL: '', studentId,
      grade: signupData.grade, syllabus: 'Karnataka PUC', institution: signupData.institution,
      language: signupData.language, teacherUid: '', teacherCode: '',
      progress: { physics: 0, chemistry: 0, biology: 0, math: 0, cs: 0 },
      completedLabs: [], visitedLabs: [],
      streak: 1, lastActiveDate: new Date().toISOString().split('T')[0], totalTimeSpent: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await logActivity({
      type: 'user_signup', actorUid: cred.user.uid,
      actorName: signupData.name, actorEmail: loginId,
      actorRole: 'Student', metadata: { method: 'email' }, visibility: 'admin',
    });
    navigate('/dashboard', { replace: true });
  };

  // Login type labels
  const idLabel = loginType === 'teacher' ? 'Teacher ID' : loginType === 'admin' ? 'Admin ID' : 'Email Address';
  const badgeColor = loginType === 'teacher' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    : loginType === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' : '';
  const badgeText = loginType === 'teacher' ? t.loginTeacherBadge : loginType === 'admin' ? t.loginAdminBadge : '';

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20 pb-12">
      <MotionDiv
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md glass-panel rounded-3xl p-8"
      >
        <div className="text-center mb-8">
          {/* Animated Orbital Logo */}
          <div className="flex justify-center mb-3">
            <svg
              viewBox="0 0 80 80"
              width="72"
              height="72"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              aria-label="E-Prayog Logo"
              style={{ overflow: 'visible', display: 'block' }}
            >
              <defs>
                <linearGradient id="login-outerG" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1A73E8" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#00C896" stopOpacity="0.9"/>
                </linearGradient>
                <linearGradient id="login-innerG" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00C896" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#FF8C00" stopOpacity="0.9"/>
                </linearGradient>
                <linearGradient id="login-eG" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60AAFF"/>
                  <stop offset="100%" stopColor="#1A73E8"/>
                </linearGradient>
                <radialGradient id="login-eGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1A73E8" stopOpacity="0.85"/>
                  <stop offset="100%" stopColor="#1A73E8" stopOpacity="0"/>
                </radialGradient>
                <filter id="login-outerElecGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="1.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="login-innerElecGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="1.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="login-ringGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="0.7" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="login-eGlowF" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <path id="login-outerPath" d="M 67.2,40 A 27.2,11.2 0 1 1 67.19,39.97" fill="none"/>
                <path id="login-innerPath" d="M 57.6,40 A 17.6,7.2 0 1 1 57.59,39.97" fill="none"/>
              </defs>

              {/* Outer ring */}
              <g className="ep-outer-ring" style={{ transformOrigin: '40px 40px' }}>
                <ellipse cx="40" cy="40" rx="27.2" ry="11.2"
                  fill="none" stroke="url(#login-outerG)" strokeWidth="1.6" strokeOpacity="1"
                  filter="url(#login-ringGlow)"
                  transform="rotate(-20,40,40)"
                />
              </g>

              {/* Inner ring */}
              <g className="ep-inner-ring" style={{ transformOrigin: '40px 40px' }}>
                <ellipse cx="40" cy="40" rx="17.6" ry="7.2"
                  fill="none" stroke="url(#login-innerG)" strokeWidth="1.6" strokeOpacity="1"
                  filter="url(#login-ringGlow)"
                  transform="rotate(55,40,40)"
                />
              </g>

              {/* Outer electrons */}
              <g className="ep-outer-ring" style={{ transformOrigin: '40px 40px' }}>
                <g filter="url(#login-outerElecGlow)">
                  <circle r="2.2" fill="#1A73E8">
                    <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear">
                      <mpath xlinkHref="#login-outerPath"/>
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#1A73E8" opacity="0.45">
                    <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear" begin="-0.17s">
                      <mpath xlinkHref="#login-outerPath"/>
                    </animateMotion>
                  </circle>
                </g>
                <g filter="url(#login-outerElecGlow)">
                  <circle r="2.2" fill="#00C896">
                    <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear" begin="-3s">
                      <mpath xlinkHref="#login-outerPath"/>
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#00C896" opacity="0.45">
                    <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear" begin="-3.17s">
                      <mpath xlinkHref="#login-outerPath"/>
                    </animateMotion>
                  </circle>
                </g>
              </g>

              {/* Inner electron */}
              <g className="ep-inner-ring" style={{ transformOrigin: '40px 40px' }}>
                <g filter="url(#login-innerElecGlow)">
                  <circle r="2" fill="#FF8C00">
                    <animateMotion dur="4s" repeatCount="indefinite" calcMode="linear">
                      <mpath xlinkHref="#login-innerPath"/>
                    </animateMotion>
                  </circle>
                  <circle r="1.3" fill="#FF8C00" opacity="0.4">
                    <animateMotion dur="4s" repeatCount="indefinite" calcMode="linear" begin="-0.14s">
                      <mpath xlinkHref="#login-innerPath"/>
                    </animateMotion>
                  </circle>
                </g>
              </g>

              {/* E glow */}
              <ellipse cx="40" cy="40" rx="9" ry="9" fill="url(#login-eGlow)" className="ep-eglow"/>

              {/* Central E */}
              <g className="ep-eletter" style={{ transformOrigin: '40px 40px' }}>
                <text x="40" y="44" textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="20"
                  fill="url(#login-eG)" filter="url(#login-eGlowF)"
                  style={{ userSelect: 'none' }}
                >E</text>
              </g>

              {/* Sparks */}
              <circle cx="62" cy="22" r="1"   fill="#60AAFF" className="ep-spark ep-s1"/>
              <circle cx="18" cy="26" r="0.8" fill="#00C896" className="ep-spark ep-s2"/>
              <circle cx="64" cy="57" r="0.9" fill="#FF8C00" className="ep-spark ep-s3"/>
              <circle cx="16" cy="54" r="1"   fill="#60AAFF" className="ep-spark ep-s4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-display font-semibold text-white">
            {isSignup ? (signupStep === 2 ? t.loginCompleteProfile : t.loginCreateAccount) : t.loginWelcome}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {isSignup ? (signupStep === 2 ? t.loginFewDetails : t.loginJoinToday) : t.loginToAccount}
          </p>
        </div>

        {/* Login type badge */}
        {badgeText && !isSignup && (
          <div className={`mb-4 px-4 py-2 rounded-xl border text-center text-sm font-bold ${badgeColor}`}>
            {badgeText}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Signup Step 2: profile details */}
          {isSignup && signupStep === 2 ? (
            <>
              <button type="button" onClick={() => setSignupStep(1)}
                className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-2">
                <ArrowLeft size={14} /> {t.loginBack}
              </button>
              <div className="relative">
                <GraduationCap size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <select value={signupData.grade} onChange={e => setSignupData({...signupData, grade: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none">
                  <option value="2nd PUC / Class 12">2nd PUC / Class 12</option>
                  <option value="1st PUC / Class 11">1st PUC / Class 11</option>
                </select>
              </div>
              <div className="relative">
                <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input type="text" value={signupData.institution}
                  onChange={e => setSignupData({...signupData, institution: e.target.value})}
                  placeholder="School / College name (optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <select value={signupData.language} onChange={e => setSignupData({...signupData, language: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none">
                <option value="English">🌐 English</option>
                <option value="Kannada">🏛️ Kannada</option>
                <option value="Hindi">🇮🇳 Hindi</option>
              </select>
            </>
          ) : (
            <>
              {/* Signup Step 1: Name field */}
              {isSignup && (
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input type="text" value={signupData.name}
                    onChange={e => setSignupData({...signupData, name: e.target.value})}
                    placeholder={t.loginFullName} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50" />
                </div>
              )}
              {/* ID field */}
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={loginType === 'student' ? 'email' : 'text'}
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder={idLabel}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              {/* Password field */}
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t.loginPassword} required minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? (
              <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : isSignup && signupStep === 2 ? (
              <ArrowRight size={16} />
            ) : (
              <LogIn size={16} />
            )}
            {isSignup ? (signupStep === 2 ? t.loginCreateAccount : t.loginNext) : t.navLogin}
          </button>
        </form>

        {/* Google login (students only) */}
        {loginType === 'student' && !isSignup && (
          <>
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="px-4 text-xs text-zinc-500">{t.loginOr}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button onClick={handleGoogleLogin} disabled={loading}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C34 32.7 29.5 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.2-2.7-.4-3.9z" />
                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.2 16.2 18.8 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.5 0-10-3.3-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.2-2.7-.4-3.9z" />
              </svg>
              {t.loginContinueGoogle}
            </button>
          </>
        )}

        {/* Toggle Sign Up (students only) */}
        {loginType === 'student' && (
          <p className="text-center text-sm text-zinc-400 mt-6">
            {isSignup ? t.loginHaveAccount : t.loginNoAccount}
            <button
              onClick={() => { setIsSignup(!isSignup); setError(''); setSignupStep(1); }}
              className="text-emerald-400 font-bold ml-2 hover:underline"
            >
              {isSignup ? t.navLogin : t.loginSignUp}
            </button>
          </p>
        )}

        {/* Hint for teacher/admin */}
        {loginType !== 'student' && !isSignup && (
          <p className="text-center text-xs text-zinc-500 mt-6">
            {loginType === 'teacher' ? t.loginTeacherHint : t.loginAdminHint}
          </p>
        )}
      </MotionDiv>
    </div>
  );
};

export default Login;
