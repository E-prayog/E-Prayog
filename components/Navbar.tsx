import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, User, Sun, Moon } from 'lucide-react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useAuth } from '../services/AuthContext';
import { useLang, Lang } from '../services/LanguageContext';
import { useTheme } from '../services/ThemeContext';
import EprayogLogo from './EprayogLogo';

const MotionSpan = motion.span as any;

const TITLES = [
  { text: "E-Prayog", lang: "en" },
  { text: "ಇ-ಪ್ರಯೋಗ", lang: "kn" },
];

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profileData, role, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinkClass = (path: string) => `relative text-sm tracking-wide transition-colors duration-200 ${
    isActive(path)
      ? 'text-paper font-medium underline underline-offset-8 decoration-sky decoration-2'
      : 'text-chalk hover:text-paper font-normal'
  }`;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % TITLES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

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

  const displayName = profileData?.name || profileData?.full_name || user?.displayName || user?.email?.split('@')[0] || '';
  const avatarUrl = profileData?.photoURL || user?.photoURL || '';

  const dashboardPath = role === 'Admin' ? '/admin-dashboard' : role === 'Teacher' ? '/teacher-dashboard' : '/dashboard';

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 h-20 px-6 md:px-12 flex items-center justify-between transition-all duration-300 ${
        isScrolled
          ? 'bg-ink border-b border-rule-dark'
          : 'bg-ink/90 md:bg-transparent md:backdrop-blur-sm border-b border-rule-dark/50'
      }`}
      style={{
        backgroundColor: 'var(--ink, #070B14)',
        borderBottom: '1px solid var(--rule-dark, rgba(56,189,248,0.16))',
      }}
    >
      <Link to="/home" className="flex items-center gap-3.5 group min-w-[170px]" style={{ textDecoration: 'none' }}>
        <div className="bg-ink p-1 rounded-sm">
          <EprayogLogo size={38} idSuffix="nav" />
        </div>

        <div className="flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <MotionSpan
              key={titleIndex}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg md:text-xl font-display font-semibold text-paper tracking-tight leading-none"
            >
              {TITLES[titleIndex].lang === 'en' ? (
                <>E-<span className="text-sky">Prayog</span></>
              ) : (
                <>ಇ-<span className="text-sky">ಪ್ರಯೋಗ</span></>
              )}
            </MotionSpan>
          </AnimatePresence>
        </div>
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-8">
        <Link to="/home" className={navLinkClass('/home')}>
          {t.navHome}
        </Link>
        <Link to="/tools" className={navLinkClass('/tools')}>
          {t.navTools}
        </Link>
        <Link to="/about" className={navLinkClass('/about')}>
          {t.navAbout}
        </Link>
        {user && (
          <>
            <Link to="/subjects" className={navLinkClass('/subjects')}>
              {t.navExperiments}
            </Link>
            <Link to="/tutor" className={navLinkClass('/tutor')}>
              {t.navTutor}
            </Link>
            <Link to={dashboardPath} className={navLinkClass(dashboardPath)}>
              {t.navDashboard}
            </Link>
          </>
        )}

        {/* ── Language Switcher: EN / ಕನ್ನಡ / हिं ── */}
        <div className="flex items-center gap-2 text-xs font-mono pl-3 border-l border-rule-dark" title="Change Language">
          <button
            onClick={() => setLang('en')}
            className={`transition-colors py-1 ${lang === 'en' ? 'text-paper underline underline-offset-4 font-semibold' : 'text-chalk hover:text-paper'}`}
          >
            EN
          </button>
          <span className="text-chalk/40 select-none">/</span>
          <button
            onClick={() => setLang('kn')}
            className={`transition-colors py-1 ${lang === 'kn' ? 'text-paper underline underline-offset-4 font-semibold' : 'text-chalk hover:text-paper'}`}
          >
            ಕನ್ನಡ
          </button>
          <span className="text-chalk/40 select-none">/</span>
          <button
            onClick={() => setLang('hi')}
            className={`transition-colors py-1 ${lang === 'hi' ? 'text-paper underline underline-offset-4 font-semibold' : 'text-chalk hover:text-paper'}`}
          >
            हिं
          </button>
        </div>
      </div>

      {/* Right side: avatar or login */}
      <div className="hidden md:flex items-center">
        {user ? (
          <div className="flex items-center gap-3">
            <Link to="/profile" aria-label="View Profile" className="group flex items-center gap-2.5 px-3 py-1.5 rounded-[2px] hover:bg-ink-2 border border-transparent hover:border-rule-dark transition-all">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="size-8 rounded-[2px] object-cover border border-rule-dark" />
              ) : (
                <div className="size-8 rounded-[2px] bg-ink-2 flex items-center justify-center text-paper text-xs font-mono font-bold border border-rule-dark">
                  {displayName?.charAt(0)?.toUpperCase() || <User size={14} />}
                </div>
              )}
              <span className="text-sm text-paper hidden lg:inline font-medium">
                {displayName?.split(' ')[0] || t.navProfile}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="p-2 rounded-[2px] bg-ink-2 hover:bg-red-950/30 text-chalk hover:text-red-400 border border-rule-dark transition-colors"
            >
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
      <button
        className="md:hidden p-2 -mr-2 text-paper hover:text-sky transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X size={26} /> : <Menu size={26} />}
      </button>

      {/* Mobile menu: full-screen ink panel with large Fraunces nav links */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-20 bottom-0 bg-ink z-50 flex flex-col justify-between p-8 md:hidden overflow-y-auto"
            style={{ background: 'var(--ink, #070B14)' }}
          >
            <div className="flex flex-col gap-6">
              {/* Language Switcher */}
              <div className="flex items-center gap-3 text-sm font-mono pb-4 border-b border-rule-dark">
                <span className="text-chalk text-xs uppercase tracking-wider">Language:</span>
                <button
                  onClick={() => setLang('en')}
                  className={`py-1 ${lang === 'en' ? 'text-paper underline underline-offset-4 font-semibold' : 'text-chalk'}`}
                >
                  EN
                </button>
                <span className="text-chalk/40">/</span>
                <button
                  onClick={() => setLang('kn')}
                  className={`py-1 ${lang === 'kn' ? 'text-paper underline underline-offset-4 font-semibold' : 'text-chalk'}`}
                >
                  ಕನ್ನಡ
                </button>
                <span className="text-chalk/40">/</span>
                <button
                  onClick={() => setLang('hi')}
                  className={`py-1 ${lang === 'hi' ? 'text-paper underline underline-offset-4 font-semibold' : 'text-chalk'}`}
                >
                  हिं
                </button>
              </div>

              {/* Fraunces Nav Links */}
              <div className="flex flex-col gap-5 pt-2">
                <Link
                  to="/home"
                  onClick={() => setIsOpen(false)}
                  className={`font-display text-3xl font-medium tracking-tight ${isActive('/home') ? 'text-paper underline underline-offset-8 decoration-sky' : 'text-chalk hover:text-paper'}`}
                >
                  {t.navHome}
                </Link>
                <Link
                  to="/tools"
                  onClick={() => setIsOpen(false)}
                  className={`font-display text-3xl font-medium tracking-tight ${isActive('/tools') ? 'text-paper underline underline-offset-8 decoration-sky' : 'text-chalk hover:text-paper'}`}
                >
                  {t.navTools}
                </Link>
                <Link
                  to="/about"
                  onClick={() => setIsOpen(false)}
                  className={`font-display text-3xl font-medium tracking-tight ${isActive('/about') ? 'text-paper underline underline-offset-8 decoration-sky' : 'text-chalk hover:text-paper'}`}
                >
                  {t.navAbout}
                </Link>
                {user && (
                  <>
                    <Link
                      to="/subjects"
                      onClick={() => setIsOpen(false)}
                      className={`font-display text-3xl font-medium tracking-tight ${isActive('/subjects') ? 'text-paper underline underline-offset-8 decoration-sky' : 'text-chalk hover:text-paper'}`}
                    >
                      {t.navExperiments}
                    </Link>
                    <Link
                      to="/tutor"
                      onClick={() => setIsOpen(false)}
                      className={`font-display text-3xl font-medium tracking-tight ${isActive('/tutor') ? 'text-paper underline underline-offset-8 decoration-sky' : 'text-chalk hover:text-paper'}`}
                    >
                      {t.navTutor}
                    </Link>
                    <Link
                      to={dashboardPath}
                      onClick={() => setIsOpen(false)}
                      className={`font-display text-3xl font-medium tracking-tight ${isActive(dashboardPath) ? 'text-paper underline underline-offset-8 decoration-sky' : 'text-chalk hover:text-paper'}`}
                    >
                      {t.navDashboard}
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setIsOpen(false)}
                      className="font-display text-3xl font-medium tracking-tight text-sky"
                    >
                      {t.navProfile}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Bottom logout / login button */}
            <div className="pt-6 border-t border-rule-dark mt-auto">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-[2px] bg-ink-2 text-paper hover:text-red-400 border border-rule-dark transition-colors font-medium text-base"
                >
                  <LogOut size={18} /> {t.navLogout}
                </button>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)} className="btn-primary w-full justify-center text-center py-3.5 text-base">
                  <LogIn size={18} /> {t.navLogin}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
