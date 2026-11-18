import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { getStudentsUnderTeacher, generateTeacherCode, saveTeacherCode, subscribeToPendingResets, logActivity } from '../services/firebase';
import GlassCard from '../components/GlassCard';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Plus, Search, Loader2, Copy, CheckCircle2, RefreshCw, Key, Activity, BarChart3, AlertCircle } from 'lucide-react';

const TeacherDashboard: React.FC = () => {
  const { user, profileData, refreshProfile } = useAuth();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classCode, setClassCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [resetRequests, setResetRequests] = useState<any[]>([]);

  // Assignment modal state
  const [showModal, setShowModal] = useState(false);
  const [assignment, setAssignment] = useState({ title: '', subject: 'Physics', grade: '2nd PUC / Class 12', dueDate: '' });

  // Load class code from profile
  useEffect(() => {
    const code = profileData?.classCode || profileData?.class_code || '';
    if (code) setClassCode(code);
  }, [profileData]);

  // Subscribe to linked students (real-time)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = getStudentsUnderTeacher(user.uid, (data) => {
      setStudents(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to password reset requests
  useEffect(() => {
    const unsub = subscribeToPendingResets((reqs) => {
      setResetRequests(reqs);
    });
    return () => unsub();
  }, []);

  const handleGenerateCode = async () => {
    if (!user) return;
    setGeneratingCode(true);
    const newCode = generateTeacherCode();
    try {
      const teacherName = profileData?.name || profileData?.full_name || '';
      await saveTeacherCode(user.uid, newCode, teacherName);
      await logActivity({
        type: 'teacher_code_generated', actorUid: user.uid,
        actorName: teacherName, actorEmail: profileData?.email || '',
        actorRole: 'Teacher', metadata: { newCode }, visibility: 'admin',
      });
      setClassCode(newCode);
      await refreshProfile();
    } catch (e) {
      console.error('Failed to generate class code:', e);
      alert('Failed to save class code.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (classCode) {
      navigator.clipboard.writeText(classCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const filteredStudents = students.filter(s =>
    (s.name || s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const teacherName = profileData?.name || profileData?.full_name || 'Teacher';
  const teacherId = profileData?.teacherId || '';
  const loginId = profileData?.loginId || profileData?.email || '';
  const institution = profileData?.institution || '';

  return (
    <div className="pt-24 pb-16 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen bg-ink text-paper">

      {/* HEADER */}
      <GlassCard className="p-6 md:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="size-12 rounded-[2px] bg-ink border border-rule-dark flex items-center justify-center shrink-0 text-verdigris">
            <BookOpen size={24} />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-chalk block mb-1">Faculty Portal</span>
            <h1 className="text-2xl md:text-3xl font-display font-normal text-paper mb-1">{teacherName}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-chalk">
              {teacherId && <span>ID: {teacherId}</span>}
              {loginId && <span>{loginId}</span>}
              {institution && <span>• {institution}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-[2px] bg-verdigris hover:bg-verdigris-deep text-paper text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> New Assignment
          </button>
        </div>
      </GlassCard>

      {/* CLASS CODE SECTION */}
      <GlassCard className="p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-[2px] bg-ink border border-rule-dark flex items-center justify-center shrink-0 text-brass">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-base font-display font-medium text-paper">Class Enrollment Code</h2>
              <p className="text-xs text-chalk mt-0.5">Share this code with PUC students to link their practical records.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {classCode ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-ink rounded-[2px] border border-rule-dark">
                  <span className="font-mono text-xl font-bold tracking-[0.25em] text-brass">{classCode}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className={`px-4 py-2 rounded-[2px] font-mono text-xs transition-colors flex items-center gap-1.5 border border-rule-dark ${
                    codeCopied ? 'bg-verdigris text-paper' : 'bg-ink-2 text-paper hover:bg-ink'
                  }`}
                >
                  {codeCopied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
                <button
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className="px-3 py-2 rounded-[2px] bg-ink-2 text-chalk hover:text-paper border border-rule-dark text-xs font-mono transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Regenerate code"
                >
                  <RefreshCw size={14} className={generatingCode ? 'animate-spin' : ''} />
                  <span>Regenerate</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={generatingCode}
                className="px-5 py-2.5 rounded-[2px] bg-verdigris hover:bg-verdigris-deep text-paper text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {generatingCode ? <Loader2 className="animate-spin" size={16} /> : <Key size={16} />}
                <span>Generate Class Code</span>
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Password Reset Alerts */}
      {resetRequests.length > 0 && (
        <GlassCard className="p-6 mb-8 border-red-900/30">
          <h2 className="text-base font-display text-paper flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-red-400" />
            <span>Pending Password Reset Requests</span>
          </h2>
          <div className="space-y-3">
            {resetRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-[2px] bg-ink border border-rule-dark">
                <div>
                  <p className="font-medium text-paper text-sm">{req.teacherName || req.teacherId}</p>
                  <p className="text-xs text-chalk font-mono">{req.failedAttempts} failed attempts • {new Date(req.requestedAt).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-mono text-chalk px-3 py-1 bg-ink-2 rounded-[2px] border border-rule-dark">Contact Admin</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Activity & Quiz Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-[2px] bg-ink border border-rule-dark flex items-center justify-center shrink-0 text-verdigris">
                <Activity size={20} />
              </div>
              <div>
                <h2 className="text-base font-display font-medium text-paper">Live Activity Stream</h2>
                <p className="text-xs text-chalk mt-0.5">Real-time practical sessions.</p>
              </div>
            </div>
            <Link
              to="/teacher-activity"
              className="px-4 py-2 rounded-[2px] bg-ink-2 hover:bg-ink text-paper border border-rule-dark text-xs font-mono transition-colors"
            >
              Open Feed →
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-[2px] bg-ink border border-rule-dark flex items-center justify-center shrink-0 text-brass">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="text-base font-display font-medium text-paper">Quiz Analytics</h2>
                <p className="text-xs text-chalk mt-0.5">Class cognitive breakdown & leaderboard.</p>
              </div>
            </div>
            <Link
              to="/teacher-quiz-dashboard"
              className="px-4 py-2 rounded-[2px] bg-ink-2 hover:bg-ink text-paper border border-rule-dark text-xs font-mono transition-colors"
            >
              View Analytics →
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* STUDENTS LIST */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg font-display text-paper flex items-center gap-2">
          <Users size={18} className="text-chalk" />
          <span>Linked Students ({filteredStudents.length})</span>
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-chalk/60" size={14} />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-ink-2 border border-rule-dark rounded-[2px] text-paper placeholder-chalk/50 focus:outline-none focus:border-verdigris text-xs font-mono"
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <GlassCard className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-verdigris" size={28} />
          </GlassCard>
        ) : filteredStudents.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Users size={40} className="text-chalk/40 mx-auto mb-3" />
            <p className="text-paper font-medium mb-1">
              {classCode ? 'No students linked yet.' : 'Generate an enrollment code to start linking students.'}
            </p>
            {classCode && (
              <p className="text-chalk text-xs font-mono">
                Class code: <span className="text-brass font-bold">{classCode}</span>
              </p>
            )}
          </GlassCard>
        ) : (
          filteredStudents.map(student => {
            const prog = student.progress || { physics: 0, chemistry: 0, biology: 0, math: 0, cs: 0 };
            const avgProgress = Math.round((Object.values(prog) as number[]).reduce((a, b) => a + Number(b), 0) / 5);
            const studentName = student.name || student.full_name || 'Unnamed';

            return (
              <GlassCard key={student.id} className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="size-10 rounded-[2px] bg-ink border border-rule-dark flex items-center justify-center text-paper font-mono font-bold text-sm shrink-0">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-paper font-display text-base font-normal">{studentName}</h3>
                      <div className="flex items-center gap-3 text-xs font-mono text-chalk mt-0.5">
                        <span>{student.email}</span>
                        <span>•</span>
                        <span>{student.grade || 'PUC'}</span>
                        {student.studentId && <span>• ID: {student.studentId}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 max-w-md w-full">
                    <div className="flex justify-between items-center mb-1 text-xs font-mono">
                      <span className="text-chalk">Completion</span>
                      <span className="text-paper font-medium">{avgProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-ink border border-rule-dark overflow-hidden mb-2">
                      <div className="h-full bg-verdigris" style={{ width: `${avgProgress}%` }}></div>
                    </div>
                    <div className="flex gap-1 h-1">
                      {Object.entries({ Phy: 'bg-verdigris', Chem: 'bg-brass', Bio: 'bg-chalk', Math: 'bg-paper', CS: 'bg-verdigris-deep' }).map(([sub, color]) => {
                        const subKey = sub === 'Phy' ? 'physics' : sub === 'Chem' ? 'chemistry' : sub === 'Bio' ? 'biology' : sub === 'Math' ? 'math' : 'cs';
                        const val = Math.min(100, Math.max(0, Number(prog[subKey]) || 0));
                        return (
                          <div key={sub} className="flex-1 bg-ink rounded-full overflow-hidden" title={`${sub}: ${val}%`}>
                            <div className={`h-full ${color}`} style={{ width: `${val}%` }}></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* ASSIGNMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-ink-2 border border-rule-dark rounded-[4px] p-6 shadow-2xl">
            <h2 className="text-lg font-display text-paper mb-6">Create Assignment</h2>
            <form onSubmit={(e) => { e.preventDefault(); setShowModal(false); alert('Assignment created!'); }} className="space-y-4">
              <div>
                <span className="block text-xs font-mono text-chalk uppercase mb-1.5">Title</span>
                <input
                  id="assignment-title"
                  required
                  type="text"
                  value={assignment.title}
                  onChange={e => setAssignment({...assignment, title: e.target.value})}
                  className="w-full bg-ink border border-rule-dark rounded-[2px] px-3.5 py-2 text-paper text-sm focus:outline-none focus:border-verdigris font-mono"
                  placeholder="e.g. Complete Titration Lab"
                />
              </div>
              <div>
                <span className="block text-xs font-mono text-chalk uppercase mb-1.5">Subject</span>
                <select
                  id="assignment-subject"
                  value={assignment.subject}
                  onChange={e => setAssignment({...assignment, subject: e.target.value})}
                  className="w-full bg-ink border border-rule-dark rounded-[2px] px-3.5 py-2 text-paper text-sm focus:outline-none focus:border-verdigris font-mono"
                >
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Biology</option>
                  <option>Math</option>
                  <option>CS</option>
                </select>
              </div>
              <div>
                <span className="block text-xs font-mono text-chalk uppercase mb-1.5">Due Date</span>
                <input
                  id="assignment-due-date"
                  required
                  type="date"
                  value={assignment.dueDate}
                  onChange={e => setAssignment({...assignment, dueDate: e.target.value})}
                  className="w-full bg-ink border border-rule-dark rounded-[2px] px-3.5 py-2 text-paper text-sm focus:outline-none focus:border-verdigris font-mono"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-[2px] text-chalk font-mono text-xs border border-rule-dark hover:text-paper hover:bg-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-[2px] bg-verdigris hover:bg-verdigris-deep text-paper font-medium text-xs transition-colors"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
