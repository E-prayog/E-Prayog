import React, { useState, useRef, useEffect } from 'react';
import EprayogLogo from '../components/EprayogLogo';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../constants';
import SimulationStage from '../components/SimulationStage';
import { useAuth } from '../services/AuthContext';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { logActivity } from '../services/activityService';
import { trackLabVisit, trackTabCompleted, trackQuizScore } from '../services/labProgressService';
import {
  ArrowLeft, ArrowRight, Target, BookOpen, ListChecks, Info, Youtube,
  FlaskConical, ClipboardList, CheckCircle2, Globe, HelpCircle, Brain,
  Printer, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { m as motion } from 'framer-motion';
import { useLang } from '../services/LanguageContext';
import { quizData } from '../data/quizData';
import { subscribeToLabQuiz, getDefaultQuizQuestions } from '../services/quizService';


const MotionDiv = motion.div as any;

type Tab = 'aim' | 'procedure' | 'instructions' | 'simulation' | 'observation' | 'result' | 'realworld' | 'viva' | 'quiz';

const LabView: React.FC = () => {
  const { t } = useLang();

  const TABS = [
    { id: 'aim' as Tab,          label: t.tabAim,          icon: <Target size={14} />,       shortLabel: t.labAimHeading },
    { id: 'procedure' as Tab,    label: t.tabProcedure,    icon: <ListChecks size={14} />,   shortLabel: t.tabProcedure },
    { id: 'instructions' as Tab, label: t.tabInstructions, icon: <Youtube size={14} />,      shortLabel: 'Info' },
    { id: 'simulation' as Tab,   label: t.tabSimulation,   icon: <FlaskConical size={14} />, shortLabel: t.tabSimulation },
    { id: 'observation' as Tab,  label: t.tabObservation,  icon: <ClipboardList size={14} />, shortLabel: t.tabObservation },
    { id: 'result' as Tab,       label: t.tabResult,       icon: <CheckCircle2 size={14} />, shortLabel: t.tabResult },
    { id: 'realworld' as Tab,    label: t.tabRealWorld,    icon: <Globe size={14} />,        shortLabel: t.tabRealWorld },
    { id: 'viva' as Tab,         label: t.tabViva,         icon: <HelpCircle size={14} />,   shortLabel: 'Viva' },
    { id: 'quiz' as Tab,         label: t.tabQuiz,         icon: <Brain size={14} />,        shortLabel: t.tabQuiz },
  ];
  const { subjectId, labId } = useParams<{ subjectId: string; labId: string }>();
  const navigate = useNavigate();
  const [tabIdx, setTabIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  // Track tab completion + scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tabIdx]);
  
  const [vivaRevealed, setVivaRevealed] = useState<Set<number>>(new Set());
  const [vivaRating, setVivaRating] = useState<Record<number, 'knew' | 'unsure' | 'missed'>>({});
  const [shuffledViva, setShuffledViva] = useState<any[]>([]);

  const printRef = useRef<HTMLDivElement>(null);
  const { user, profileData } = useAuth();

  const subject = SUBJECTS.find(s => s.id === subjectId);
  const lab = subject?.labs.find(l => l.id === labId);
  const labContent = lab?.content;

  // Use effect to initialize shuffled viva
  React.useEffect(() => {
    if (labContent?.vivaQuestions) {
      setShuffledViva([...labContent.vivaQuestions]);
    }
  }, [labContent]);

  // Track lab visit on mount (after lab is resolved)
  useEffect(() => {
    if (subjectId && labId && lab) {
      trackLabVisit(labId, subjectId, lab.title);
    }
  }, [subjectId, labId, lab?.title]);

  // Track tab completion on tab change
  useEffect(() => {
    if (subjectId && labId && lab) {
      trackTabCompleted(labId, subjectId, TABS[tabIdx]?.id || '');
    }
  }, [tabIdx, subjectId, labId, lab?.id]);

  if (!subject || !lab) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center text-white text-xl">
        {t.labExperimentNotFound}
      </div>
    );
  }

  const content = lab.content;
  const activeTab = TABS[tabIdx];

  const goNext = () => {
    if (tabIdx < TABS.length - 1) {
      setTabIdx(tabIdx + 1);
    } else {
      navigate(`/subjects/${subjectId}`);
    }
  };
  const goPrev = () => { if (tabIdx > 0) setTabIdx(tabIdx - 1); };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${lab.title} - Observation | E-Prayog</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #0f172a; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; color: #475569; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f1f5f9; font-weight: 600; }
        .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; }
        .result-box { margin-top: 30px; padding: 16px; border: 2px solid #10b981; border-radius: 8px; }
        .result-box h3 { font-size: 14px; margin-bottom: 8px; }
        input { width: 100%; border: none; border-bottom: 1px dotted #94a3b8; padding: 4px 0; font-size: 13px; }
      </style></head><body>
      <h1>${lab.title}</h1>
      <h2>${subject.name}: Karnataka PUC | E-Prayog Virtual Lab</h2>
      ${printRef.current.innerHTML}
      <div class="result-box">
        <h3>Result / Conclusion:</h3>
        <input placeholder="Write your result here..." /><br/><br/>
        <input placeholder="" /><br/><br/>
        <input placeholder="" />
      </div>
      <div class="footer">
        Printed from E-Prayog (ಇ-ಪ್ರಯೋಗ) - Virtual Science Lab for Karnataka PUC<br/>
        Student Name: __________________ | Date: __________________ | Section: __________________
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Real-time Quiz Questions (dynamic from Firestore custom quiz or standard defaults)
  const [quizQuestions, setQuizQuestions] = useState<any[]>(() => {
    return labId ? getDefaultQuizQuestions(labId).map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctIndex: typeof q.correctAnswer === 'number' ? q.correctAnswer : (q as any).correctIndex ?? 0,
      explanation: q.explanation,
      level: q.level,
      hint: q.hint,
    })) : [];
  });
  const [isCustomQuiz, setIsCustomQuiz] = useState<boolean>(false);

  useEffect(() => {
    if (!labId) return;
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    const unsub = subscribeToLabQuiz(labId, (qs, custom) => {
      setQuizQuestions(qs.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: typeof q.correctAnswer === 'number' ? q.correctAnswer : (q as any).correctIndex ?? 0,
        explanation: q.explanation,
        level: q.level,
        hint: q.hint,
      })));
      setIsCustomQuiz(custom);
    });
    return () => unsub();
  }, [labId]);

  const handleQuizSubmit = async () => {
    let score = 0;
    quizQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.correctIndex) score++;
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    // Track quiz score in lab progress
    if (subjectId && labId) {
      trackQuizScore(labId, subjectId, score, quizQuestions.length);
    }
    
    if (user) {
      try {
        // Calculate cognitive level breakdown for Teacher Dashboard
        const levelBreakdown: Record<string, { correct: number; total: number }> = {};
        quizQuestions.forEach(q => {
          const lvl = (q as any).level || 'Cognitive';
          if (!levelBreakdown[lvl]) {
            levelBreakdown[lvl] = { correct: 0, total: 0 };
          }
          levelBreakdown[lvl].total++;
          if (quizAnswers[q.id] === q.correctIndex) {
            levelBreakdown[lvl].correct++;
          }
        });

        // Write to quizAttempts for Teacher Dashboard analytics
        const attemptId = `${user.uid}_${lab.id}_${Date.now()}`;
        await setDoc(doc(db, 'quizAttempts', attemptId), {
          userId: user.uid,
          userName: profileData?.full_name || profileData?.name || user.displayName || user.email || 'Student',
          experimentId: lab.id,
          experimentName: lab.title,
          subject: subject.name,
          score: Math.round((score / quizQuestions.length) * 100),
          totalQuestions: quizQuestions.length,
          correctAnswers: score,
          attemptedAt: new Date().toISOString(),
          levelBreakdown,
          teacherId: profileData?.teacherUid || profileData?.teacherCode || profileData?.teacher_code || ''
        });

        // Write to legacy quiz_scores collection for compatibility
        await setDoc(doc(db, 'quiz_scores', `${user.uid}_${lab.id}`), {
          user_id: user.uid,
          lab_id: lab.id,
          score,
          total: quizQuestions.length,
          completed_at: new Date().toISOString()
        }, { merge: true });

        await logActivity({
          type: 'quiz_completed',
          actorUid: user.uid,
          actorName: user.displayName || '',
          actorEmail: user.email || '',
          actorRole: 'Student',
          metadata: {
            labId: lab.id,
            labTitle: lab.title,
            subjectId: subject.id,
            score,
            total: quizQuestions.length,
            percentage: Math.round((score / quizQuestions.length) * 100),
          },
          visibility: 'both',
        });
      } catch (e) {
         console.warn('Firebase save error:', e);
      }
    }
  };

  const handleShuffleViva = () => {
    setShuffledViva([...shuffledViva].sort(() => Math.random() - 0.5));
    setVivaRevealed(new Set());
    setVivaRating({});
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to={`/subjects/${subject.id}`} className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1 mb-3">
            <ArrowLeft size={14} /> {t.labBackTo} {subject.name}
          </Link>
          <div className="flex items-center gap-3">
            <EprayogLogo size={52} idSuffix={lab.id} />
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-semibold text-white">{lab.title}</h1>
              <p className="text-sm text-zinc-400">{lab.category} • {lab.difficulty} • {lab.duration}</p>
            </div>
          </div>
        </div>

        {/* Step Indicator (numbered tabs) */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {TABS.map((tab, idx) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabIdx(idx)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border
                ${tabIdx === idx
                  ? 'bg-white/10 text-white border-white/20 shadow-lg'
                  : tabIdx > idx
                    ? 'text-emerald-400/60 border-emerald-500/10 bg-emerald-500/5'
                    : 'text-zinc-500 border-transparent hover:text-white hover:bg-white/5'
                }`}
            >
              <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                tabIdx === idx ? 'bg-white/20 text-white' : tabIdx > idx ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-600'
              }`}>
                {tabIdx > idx ? '✓' : idx + 1}
              </span>
              <span className="hidden sm:inline">{tab.shortLabel}</span>
              {tab.icon}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <MotionDiv key={activeTab.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>

          {/* 1. AIM & THEORY */}
          {activeTab.id === 'aim' && content && (
            <div className="glass-panel rounded-2xl p-8 space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Target size={18} style={{ color: subject.hex }} /> {t.labAimHeading}
                </h3>
                <p className="text-zinc-300">{content.aim}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{t.labRequirements}</h3>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  {content.requirements.map(r => <li key={r}>{r}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <BookOpen size={18} style={{ color: subject.hex }} /> {t.labTheory}
                </h3>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{content.theory}</p>
              </div>
              {content.objectives?.length > 0 && (
                <div>
                <h3 className="text-lg font-semibold text-white mb-2">{t.labObjectives}</h3>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1">
                    {content.objectives.map(o => <li key={o}>{o}</li>)}
                  </ul>
                </div>
              )}
              {content.safety && content.safety.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">{t.labSafetyPrecautions}</h3>
                  <ul className="list-disc list-inside text-red-300/80 text-sm space-y-1">
                    {content.safety.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 2. PROCEDURE */}
          {activeTab.id === 'procedure' && content && (
            <div className="glass-panel rounded-2xl p-8 max-w-4xl">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ListChecks size={18} style={{ color: subject.hex }} /> {t.labProcedureHeading}
              </h3>
              <ol className="space-y-3">
                {content.procedure.map((step, i) => (
                  <li key={step} className="flex gap-3 items-start text-zinc-300">
                    <span className="size-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${subject.hex}20`, color: subject.hex }}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 3. INSTRUCTIONS & YOUTUBE */}
          {activeTab.id === 'instructions' && content && (
            <div className="glass-panel rounded-2xl p-8 max-w-4xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Info size={18} style={{ color: subject.hex }} /> {t.labInstructionsHeading}
                </h3>
                {content.instructions && content.instructions.length > 0 ? (
                  <ul className="space-y-2">
                    {content.instructions.map(inst => (
                      <li key={inst} className="flex gap-2 items-start text-zinc-300 text-sm">
                        <span className="text-amber-400 mt-0.5">•</span> {inst}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2 text-zinc-400 text-sm">
                    <p>• Read the aim and theory before starting the simulation.</p>
                    <p>• Follow the procedure step-by-step.</p>
                    <p>• Record all readings in the observation table carefully.</p>
                    <p>• Calculate the result and compare with the expected value.</p>
                    <p>• Answer the viva questions and attempt the quiz for self-assessment.</p>
                  </div>
                )}
              </div>

              {/* YouTube Video */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Youtube size={18} className="text-red-500" /> {t.labVideoDemo}
                </h3>
                {content.videoId ? (
                  <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                    <iframe
                      src={`https://www.youtube.com/embed/${content.videoId}`}
                      title={`${lab.title} - Video Demo`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-col gap-3">
                    <Youtube size={48} className="text-zinc-700" />
                    <p className="text-sm text-zinc-500">{t.labVideoComingSoon}</p>
                    <a
                      href={`https://www.youtube.com/results?search_query=Karnataka+PUC+${encodeURIComponent(lab.title)}+experiment`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {t.labSearchYouTube} <ArrowRight size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. SIMULATION */}
          {activeTab.id === 'simulation' && (
            <div className="min-h-[500px]">
              <SimulationStage labId={lab.id} hex={subject.hex} />
            </div>
          )}

          {/* 5. OBSERVATION (printable) */}
          {activeTab.id === 'observation' && content?.observationTable && (
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ClipboardList size={18} style={{ color: subject.hex }} /> {t.labObservationTable}
                </h3>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 text-sm font-bold hover:bg-amber-500/25 transition-all">
                  <Printer size={14} /> {t.labPrintObservation}
                </button>
              </div>
              <div ref={printRef} className="glass-panel rounded-2xl p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {content.observationTable.columns.map(col => (
                        <th key={col} className="text-left py-2 px-3 text-zinc-400 border-b border-white/10 font-bold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: content.observationTable.rows || 5 }).map((_, row) => (
                      <tr key={row} className="border-b border-white/5">
                        {content.observationTable!.columns.map((_, col) => (
                          <td key={col} className="py-2 px-3">
                            <input
                              type="text"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab.id === 'observation' && (!content || !content.observationTable) && (
            <div className="glass-panel rounded-2xl p-8 max-w-4xl text-center">
              <ClipboardList size={48} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400">{t.labNoObservation}</p>
            </div>
          )}

          {/* 6. RESULT */}
          {activeTab.id === 'result' && (
            <div className="glass-panel rounded-2xl p-8 max-w-4xl space-y-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircle2 size={18} style={{ color: subject.hex }} /> {t.labResultConclusion}
              </h3>
              {content?.result ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-emerald-300 leading-relaxed">{content.result}</p>
                </div>
              ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                  <p className="text-zinc-400 text-sm mb-2">{t.labExpectedResultFormat}</p>
                  <p className="text-emerald-300/80 text-sm">
                    Based on your observations, write the result matching the aim of the experiment.
                    Compare your experimental value with the theoretical/standard value and calculate percentage error.
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">{t.labYourResult}</h4>
                <textarea
                  rows={4}
                  placeholder={t.labWriteResult}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-zinc-500 font-bold block mb-1">{t.labExperimentalValue}</span>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" placeholder="e.g., 9.72 m/s²" />
                </div>
                <div>
                  <span className="text-xs text-zinc-500 font-bold block mb-1">{t.labPercentageError}</span>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" placeholder="e.g., 0.8%" />
                </div>
              </div>
            </div>
          )}

          {/* 7. REAL WORLD */}
          {activeTab.id === 'realworld' && (
            <div className="glass-panel rounded-2xl p-8 max-w-4xl space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe size={18} style={{ color: subject.hex }} /> {t.labRealWorldApps}
              </h3>
              {content?.realWorldApplications && content.realWorldApplications.length > 0 ? (
                <ul className="space-y-3">
                  {content.realWorldApplications.map((app, i) => (
                    <li key={app} className="flex gap-3 items-start">
                      <span className="size-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-white/5">
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][i % 8]}
                      </span>
                      <p className="text-zinc-300 text-sm leading-relaxed pt-1">{app}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3">
                  <p className="text-zinc-400 text-sm">
                    {t.labRealWorldDefault} <strong className="text-white">{lab.title}</strong>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'Engineering and manufacturing quality control',
                      'Scientific research and laboratory measurements',
                      'Medical and pharmaceutical applications',
                      'Everyday technology and practical uses',
                    ].map((app, i) => (
                      <div key={app} className="bg-white/5 rounded-xl p-3 flex items-center gap-2">
                        <span className="text-lg">{['1', '2', '3', '4'][i]}</span>
                        <span className="text-sm text-zinc-400">{app}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. VIVA */}
          {activeTab.id === 'viva' && content?.vivaQuestions && shuffledViva.length > 0 && (
            <div className="max-w-4xl space-y-6">
              <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                    <HelpCircle size={18} style={{ color: subject.hex }} /> {t.labInteractiveViva}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-48 h-1.5 bg-black/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(vivaRevealed.size / shuffledViva.length) * 100}%`, background: subject.hex }} />
                    </div>
                    <span className="text-xs text-zinc-400 font-bold">{vivaRevealed.size} / {shuffledViva.length} {t.labRevealed}</span>
                  </div>
                </div>
                <button 
                  onClick={handleShuffleViva}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors"
                >
                  {t.labShuffleQuestions}
                </button>
              </div>

              {shuffledViva.map((vq, i) => {
                const isRevealed = vivaRevealed.has(i);
                const rating = vivaRating[i];
                const borderColor = rating === 'knew' ? 'border-green-500/50' : rating === 'unsure' ? 'border-amber-500/50' : rating === 'missed' ? 'border-red-500/50' : 'border-white/10';
                
                return (
                  <div key={vq.question} className={`glass-panel rounded-2xl p-6 transition-all border ${borderColor}`}>
                    <div className="flex items-start gap-4 mb-4">
                      <span className="size-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0" style={{ background: `${subject.hex}20`, color: subject.hex }}>
                        Q{i + 1}
                      </span>
                      <h4 className="text-white font-medium text-lg leading-snug pt-1">{vq.question}</h4>
                    </div>
                    
                    {!isRevealed ? (
                      <div className="ml-12 mt-4">
                        <button 
                          onClick={() => setVivaRevealed(new Set(vivaRevealed).add(i))}
                          className="px-6 py-2 rounded-xl border border-blue-500/50 text-blue-400 font-bold text-sm hover:bg-blue-500/10 transition-colors"
                        >
                          {t.labRevealAnswer}
                        </button>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="ml-12">
                        <div className="p-4 rounded-xl bg-black/20 text-zinc-300 leading-relaxed mb-4 border border-white/5">
                          {vq.answer}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-zinc-500 font-bold uppercase mr-2">{t.labHowDidYouDo}</span>
                          <button onClick={() => setVivaRating({...vivaRating, [i]: 'knew'})} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${rating === 'knew' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{t.labKnew}</button>
                          <button onClick={() => setVivaRating({...vivaRating, [i]: 'unsure'})} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${rating === 'unsure' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{t.labUnsure}</button>
                          <button onClick={() => setVivaRating({...vivaRating, [i]: 'missed'})} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${rating === 'missed' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{t.labMissed}</button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}

              {vivaRevealed.size === shuffledViva.length && shuffledViva.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border border-white/10 mt-8 flex flex-col items-center">
                  <h3 className="text-white font-semibold text-lg mb-4">{t.labPracticeSummary}</h3>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center bg-green-500/10 p-4 rounded-xl border border-green-500/20 min-w-[100px]">
                      <span className="text-2xl font-bold text-green-400">{Object.values(vivaRating).filter(r => r === 'knew').length}</span>
                      <span className="text-xs text-green-300/70 font-bold uppercase mt-1">{t.labKnew}</span>
                    </div>
                    <div className="flex flex-col items-center bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 min-w-[100px]">
                      <span className="text-2xl font-bold text-amber-400">{Object.values(vivaRating).filter(r => r === 'unsure').length}</span>
                      <span className="text-xs text-amber-300/70 font-bold uppercase mt-1">{t.labUnsure}</span>
                    </div>
                    <div className="flex flex-col items-center bg-red-500/10 p-4 rounded-xl border border-red-500/20 min-w-[100px]">
                      <span className="text-2xl font-bold text-red-400">{Object.values(vivaRating).filter(r => r === 'missed').length}</span>
                      <span className="text-xs text-red-300/70 font-bold uppercase mt-1">{t.labMissed}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
          {activeTab.id === 'viva' && (!content?.vivaQuestions || content.vivaQuestions.length === 0) && (
            <div className="glass-panel rounded-2xl p-8 max-w-4xl text-center">
              <HelpCircle size={48} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400">{t.labNoViva}</p>
            </div>
          )}

          {/* 9. QUIZ */}
          {activeTab.id === 'quiz' && (
            <div className="glass-panel rounded-2xl p-8 max-w-4xl space-y-6">
              
              {quizSubmitted && quizQuestions.length > 0 && (
                <div className={`p-6 rounded-2xl border mb-8 text-center flex flex-col items-center gap-2 ${
                  quizScore >= quizQuestions.length * 0.7 ? 'bg-green-500/10 border-green-500/30' :
                  quizScore >= quizQuestions.length * 0.4 ? 'bg-amber-500/10 border-amber-500/30' :
                  'bg-red-500/10 border-red-500/30'
                }`}>
                  <h2 className="text-lg font-semibold text-white mb-2">{t.labQuizCompleted}</h2>
                  <div className={`text-5xl font-black ${
                    quizScore >= quizQuestions.length * 0.7 ? 'text-green-400' :
                    quizScore >= quizQuestions.length * 0.4 ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {quizScore} / {quizQuestions.length}
                  </div>
                  <p className="text-zinc-400 font-medium">({Math.round((quizScore / quizQuestions.length) * 100)}%)</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Brain size={18} style={{ color: subject.hex }} /> {t.labSelfAssessmentQuiz}
                </h3>
                {!quizSubmitted && quizQuestions.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-zinc-400 font-bold">{Object.keys(quizAnswers).length} / {quizQuestions.length} {t.labAnswered}</div>
                    <div className="w-24 h-1.5 bg-black/30 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${(Object.keys(quizAnswers).length / quizQuestions.length) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {quizQuestions.length > 0 ? (
                <>
                  {quizQuestions.map((q, idx) => (
                    <div key={q.id} className={`bg-white/5 rounded-xl p-5 border transition-all ${
                      quizSubmitted && quizAnswers[q.id] === q.correctIndex ? 'border-green-500/30' :
                      quizSubmitted && quizAnswers[q.id] !== q.correctIndex ? 'border-red-500/30' :
                      'border-transparent'
                    }`}>
                      <div className="flex items-start gap-4 mb-4">
                        <span className="size-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0" style={{ background: `${subject.hex}20`, color: subject.hex }}>
                          Q{idx + 1}
                        </span>
                        <p className="text-white font-medium text-lg leading-snug pt-1">{q.question}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 ml-12">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = quizAnswers[q.id] === optIdx;
                          const isCorrect = quizSubmitted && optIdx === q.correctIndex;
                          const isWrong = quizSubmitted && isSelected && optIdx !== q.correctIndex;
                          
                          let btnClass = 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white';
                          if (quizSubmitted) {
                            if (isCorrect) btnClass = 'bg-green-500/20 border border-green-500/50 text-green-300';
                            else if (isWrong) btnClass = 'bg-red-500/20 border border-red-500/50 text-red-300';
                            else btnClass = 'bg-black/20 border border-transparent text-zinc-500 opacity-50';
                          } else if (isSelected) {
                            btnClass = 'bg-blue-600/20 border-l-4 border-y border-r border-blue-500 text-white';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => { if (!quizSubmitted) setQuizAnswers({ ...quizAnswers, [q.id]: optIdx }); }}
                              disabled={quizSubmitted}
                              className={`text-left px-5 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${btnClass}`}
                            >
                              <span className={`size-6 rounded-md flex items-center justify-center text-xs font-bold ${
                                quizSubmitted && isCorrect ? 'bg-green-500' :
                                quizSubmitted && isWrong ? 'bg-red-500' :
                                isSelected ? 'bg-blue-500 text-white' : 'bg-black/30'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      
                      {quizSubmitted && q.explanation && (
                        <div className="ml-12 mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <p className="text-sm text-blue-300"><span className="font-bold mr-1">{t.labExplanation}</span> {q.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-center pt-4">
                    {!quizSubmitted ? (
                      <button
                        onClick={handleQuizSubmit}
                        disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                        className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-30 disabled:scale-100 hover:scale-105"
                      >
                        {t.labSubmitQuiz}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(0); }}
                        className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
                      >
                        {t.labRetakeQuiz}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center border border-white/5">
                  <Brain size={48} className="text-zinc-700 mb-4" />
                  <p className="text-zinc-400 font-medium">{t.labNoQuiz}</p>
                </div>
              )}
            </div>
          )}
        </MotionDiv>

        {/* Navigation: Previous / Next */}
        <div className="flex items-center justify-between mt-8 max-w-4xl">
          <button
            type="button"
            onClick={goPrev}
            disabled={tabIdx === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold transition-all hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> {tabIdx > 0 ? TABS[tabIdx - 1].label : t.labPrevious}
          </button>

          <span className="text-xs text-zinc-500 font-mono">
            {tabIdx + 1} / {TABS.length}
          </span>

          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ background: `${subject.hex}20`, color: subject.hex, borderColor: `${subject.hex}30`, borderWidth: 1 }}
          >
            {tabIdx < TABS.length - 1 ? TABS[tabIdx + 1].label : t.labFinish} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabView;
