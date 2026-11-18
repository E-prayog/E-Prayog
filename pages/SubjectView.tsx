import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SUBJECTS } from '../constants';
import GlassCard from '../components/GlassCard';
import { ArrowRight, Clock, Filter, PlayCircle } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { useLang } from '../services/LanguageContext';
import { experimentVideos } from '../data/experimentVideos';

const MotionDiv = motion.div as any;

const SubjectView: React.FC = () => {
  const { t } = useLang();
  const { subjectId } = useParams<{ subjectId: string }>();
  const subject = SUBJECTS.find(s => s.id === subjectId);
  const [difficulty, setDifficulty] = useState<string>('All');
  const [standard, setStandard] = useState<string>('All');

  if (!subject) return <div className="min-h-screen pt-24 flex items-center justify-center text-white text-xl">{t.subjectNotFound}</div>;

  // Translated subject names and descriptions
  const subjectNameMap: Record<string, string> = {
    physics: t.namePhysics,
    chemistry: t.nameChemistry,
    biology: t.nameBiology,
    math: t.nameMath,
    cs: t.nameCS,
  };
  const translatedName = subjectNameMap[subject.id] || subject.name;

  // Difficulty filter options with translated labels
  const difficultyOptions = [
    { value: 'All',    label: t.subjectAll },
    { value: 'Easy',   label: t.diffEasy },
    { value: 'Medium', label: t.diffMedium },
    { value: 'Hard',   label: t.diffHard },
  ];

  // Standard filter options with translated labels
  const standardOptions = [
    { value: 'All',                   label: t.subjectAll },
    { value: '1st PUC / Class 11',    label: t.std1stPuc },
    { value: '2nd PUC / Class 12',    label: t.std2ndPuc },
  ];

  // Difficulty badge colours + translated display text
  const diffColors: Record<string, string> = {
    Easy:   'text-emerald-400 bg-emerald-500/10',
    Medium: 'text-amber-400 bg-amber-500/10',
    Hard:   'text-red-400 bg-red-500/10',
  };
  const diffLabelMap: Record<string, string> = {
    Easy:   t.diffEasy,
    Medium: t.diffMedium,
    Hard:   t.diffHard,
  };

  const filtered = subject.labs.filter(lab => {
    if (difficulty !== 'All' && lab.difficulty !== difficulty) return false;
    if (standard !== 'All' && !lab.standards?.includes(standard as any)) return false;
    return true;
  });

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Link to="/subjects" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors mb-4 inline-block">
            ← {t.subjectBack}
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="size-14 rounded-2xl flex items-center justify-center" style={{ background: `${subject.hex}15` }}>
              <subject.icon size={28} style={{ color: subject.hex }} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-white">{translatedName}</h1>
              <p className="text-zinc-400 text-sm">
                {subject.labs.length} {t.subjectsExperiments.toLowerCase()} • {t.subjectKarnatakaPuc}
              </p>
            </div>
          </div>
        </MotionDiv>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          {/* Difficulty filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-500 uppercase font-bold">{t.subjectDifficulty}:</span>
            {difficultyOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  difficulty === opt.value
                    ? 'bg-white/10 text-white border-white/20'
                    : 'text-zinc-500 border-white/5 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Standard filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase font-bold">{t.subjectStandard}:</span>
            {standardOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStandard(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  standard === opt.value
                    ? 'bg-white/10 text-white border-white/20'
                    : 'text-zinc-500 border-white/5 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lab cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((lab) => (
            <Link key={lab.id} to={`/subjects/${subject.id}/${lab.id}`}>
              <GlassCard color={subject.color} className="h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diffColors[lab.difficulty] || ''}`}>
                    {diffLabelMap[lab.difficulty] || lab.difficulty}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock size={12} /> {lab.duration}
                    {experimentVideos[lab.id] && (
                      <span title="Video available" className="ml-1 text-red-400">
                        <PlayCircle size={12} strokeWidth={1.5} />
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{lab.title}</h3>
                <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{lab.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 bg-white/5 rounded-full px-2 py-0.5">{lab.category}</span>
                  <span className="text-sm font-bold flex items-center gap-1" style={{ color: subject.hex }}>
                    {t.subjectOpenLab} <ArrowRight size={14} />
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 py-12">{t.subjectNoExperiments}</p>
        )}
      </div>
    </div>
  );
};

export default SubjectView;
