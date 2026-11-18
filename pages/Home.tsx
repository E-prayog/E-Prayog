import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  FlaskConical,
  Dna,
  Calculator,
  Monitor,
  ArrowRight,
  Bot,
  ChevronDown,
  Microscope,
  BookOpen,
  BarChart3,
  Smartphone,
  HelpCircle,
} from 'lucide-react';
import { SUBJECTS } from '../constants';
import { useAuth } from '../services/AuthContext';
import { useLang } from '../services/LanguageContext';

const subjectIcons = [Zap, FlaskConical, Dna, Calculator, Monitor];

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    let start = 0;
    const duration = 1600;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);

  return <span>{count}</span>;
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const [hoveredSubject, setHoveredSubject] = useState<number | null>(null);
  const [expandedMobileSubject, setExpandedMobileSubject] = useState<string | null>(null);

  const stats = [
    { label: t.statsExperiments, value: 42 },
    { label: t.statsSubjects, value: 5 },
    { label: t.statsLabs, value: 42 },
    { label: t.statsAi, value: 1 },
  ];

  const features = [
    { title: t.feat1Title, desc: t.feat1Desc, icon: Microscope },
    { title: t.feat2Title, desc: t.feat2Desc, icon: Bot },
    { title: t.feat3Title, desc: t.feat3Desc, icon: BookOpen },
    { title: t.feat4Title, desc: t.feat4Desc, icon: BarChart3 },
    { title: t.feat5Title, desc: t.feat5Desc, icon: Smartphone },
    { title: t.feat6Title, desc: t.feat6Desc, icon: HelpCircle },
  ];

  return (
    <div className="relative min-h-screen bg-ink text-paper selection:bg-sky selection:text-ink overflow-x-hidden">
      {/* ── FULL-SCREEN 3D MOTION VIDEO BACKGROUND ── */}
      <div className="absolute inset-x-0 top-0 h-[100vh] min-h-[650px] overflow-hidden pointer-events-none z-0">
        <video
          src="/hero-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover object-center opacity-40 scale-105"
        />
        {/* Soft Contrast Gradient Overlays without Neon or Excessive Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/75 via-[#070B14]/85 to-[#070B14]" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#070B14]/50 to-[#070B14]" />
      </div>

      {/* ── HERO CONTENT OVERLAY (Z-10) ── */}
      <section className="relative z-10 min-h-[85vh] flex flex-col items-center justify-center pt-24 pb-16 px-6 md:px-12 lg:px-20 max-w-5xl mx-auto text-center">
        {/* Main Title: Crisp Fraunces, soft sky-blue accent without neon glow */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-paper leading-[1.05] mb-2"
        >
          E-<span className="text-sky font-medium">Prayog</span>
        </motion.h1>

        {/* Subtitle in Kannada */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-2xl sm:text-3xl md:text-4xl text-sky-deep tracking-tight mb-6"
        >
          ಇ-ಪ್ರಯೋಗ
        </motion.div>

        {/* Hero Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-base sm:text-xl text-slate-300 max-w-2xl font-light leading-relaxed mb-10"
        >
          {t.heroDesc}
        </motion.p>

        {/* Action Buttons: Clean soft sky blue, no neon glow */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          <Link to="/subjects" className="btn-primary">
            <span>{t.heroCta}</span>
            <ArrowRight size={18} />
          </Link>

          <Link to="/tutor" className="btn-secondary">
            <Bot size={18} className="text-sky" />
            <span>{t.heroCtaAi}</span>
          </Link>
        </motion.div>
      </section>

      {/* ── STATS ROW ── */}
      <section
        className="py-14 border-y relative z-10 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(14, 22, 38, 0.85)',
          borderColor: 'var(--rule-dark, rgba(135,206,235,0.16))',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center text-center ${idx > 0 ? 'md:border-l md:border-sky-500/20' : ''}`}
              >
                <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-semibold text-sky tracking-tight">
                  <AnimatedCounter target={stat.value} />
                </span>
                <span className="text-xs uppercase tracking-widest text-chalk mt-2 font-medium">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECT INDEX ── */}
      <section
        className="py-24 md:py-32 relative z-10"
        style={{
          backgroundColor: 'var(--ink, #070B14)',
          color: 'var(--paper, #F0F6FC)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          {/* Section header */}
          <div
            className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b"
            style={{ borderColor: 'var(--rule-dark, rgba(135,206,235,0.16))' }}
          >
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-sky block mb-3 font-semibold">
                {t.subjectsHeading}
              </span>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-paper">
                Curriculum Practicals
              </h2>
            </div>
            <p className="text-sm text-chalk max-w-sm mt-4 md:mt-0 font-normal">
              {t.subjectsSubheading}
            </p>
          </div>

          {/* Desktop editorial numbered index */}
          <div className="hidden md:block divide-y" style={{ borderColor: 'var(--rule-dark, rgba(135,206,235,0.16))' }}>
            {SUBJECTS.map((subject, idx) => {
              const Icon = subjectIcons[idx] || Zap;
              const num = String(idx + 1).padStart(2, '0');

              return (
                <Link
                  key={subject.id}
                  to={`/subjects/${subject.id}`}
                  onMouseEnter={() => setHoveredSubject(idx)}
                  onMouseLeave={() => setHoveredSubject(null)}
                  className="group block py-8 px-6 transition-all duration-200 hover:bg-ink-2/90 rounded-lg"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-8">
                      <span className="font-mono text-sm text-sky/70 tracking-wider font-semibold">
                        {num}
                      </span>
                      <h3 className="font-display text-3xl lg:text-4xl text-paper font-normal tracking-tight group-hover:text-sky transition-colors">
                        {subject.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-10">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Icon size={18} className="text-sky" />
                        <span className="text-xs text-chalk italic hidden lg:inline">
                          {subject.description.slice(0, 48)}...
                        </span>
                      </div>

                      <div className="text-right min-w-[120px]">
                        <span className="font-mono text-sm text-sky font-semibold">
                          {subject.labs.length} {t.labsLabel}
                        </span>
                      </div>

                      <ArrowRight
                        size={18}
                        className="text-chalk group-hover:text-sky transform group-hover:translate-x-1.5 transition-all"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile: Tappable accordion index */}
          <div className="md:hidden divide-y" style={{ borderColor: 'var(--rule-dark, rgba(135,206,235,0.16))' }}>
            {SUBJECTS.map((subject, idx) => {
              const Icon = subjectIcons[idx] || Zap;
              const num = String(idx + 1).padStart(2, '0');
              const isExpanded = expandedMobileSubject === subject.id;

              return (
                <div key={subject.id} className="py-5">
                  <button
                    onClick={() => setExpandedMobileSubject(isExpanded ? null : subject.id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono text-xs text-sky font-bold">{num}</span>
                      <span className="font-display text-2xl text-paper">{subject.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-sky font-medium">
                        {subject.labs.length} labs
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-chalk transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pt-4 pb-2 pl-7 overflow-hidden"
                      >
                        <p className="text-sm text-chalk mb-4 leading-relaxed">
                          {subject.description}
                        </p>
                        <Link
                          to={`/subjects/${subject.id}`}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-sky uppercase tracking-wider"
                        >
                          <Icon size={14} />
                          <span>Open Experiments</span>
                          <ArrowRight size={14} />
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section
        className="py-24 md:py-32 relative z-10"
        style={{
          backgroundColor: 'var(--ink-2, #0E1626)',
          borderTop: '1px solid var(--rule-dark, rgba(135,206,235,0.16))',
          borderBottom: '1px solid var(--rule-dark, rgba(135,206,235,0.16))',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-28">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-sky block mb-3 font-semibold">
                {t.featuresHeading}
              </span>
              <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-paper mb-6 leading-tight">
                Crafted for Karnataka PUC Practicals
              </h2>
              <p className="text-chalk text-base leading-relaxed max-w-sm">
                Every calculation, simulation canvas, and viva query is tailored to the Department of Pre-University Education curriculum.
              </p>
            </div>

            <div className="lg:col-span-7 divide-y" style={{ borderColor: 'var(--rule-dark, rgba(135,206,235,0.16))' }}>
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="py-8 first:pt-0 last:pb-0 flex items-start gap-6">
                    <div
                      className="p-3 rounded-lg mt-1 shrink-0 bg-ink border border-sky-400/25"
                    >
                      <Icon size={20} className="text-sky" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl text-paper font-medium mb-2 tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-chalk leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-24 md:py-32 px-6 md:px-12 lg:px-20 max-w-5xl mx-auto text-center relative z-10">
        <div
          className="p-10 md:p-16 rounded-2xl border bg-ink-2 border-sky-400/20"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-paper font-normal tracking-tight mb-4">
            {t.ctaHeading}
          </h2>
          <p className="text-chalk text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            {t.ctaSubheading}
          </p>
          <div>
            <Link
              to="/subjects"
              className="btn-primary"
            >
              <span>{t.ctaBtn}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
