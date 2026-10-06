import React, { useState, useEffect, useMemo } from 'react';
import {
  SUBJECTS,
  findLabById,
} from '../../constants';
import {
  QuizQuestion,
  CognitiveLevel,
} from '../../data/quizData';
import {
  getDefaultQuizQuestions,
  subscribeToLabQuiz,
  saveCustomQuiz,
  resetQuizToDefault,
  subscribeToCustomQuizList,
} from '../../services/quizService';
import { useAuth } from '../../services/AuthContext';
import { logActivity } from '../../services/activityService';
import GlassCard from '../GlassCard';
import {
  Brain,
  Plus,
  Trash2,
  Edit3,
  RotateCcw,
  CheckCircle2,
  Save,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Check,
  X,
  Copy,
  ArrowUpDown,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';

const COGNITIVE_LEVELS: { id: CognitiveLevel; label: string; desc: string; color: string }[] = [
  { id: 'Cognitive', label: 'Cognitive', desc: 'Recall definitions, formulas, units', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'Thinking', label: 'Thinking', desc: 'Application, graph reading, value substitution', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'Reasoning', label: 'Reasoning', desc: 'Why/how phenomena occur, error identification', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'Complexity', label: 'Complexity', desc: 'Multi-step numerical and analytical problems', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'Cognitive Complexity', label: 'Cognitive Complexity', desc: 'Synthesis, evaluation, experiment design', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
];

interface QuestionFormData {
  id?: string;
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation: string;
  level: CognitiveLevel;
  hint: string;
}

const emptyForm: QuestionFormData = {
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  explanation: '',
  level: 'Cognitive',
  hint: '',
};

export const AdminQuizDesigner: React.FC = () => {
  const { user, profileData, role } = useAuth();

  // Selection states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('physics');
  const [selectedLabId, setSelectedLabId] = useState<string>('p1');
  const [customLabIds, setCustomLabIds] = useState<string[]>([]);

  // Active quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');

  // Question Modal (Add / Edit)
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(emptyForm);
  const [formError, setFormError] = useState<string>('');

  // Reset Confirmation Modal
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Subscribe to list of customized labs
  useEffect(() => {
    const unsub = subscribeToCustomQuizList((ids) => {
      setCustomLabIds(ids);
    });
    return () => unsub();
  }, []);

  // Update selectedLabId when subject changes
  const currentSubject = useMemo(
    () => SUBJECTS.find((s) => s.id === selectedSubjectId) || SUBJECTS[0],
    [selectedSubjectId]
  );

  useEffect(() => {
    if (currentSubject.labs.length > 0) {
      const exists = currentSubject.labs.some((l) => l.id === selectedLabId);
      if (!exists) {
        setSelectedLabId(currentSubject.labs[0].id);
      }
    }
  }, [currentSubject, selectedLabId]);

  // Subscribe to the selected lab's quiz in real time
  useEffect(() => {
    if (!selectedLabId) return;
    setLoading(true);
    const unsub = subscribeToLabQuiz(selectedLabId, (qs, custom) => {
      setQuestions(qs);
      setIsCustom(custom);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedLabId]);

  const currentLab = useMemo(
    () => currentSubject.labs.find((l) => l.id === selectedLabId) || currentSubject.labs[0],
    [currentSubject, selectedLabId]
  );

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.options.some((opt) => opt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.explanation && q.explanation.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLevel =
        selectedLevelFilter === 'all' || q.level === selectedLevelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [questions, searchQuery, selectedLevelFilter]);

  // Level statistics
  const levelStats = useMemo(() => {
    const stats: Record<string, number> = {};
    COGNITIVE_LEVELS.forEach((lvl) => {
      stats[lvl.id] = 0;
    });
    questions.forEach((q) => {
      if (stats[q.level] !== undefined) {
        stats[q.level]++;
      } else {
        stats[q.level] = (stats[q.level] || 0) + 1;
      }
    });
    return stats;
  }, [questions]);

  // ── Open Add Modal ──
  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setFormData({
      id: `${selectedLabId}_q${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      level: 'Cognitive',
      hint: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // ── Open Edit Modal ──
  const handleOpenEditModal = (q: QuizQuestion, index: number) => {
    // Find true index in questions array
    const realIndex = questions.findIndex((item) => item.id === q.id);
    setEditingIndex(realIndex !== -1 ? realIndex : index);
    setFormData({
      id: q.id,
      question: q.question,
      options: [
        q.options[0] || '',
        q.options[1] || '',
        q.options[2] || '',
        q.options[3] || '',
      ],
      correctAnswer: (typeof q.correctAnswer === 'number' ? q.correctAnswer : 0) as 0 | 1 | 2 | 3,
      explanation: q.explanation || '',
      level: q.level || 'Cognitive',
      hint: q.hint || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // ── Duplicate Question ──
  const handleDuplicateQuestion = async (q: QuizQuestion) => {
    const newQ: QuizQuestion = {
      ...q,
      id: `${selectedLabId}_q${Date.now()}`,
      question: `${q.question} (Copy)`,
      options: [...q.options] as [string, string, string, string],
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    await persistQuiz(updated, `Duplicated question in ${currentLab.title}`);
  };

  // ── Move Question ──
  const handleMoveQuestion = async (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= questions.length) return;
    const updated = [...questions];
    const temp = updated[fromIndex];
    updated[fromIndex] = updated[toIndex];
    updated[toIndex] = temp;
    setQuestions(updated);
    await persistQuiz(updated, `Reordered questions in ${currentLab.title}`);
  };

  // ── Delete Question ──
  const handleDeleteQuestion = async (qId: string) => {
    const updated = questions.filter((q) => q.id !== qId);
    setQuestions(updated);
    await persistQuiz(updated, `Deleted question from ${currentLab.title}`);
  };

  // ── Save Form Question (Add or Edit) ──
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.question.trim()) {
      setFormError('Question text cannot be empty.');
      return;
    }

    if (formData.options.some((opt) => !opt.trim())) {
      setFormError('All 4 options (A, B, C, D) must have text.');
      return;
    }

    const newQuestion: QuizQuestion = {
      id: formData.id || `${selectedLabId}_q${Date.now()}`,
      question: formData.question.trim(),
      options: [
        formData.options[0].trim(),
        formData.options[1].trim(),
        formData.options[2].trim(),
        formData.options[3].trim(),
      ],
      correctAnswer: formData.correctAnswer,
      explanation: formData.explanation.trim(),
      level: formData.level,
      hint: formData.hint.trim() || undefined,
    };

    let updated: QuizQuestion[];
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < questions.length) {
      updated = [...questions];
      updated[editingIndex] = newQuestion;
    } else {
      updated = [...questions, newQuestion];
    }

    setQuestions(updated);
    setModalOpen(false);
    await persistQuiz(
      updated,
      editingIndex !== null
        ? `Updated question in ${currentLab.title}`
        : `Added new question to ${currentLab.title}`
    );
  };

  // ── Persist to Firestore & Local Storage ──
  const persistQuiz = async (newQuestions: QuizQuestion[], actionDesc: string) => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await saveCustomQuiz(selectedLabId, newQuestions, {
        uid: user?.uid,
        name: profileData?.full_name || profileData?.name || user?.displayName || '',
        email: user?.email || '',
      });

      await logActivity({
        type: 'custom_quiz_updated',
        actorUid: user?.uid || '',
        actorName: profileData?.full_name || profileData?.name || user?.displayName || 'Admin',
        actorEmail: user?.email || '',
        actorRole: role || 'Admin',
        targetName: currentLab.title,
        metadata: {
          labId: selectedLabId,
          subjectId: selectedSubjectId,
          totalQuestions: newQuestions.length,
          actionDesc,
        },
        visibility: 'admin',
      });

      setIsCustom(true);
      setSaveSuccess(`Quiz saved successfully! (${newQuestions.length} questions live)`);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to save quiz:', err);
      setSaveError(err.message || 'Failed to save quiz changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Restore Default Questions ("make it as it is") ──
  const handleConfirmReset = async () => {
    setIsResetting(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await resetQuizToDefault(selectedLabId);
      const defaults = getDefaultQuizQuestions(selectedLabId);
      setQuestions(defaults);
      setIsCustom(false);
      setShowResetConfirm(false);

      await logActivity({
        type: 'custom_quiz_reset',
        actorUid: user?.uid || '',
        actorName: profileData?.full_name || profileData?.name || user?.displayName || 'Admin',
        actorEmail: user?.email || '',
        actorRole: role || 'Admin',
        targetName: currentLab.title,
        metadata: {
          labId: selectedLabId,
          subjectId: selectedSubjectId,
          restoredQuestions: defaults.length,
        },
        visibility: 'admin',
      });

      setSaveSuccess(`Restored original default quiz (${defaults.length} questions) successfully!`);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to reset quiz to default:', err);
      setSaveError(err.message || 'Failed to restore default quiz.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Subject Bar ── */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Brain size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Interactive Quiz Designer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  Admin Control
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Customize, add, modify, or remove questions for any lab experiment. Students receive updates live.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCustom && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all hover:scale-105"
                title="Restore default curriculum quiz"
              >
                <RotateCcw size={14} />
                Restore Default Quiz
              </button>
            )}
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-105"
            >
              <Plus size={15} />
              Add New Question
            </button>
          </div>
        </div>

        {/* ── Subject Selection Pills ── */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            1. Select Subject:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {SUBJECTS.map((sub) => {
              const isSelected = sub.id === selectedSubjectId;
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span
                    className="size-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${sub.hex}25`, color: sub.hex }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="truncate">{sub.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Experiment Selection Grid / Dropdown ── */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            2. Select Experiment ({currentSubject.labs.length} available):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
            {currentSubject.labs.map((lab) => {
              const isSelected = lab.id === selectedLabId;
              const isLabCustom = customLabIds.includes(lab.id);
              return (
                <button
                  key={lab.id}
                  onClick={() => setSelectedLabId(lab.id)}
                  className={`flex items-start justify-between gap-2 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{lab.title}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{lab.duration} • {lab.difficulty}</p>
                  </div>
                  {isLabCustom ? (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Custom
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                      Default
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* ── Alerts & Feedback ── */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>{saveSuccess}</span>
            </div>
            <button onClick={() => setSaveSuccess('')} className="p-1 hover:bg-emerald-500/20 rounded">
              <X size={14} />
            </button>
          </motion.div>
        )}
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-medium flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-400" />
              <span>{saveError}</span>
            </div>
            <button onClick={() => setSaveError('')} className="p-1 hover:bg-rose-500/20 rounded">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Quiz Header & Summary Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Brain size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Total Questions</p>
            <p className="text-xl font-bold text-white">{questions.length}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Quiz Status</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              {isCustom ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Sparkles size={14} /> Customized Live
                </span>
              ) : (
                <span className="text-zinc-300">Standard Default</span>
              )}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <FlaskConical size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400">Active Experiment</p>
            <p className="text-sm font-bold text-white truncate">{currentLab.title}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Cognitive Levels</p>
            <p className="text-xs font-semibold text-zinc-300 mt-0.5">
              {Object.entries(levelStats).filter(([_, count]) => count > 0).length} active tiers
            </p>
          </div>
        </GlassCard>
      </div>

      {/* ── Search & Filter Controls ── */}
      <GlassCard className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, options, or explanations..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedLevelFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedLevelFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            All Levels ({questions.length})
          </button>
          {COGNITIVE_LEVELS.map((lvl) => {
            const count = levelStats[lvl.id] || 0;
            const active = selectedLevelFilter === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevelFilter(lvl.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  active
                    ? `${lvl.color} border font-bold`
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{lvl.label}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* ── Questions List ── */}
      <div className="space-y-4">
        {loading ? (
          <GlassCard className="p-12 text-center text-zinc-400">
            <div className="size-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading quiz questions for {currentLab.title}...</p>
          </GlassCard>
        ) : filteredQuestions.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="size-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-3">
              <Brain size={24} />
            </div>
            <h3 className="text-base font-bold text-white">No Questions Found</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedLevelFilter !== 'all'
                ? 'Try clearing your search or filter to see questions.'
                : 'This experiment currently has no questions. Click "Add New Question" to create one or "Restore Default Quiz".'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
              >
                Add First Question
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              >
                Restore Defaults
              </button>
            </div>
          </GlassCard>
        ) : (
          filteredQuestions.map((q, idx) => {
            const realIdx = questions.findIndex((item) => item.id === q.id);
            const levelInfo =
              COGNITIVE_LEVELS.find((l) => l.id === q.level) || COGNITIVE_LEVELS[0];

            return (
              <GlassCard key={q.id} className="p-5 relative transition-all hover:border-white/20">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span
                      className="size-8 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0"
                      style={{ background: `${currentSubject.hex}25`, color: currentSubject.hex }}
                    >
                      Q{realIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${levelInfo.color}`}
                        >
                          {levelInfo.label}
                        </span>
                        {q.hint && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 flex items-center gap-1">
                            <HelpCircle size={10} /> Has Hint
                          </span>
                        )}
                      </div>
                      <p className="text-white font-medium text-base leading-snug">{q.question}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                    <button
                      onClick={() => handleMoveQuestion(realIdx, 'up')}
                      disabled={realIdx === 0}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors"
                      title="Move Question Up"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(realIdx, 'down')}
                      disabled={realIdx === questions.length - 1}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors"
                      title="Move Question Down"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      onClick={() => handleDuplicateQuestion(q)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="Duplicate Question"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(q, realIdx)}
                      className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit Question"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 ml-0 sm:ml-11">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correctAnswer;
                    return (
                      <div
                        key={optIdx}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                          isCorrect
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-medium'
                            : 'bg-white/5 border-white/5 text-zinc-400'
                        }`}
                      >
                        <span
                          className={`size-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            isCorrect
                              ? 'bg-emerald-500 text-white'
                              : 'bg-black/30 text-zinc-400'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && <Check size={14} className="text-emerald-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation & Hint */}
                {(q.explanation || q.hint) && (
                  <div className="mt-3 ml-0 sm:ml-11 space-y-1.5">
                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                        <span className="font-bold mr-1">Explanation:</span> {q.explanation}
                      </div>
                    )}
                    {q.hint && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                        <HelpCircle size={12} className="shrink-0" />
                        <span><span className="font-semibold">Hint:</span> {q.hint}</span>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })
        )}
      </div>

      {/* ── Modal: Add / Edit Question ── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    {editingIndex !== null ? <Edit3 size={18} /> : <Plus size={18} />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingIndex !== null ? 'Edit Question' : 'Add New Question'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Target: {currentLab.title} ({currentSubject.name})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Question Statement */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Question Statement *
                  </label>
                  <textarea
                    rows={3}
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Enter the question clearly..."
                    className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
                    required
                  />
                </div>

                {/* Cognitive Level Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Cognitive Level
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COGNITIVE_LEVELS.map((lvl) => {
                      const isSelected = formData.level === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, level: lvl.id })}
                          className={`p-2 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? `${lvl.color} border-2 font-bold`
                              : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <p className="font-semibold">{lvl.label}</p>
                          <p className="text-[10px] opacity-70 truncate mt-0.5">{lvl.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4 Options */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Options & Correct Answer * (Select the radio button for the correct option)
                  </label>
                  <div className="space-y-2">
                    {formData.options.map((opt, i) => {
                      const isCorrect = formData.correctAnswer === i;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/40'
                              : 'bg-black/30 border-white/10'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, correctAnswer: i as any })}
                            className={`size-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                              isCorrect
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white'
                            }`}
                            title="Click to mark as correct answer"
                          >
                            {String.fromCharCode(65 + i)}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...formData.options] as [string, string, string, string];
                              newOpts[i] = e.target.value;
                              setFormData({ ...formData, options: newOpts });
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                            required
                          />
                          {isCorrect && (
                            <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/20">
                              Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Explanation (Displayed to student after submission)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="Explain why the answer is correct..."
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Hint */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Hint (Optional helper for students)
                  </label>
                  <input
                    type="text"
                    value={formData.hint}
                    onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                    placeholder="Short hint e.g., Recall standard unit or formula..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <Save size={14} />
                    {editingIndex !== null ? 'Save Question' : 'Add Question'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Confirm Restore Defaults ("make it as it is") ── */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-center"
            >
              <div className="size-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <RotateCcw size={24} />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  Restore Default Curriculum Quiz?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  This will discard custom question modifications for <strong>{currentLab.title}</strong> and restore the original 15 standard Karnataka PUC curriculum questions exactly as they were.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isResetting ? 'Restoring...' : 'Yes, Restore Defaults'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminQuizDesigner;
