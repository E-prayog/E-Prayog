import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, User, Languages } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useAuth } from '../services/AuthContext';
import { useLang, Lang } from '../services/LanguageContext';

const LANG_OPTIONS: { code: Lang; label: string; fullLabel: string }[] = [
  { code: 'en', label: 'English', fullLabel: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ', fullLabel: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिंदी', fullLabel: 'हिंदी' },
];

const MotionSpan = motion.span as any;

const TITLES = [
  { text: "E-Prayog", lang: "en" },
  { text: "ಇ-ಪ್ರಯೋಗ", lang: "kn" },
];

// Auth-dependent nav items (shown only when logged in)
const AUTH_NAV_ITEMS = [
  { label: 'Experiments', path: '/subjects' },
  { label: 'AI Tutor', path: '/tutor' },
];

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profileData, role, signOut } = useAuth();
  const { lang, setLang, t } = useLang();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinkClass = (path: string) => `relative text-sm font-medium transition-colors duration-300 ${
    isActive(path)
      ? 'text-[#F1F5F9]'
      : 'text-slate-400 hover:text-[#F1F5F9]'
  }`;

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % TITLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await signOut();
      navigate('/home', { replace: true });
    } catch (error) {
      console.error("Logout Error:", error);
      navigate('/home', { replace: true });
    }
  };

  // Display info: prefer name, fallback to full_name, then Firebase displayName
  const displayName = profileData?.name || profileData?.full_name || user?.displayName || user?.email?.split('@')[0] || '';
  const avatarUrl = profileData?.photoURL || user?.photoURL || '';
  const avatarClass = profileData?.avatar && profileData.avatar.startsWith('bg-') ? profileData.avatar : 'bg-[#38BDF8]';

  // Dashboard link: role-aware
  const dashboardPath = role === 'Admin' ? '/admin-dashboard' : role === 'Teacher' ? '/teacher-dashboard' : '/dashboard';

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass-nav h-20 px-6 md:px-12 flex items-center justify-between transition-colors duration-300 border-b border-[#1E293B]">
      <Link to="/home" className="ep-logo-link flex items-center gap-3 group min-w-[180px]" style={{textDecoration:'none'}}>
        {/* ── Animated Orbital Logo Mark ── */}
        <svg
          className="ep-nav-svg transition-transform duration-300 group-hover:scale-105"
          viewBox="0 0 80 80"
          width="44"
          height="44"
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          aria-hidden="true"
          style={{overflow:'visible',flexShrink:0}}
        >
          <defs>
            <linearGradient id="nav-outerG" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.9"/>
            </linearGradient>
            <linearGradient id="nav-innerG" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9"/>
            </linearGradient>
            <linearGradient id="nav-eG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F1F5F9"/>
              <stop offset="100%" stopColor="#38BDF8"/>
            </linearGradient>
            <path id="nav-outerPath" d="M 67.2,40 A 27.2,11.2 0 1 1 67.19,39.97" fill="none"/>
            <path id="nav-innerPath" d="M 57.6,40 A 17.6,7.2 0 1 1 57.59,39.97" fill="none"/>
          </defs>

          {/* Outer ring */}
          <g className="ep-outer-ring" style={{transformOrigin:'40px 40px'}}>
            <ellipse cx="40" cy="40" rx="27.2" ry="11.2"
              fill="none" stroke="url(#nav-outerG)" strokeWidth="1.6" strokeOpacity="0.8"
              transform="rotate(-20,40,40)"
            />
          </g>

          {/* Inner ring */}
          <g className="ep-inner-ring" style={{transformOrigin:'40px 40px'}}>
            <ellipse cx="40" cy="40" rx="17.6" ry="7.2"
              fill="none" stroke="url(#nav-innerG)" strokeWidth="1.6" strokeOpacity="0.8"
              transform="rotate(55,40,40)"
            />
          </g>

          {/* Outer electrons */}
          <g className="ep-outer-ring" style={{transformOrigin:'40px 40px'}}>
            <circle r="2.2" fill="#38BDF8">
              <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear">
                <mpath xlinkHref="#nav-outerPath"/>
              </animateMotion>
            </circle>
            <circle r="2.2" fill="#38BDF8" begin="-3s">
              <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear" begin="-3s">
                <mpath xlinkHref="#nav-outerPath"/>
              </animateMotion>
            </circle>
          </g>

          {/* Inner electron */}
          <g className="ep-inner-ring" style={{transformOrigin:'40px 40px'}}>
            <circle r="2" fill="#38BDF8">
              <animateMotion dur="4s" repeatCount="indefinite" calcMode="linear">
                <mpath xlinkHref="#nav-innerPath"/>
              </animateMotion>
            </circle>
          </g>

          {/* Central E */}
          <g className="ep-eletter" style={{transformOrigin:'40px 40px'}}>
            <text x="40" y="44" textAnchor="middle" dominantBaseline="middle"
              fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="20"
              fill="url(#nav-eG)"
              style={{userSelect:'none'}}
            >E</text>
          </g>
        </svg>

        {/* ── Wordmark ── */}
        <div className="flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <MotionSpan
              key={titleIndex}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-xl font-display font-semibold text-[#F1F5F9] tracking-tight leading-none"
            >
              {TITLES[titleIndex].lang === 'en' ? (
                <>E-<span className="text-[#38BDF8]">Prayog</span></>
              ) : (
                <>ಇ-<span className="text-[#38BDF8]">ಪ್ರಯೋಗ</span></>
              )}
            </MotionSpan>
          </AnimatePresence>
        </div>
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-8">
        <Link to="/home" className={navLinkClass('/home')}>
          {t.navHome}{isActive('/home') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#38BDF8] rounded-full" />}
        </Link>
        <Link to="/tools" className={navLinkClass('/tools')}>
          {t.navTools}{isActive('/tools') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#38BDF8] rounded-full" />}
        </Link>
        <Link to="/about" className={navLinkClass('/about')}>
          {t.navAbout}{isActive('/about') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#38BDF8] rounded-full" />}
        </Link>
        {user && (
          <>
            <Link to="/subjects" className={navLinkClass('/subjects')}>
              {t.navExperiments}{isActive('/subjects') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#38BDF8] rounded-full" />}
            </Link>
            <Link to="/tutor" className={navLinkClass('/tutor')}>
              {t.navTutor}{isActive('/tutor') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#38BDF8] rounded-full" />}
            </Link>
            <Link to={dashboardPath} className={navLinkClass(dashboardPath)}>
              {t.navDashboard}{isActive(dashboardPath) && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#38BDF8] rounded-full" />}
            </Link>
          </>
        )}

        {/* ── Language Switcher ── */}
        <div className="flex items-center gap-1 bg-[#131B2E] rounded-full p-1 border border-[#1E293B]" title="Change Language">
          <Languages size={14} className="text-slate-500 mx-2" />
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.code}
              onClick={() => setLang(opt.code)}
              title={opt.fullLabel}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                lang === opt.code
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right side: avatar or login */}
      <div className="hidden md:flex items-center">
        {user ? (
          <div className="flex items-center gap-3">
            <Link to="/profile" aria-label="View Profile" className="group flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-[#131B2E] transition-all">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="size-8 rounded-full object-cover border border-[#1E293B]" />
              ) : (
                <div className={`size-8 rounded-full ${avatarClass} flex items-center justify-center text-white text-xs font-bold border border-[#1E293B]`}>
                  {displayName?.charAt(0)?.toUpperCase() || <User size={14} />}
                </div>
              )}
              <span className="text-sm text-slate-300 hidden lg:inline font-medium">
                {displayName?.split(' ')[0] || t.navProfile}
              </span>
            </Link>
            <button onClick={handleLogout} aria-label="Logout" className="p-2 rounded-full bg-[#131B2E] hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-[#1E293B] transition-all">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link to="/login">
            <button className="btn-primary py-2 px-5 text-sm">
              <LogIn size={16} /> {t.navLogin}
            </button>
          </Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <button className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white transition-colors" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Close menu" : "Open menu"}>
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-20 left-0 w-full glass-nav flex flex-col p-6 gap-4 md:hidden border-b border-white/5 shadow-2xl"
          >
            {/* Mobile Language Switcher */}
            <div className="flex items-center gap-2">
              <Languages size={14} className="text-slate-500" />
              <span className="text-xs text-slate-500 font-semibold">Language / ಭಾಷೆ / भाषा:</span>
            </div>
            <div className="flex gap-2">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.code}
                  onClick={() => setLang(opt.code)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    lang === opt.code
                      ? 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20'
                      : 'bg-[#1A202C]/50 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {opt.fullLabel}
                </button>
              ))}
            </div>
            <hr className="border-[#1E293B]" />
            <Link to="/home" onClick={() => setIsOpen(false)} className={`text-lg font-medium transition-colors ${isActive('/home') ? 'text-[#38BDF8]' : 'text-slate-300 hover:text-white'}`}>{t.navHome}</Link>
            <Link to="/tools" onClick={() => setIsOpen(false)} className={`text-lg font-medium transition-colors ${isActive('/tools') ? 'text-[#38BDF8]' : 'text-slate-300 hover:text-white'}`}>{t.navTools}</Link>
            <Link to="/about" onClick={() => setIsOpen(false)} className={`text-lg font-medium transition-colors ${isActive('/about') ? 'text-[#38BDF8]' : 'text-slate-300 hover:text-white'}`}>{t.navAbout}</Link>
            {user && (
              <>
                <hr className="border-[#1E293B]" />
                <Link to="/subjects" onClick={() => setIsOpen(false)} className={`text-lg font-medium transition-colors ${isActive('/subjects') ? 'text-[#38BDF8]' : 'text-slate-300 hover:text-white'}`}>{t.navExperiments}</Link>
                <Link to="/tutor" onClick={() => setIsOpen(false)} className={`text-lg font-medium transition-colors ${isActive('/tutor') ? 'text-[#38BDF8]' : 'text-slate-300 hover:text-white'}`}>{t.navTutor}</Link>
                <Link to={dashboardPath} onClick={() => setIsOpen(false)} className={`text-lg font-medium transition-colors ${isActive(dashboardPath) ? 'text-[#38BDF8]' : 'text-slate-300 hover:text-white'}`}>{t.navDashboard}</Link>
                <Link to="/profile" onClick={() => setIsOpen(false)} className="text-lg font-medium text-[#38BDF8]">{t.navProfile}</Link>
              </>
            )}
            <hr className="border-[#1E293B] mt-2" />
            {user ? (
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors border border-red-500/20">
                <LogOut size={18} /> {t.navLogout}
              </button>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="btn-primary w-full justify-center text-center py-3">
                <LogIn size={18} /> {t.navLogin}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
