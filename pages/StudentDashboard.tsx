import React from 'react';
import { useAuth } from '../services/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { FlaskConical, BookOpen, GraduationCap, TrendingUp, ArrowRight, Zap, Dna, Calculator, Monitor, Clock, Sigma, Cpu, Table2, Hash, ShieldCheck, Microscope, Flame } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { SUBJECTS, findLabById, getSubjectLabIds, SUBJECT_LAB_COUNTS } from '../constants';

const SUBJECT_ICONS: Record<string, React.ReactNode> = {
  physics: <Zap size={22} />,
  chemistry: <FlaskConical size={22} />,
  biology: <Dna size={22} />,
  math: <Calculator size={22} />,
  cs: <Monitor size={22} />,
};

const StudentDashboard: React.FC = () => {
  const { user, profileData, loading } = useAuth();
  const navigate = useNavigate();

  const progress = profileData?.progress || { physics: 0, chemistry: 0, biology: 0, math: 0, cs: 0 };
  const completedLabs: string[] = profileData?.completedLabs || [];
  const visitedLabs: string[] = profileData?.visitedLabs || [];
  const streak = profileData?.streak || 0;
  const grade = profileData?.grade || 'PUC';
  const displayName = profileData?.name || profileData?.full_name || user?.displayName || 'Student';
  const overallProgress = Math.round(
    ((progress.physics || 0) + (progress.chemistry || 0) + (progress.biology || 0) + (progress.math || 0) + (progress.cs || 0)) / 5
  );

  // Find most recent visited-but-not-completed lab
  const incompleteVisited = visitedLabs.filter(id => !completedLabs.includes(id)).slice(-1)[0];
  const recentLabData = findLabById(incompleteVisited);

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-ink">
        <div className="size-10 border-2 border-chalk/20 border-t-verdigris rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="pt-24 pb-16 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen bg-ink text-paper">
      {/* Welcome Header */}
      <div className="mb-10 pb-6 border-b border-rule-dark flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-chalk block mb-2">Student Dashboard</span>
          <h1 className="text-3xl lg:text-4xl font-display font-normal text-paper mb-2 tracking-tight">
            Welcome back, <span className="text-verdigris">{displayName.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-chalk">Continue your coursework. You have completed {overallProgress}% of the syllabus.</p>
        </div>
        {/* Streak badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-[2px] bg-ink-2 border border-rule-dark shrink-0">
          <Flame size={20} className="text-brass" />
          <div>
            <p className="text-base font-mono font-bold text-paper leading-tight">{streak} day{streak !== 1 ? 's' : ''}</p>
            <p className="text-[10px] text-chalk font-mono uppercase tracking-wider">Streak</p>
          </div>
        </div>
      </div>

      {/* Quick Access Tools */}
      <section className="mb-10">
        <h3 className="text-xs font-mono text-chalk uppercase tracking-widest mb-4">Quick References & Tools</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {[
            { id: 'formula', label: 'Formula Sheet', icon: Sigma, path: '/tools/formula-sheet' },
            { id: 'logic', label: 'Logic Gates', icon: Cpu, path: '/tools/logic-gates' },
            { id: 'periodic', label: 'Periodic Table', icon: Table2, path: '/tools/periodic-table' },
            { id: 'constants', label: 'Constants', icon: Hash, path: '/tools/constants' },
            { id: 'calc', label: 'Calculator', icon: Calculator, path: '/tools/calculator' },
            { id: 'safety', label: 'Safety Guide', icon: ShieldCheck, path: '/tools/safety-guide' },
            { id: 'bio', label: 'Bio Diagrams', icon: Microscope, path: '/tools/bio-diagrams' },
          ].map(tool => (
            <Link key={tool.id} to={tool.path} className="group">
              <div className="rounded-[4px] p-3.5 flex flex-col items-center gap-2.5 bg-ink-2 border border-rule-dark hover:border-chalk/40 transition-colors h-full text-center">
                <div className="size-10 rounded-[2px] flex items-center justify-center bg-ink border border-rule-dark text-chalk group-hover:text-verdigris transition-colors">
                  <tool.icon size={18} />
                </div>
                <span className="text-paper text-xs font-medium leading-tight">{tool.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <GlassCard hoverEffect={false} className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[2px] bg-ink border border-rule-dark text-verdigris"><TrendingUp size={18} /></div>
            <div>
              <div className="text-2xl font-mono font-semibold text-paper">{overallProgress}%</div>
              <div className="text-xs text-chalk font-mono uppercase tracking-wider">Overall Progress</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard hoverEffect={false} className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[2px] bg-ink border border-rule-dark text-verdigris"><FlaskConical size={18} /></div>
            <div>
              <div className="text-2xl font-mono font-semibold text-paper">{completedLabs.length}</div>
              <div className="text-xs text-chalk font-mono uppercase tracking-wider">Labs Completed</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard hoverEffect={false} className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[2px] bg-ink border border-rule-dark text-brass"><BookOpen size={18} /></div>
            <div>
              <div className="text-2xl font-mono font-semibold text-paper">5</div>
              <div className="text-xs text-chalk font-mono uppercase tracking-wider">Subjects</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard hoverEffect={false} className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[2px] bg-ink border border-rule-dark text-brass"><GraduationCap size={18} /></div>
            <div>
              <div className="text-2xl font-mono font-semibold text-paper">{grade || 'PUC'}</div>
              <div className="text-xs text-chalk font-mono uppercase tracking-wider">Grade Level</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Continue Learning + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-display text-paper mb-4 flex items-center gap-2">
            <Clock size={18} className="text-verdigris" />
            <span>Continue Learning</span>
          </h2>
          <GlassCard hoverEffect={false} className="p-6">
            {recentLabData ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-chalk mb-1">Last experiment</p>
                  <h3 className="text-xl font-display text-paper mb-1">{recentLabData.lab.title}</h3>
                  <p className="text-xs text-chalk font-mono capitalize">{recentLabData.subject.name}</p>
                </div>
                <Link
                  to={`/subjects/${recentLabData.subject.id}/${recentLabData.lab.id}`}
                  className="shrink-0 px-5 py-2.5 rounded-[2px] bg-verdigris hover:bg-verdigris-deep text-paper text-sm font-medium transition-colors flex items-center gap-2 self-start sm:self-auto"
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-6">
                <FlaskConical className="text-chalk/40 mb-3" size={36} />
                <p className="text-chalk text-sm mb-4">No unfinished practicals found.</p>
                <Link
                  to="/subjects"
                  className="px-5 py-2.5 rounded-[2px] bg-verdigris hover:bg-verdigris-deep text-paper text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span>Explore Labs</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </GlassCard>
        </div>

        <div>
          <h2 className="text-lg font-display text-paper mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/subjects"
              className="flex items-center gap-3 p-4 rounded-[4px] bg-ink-2 hover:bg-ink-2/80 border border-rule-dark transition-colors group"
            >
              <FlaskConical size={18} className="text-verdigris" />
              <span className="text-paper text-sm font-medium">Browse All Labs</span>
              <ArrowRight size={14} className="ml-auto text-chalk group-hover:text-paper transition-colors" />
            </Link>
            <Link
              to="/tutor"
              className="flex items-center gap-3 p-4 rounded-[4px] bg-ink-2 hover:bg-ink-2/80 border border-rule-dark transition-colors group"
            >
              <Zap size={18} className="text-brass" />
              <span className="text-paper text-sm font-medium">Ask AI Tutor</span>
              <ArrowRight size={14} className="ml-auto text-chalk group-hover:text-paper transition-colors" />
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-3 p-4 rounded-[4px] bg-ink-2 hover:bg-ink-2/80 border border-rule-dark transition-colors group"
            >
              <GraduationCap size={18} className="text-chalk" />
              <span className="text-paper text-sm font-medium">Account Settings</span>
              <ArrowRight size={14} className="ml-auto text-chalk group-hover:text-paper transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Subject Progress Cards */}
      <h2 className="text-lg font-display text-paper mb-4">Subject Progress</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {SUBJECTS.map(subject => {
          const subjectId = subject.id;
          const percentage = Math.min(100, Math.max(0, progress[subjectId] || 0));
          const subjectLabIds = getSubjectLabIds(subjectId);
          const completedCount = completedLabs.filter(id => subjectLabIds.includes(id)).length;
          const totalLabs = SUBJECT_LAB_COUNTS[subjectId] || subject.labs.length;

          return (
            <Link to={`/subjects/${subjectId}`} key={subjectId} className="block group">
              <GlassCard className="p-5 h-full">
                <div className="p-2.5 rounded-[2px] bg-ink border border-rule-dark text-verdigris w-fit mb-3">
                  {SUBJECT_ICONS[subjectId] || <FlaskConical size={20} />}
                </div>
                <h3 className="font-display text-lg text-paper font-normal capitalize mb-1 group-hover:text-verdigris transition-colors">
                  {subject.name}
                </h3>
                <p className="text-xs font-mono text-chalk mb-4">{completedCount}/{totalLabs} completed</p>
                <div className="w-full h-1.5 bg-ink rounded-full overflow-hidden border border-rule-dark mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-verdigris"
                  />
                </div>
                <div className="text-right text-xs font-mono font-medium text-chalk">{percentage}%</div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default StudentDashboard;
