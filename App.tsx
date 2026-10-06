import React, { lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import { LanguageProvider } from './services/LanguageContext';
import { MotionConfig, LazyMotion, domAnimation } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AIFloatingTutor from './components/AIFloatingTutor';
import ProtectedRoute from './components/ProtectedRoute';
import { ensureAdminExists } from './services/adminSetup';
import { ReactLenis } from 'lenis/react';

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Subjects = lazy(() => import('./pages/Subjects'));
const SubjectView = lazy(() => import('./pages/SubjectView'));
const LabView = lazy(() => import('./pages/LabView'));
const TutorPage = lazy(() => import('./pages/TutorPage'));
const About = lazy(() => import('./pages/About'));
const Profile = lazy(() => import('./pages/Profile'));
const Contact = lazy(() => import('./pages/Contact'));

// Role-specific dashboards
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TeacherProfile = lazy(() => import('./pages/TeacherProfile'));
const TeacherQuizDashboard = lazy(() => import('./pages/TeacherQuizDashboard'));

// Activity feeds
const TeacherActivityFeed = lazy(() => import('./pages/TeacherActivityFeed'));
const AdminActivityFeed = lazy(() => import('./pages/AdminActivityFeed'));

// Tools
const Tools = lazy(() => import('./pages/Tools'));
const FormulaSheet = lazy(() => import('./pages/tools/FormulaSheet'));
const LogicGates = lazy(() => import('./pages/tools/LogicGates'));
const PeriodicTableTool = lazy(() => import('./pages/tools/PeriodicTableTool'));
const Constants = lazy(() => import('./pages/tools/Constants'));
const CalculatorTool = lazy(() => import('./pages/tools/CalculatorTool'));
const SafetyGuide = lazy(() => import('./pages/tools/SafetyGuide'));
const BioDiagrams = lazy(() => import('./pages/tools/BioDiagrams'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="size-12 rounded-full animate-spin" style={{ border: '3px solid rgba(56,189,248,0.15)', borderTopColor: '#38BDF8' }} />
      <p className="text-sm text-zinc-500 font-medium">Loading E-Prayog...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  // Initialize admin account on first load (idempotent)
  useEffect(() => {
    ensureAdminExists().catch(() => {});
  }, []);

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      <LanguageProvider>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <LazyMotion features={domAnimation}>
            <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
          <Navbar />
          <main className="flex-1">
            <React.Suspense fallback={<PageLoader />}>
              <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/about" element={<About />} />

                {/* TOOLS: public (no auth required) */}
                <Route path="/tools" element={<Tools />} />
                <Route path="/tools/formula-sheet" element={<FormulaSheet />} />
                <Route path="/tools/logic-gates" element={<LogicGates />} />
                <Route path="/tools/periodic-table" element={<PeriodicTableTool />} />
                <Route path="/tools/constants" element={<Constants />} />
                <Route path="/tools/calculator" element={<CalculatorTool />} />
                <Route path="/tools/safety-guide" element={<SafetyGuide />} />
                <Route path="/tools/bio-diagrams" element={<BioDiagrams />} />

                {/* AUTH REQUIRED: any role */}
                <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
                <Route path="/subjects/:subjectId" element={<ProtectedRoute><SubjectView /></ProtectedRoute>} />
                <Route path="/subjects/:subjectId/:labId" element={<ProtectedRoute><LabView /></ProtectedRoute>} />
                <Route path="/tutor" element={<ProtectedRoute><TutorPage /></ProtectedRoute>} />
                <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                {/* STUDENT */}
                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Student']}><StudentDashboard /></ProtectedRoute>} />

                {/* TEACHER */}
                <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherDashboard /></ProtectedRoute>} />
                <Route path="/teacher-profile" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherProfile /></ProtectedRoute>} />
                <Route path="/teacher-activity" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin']}><TeacherActivityFeed /></ProtectedRoute>} />
                <Route path="/teacher-quiz-dashboard" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherQuizDashboard /></ProtectedRoute>} />

                {/* ADMIN */}
                <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-activity" element={<ProtectedRoute allowedRoles={['Admin']}><AdminActivityFeed /></ProtectedRoute>} />

                {/* LEGACY REDIRECTS */}
                <Route path="/student-dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/staff-login" element={<Navigate to="/login" replace />} />
                <Route path="/auth/callback" element={<Navigate to="/home" replace />} />

                {/* FALLBACK */}
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </React.Suspense>
          </main>
          <Footer />
          <AIFloatingTutor />
        </div>
          </BrowserRouter>
        </LazyMotion>
      </MotionConfig>
    </AuthProvider>
    </LanguageProvider>
    </ReactLenis>
  );
};

export default App;
