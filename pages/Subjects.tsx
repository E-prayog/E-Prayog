import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, FlaskConical, Dna, Calculator, Monitor, ArrowRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { SUBJECTS } from '../constants';
import { m as motion } from 'framer-motion';
import { useLang } from '../services/LanguageContext';
import { SUBJECT_REALISTIC_IMAGES } from '../data/labImages';

const MotionDiv = motion.div as any;
const icons = [Zap, FlaskConical, Dna, Calculator, Monitor];

const Subjects: React.FC = () => {
  const { t } = useLang();

  // Map subject IDs → translated names and descriptions
  const subjectNameMap: Record<string, string> = {
    physics: t.namePhysics,
    chemistry: t.nameChemistry,
    biology: t.nameBiology,
    math: t.nameMath,
    cs: t.nameCS,
  };
  const subjectDescMap: Record<string, string> = {
    physics: t.descPhysics,
    chemistry: t.descChemistry,
    biology: t.descBiology,
    math: t.descMath,
    cs: t.descCS,
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 md:px-12 lg:px-20 bg-ink text-paper">
      <div className="max-w-6xl mx-auto">
        <MotionDiv initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-chalk block mb-2">PUC Practicals</span>
          <h1 className="text-3xl md:text-5xl font-display font-normal text-paper mb-3">
            {t.subjectsTitle}
          </h1>
          <p className="text-chalk max-w-xl mx-auto text-sm leading-relaxed">
            {t.subjectsDesc}
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBJECTS.map((subject, idx) => {
            const Icon = icons[idx] || Zap;
            const translatedName = subjectNameMap[subject.id] || subject.name;
            const translatedDesc = subjectDescMap[subject.id] || subject.description;
            const imgMeta = SUBJECT_REALISTIC_IMAGES[subject.id];

            return (
              <Link key={subject.id} to={`/subjects/${subject.id}`} className="group">
                <GlassCard color={subject.color} className="h-full flex flex-col justify-between overflow-hidden">
                  <div>
                    {/* Realistic Laboratory Photo Banner */}
                    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-[#070D18] border border-sky-500/15 mb-4 group/thumb">
                      <img
                        src={imgMeta?.url}
                        alt={imgMeta?.alt || translatedName}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070D18] via-[#070D18]/30 to-black/20" />

                      {/* Subject Icon Badge */}
                      <div className="absolute top-2.5 left-2.5 size-9 rounded-md bg-[#070D18]/90 backdrop-blur-md border border-sky-500/20 flex items-center justify-center text-sky shadow-md">
                        <Icon size={18} />
                      </div>

                      {/* Experiments Count Badge */}
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-[#070D18]/90 backdrop-blur-md border border-sky-500/20 text-sky-200">
                        {subject.labs.length} {t.subjectsExperiments}
                      </div>

                      {/* Apparatus / Domain caption */}
                      {imgMeta?.caption && (
                        <div className="absolute bottom-2 left-2.5 right-2.5">
                          <span className="text-[10px] font-mono text-slate-300 drop-shadow truncate block">
                            {imgMeta.caption}
                          </span>
                        </div>
                      )}
                    </div>

                    <h2 className="text-xl font-display font-medium text-paper group-hover:text-sky transition-colors mb-2">
                      {translatedName}
                    </h2>
                    <p className="text-xs text-chalk mb-4 leading-relaxed line-clamp-2">{translatedDesc}</p>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {subject.labs.slice(0, 3).map(lab => (
                        <span key={lab.id} className="text-[11px] font-mono text-chalk/80 bg-ink border border-rule-dark rounded-[2px] px-2 py-0.5">{lab.title}</span>
                      ))}
                      {subject.labs.length > 3 && (
                        <span className="text-[11px] font-mono text-chalk/60 px-1 py-0.5">
                          +{subject.labs.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-rule-dark/60 text-xs font-mono font-medium text-sky group-hover:underline">
                    <span>{t.subjectsExplore}</span>
                    <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Subjects;
