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
    <div className="min-h-screen pt-24 pb-20 px-6 md:px-12 lg:px-20 bg-ink text-paper">
      <div className="max-w-6xl mx-auto">
        <MotionDiv initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-10 pb-6 border-b border-rule-dark">
          <Link to="/subjects" className="text-xs font-mono text-chalk hover:text-paper transition-colors mb-3 inline-block">
            ← {t.subjectBack}
          </Link>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-[2px] bg-ink border border-rule-dark flex items-center justify-center text-verdigris shrink-0">
              <subject.icon size={24} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-normal text-paper tracking-tight">{translatedName}</h1>
              <p className="text-xs font-mono text-chalk mt-1">
                {subject.labs.length} {t.subjectsExperiments.toLowerCase()} • {t.subjectKarnatakaPuc}
              </p>
            </div>
          </div>
        </MotionDiv>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          {/* Difficulty filter */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <Filter size={13} className="text-chalk" />
            <span className="text-chalk uppercase tracking-wider">{t.subjectDifficulty}:</span>
            {difficultyOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={`px-3 py-1 rounded-[2px] border transition-colors ${
                  difficulty === opt.value
                    ? 'bg-ink-2 text-paper border-rule-dark underline underline-offset-4 decoration-verdigris font-medium'
                    : 'text-chalk border-rule-dark/50 hover:text-paper hover:bg-ink-2'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Standard filter */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-chalk uppercase tracking-wider">{t.subjectStandard}:</span>
            {standardOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStandard(opt.value)}
                className={`px-3 py-1 rounded-[2px] border transition-colors ${
                  standard === opt.value
                    ? 'bg-ink-2 text-paper border-rule-dark underline underline-offset-4 decoration-verdigris font-medium'
                    : 'text-chalk border-rule-dark/50 hover:text-paper hover:bg-ink-2'
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
            <Link key={lab.id} to={`/subjects/${subject.id}/${lab.id}`} className="group">
              <GlassCard color={subject.color} className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-[2px] bg-ink border border-rule-dark text-paper">
                      {diffLabelMap[lab.difficulty] || lab.difficulty}
                    </span>
                    <div className="flex items-center gap-1.5 text-chalk">
                      <Clock size={12} /> <span>{lab.duration}</span>
                      {experimentVideos[lab.id] && (
                        <span title="Video available" className="ml-1 text-verdigris">
                          <PlayCircle size={13} strokeWidth={1.5} />
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base font-display font-medium text-paper mb-2 group-hover:text-verdigris transition-colors">{lab.title}</h3>
                  <p className="text-xs text-chalk mb-4 line-clamp-2 leading-relaxed">{lab.description}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-rule-dark/60 text-xs font-mono">
                  <span className="text-chalk/80">{lab.category}</span>
                  <span className="font-medium text-verdigris flex items-center gap-1 group-hover:underline">
                    {t.subjectOpenLab} <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-chalk py-12 font-mono text-sm">{t.subjectNoExperiments}</p>
        )}
      </div>
    </div>
  );
};

export default SubjectView;
