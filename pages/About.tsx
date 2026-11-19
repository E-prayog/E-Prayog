import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import {
  FlaskConical, Bot, Languages, ShieldCheck, Calculator,
  Brain, ArrowRight, Github, Linkedin, Mail, ExternalLink,
  Code2, Sparkles, CheckCircle2, ChevronRight, BookOpen,
  Layers, MapPin, Heart, Terminal, Cpu, Database
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useLang } from '../services/LanguageContext';

const MotionDiv = motion.div as any;

/**
 * Solo Developer Profile Configuration
 * Update links, bio, and photo as needed.
 */
export interface DeveloperProfile {
  name: string;
  title: string;
  tagline: string;
  bio: string;
  location: string;
  email: string;
  github: string;
  linkedin: string;
  portfolio: string;
  photoPath: string;
  initials: string;
  skills: string[];
}

export const DEVELOPER: DeveloperProfile = {
  name: 'Sushant Shetty',
  title: 'Full Stack Developer',
  tagline: 'Computer Science Student · Bengaluru, Karnataka',
  bio: 'I built E-Prayog entirely from scratch as a personal initiative to solve a critical gap in Karnataka science education: limited physical laboratory access, crowded batches, and high anxiety before practical exams. E-Prayog gives every student an unlimited, pressure-free digital laboratory to explore 42 curriculum experiments in their own language—combining authentic mathematical simulations with Gemini AI mentorship to supplement and reinforce their college physical lab work.',
  location: 'Bengaluru, Karnataka, India',
  email: 'sushantshetty09@gmail.com',
  github: 'https://github.com',
  linkedin: 'https://linkedin.com',
  portfolio: 'https://sushantshetty.dev',
  photoPath: '/developer.jpg', // User uploads to public/developer.jpg
  initials: 'SS',
  skills: ['React 19', 'TypeScript', 'Tailwind CSS 4', 'Vite', 'Firebase', 'Google Gemini AI', 'Framer Motion', 'Node.js'],
};

// Animation easing matching the app's motion system
const ease = [0.16, 1, 0.3, 1];

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.6, ease },
};

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    let start = 0;
    const duration = 1400;
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

  return <span>{count}{suffix}</span>;
}

