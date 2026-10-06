import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Github, Linkedin, Send, Mail, Heart } from 'lucide-react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useLang } from '../services/LanguageContext';

const MotionSpan = motion.span as any;

const TITLES = [
  { text: "E-Prayog", lang: "en" },
  { text: "ಇ-ಪ್ರಯೋಗ", lang: "kn" },
];

const Footer: React.FC = () => {
  const { t } = useLang();
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % TITLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSent(true);
    setTimeout(() => { setSent(false); setFeedback(''); }, 2000);
  };

  return (
    <footer className="bg-[#04060A] border-t border-white/[0.04] pt-16 pb-8 z-10 relative mt-auto">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3 group" style={{ textDecoration: 'none' }}>
              {/* ── Animated Orbital Logo Mark (matches Navbar) ── */}
              <svg
                viewBox="0 0 80 80"
                width="44"
                height="44"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                aria-hidden="true"
                style={{ overflow: 'visible', flexShrink: 0 }}
              >
                <defs>
                  <linearGradient id="ft-outerG" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="ft-innerG" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="ft-eG" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F1F5F9" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                  <path id="ft-outerPath" d="M 67.2,40 A 27.2,11.2 0 1 1 67.19,39.97" fill="none" />
                  <path id="ft-innerPath" d="M 57.6,40 A 17.6,7.2 0 1 1 57.59,39.97" fill="none" />
                </defs>

                {/* Outer ring */}
                <g className="ep-outer-ring" style={{ transformOrigin: '40px 40px' }}>
                  <ellipse cx="40" cy="40" rx="27.2" ry="11.2"
                    fill="none" stroke="url(#ft-outerG)" strokeWidth="1.6" strokeOpacity="0.8"
                    transform="rotate(-20,40,40)"
                  />
                </g>

                {/* Inner ring */}
                <g className="ep-inner-ring" style={{ transformOrigin: '40px 40px' }}>
                  <ellipse cx="40" cy="40" rx="17.6" ry="7.2"
                    fill="none" stroke="url(#ft-innerG)" strokeWidth="1.6" strokeOpacity="0.8"
                    transform="rotate(55,40,40)"
                  />
                </g>

                {/* Outer electrons */}
                <g className="ep-outer-ring" style={{ transformOrigin: '40px 40px' }}>
                  <circle r="2.2" fill="#38BDF8">
                    <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear">
                      <mpath xlinkHref="#ft-outerPath" />
                    </animateMotion>
                  </circle>
                  <circle r="2.2" fill="#38BDF8">
                    <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear" begin="-3s">
                      <mpath xlinkHref="#ft-outerPath" />
                    </animateMotion>
                  </circle>
                </g>

                {/* Inner electron */}
                <g className="ep-inner-ring" style={{ transformOrigin: '40px 40px' }}>
                  <circle r="2" fill="#38BDF8">
                    <animateMotion dur="4s" repeatCount="indefinite" calcMode="linear">
                      <mpath xlinkHref="#ft-innerPath" />
                    </animateMotion>
                  </circle>
                </g>

                {/* Central E */}
                <g className="ep-eletter" style={{ transformOrigin: '40px 40px' }}>
                  <text x="40" y="44" textAnchor="middle" dominantBaseline="middle"
                    fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="20"
                    fill="url(#ft-eG)"
                    style={{ userSelect: 'none' }}
                  >E</text>
                </g>
              </svg>

              {/* Wordmark */}
              <div className="flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <MotionSpan
                    key={titleIndex}
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -5, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-xl font-display font-semibold text-white tracking-tight leading-none whitespace-nowrap"
                  >
                    {TITLES[titleIndex].lang === 'en' ? (
                      <><span className="text-[#38BDF8]">E</span>-Prayog</>
                    ) : (
                      <><span className="text-[#38BDF8]">ಇ</span>-ಪ್ರಯೋಗ</>
                    )}
                  </MotionSpan>
                </AnimatePresence>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-light">
              {t.footerDesc}
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" aria-label="Twitter" className="text-slate-400 hover:text-[#F1F5F9] transition-colors"><Twitter size={18} /></a>
              <a href="#" aria-label="Github" className="text-slate-400 hover:text-white transition-colors"><Github size={18} /></a>
              <a href="#" aria-label="LinkedIn" className="text-slate-400 hover:text-[#F1F5F9] transition-colors"><Linkedin size={18} /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-medium mb-6 tracking-wider uppercase text-xs">{t.footerPlatform}</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link to="/" className="hover:text-[#F1F5F9] transition-colors">{t.navHome}</Link></li>
              <li><Link to="/subjects" className="hover:text-[#F1F5F9] transition-colors">{t.footerVirtualLabs}</Link></li>
              <li><Link to="/tutor" className="hover:text-[#F1F5F9] transition-colors">{t.navTutor}</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#F1F5F9] transition-colors">{t.navDashboard}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-medium mb-6 tracking-wider uppercase text-xs">{t.footerSupport}</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link to="/contact" className="hover:text-[#F1F5F9] transition-colors">{t.footerContactUs}</Link></li>
              <li><Link to="/about" className="hover:text-[#F1F5F9] transition-colors">{t.footerAboutUs}</Link></li>
              <li><a href="#" className="hover:text-[#F1F5F9] transition-colors">{t.footerPrivacy}</a></li>
              <li><a href="#" className="hover:text-[#F1F5F9] transition-colors">{t.footerTerms}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-medium mb-6 tracking-wider uppercase text-xs">{t.footerFeedback}</h3>
            <p className="text-xs text-slate-400 mb-4 font-light">{t.footerFeedbackDesc}</p>
            <form onSubmit={handleFeedback} className="space-y-4">
              <div className="relative group">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t.footerFeedbackPlaceholder}
                  aria-label="Send feedback"
                  className="w-full bg-[#0D1117] border border-[#1E293B] rounded-2xl p-4 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]/30 focus:bg-[#131B2E] transition-all resize-none h-28 placeholder-slate-600 shadow-inner"
                />
                <button type="submit" aria-label="Submit Feedback" className={`absolute bottom-3 right-3 p-2.5 rounded-xl transition-all ${sent ? 'bg-green-500 text-white' : 'bg-[#38BDF8] text-[#0B1120] hover:bg-[#0EA5E9] font-semibold'}`}>
                  {sent ? <Heart size={16} fill="currentColor" /> : <Send size={16} />}
                </button>
              </div>
              {sent && <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-[#38BDF8] font-medium">{t.footerFeedbackThanks}</motion.p>}
            </form>
          </div>
        </div>

        <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} E-Prayog. {t.footerRights}</p>
          <a href="mailto:sushantshetty09@gmail.com" className="flex items-center gap-2 text-xs text-slate-500 hover:text-[#F1F5F9] transition-colors">
            <Mail size={14} />
            <span>sushantshetty09@gmail.com</span>
          </a>
        </div>

        <div className="w-full text-center mt-6 pt-4 border-t border-white/[0.04] pb-4">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1 font-light">
            {t.footerBuiltFor} <span className="text-[#38BDF8] font-medium tracking-wide">{t.footerKarnatakaStudents}</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
