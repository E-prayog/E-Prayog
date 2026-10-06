import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/AuthContext';
import {
  db, auth, subscribeToUsersByRole, getUsersByRole, subscribeToFeedbacks, updateFeedbackStatus,
  subscribeToPendingResets, resolveResetRequest, subscribeToAllActivity, logActivity,
  normalizeTeacherEmail, generateTeacherId, generateTeacherCode,
  getSecondaryApp, removeUser,
} from '../services/firebase';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth as getFirebaseAuth, signOut as fbSignOut } from 'firebase/auth';
import GlassCard from '../components/GlassCard';
import AdminQuizDesigner from '../components/admin/AdminQuizDesigner';
import { ShieldCheck, Users, BookOpen, MessageSquare, Key, Activity, Search, Plus, Loader2, X, CheckCircle2, Clock, Eye, Trash2, UserPlus, BarChart3, RefreshCw, Star, Flame, Brain } from 'lucide-react';
import { m as motion } from 'framer-motion';

type Tab = 'overview' | 'quizzes' | 'teachers' | 'students' | 'feedback' | 'resets' | 'activity';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
  { id: 'quizzes', label: 'Quiz Designer', icon: <Brain size={16} /> },
  { id: 'teachers', label: 'Teachers', icon: <BookOpen size={16} /> },
  { id: 'students', label: 'Students', icon: <Users size={16} /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} /> },
  { id: 'resets', label: 'Reset Requests', icon: <Key size={16} /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={16} /> },
];

