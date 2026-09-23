import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { Zap, FlaskConical, Dna, Calculator, Monitor, Bot, Microscope, GraduationCap, Sparkles, ArrowRight, BookOpen, BarChart3, Smartphone, HelpCircle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { SUBJECTS } from '../constants';
import { useAuth } from '../services/AuthContext';
import { useLang } from '../services/LanguageContext';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

// Lazy load the R3F 3D atom scene
const AtomSceneR3F = React.lazy(() => import('../components/AtomSceneR3F'));

const MotionDiv = motion.div as any;
const MotionH1 = motion.h1 as any;
const MotionP = motion.p as any;

const subjectIcons = [Zap, FlaskConical, Dna, Calculator, Monitor];

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count}</span>;
}

const Home: React.FC = () => {
  const { user, role } = useAuth();
  const { t } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);

  const stats = [
    { label: t.statsExperiments, value: 42, icon: Microscope, color: '#38BDF8' },
    { label: t.statsSubjects,    value: 5,  icon: BookOpen,   color: '#38BDF8' },
    { label: t.statsLabs,        value: 42, icon: GraduationCap, color: '#38BDF8' },
    { label: t.statsAi,          value: 1,  suffix: '', icon: Bot, color: '#38BDF8' },
  ];

  const features = [
    { title: t.feat1Title, desc: t.feat1Desc, icon: Microscope, color: '#38BDF8' },
    { title: t.feat2Title, desc: t.feat2Desc, icon: Bot, color: '#38BDF8' },
    { title: t.feat3Title, desc: t.feat3Desc, icon: BookOpen, color: '#38BDF8' },
    { title: t.feat4Title, desc: t.feat4Desc, icon: BarChart3, color: '#38BDF8' },
    { title: t.feat5Title, desc: t.feat5Desc, icon: Smartphone, color: '#38BDF8' },
    { title: t.feat6Title, desc: t.feat6Desc, icon: HelpCircle, color: '#38BDF8' },
  ];

  // ── GSAP ScrollTrigger Animations ──
  useGSAP(() => {
    // Stagger reveal for subject cards on scroll
    gsap.from('.gsap-subject-card', {
      scrollTrigger: {
        trigger: '.gsap-subjects-section',
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out',
    });

    // Stagger reveal for feature cards on scroll
    gsap.from('.gsap-feature-card', {
      scrollTrigger: {
        trigger: '.gsap-features-section',
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      y: 35,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power2.out',
    });
  }, { scope: containerRef });
  
  return (
    <div ref={containerRef} className="min-h-screen pt-20">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 md:px-12 lg:px-20 py-16 sm:py-24 lg:py-36 overflow-hidden">
        {/* R3F Real 3D Canvas Scene (z-0) */}
        <Suspense fallback={null}>
          <AtomSceneR3F />
        </Suspense>
        
        {/* Scrim overlay for depth & readability (z-10) */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#0B1120]/60 to-[#0B1120] pointer-events-none z-10" />

        {/* Hero Content (z-20 explicitly sits ABOVE 3D scene & scrim) */}
        <div className="max-w-6xl mx-auto relative z-20 flex flex-col items-center justify-center min-h-[50vh]">
          <MotionDiv 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
            className="text-center max-w-4xl mx-auto px-2 sm:px-0"
          >
            <div className="hero-badge-pill mb-6 sm:mb-8">
              <Sparkles size={14} className="text-[#38BDF8] shrink-0" /> 
              <span className="tracking-wide text-slate-400 text-xs sm:text-sm">{t.heroBadge}</span>
            </div>
            
            <MotionH1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold text-[#F1F5F9] tracking-tight leading-[1.1] mb-6 sm:mb-8"
            >
              E-<span className="text-[#38BDF8]">Prayog</span>
              <br />
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-slate-400 tracking-normal mt-2 sm:mt-4 block">
                ಇ-ಪ್ರಯೋಗ
              </span>
            </MotionH1>
            
            <MotionP 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-base sm:text-lg md:text-xl text-slate-400 mb-8 sm:mb-12 leading-relaxed max-w-2xl mx-auto font-light px-2 sm:px-0"
            >
              {t.heroDesc}
            </MotionP>
            
            <MotionDiv 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.45, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
              className="flex flex-col sm:flex-row w-full sm:w-auto gap-4 sm:gap-5 justify-center items-center px-4 sm:px-0"
            >
              <Link to="/subjects" className="btn-primary w-full sm:w-auto justify-center text-center">
                {t.heroCta} <ArrowRight size={18} />
              </Link>
              <Link to="/tutor" className="btn-secondary w-full sm:w-auto justify-center text-center">
                <Bot size={18} className="text-[#38BDF8]" /> {t.heroCtaAi}
              </Link>
            </MotionDiv>
          </MotionDiv>
        </div>
      </section>

      {/* Stats Divider Section */}
      <section className="px-6 md:px-12 lg:px-20 py-8 border-y border-[#1E293B] bg-[#131B2E]/60 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-y-8">
          {stats.map((stat, idx) => (
            <MotionDiv 
              key={stat.label} 
              initial={{ opacity: 0, y: 10 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="stat-item flex-1 min-w-[140px]"
            >
              <div className="text-4xl md:text-5xl font-bold font-display text-[#F1F5F9] tracking-tight">
                <AnimatedCounter target={stat.value} />{stat.suffix}
              </div>
              <div className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-wider">{stat.label}</div>
            </MotionDiv>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="gsap-subjects-section px-6 md:px-12 lg:px-20 py-24 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="overline">{t.subjectsHeading}</span>
            <h2 className="text-3xl md:text-5xl font-display font-semibold text-[#F1F5F9] mb-6 tracking-tight">Explore Virtual Labs</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">{t.subjectsSubheading}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {SUBJECTS.map((subject, idx) => {
              const Icon = subjectIcons[idx] || Zap;
              return (
                <Link key={subject.id} to={`/subjects/${subject.id}`} className="gsap-subject-card block h-full group">
                  <GlassCard color={subject.color} className="text-center h-full flex flex-col">
                    <div className="size-14 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-transform group-hover:scale-105 duration-200 bg-[#38BDF8]/10 border border-[#38BDF8]/20">
                      <Icon size={26} className="text-[#38BDF8]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#F1F5F9] mb-3 tracking-tight">{subject.name}</h3>
                    <p className="text-sm text-slate-400 mb-6 flex-1 leading-relaxed line-clamp-3">{subject.description}</p>
                    <div className="text-xs font-semibold px-4 py-1.5 rounded-full inline-flex mx-auto items-center justify-center bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
                      {subject.labs.length} {t.labsLabel}
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="gsap-features-section px-6 md:px-12 lg:px-20 py-24 bg-[#131B2E]/40 border-y border-[#1E293B] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="overline">{t.featuresHeading}</span>
            <h2 className="text-3xl md:text-5xl font-display font-semibold text-[#F1F5F9] tracking-tight">Precision Learning Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="gsap-feature-card">
                  <GlassCard hoverEffect={true} className="flex flex-col items-start p-8 text-left h-full">
                    <div className="size-12 rounded-xl mb-6 flex items-center justify-center bg-[#38BDF8]/10 border border-[#38BDF8]/20">
                      <Icon size={24} className="text-[#38BDF8]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#F1F5F9] mb-3">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-32 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-panel rounded-[2.5rem] p-12 md:p-20 relative overflow-hidden bg-[#131B2E] border border-[#1E293B]">
            <h2 className="text-4xl md:text-5xl font-display font-semibold text-[#F1F5F9] mb-6 tracking-tight relative z-10">{t.ctaHeading}</h2>
            <p className="text-slate-400 mb-10 text-lg max-w-xl mx-auto relative z-10">{t.ctaSubheading}</p>
            <div className="relative z-10">
              <Link to="/subjects" className="btn-primary">
                {t.ctaBtn} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
