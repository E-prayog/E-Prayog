import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import {
  db, subscribeToUsersByRole, subscribeToFeedbacks, updateFeedbackStatus,
  subscribeToPendingResets, resolveResetRequest, subscribeToAllActivity, logActivity,
  normalizeTeacherEmail, generateTeacherId, generateTeacherCode,
  getSecondaryApp, removeUser,
} from '../services/firebase';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth as getFirebaseAuth, signOut as fbSignOut } from 'firebase/auth';
import GlassCard from '../components/GlassCard';
import AdminQuizDesigner from '../components/admin/AdminQuizDesigner';
import AdminVideoManager from '../components/admin/AdminVideoManager';
import { ShieldCheck, Users, BookOpen, MessageSquare, Key, Activity, Search, Loader2, X, CheckCircle2, Trash2, UserPlus, BarChart3, Star, Flame, Brain, Youtube } from 'lucide-react';

type Tab = 'overview' | 'quizzes' | 'videos' | 'teachers' | 'students' | 'feedback' | 'resets' | 'activity';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
  { id: 'quizzes', label: 'Quiz Designer', icon: <Brain size={15} /> },
  { id: 'videos', label: 'Experiment Videos', icon: <Youtube size={15} /> },
  { id: 'teachers', label: 'Teachers', icon: <BookOpen size={15} /> },
  { id: 'students', label: 'Students', icon: <Users size={15} /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={15} /> },
  { id: 'resets', label: 'Reset Requests', icon: <Key size={15} /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={15} /> },
];