const About: React.FC = () => {
  const { t } = useLang();
  const [imgError, setImgError] = useState(false);

  const scrollToDev = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('developer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const offerings = [
    {
      icon: FlaskConical,
      title: t.aboutOffSimTitle || '42 Interactive Simulations',
      desc: t.aboutOffSimDesc || 'Accurate mathematical models for Physics, Chemistry, Biology, Mathematics, and Computer Science.',
    },
    {
      icon: Bot,
      title: t.aboutOffAiTitle || 'Context-Aware AI Tutor',
      desc: t.aboutOffAiDesc || 'Powered by Google Gemini to guide students through experiment theory, calculations, and viva questions.',
    },
    {
      icon: Languages,
      title: t.aboutOffLangTitle || 'Trilingual Lab Environment',
      desc: t.aboutOffLangDesc || 'Native support for English, Kannada (ಕನ್ನಡ), and Hindi (हिंदी) across lab procedures and tutor dialogues.',
    },
    {
      icon: ShieldCheck,
      title: t.aboutOffDashTitle || 'Educator & Admin Dashboards',
      desc: t.aboutOffDashDesc || 'Role-based dashboards for students, lecturers, and administrators with progress logs and class management.',
    },
    {
      icon: Calculator,
      title: t.aboutOffToolsTitle || 'Integrated Scientific Tools',
      desc: t.aboutOffToolsDesc || 'Interactive periodic table, formula cheat-sheets, logic gate truth-table testers, and quick calculators.',
    },
    {
      icon: Brain,
      title: t.aboutOffQuizTitle || 'Viva Voce & Self-Assessment',
      desc: t.aboutOffQuizDesc || 'Comprehensive question banks with randomized viva practice, observation tables, and instant feedback.',
    },
  ];

  const timelineSteps = [
    {
      year: t.aboutTimelineStep1Year || 'Early 2024',
      title: t.aboutTimelineStep1Title || 'Identifying the PUC Laboratory Gap',
      desc: t.aboutTimelineStep1Desc || 'Noticed the intense pressure on PUC students during practical exams and the shortage of accessible digital practice tools aligned with the Karnataka state syllabus.',
    },
    {
      year: t.aboutTimelineStep2Year || 'Mid 2024',
      title: t.aboutTimelineStep2Title || 'First Simulation Prototypes',
      desc: t.aboutTimelineStep2Desc || 'Engineered the initial interactive 2D physics simulations (Ohm\'s Law and Convex Lens) using custom mathematical rendering in React.',
    },
    {
      year: t.aboutTimelineStep3Year || 'Late 2024',
      title: t.aboutTimelineStep3Title || 'Scaling to 42 Curriculum Labs',
      desc: t.aboutTimelineStep3Desc || 'Expanded the experiment catalog across 5 subjects: Physics, Chemistry, Biology, Mathematics, and Computer Science, complete with step-by-step procedures.',
    },
    {
      year: t.aboutTimelineStep4Year || '2025 – Present',
      title: t.aboutTimelineStep4Title || 'Trilingual & AI Integration',
      desc: t.aboutTimelineStep4Desc || 'Implemented full Kannada and Hindi localization, integrated the Gemini AI Tutor, and launched student/teacher performance dashboards.',
    },
  ];

  const techStack = [
    { name: 'React 19', icon: Code2, desc: 'Frontend architecture' },
    { name: 'TypeScript', icon: Terminal, desc: 'Strict type safety' },
    { name: 'Tailwind CSS 4', icon: Layers, desc: 'Obsidian design system' },
    { name: 'Vite', icon: Sparkles, desc: 'Lightning-fast bundler' },
    { name: 'Firebase', icon: Database, desc: 'Auth, Firestore & Storage' },
    { name: 'Gemini AI', icon: Cpu, desc: 'Contextual lab mentor' },
  ];

  const roadmap = [
    {
      title: t.aboutRoadmap1Title || 'Offline Progressive Web App (PWA)',
      desc: t.aboutRoadmap1Desc || 'Full offline execution of all 42 simulations for rural college computer labs with intermittent connectivity.',
      status: 'In Development',
    },
    {
      title: t.aboutRoadmap2Title || 'Voice-Assisted Kannada Viva',
      desc: t.aboutRoadmap2Desc || 'Interactive voice oral exam rehearsal in Kannada and English with real-time AI pronunciation feedback.',
      status: 'Planned',
    },
    {
      title: t.aboutRoadmap3Title || 'Custom Teacher Worksheet Builder',
      desc: t.aboutRoadmap3Desc || 'Tools for PUC lecturers to generate customized observation sheets and test sets for their college classes.',
      status: 'Planned',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070A0F] text-[#E2E8F0] selection:bg-[#87CEEB] selection:text-[#070A0F] overflow-x-hidden font-sans">

      {/* ── 1. HERO SECTION ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto text-center">
        {/* Subtle background orbit motif & soft sky glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10 overflow-hidden">
          <div className="w-[600px] h-[600px] rounded-full border border-sky-500/10 opacity-40 animate-spin" style={{ animationDuration: '40s' }} />
          <div className="absolute w-[440px] h-[440px] rounded-full border border-sky-500/15 opacity-60" />
          <div className="absolute w-[300px] h-[300px] rounded-full bg-[#87CEEB]/5 blur-[90px]" />
        </div>

        <MotionDiv {...fadeInUp}>
          <span className="inline-block text-xs font-mono uppercase tracking-[0.22em] text-[#87CEEB] mb-4 font-semibold px-3 py-1 rounded-full bg-[#87CEEB]/10 border border-[#87CEEB]/20">
            {t.aboutHeroOverline || 'ABOUT E-PRAYOG'}
          </span>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-paper leading-[1.1] max-w-4xl mx-auto mb-6">
            {t.aboutHeroTitle || 'A virtual lab for every PUC student, in their own language.'}
          </h1>

          <p className="text-base sm:text-xl text-[#94A3B8] max-w-2xl mx-auto font-normal leading-relaxed mb-10">
            {t.aboutHeroSubtitle || 'Engineered as a solo personal project to make hands-on science accessible across Karnataka colleges, bridging textbook theory and practical discovery.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/subjects"
              className="px-7 py-3.5 rounded-xl bg-[#87CEEB] hover:bg-[#5DADE2] text-[#070A0F] font-semibold text-sm transition-all shadow-lg shadow-sky-500/15 flex items-center gap-2"
            >
              <span>{t.aboutHeroCtaLabs || 'Explore Experiments'}</span>
              <ArrowRight size={16} />
            </Link>

            <a
              href="#developer"
              onClick={scrollToDev}
              className="px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-paper font-medium text-sm transition-all flex items-center gap-2"
            >
              <span>{t.aboutHeroCtaDev || 'Meet the Developer'}</span>
              <ChevronRight size={16} className="text-[#87CEEB]" />
            </a>
          </div>
        </MotionDiv>
      </section>

      {/* ── 2. THE PROBLEM & THE ANSWER (TWO-COLUMN) ── */}
      <section className="py-20 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto border-t border-sky-500/10">
        <MotionDiv {...fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Column 1: The Problem */}
          <div className="rounded-2xl p-8 bg-[#0D1117] border border-red-500/15 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 block mb-2 font-semibold">
                {t.aboutProblemOverline || 'THE MOTIVATION'}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-paper mb-4">
                {t.aboutProblemTitle || 'The Problem with Traditional Labs'}
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed mb-4">
                {t.aboutProblemText1 || 'In many PUC colleges across Karnataka, students get barely two hours a week in a crowded science lab. With 40 to 60 students per batch, individual hands-on practice with sensitive apparatus like vernier calipers, spectrometers, and titration burettes is rarely possible.'}
              </p>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                {t.aboutProblemText2 || 'Furthermore, technical laboratory manuals written exclusively in English create an unintended barrier for students transitioning from Kannada-medium high schools.'}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-red-500/10 text-xs font-mono text-red-300/80 flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-400" />
              <span>Result: Practical exam anxiety and rote memorization without intuition</span>
            </div>
          </div>

          {/* Column 2: My Answer */}
          <div className="rounded-2xl p-8 bg-[#0D1117] border border-sky-500/25 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#87CEEB] block mb-2 font-semibold">
                {t.aboutAnswerOverline || 'THE SOLUTION'}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-paper mb-4">
                {t.aboutAnswerTitle || 'My Answer: E-Prayog Virtual Science Lab'}
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed mb-4">
                {t.aboutAnswerText1 || 'I built E-Prayog to give every student an unlimited, pressure-free sandbox to perform curriculum experiments as many times as needed before stepping into the physical examination hall.'}
              </p>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                {t.aboutAnswerText2 || 'With an AI lab mentor that explains concepts in English, Kannada, and Hindi, students can make mistakes, observe calculations, and master viva questions at their own pace. This platform directly supplements and reinforces supervised laboratory work.'}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-sky-500/15 text-xs font-mono text-[#87CEEB] flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[#87CEEB]" />
              <span>Designed specifically as a digital companion to physical labs</span>
            </div>
          </div>

        </MotionDiv>
      </section>

      {/* ── 3. WHAT IT OFFERS (BENTO-STYLE GRID) ── */}
      <section className="py-20 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto border-t border-sky-500/10">
        <MotionDiv {...fadeInUp} className="text-center mb-14">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#87CEEB] block mb-2 font-semibold">
            {t.aboutOfferingsOverline || 'PLATFORM CAPABILITIES'}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-paper mb-3">
            {t.aboutOfferingsTitle || 'What E-Prayog Offers'}
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] max-w-xl mx-auto">
            {t.aboutOfferingsSub || 'Designed specifically for the Karnataka State Pre-University Board curriculum.'}
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offerings.map((item, idx) => {
            const Icon = item.icon;
            return (
              <MotionDiv
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease }}
              >
                <div className="group h-full p-6 rounded-2xl bg-[#0D1117] border border-sky-500/15 hover:border-[#87CEEB]/50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-sky-500/5 flex flex-col justify-between">
                  <div>
                    <div className="size-12 rounded-xl bg-[#070A0F] border border-sky-500/20 text-[#87CEEB] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <Icon size={22} />
                    </div>
                    <h3 className="font-display text-lg font-medium text-paper mb-2 group-hover:text-[#87CEEB] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </MotionDiv>
            );
          })}
        </div>
      </section>

      {/* ── 4. STATS STRIP ── */}
      <section className="py-16 px-6 md:px-12 lg:px-20 bg-[#0D1117] border-y border-sky-500/15">
        <div className="max-w-7xl mx-auto">
          <MotionDiv {...fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="font-mono text-4xl sm:text-5xl font-bold text-[#87CEEB] tracking-tight mb-2">
                <AnimatedNumber target={42} />
              </div>
              <div className="text-xs uppercase tracking-widest text-[#94A3B8] font-mono">
                {t.aboutStatsLabs || 'Interactive Simulations'}
              </div>
            </div>

            <div className="text-center">
              <div className="font-mono text-4xl sm:text-5xl font-bold text-[#87CEEB] tracking-tight mb-2">
                <AnimatedNumber target={5} />
              </div>
              <div className="text-xs uppercase tracking-widest text-[#94A3B8] font-mono">
                {t.aboutStatsSubjects || 'PUC Science Streams'}
              </div>
            </div>

            <div className="text-center">
              <div className="font-mono text-4xl sm:text-5xl font-bold text-[#87CEEB] tracking-tight mb-2">
                <AnimatedNumber target={3} />
              </div>
              <div className="text-xs uppercase tracking-widest text-[#94A3B8] font-mono">
                {t.aboutStatsLanguages || 'Supported Languages'}
              </div>
            </div>

            <div className="text-center">
              <div className="font-mono text-4xl sm:text-5xl font-bold text-[#87CEEB] tracking-tight mb-2">
                <span>100%</span>
              </div>
              <div className="text-xs uppercase tracking-widest text-[#94A3B8] font-mono">
                {t.aboutStatsAccess || 'Free & Open Access'}
              </div>
            </div>
          </MotionDiv>
        </div>
      </section>

      {/* ── 5. MY STORY / TIMELINE ── */}
      <section className="py-24 px-6 md:px-12 lg:px-20 max-w-4xl mx-auto">
        <MotionDiv {...fadeInUp} className="text-center mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#87CEEB] block mb-2 font-semibold">
            {t.aboutTimelineOverline || 'PROJECT CHRONICLE'}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-paper">
            {t.aboutTimelineTitle || 'How E-Prayog Came to Life'}
          </h2>
        </MotionDiv>

        <div className="relative pl-6 sm:pl-8 border-l border-sky-500/20 space-y-12">
          {timelineSteps.map((step, idx) => (
            <MotionDiv
              key={step.year}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease }}
              className="relative"
            >
              {/* Dot */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-1 size-3.5 rounded-full bg-[#87CEEB] border-4 border-[#070A0F] shadow-sm shadow-sky-500/50" />

              <div className="p-6 rounded-2xl bg-[#0D1117] border border-sky-500/15">
                <span className="text-xs font-mono text-[#87CEEB] font-semibold tracking-wider block mb-1">
                  {step.year}
                </span>
                <h3 className="font-display text-lg font-medium text-paper mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </MotionDiv>
          ))}
        </div>
      </section>

      {/* ── 6. MEET THE DEVELOPER (SOLO PROFILE) ── */}
      <section id="developer" className="py-24 px-6 md:px-12 lg:px-20 max-w-4xl mx-auto border-t border-sky-500/10">
        <MotionDiv {...fadeInUp}>
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#87CEEB] block mb-2 font-semibold">
              {t.aboutDevOverline || 'SOLO DEVELOPER'}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-paper">
              {t.aboutDevTitle || 'Meet the Developer'}
            </h2>
          </div>

          <div className="rounded-3xl p-8 sm:p-10 bg-[#0D1117] border border-sky-500/25 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              
              {/* Avatar with fallback */}
              <div className="shrink-0 text-center">
                <div className="size-28 sm:size-32 rounded-2xl overflow-hidden bg-gradient-to-br from-[#87CEEB]/20 via-[#5DADE2]/10 to-[#070A0F] border border-sky-500/30 flex items-center justify-center text-3xl font-display font-bold text-[#87CEEB] shadow-xl relative">
                  {!imgError ? (
                    <img
                      src={DEVELOPER.photoPath}
                      alt={DEVELOPER.name}
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span>{DEVELOPER.initials}</span>
                  )}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Solo Author</span>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-paper">
                  {DEVELOPER.name}
                </h3>
                <p className="text-xs sm:text-sm font-mono text-[#87CEEB] mt-1 mb-1 font-medium">
                  {t.aboutDevTagline || DEVELOPER.tagline}
                </p>
                <p className="text-xs text-[#94A3B8] font-mono flex items-center justify-center sm:justify-start gap-1 mb-4">
                  <MapPin size={12} className="text-[#87CEEB]" /> {DEVELOPER.location}
                </p>

                <p className="text-sm text-[#CBD5E1] leading-relaxed mb-6">
                  {t.aboutDevBio || DEVELOPER.bio}
                </p>

                {/* Skill chips */}
                <div className="mb-6">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] block mb-2 font-medium">
                    Technical Stack
                  </span>
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                    {DEVELOPER.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#070A0F] border border-sky-500/20 text-[#E2E8F0]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social links */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-4 border-t border-sky-500/15">
                  <a
                    href={`mailto:${DEVELOPER.email}`}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-[#87CEEB] text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Mail size={14} />
                    <span>{DEVELOPER.email}</span>
                  </a>

                  {DEVELOPER.github && (
                    <a
                      href={DEVELOPER.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-paper border border-white/10 transition-colors"
                      title="GitHub"
                    >
                      <Github size={15} />
                    </a>
                  )}

                  {DEVELOPER.linkedin && (
                    <a
                      href={DEVELOPER.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-paper border border-white/10 transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin size={15} />
                    </a>
                  )}

                  {DEVELOPER.portfolio && (
                    <a
                      href={DEVELOPER.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-paper border border-white/10 transition-colors"
                      title="Portfolio"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>

              </div>
            </div>
          </div>
        </MotionDiv>
      </section>

      {/* ── 7. BUILT WITH (TECH ROW) ── */}
      <section className="py-16 px-6 md:px-12 lg:px-20 max-w-5xl mx-auto border-t border-sky-500/10">
        <MotionDiv {...fadeInUp} className="text-center mb-8">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#87CEEB] font-semibold">
            {t.aboutDevBuiltWith || 'Engineered With'}
          </span>
        </MotionDiv>

        <MotionDiv {...fadeInUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {techStack.map((tech) => {
            const Icon = tech.icon;
            return (
              <div
                key={tech.name}
                className="p-3.5 rounded-xl bg-[#0D1117] border border-sky-500/15 text-center flex flex-col items-center justify-center hover:border-[#87CEEB]/40 transition-colors"
              >
                <Icon size={18} className="text-[#87CEEB] mb-1.5" />
                <span className="font-mono text-xs font-medium text-paper block">{tech.name}</span>
                <span className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{tech.desc}</span>
              </div>
            );
          })}
        </MotionDiv>
      </section>

      {/* ── 8. ROADMAP ── */}
      <section className="py-20 px-6 md:px-12 lg:px-20 max-w-5xl mx-auto border-t border-sky-500/10">
        <MotionDiv {...fadeInUp} className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#87CEEB] block mb-2 font-semibold">
            {t.aboutRoadmapOverline || 'LOOKING FORWARD'}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-paper">
            {t.aboutRoadmapTitle || 'Upcoming Roadmap'}
          </h2>
        </MotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {roadmap.map((item, idx) => (
            <MotionDiv
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease }}
              className="p-5 rounded-2xl bg-[#0D1117] border border-sky-500/15 flex flex-col justify-between"
            >
              <div>
                <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-[#87CEEB] px-2 py-0.5 rounded bg-[#87CEEB]/10 border border-[#87CEEB]/25 mb-3 font-semibold">
                  {item.status}
                </span>
                <h3 className="font-display text-base font-medium text-paper mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </MotionDiv>
          ))}
        </div>
      </section>

      {/* ── 9. CLOSING CTA ── */}
      <section className="py-24 px-6 md:px-12 lg:px-20 max-w-4xl mx-auto text-center border-t border-sky-500/10">
        <MotionDiv {...fadeInUp} className="rounded-3xl p-8 sm:p-12 bg-gradient-to-b from-[#0D1117] to-[#070A0F] border border-sky-500/25 shadow-2xl">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-paper mb-4">
            {t.aboutCtaTitle || 'Want to Bring E-Prayog to Your College?'}
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] max-w-lg mx-auto mb-8 leading-relaxed">
            {t.aboutCtaDesc || 'If you are a PUC lecturer, college administrator, or student representative interested in adopting E-Prayog, let\'s connect.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/contact"
              className="px-8 py-3.5 rounded-xl bg-[#87CEEB] hover:bg-[#5DADE2] text-[#070A0F] font-semibold text-sm transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2"
            >
              <span>{t.aboutCtaContactBtn || 'Get in Touch'}</span>
              <ArrowRight size={16} />
            </Link>

            <a
              href="mailto:sushantshetty09@gmail.com"
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-paper font-medium text-sm transition-all flex items-center gap-2"
            >
              <Mail size={16} className="text-[#87CEEB]" />
              <span>sushantshetty09@gmail.com</span>
            </a>
          </div>
        </MotionDiv>
      </section>

    </div>
  );
};

export default About;
