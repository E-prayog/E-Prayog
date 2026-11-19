import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Github, Linkedin, Send, Mail, Check } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { useLang } from '../services/LanguageContext';
import EprayogLogo from './EprayogLogo';

const Footer: React.FC = () => {
  const { t } = useLang();
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setFeedback('');
    }, 2500);
  };

  return (
    <footer
      className="border-t pt-16 pb-12 z-10 relative mt-auto"
      style={{
        backgroundColor: 'var(--ink, #16140F)',
        borderColor: 'var(--rule-dark, rgba(241,235,221,0.14))',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand block */}
          <div className="space-y-4">
            <Link to="/home" className="flex items-center gap-3 group" style={{ textDecoration: 'none' }}>
              <div className="bg-ink p-0.5 rounded-[2px]">
                <EprayogLogo size={36} idSuffix="ft" />
              </div>
              <span className="font-display text-2xl font-semibold tracking-tight text-paper">
                E-<span className="text-verdigris">Prayog</span>
              </span>
            </Link>
            <p className="text-chalk text-sm leading-relaxed max-w-xs font-normal">
              {t.footerDesc}
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" aria-label="Twitter" className="text-chalk hover:text-paper transition-colors"><Twitter size={18} /></a>
              <a href="#" aria-label="Github" className="text-chalk hover:text-paper transition-colors"><Github size={18} /></a>
              <a href="#" aria-label="LinkedIn" className="text-chalk hover:text-paper transition-colors"><Linkedin size={18} /></a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-display text-paper font-semibold mb-5 tracking-wider uppercase text-xs">
              {t.footerPlatform}
            </h3>
            <ul className="space-y-3 text-sm text-chalk">
              <li><Link to="/home" className="hover:text-paper transition-colors">{t.navHome}</Link></li>
              <li><Link to="/subjects" className="hover:text-paper transition-colors">{t.footerVirtualLabs}</Link></li>
              <li><Link to="/tutor" className="hover:text-paper transition-colors">{t.navTutor}</Link></li>
              <li><Link to="/dashboard" className="hover:text-paper transition-colors">{t.navDashboard}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-display text-paper font-semibold mb-5 tracking-wider uppercase text-xs">
              {t.footerSupport}
            </h3>
            <ul className="space-y-3 text-sm text-chalk">
              <li><Link to="/contact" className="hover:text-paper transition-colors">{t.footerContactUs}</Link></li>
              <li><Link to="/about" className="hover:text-paper transition-colors">{t.footerAboutUs}</Link></li>
              <li><a href="#" className="hover:text-paper transition-colors">{t.footerPrivacy}</a></li>
              <li><a href="#" className="hover:text-paper transition-colors">{t.footerTerms}</a></li>
            </ul>
          </div>

          {/* Feedback */}
          <div>
            <h3 className="font-display text-paper font-semibold mb-5 tracking-wider uppercase text-xs">
              {t.footerFeedback}
            </h3>
            <p className="text-xs text-chalk mb-4 leading-relaxed">{t.footerFeedbackDesc}</p>
            <form onSubmit={handleFeedback} className="space-y-3">
              <div className="relative">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t.footerFeedbackPlaceholder}
                  aria-label="Send feedback"
                  rows={3}
                  className="w-full bg-ink-2 border border-rule-dark rounded-[2px] p-3 text-sm text-paper focus:outline-none focus:border-verdigris transition-colors resize-none placeholder-chalk/50"
                  style={{ background: 'var(--ink-2, #211E17)' }}
                />
                <button
                  type="submit"
                  aria-label="Submit Feedback"
                  className="absolute bottom-2.5 right-2.5 p-2 rounded-[2px] bg-verdigris text-paper hover:bg-verdigris-deep transition-colors"
                >
                  {sent ? <Check size={14} /> : <Send size={14} />}
                </button>
              </div>
              {sent && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-verdigris font-medium font-mono"
                >
                  {t.footerFeedbackThanks}
                </motion.p>
              )}
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-rule-dark pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-chalk">
          <p>© {new Date().getFullYear()} E-Prayog. {t.footerRights}</p>
          <a
            href="mailto:sushantshetty09@gmail.com"
            className="flex items-center gap-2 hover:text-paper transition-colors font-mono"
          >
            <Mail size={14} />
            <span>sushantshetty09@gmail.com</span>
          </a>
        </div>

        <div className="w-full text-center mt-6 pt-4 border-t border-rule-dark/50 text-xs text-chalk">
          <p>
            {t.footerBuiltFor}{' '}
            <span className="text-paper font-medium tracking-wide">
              {t.footerKarnatakaStudents}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