const AdminDashboard: React.FC = () => {
  const { user, profileData } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  // Data states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [resets, setResets] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Modal states
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', loginId: '', password: '', institution: '', profession: 'PUC Lecturer' });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Reset password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetting, setResetting] = useState(false);

  // Subscriptions
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(subscribeToUsersByRole('Teacher', setTeachers));
    unsubs.push(subscribeToUsersByRole('Student', setStudents));
    unsubs.push(subscribeToFeedbacks(setFeedbacks));
    unsubs.push(subscribeToPendingResets(setResets));
    unsubs.push(subscribeToAllActivity(setActivities));
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Create Teacher ────────────────────────
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    if (!createForm.loginId.endsWith('@tchr.e-prayog')) {
      setCreateError('Login ID must end with @tchr.e-prayog');
      return;
    }
    setCreating(true);
    try {
      // Check if ID exists
      const existing = await getDocs(query(collection(db, 'users'), where('loginId', '==', createForm.loginId)));
      if (!existing.empty) throw new Error('This Teacher ID is already taken');

      const firebaseEmail = normalizeTeacherEmail(createForm.loginId);
      const teacherId = generateTeacherId(createForm.name);
      const classCode = generateTeacherCode();

      // Use secondary app to avoid switching the admin's auth session
      const secondaryApp = getSecondaryApp();
      const secondaryAuth = getFirebaseAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, firebaseEmail, createForm.password);

      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid, name: createForm.name, full_name: createForm.name,
        email: createForm.loginId, loginId: createForm.loginId, role: 'Teacher',
        photoURL: '', teacherId, institution: createForm.institution,
        profession: createForm.profession, classCode, class_code: classCode,
        failedLoginAttempts: 0,
        progress: { physics: 0, chemistry: 0, biology: 0, math: 0, cs: 0 },
        completedLabs: [], visitedLabs: [], streak: 0, lastActiveDate: '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'teacherCodes', classCode), {
        teacherUid: cred.user.uid, teacherName: createForm.name,
        createdAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'teachers', cred.user.uid), {
        uid: cred.user.uid, classCode, students: [],
        createdAt: new Date().toISOString(),
      });

      // Sign out from secondary app (doesn't affect admin's session)
      await fbSignOut(secondaryAuth);

      await logActivity({
        type: 'new_teacher_registered', actorUid: user?.uid || '',
        actorName: profileData?.name || '', actorEmail: profileData?.email || '',
        actorRole: 'Admin', targetName: createForm.name,
        metadata: { teacherLoginId: createForm.loginId }, visibility: 'admin',
      });

      setCreateSuccess(`Teacher "${createForm.name}" created! Login ID: ${createForm.loginId}, Class Code: ${classCode}`);
      setCreateForm({ name: '', loginId: '', password: '', institution: '', profession: 'PUC Lecturer' });
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create teacher');
    } finally {
      setCreating(false);
    }
  };

  // ── Handle Reset ────────────────────────
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await resolveResetRequest(resetTarget.id);
      setShowResetModal(false);
      setResetTarget(null);
    } catch (e) {
      alert('Failed to resolve reset request');
    } finally {
      setResetting(false);
    }
  };

  const filteredTeachers = teachers.filter(t =>
    (t.name || t.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.loginId || t.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    (s.name || s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.studentId || '').toLowerCase().includes(search.toLowerCase())
  );

  const getName = (u: any) => u.name || u.full_name || 'Unknown';

  const overviewStats = {
    totalUsers: teachers.length + students.length + 1,
    teachers: teachers.length,
    students: students.length,
    feedbacks: feedbacks.filter(f => f.status === 'open').length,
    resets: resets.length,
  };

  return (
    <div className="pt-24 pb-16 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen bg-ink text-paper">
      {/* Header */}
      <GlassCard className="p-6 md:p-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-[2px] bg-ink border border-rule-dark flex items-center justify-center shrink-0 text-brass">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-chalk block mb-1">System Administration</span>
            <h1 className="text-2xl md:text-3xl font-display font-normal text-paper mb-1">Control Panel</h1>
            <p className="text-xs font-mono text-chalk">{profileData?.loginId || profileData?.email || 'Admin'}</p>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-rule-dark">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(''); }}
            className={`px-4 py-2 text-xs font-mono tracking-wider flex items-center gap-2 whitespace-nowrap transition-colors rounded-[2px] border ${
              tab === t.id
                ? 'bg-ink-2 text-paper border-rule-dark font-medium underline underline-offset-4 decoration-verdigris'
                : 'text-chalk hover:text-paper border-transparent'
            }`}
          >
            {t.icon} <span>{t.label}</span>
            {t.id === 'resets' && resets.length > 0 && (
              <span className="size-4 bg-brass text-ink text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
                {resets.length}
              </span>
            )}
            {t.id === 'feedback' && feedbacks.filter(f => f.status === 'open').length > 0 && (
              <span className="size-4 bg-verdigris text-paper text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
                {feedbacks.filter(f => f.status === 'open').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Users', value: overviewStats.totalUsers },
              { label: 'Teachers', value: overviewStats.teachers },
              { label: 'Students', value: overviewStats.students },
              { label: 'Open Feedback', value: overviewStats.feedbacks },
              { label: 'Reset Requests', value: overviewStats.resets },
            ].map(stat => (
              <GlassCard key={stat.label} hoverEffect={false} className="p-5">
                <div className="text-2xl font-mono font-semibold text-paper">{stat.value}</div>
                <div className="text-xs font-mono text-chalk uppercase tracking-wider mt-1">{stat.label}</div>
              </GlassCard>
            ))}
          </div>

          {/* Recent Activity */}
          <h2 className="text-base font-display text-paper mb-4">Recent Audit Stream</h2>
          <GlassCard className="p-0 overflow-hidden">
            <div className="max-h-96 overflow-y-auto divide-y divide-rule-dark">
              {activities.slice(0, 20).map((event, i) => (
                <div key={event.id || i} className="flex items-start gap-4 p-4 hover:bg-ink-2/60 transition-colors">
                  <div className="size-2 rounded-full bg-verdigris mt-2 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-paper font-normal">
                      <span className="font-medium text-paper">{event.actorName || event.actorEmail || 'User'}</span>
                      <span className="text-chalk font-mono text-xs ml-2">[{event.type?.replace(/_/g, ' ')}]</span>
                    </p>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <p className="text-xs text-chalk/70 font-mono mt-0.5 truncate">{JSON.stringify(event.metadata)}</p>
                    )}
                    <p className="text-xs text-chalk font-mono mt-0.5">{event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}</p>
                  </div>
                  <span className="text-xs text-chalk font-mono shrink-0 px-2 py-0.5 border border-rule-dark rounded-[2px]">{event.actorRole}</span>
                </div>
              ))}
              {activities.length === 0 && <div className="p-12 text-center text-chalk font-mono text-sm">No activity recorded yet</div>}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Quizzes / Quiz Designer Tab ── */}
      {tab === 'quizzes' && <AdminQuizDesigner />}

      {/* ── Experiment Videos Tab ── */}
      {tab === 'videos' && <AdminVideoManager />}

      {/* ── Teachers Tab ── */}
      {tab === 'teachers' && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-chalk/50" size={14} />
              <input
                type="text"
                placeholder="Search teachers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-ink-2 border border-rule-dark rounded-[2px] text-paper placeholder-chalk/50 focus:outline-none focus:border-verdigris text-xs font-mono"
              />
            </div>
            <button
              onClick={() => { setShowCreateTeacher(true); setCreateError(''); setCreateSuccess(''); }}
              className="px-5 py-2.5 rounded-[2px] bg-verdigris hover:bg-verdigris-deep text-paper text-xs font-medium tracking-wide transition-colors flex items-center gap-2"
            >
              <UserPlus size={14} /> Create Teacher
            </button>
          </div>
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="uppercase text-chalk bg-ink border-b border-rule-dark">
                  <tr>
                    <th className="px-4 py-3 font-normal">Name</th>
                    <th className="px-4 py-3 font-normal">Login ID</th>
                    <th className="px-4 py-3 font-normal">Teacher ID</th>
                    <th className="px-4 py-3 font-normal">Institution</th>
                    <th className="px-4 py-3 font-normal">Class Code</th>
                    <th className="px-4 py-3 font-normal">Created</th>
                    <th className="px-4 py-3 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule-dark">
                  {filteredTeachers.map(t => (
                    <tr key={t.id} className="hover:bg-ink transition-colors">
                      <td className="px-4 py-3 font-medium text-paper">{getName(t)}</td>
                      <td className="px-4 py-3 text-chalk">{t.loginId || t.email}</td>
                      <td className="px-4 py-3 text-verdigris">{t.teacherId || '-'}</td>
                      <td className="px-4 py-3 text-chalk">{t.institution || '-'}</td>
                      <td className="px-4 py-3 text-brass font-bold tracking-widest">{t.classCode || t.class_code || '-'}</td>
                      <td className="px-4 py-3 text-chalk">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove teacher "${getName(t)}"? This cannot be undone.`)) {
                              removeUser(t.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-chalk">No teachers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Students Tab ── */}
      {tab === 'students' && (
        <div>
          <div className="mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-chalk/50" size={14} />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-ink-2 border border-rule-dark rounded-[2px] text-paper placeholder-chalk/50 focus:outline-none focus:border-verdigris text-xs font-mono"
              />
            </div>
          </div>
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="uppercase text-chalk bg-ink border-b border-rule-dark">
                  <tr>
                    <th className="px-4 py-3 font-normal">Name</th>
                    <th className="px-4 py-3 font-normal">Email</th>
                    <th className="px-4 py-3 font-normal">Student ID</th>
                    <th className="px-4 py-3 font-normal">Grade</th>
                    <th className="px-4 py-3 font-normal">Progress</th>
                    <th className="px-4 py-3 font-normal">Streak</th>
                    <th className="px-4 py-3 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule-dark">
                  {filteredStudents.map(s => {
                    const prog = s.progress || {};
                    const avg = Math.round((Object.values(prog) as number[]).reduce((a, b) => a + Number(b), 0) / 5);
                    return (
                      <tr key={s.id} className="hover:bg-ink transition-colors">
                        <td className="px-4 py-3 font-medium text-paper">{getName(s)}</td>
                        <td className="px-4 py-3 text-chalk">{s.email}</td>
                        <td className="px-4 py-3 text-verdigris">{s.studentId || '-'}</td>
                        <td className="px-4 py-3 text-chalk">{s.grade || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-ink rounded-full overflow-hidden">
                              <div className="h-full bg-verdigris" style={{ width: `${avg}%` }}></div>
                            </div>
                            <span className="text-paper">{avg}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-brass">
                            <Flame size={14} />
                            <span>{s.streak || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove student "${getName(s)}"?`)) removeUser(s.id);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-chalk">No students found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Feedback Tab ── */}
      {tab === 'feedback' && (
        <div>
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="uppercase text-chalk bg-ink border-b border-rule-dark">
                  <tr>
                    <th className="px-4 py-3 font-normal">From</th>
                    <th className="px-4 py-3 font-normal">Role</th>
                    <th className="px-4 py-3 font-normal">Category</th>
                    <th className="px-4 py-3 font-normal">Rating</th>
                    <th className="px-4 py-3 font-normal">Message</th>
                    <th className="px-4 py-3 font-normal">Date</th>
                    <th className="px-4 py-3 font-normal">Status</th>
                    <th className="px-4 py-3 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule-dark">
                  {feedbacks.map(fb => (
                    <tr key={fb.id} className="hover:bg-ink transition-colors">
                      <td className="px-4 py-3 font-medium text-paper">{fb.name}</td>
                      <td className="px-4 py-3 text-chalk">{fb.role}</td>
                      <td className="px-4 py-3 text-chalk capitalize">{fb.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={'star-' + i}
                              size={12}
                              className={i < (fb.rating || 0) ? "fill-brass text-brass" : "text-chalk/30"}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-paper max-w-xs truncate font-sans text-xs" title={fb.message}>{fb.message}</td>
                      <td className="px-4 py-3 text-chalk">{fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ''}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-[2px] border ${
                          fb.status === 'open' ? 'border-brass text-brass' :
                          fb.status === 'read' ? 'border-chalk text-chalk' : 'border-verdigris text-verdigris'
                        }`}>
                          {fb.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {fb.status === 'open' && (
                          <button onClick={() => updateFeedbackStatus(fb.id, 'read')} className="text-chalk hover:text-paper">Read</button>
                        )}
                        {fb.status !== 'resolved' && (
                          <button onClick={() => updateFeedbackStatus(fb.id, 'resolved')} className="text-verdigris hover:underline">Resolve</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {feedbacks.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-chalk">No feedback received yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Reset Requests Tab ── */}
      {tab === 'resets' && (
        <div className="space-y-4">
          {resets.length === 0 ? (
            <GlassCard className="p-12 text-center font-mono">
              <Key size={36} className="mx-auto text-chalk/40 mb-3" />
              <p className="text-chalk">No pending password reset requests.</p>
            </GlassCard>
          ) : resets.map(req => (
            <GlassCard key={req.id} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-paper text-sm">{req.teacherName || 'Teacher'}</p>
                  <p className="text-xs text-chalk font-mono mt-0.5">{req.teacherId} • {req.failedAttempts} failed attempts</p>
                  <p className="text-xs text-chalk/70 font-mono">{req.requestedAt ? new Date(req.requestedAt).toLocaleString() : ''}</p>
                </div>
                <button
                  onClick={() => { setResetTarget(req); setShowResetModal(true); }}
                  className="px-4 py-2 bg-brass hover:bg-brass/90 text-ink rounded-[2px] text-xs font-mono font-medium transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Activity Tab ── */}
      {tab === 'activity' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto divide-y divide-rule-dark">
            {activities.map((event, i) => (
              <div key={event.id || i} className="flex items-start gap-4 p-4 hover:bg-ink transition-colors">
                <div className="size-2 rounded-full bg-verdigris mt-2 shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-paper">
                    <span className="font-bold">{event.actorName || event.actorEmail || 'User'}</span>: <span className="text-chalk">{event.type?.replace(/_/g, ' ')}</span>
                  </p>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <p className="text-xs text-chalk/60 font-mono mt-0.5 truncate">{JSON.stringify(event.metadata)}</p>
                  )}
                  <p className="text-xs text-chalk font-mono mt-0.5">{event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}</p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 border border-rule-dark rounded-[2px] text-chalk shrink-0">
                  {event.actorRole}
                </span>
              </div>
            ))}
            {activities.length === 0 && <div className="p-12 text-center text-chalk font-mono text-sm">No activity recorded yet</div>}
          </div>
        </GlassCard>
      )}

      {/* ── Create Teacher Modal ── */}
      {showCreateTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-ink-2 border border-rule-dark rounded-[4px] p-6 shadow-2xl relative">
            <button onClick={() => setShowCreateTeacher(false)} className="absolute top-4 right-4 text-chalk hover:text-paper">
              <X size={18} />
            </button>
            <h2 className="text-lg font-display text-paper mb-6 flex items-center gap-2">
              <UserPlus size={18} className="text-verdigris" />
              <span>Create Teacher Account</span>
            </h2>
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <span className="block text-xs font-mono text-chalk uppercase mb-1.5">Full Name</span>
                <input
                  id="create-teacher-name"
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full bg-ink border border-rule-dark rounded-[2px] px-3.5 py-2 text-paper text-sm focus:outline-none focus:border-verdigris font-mono"
                  placeholder="e.g. Mr. Rao"
                />
              </div>
              <div>
                <span className="block text-xs font-mono text-chalk uppercase mb-1.5">Login ID</span>
                <input
                  id="create-teacher-login"
                  required
                  value={createForm.loginId}
                  onChange={e => setCreateForm({...createForm, loginId: e.target.value})}
                  className="w-full bg-ink border border-rule-dark rounded-[2px] px-3.5 py-2 text-paper text-sm focus:outline-none focus:border-verdigris font-mono"
                  placeholder="mrrao@tchr.e-prayog"
                />
                <p className="text-xs text-chalk/60 font-mono mt-1">Must end with @tchr.e-prayog</p>
              </div>
              <div>
                <span className="block text-xs font-mono text-chalk uppercase mb-1.5">Temporary Password</span>
                <input
                  id="create-teacher-password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={e => setCreateForm({...createForm, password: e.target.value})}
                  className="w-full bg-ink border border-rule-dark rounded-[2px] px-3.5 py-2 text-paper text-sm focus:outline-none focus:border-verdigris font-mono"
                  placeholder="Minimum 6 characters"
                  type="text"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-mono text-chalk uppercase mb-1.5">Institution</span>
                  <input
                    id="create-teacher-institution"
                    value={createForm.institution}
                    onChange={e => setCreateForm({...createForm, institution: e.target.value})}
                    className="w-full bg-ink border border-rule-dark rounded-[2px] px-3.5 py-2 text-paper text-sm focus:outline-none focus:border-verdigris font-mono"
                    placeholder="College name"
                  />
                </div>
                <div>
                  <span className="block text-xs font-mono text-chalk uppercase mb-1.5">Profession</span>
                  <select
                    id="create-teacher-profession"
                    value={createForm.profession}
                    onChange={e => setCreateForm({...createForm, profession: e.target.value})}
                    className="w-full bg-ink border border-rule-dark rounded-[2px] px-3.5 py-2 text-paper text-sm focus:outline-none focus:border-verdigris font-mono"
                  >
                    <option>PUC Lecturer</option>
                    <option>Assistant Professor</option>
                    <option>Professor</option>
                    <option>Lab Instructor</option>
                  </select>
                </div>
              </div>
              {createError && <p className="text-xs font-mono text-red-400 bg-red-950/30 border border-red-900/40 p-2.5 rounded-[2px]">{createError}</p>}
              {createSuccess && <p className="text-xs font-mono text-verdigris bg-ink border border-verdigris/40 p-2.5 rounded-[2px]">{createSuccess}</p>}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTeacher(false)}
                  className="flex-1 py-2.5 rounded-[2px] text-chalk font-mono text-xs border border-rule-dark hover:text-paper hover:bg-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-[2px] bg-verdigris hover:bg-verdigris-deep text-paper font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {showResetModal && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-ink-2 border border-rule-dark rounded-[4px] p-6 shadow-2xl">
            <h2 className="text-base font-display text-paper mb-3">Reset request for {resetTarget.teacherName || resetTarget.teacherId}</h2>
            <p className="text-xs text-chalk leading-relaxed mb-6 font-mono">
              Mark this request resolved. Set a new password in Firebase Console → Authentication.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-[2px] text-chalk font-mono text-xs border border-rule-dark hover:text-paper hover:bg-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-[2px] bg-brass hover:bg-brass/90 text-ink font-mono font-medium text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {resetting ? <Loader2 className="animate-spin" size={14} /> : <Key size={14} />}
                <span>Mark Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