const AdminDashboard: React.FC = () => {
  const { user, profileData, role } = useAuth();
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
  const [newPassword, setNewPassword] = useState('');
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
    if (!resetTarget || !newPassword) return;
    setResetting(true);
    try {
      await resolveResetRequest(resetTarget.id, resetTarget.teacherUid, newPassword);
      setShowResetModal(false);
      setNewPassword('');
      setResetTarget(null);
    } catch (e) {
      alert('Failed to resolve reset request');
    } finally {
      setResetting(false);
    }
  };

  // ── Render helpers ────────────────────────

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
    <div className="pt-24 pb-12 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <GlassCard className="p-6 md:p-8 mb-8 border-red-500/20 bg-red-500/5 relative overflow-hidden">
        <div className="absolute -bottom-24 -left-24 size-64 bg-red-500/10 blur-[80px] rounded-full"></div>
        <div className="flex items-center gap-4 z-10 relative">
          <div className="size-14 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
            <ShieldCheck className="text-red-400" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-white mb-1">Admin Control Panel</h1>
            <p className="text-sm text-red-400/80">{profileData?.loginId || profileData?.email || 'Admin'}</p>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-white/10 text-white border border-white/15' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}>
            {t.icon} {t.label}
            {t.id === 'resets' && resets.length > 0 && (
              <span className="size-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{resets.length}</span>
            )}
            {t.id === 'feedback' && feedbacks.filter(f => f.status === 'open').length > 0 && (
              <span className="size-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{feedbacks.filter(f => f.status === 'open').length}</span>
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
              { label: 'Total Users', value: overviewStats.totalUsers, color: 'emerald' },
              { label: 'Teachers', value: overviewStats.teachers, color: 'purple' },
              { label: 'Students', value: overviewStats.students, color: 'blue' },
              { label: 'Open Feedback', value: overviewStats.feedbacks, color: 'amber' },
              { label: 'Reset Requests', value: overviewStats.resets, color: 'red' },
            ].map(stat => (
              <GlassCard key={stat.label} hoverEffect={false} className="p-5">
                <div className={`text-2xl font-display font-bold text-${stat.color}-400`}>{stat.value}</div>
                <div className="text-xs text-zinc-400 font-medium">{stat.label}</div>
              </GlassCard>
            ))}
          </div>
          {/* Recent Activity */}
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <GlassCard className="p-0 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {activities.slice(0, 20).map((event, i) => (
                <div key={event.id || i} className="flex items-start gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <div className="size-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white"><span className="font-bold">{event.actorName || event.actorEmail || 'User'}</span>: <span className="text-zinc-400">{event.type?.replace(/_/g, ' ')}</span></p>
                    <p className="text-xs text-zinc-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}</p>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono shrink-0">{event.actorRole}</span>
                </div>
              ))}
              {activities.length === 0 && <div className="p-12 text-center text-zinc-500">No activity yet</div>}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Quizzes / Quiz Designer Tab ── */}
      {tab === 'quizzes' && <AdminQuizDesigner />}

      {/* ── Teachers Tab ── */}
      {tab === 'teachers' && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input type="text" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 text-sm" />
            </div>
            <button onClick={() => { setShowCreateTeacher(true); setCreateError(''); setCreateSuccess(''); }}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all flex items-center gap-2 text-sm">
              <UserPlus size={16} /> Create Teacher
            </button>
          </div>
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-zinc-400 bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Login ID</th>
                    <th className="px-4 py-3">Teacher ID</th>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Class Code</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map(t => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{getName(t)}</td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{t.loginId || t.email}</td>
                      <td className="px-4 py-3 text-emerald-400 font-mono text-xs">{t.teacherId || '-'}</td>
                      <td className="px-4 py-3 text-zinc-400">{t.institution || '-'}</td>
                      <td className="px-4 py-3 font-mono text-amber-400 font-bold tracking-widest">{t.classCode || t.class_code || '-'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => {
                          if (window.confirm(`Remove teacher "${getName(t)}"? This cannot be undone.`)) {
                            removeUser(t.id);
                          }
                        }} className="text-red-400 hover:text-red-300 text-xs font-bold"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No teachers found</td></tr>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 text-sm" />
            </div>
          </div>
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-zinc-400 bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Streak</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => {
                    const prog = s.progress || {};
                    const avg = Math.round((Object.values(prog) as number[]).reduce((a, b) => a + Number(b), 0) / 5);
                    return (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-bold text-white">{getName(s)}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{s.email}</td>
                        <td className="px-4 py-3 text-emerald-400 font-mono text-xs">{s.studentId || '-'}</td>
                        <td className="px-4 py-3 text-zinc-400">{s.grade || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-black/30 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 opacity-80" style={{ width: `${avg}%` }}></div></div>
                            <span className="text-xs font-mono text-emerald-400">{avg}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                            <Flame size={16} className="fill-orange-500 text-orange-400" />
                            <span>{s.streak || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => {
                            if (window.confirm(`Remove student "${getName(s)}"?`)) removeUser(s.id);
                          }} className="text-red-400 hover:text-red-300 text-xs font-bold"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No students found</td></tr>
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
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-zinc-400 bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map(fb => (
                    <tr key={fb.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{fb.name}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${fb.role === 'Teacher' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{fb.role}</span></td>
                      <td className="px-4 py-3 text-zinc-400 capitalize">{fb.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={'star-' + i}
                              size={14}
                              className={i < (fb.rating || 0) ? "fill-amber-400 text-amber-400" : "text-zinc-600"}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 max-w-xs truncate" title={fb.message}>{fb.message}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ''}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${fb.status === 'open' ? 'bg-amber-500/20 text-amber-400' : fb.status === 'read' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{fb.status}</span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {fb.status === 'open' && <button onClick={() => updateFeedbackStatus(fb.id, 'read')} className="text-xs text-blue-400 hover:text-blue-300 font-bold"><Eye size={14} /></button>}
                        {fb.status !== 'resolved' && <button onClick={() => updateFeedbackStatus(fb.id, 'resolved')} className="text-xs text-green-400 hover:text-green-300 font-bold"><CheckCircle2 size={14} /></button>}
                      </td>
                    </tr>
                  ))}
                  {feedbacks.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-500">No feedback received yet</td></tr>
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
            <GlassCard className="p-12 text-center"><Key size={40} className="mx-auto text-zinc-600 mb-4" /><p className="text-zinc-400">No pending password reset requests.</p></GlassCard>
          ) : resets.map(req => (
            <GlassCard key={req.id} className="p-6 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{req.teacherName || 'Teacher'}</p>
                  <p className="text-sm text-zinc-400">{req.teacherId}: {req.failedAttempts} failed attempts</p>
                  <p className="text-xs text-zinc-500">{req.requestedAt ? new Date(req.requestedAt).toLocaleString() : ''}</p>
                </div>
                <button onClick={() => { setResetTarget(req); setShowResetModal(true); setNewPassword(''); }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition-colors">Reset Password</button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Activity Tab ── */}
      {tab === 'activity' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {activities.map((event, i) => (
              <div key={event.id || i} className="flex items-start gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <div className="size-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white"><span className="font-bold">{event.actorName || event.actorEmail || 'User'}</span>: <span className="text-zinc-400">{event.type?.replace(/_/g, ' ')}</span></p>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <p className="text-xs text-zinc-500 mt-0.5">{JSON.stringify(event.metadata).slice(0, 120)}</p>
                  )}
                  <p className="text-xs text-zinc-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  event.actorRole === 'Admin' ? 'bg-red-500/20 text-red-400' :
                  event.actorRole === 'Teacher' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                }`}>{event.actorRole}</span>
              </div>
            ))}
            {activities.length === 0 && <div className="p-12 text-center text-zinc-500">No activity recorded yet</div>}
          </div>
        </GlassCard>
      )}

      {/* ── Create Teacher Modal ── */}
      {showCreateTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <button onClick={() => setShowCreateTeacher(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2"><UserPlus size={20} className="text-purple-400" /> Create Teacher Account</h2>
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-zinc-400 uppercase mb-2">Full Name</span>
                <input id="create-teacher-name" required value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50" placeholder="e.g. Mr. Rao" />
              </div>
              <div>
                <span className="block text-xs font-bold text-zinc-400 uppercase mb-2">Login ID</span>
                <input id="create-teacher-login" required value={createForm.loginId} onChange={e => setCreateForm({...createForm, loginId: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 font-mono" placeholder="mrrao@tchr.e-prayog" />
                <p className="text-xs text-zinc-500 mt-1">Must end with <code className="text-purple-400">@tchr.e-prayog</code></p>
              </div>
              <div>
                <span className="block text-xs font-bold text-zinc-400 uppercase mb-2">Temporary Password</span>
                <input id="create-teacher-password" required minLength={6} value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50" placeholder="Minimum 6 characters" type="text" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-bold text-zinc-400 uppercase mb-2">Institution</span>
                  <input id="create-teacher-institution" value={createForm.institution} onChange={e => setCreateForm({...createForm, institution: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50" placeholder="College name" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-400 uppercase mb-2">Profession</span>
                  <select id="create-teacher-profession" value={createForm.profession} onChange={e => setCreateForm({...createForm, profession: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 appearance-none">
                    <option>PUC Lecturer</option><option>Assistant Professor</option><option>Professor</option><option>Lab Instructor</option>
                  </select>
                </div>
              </div>
              {createError && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">{createError}</p>}
              {createSuccess && <p className="text-sm text-green-400 bg-green-500/10 rounded-xl px-4 py-2">{createSuccess}</p>}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreateTeacher(false)} className="flex-1 py-3 rounded-xl text-zinc-400 font-bold hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {creating ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {showResetModal && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Reset Password for {resetTarget.teacherName || resetTarget.teacherId}</h2>
            <p className="text-sm text-zinc-400 mb-4">Enter a new password. The teacher's next login will use this password.</p>
            <input type="text" placeholder="New password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(false)} className="flex-1 py-3 rounded-xl text-zinc-400 font-bold hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={handleResetPassword} disabled={resetting || newPassword.length < 6}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {resetting ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />} Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
