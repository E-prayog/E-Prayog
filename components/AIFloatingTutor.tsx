import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Bot, X, Sparkles, User, Maximize2, Minimize2, MapPin } from 'lucide-react';
import { ChatMessage } from '../types';
import { SUBJECTS } from '../constants';
import { createChatSession, sendMessageToGemini, ChatSession } from '../services/geminiService';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../services/LanguageContext';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

function useLabContext() {
  const { pathname } = useLocation();
  return useMemo(() => {
    const match = pathname.match(/^\/subjects\/([\w-]+)\/([\w-]+)$/);
    if (!match) return null;
    const [, subjectId, labId] = match;
    const subject = SUBJECTS.find(s => s.id === subjectId);
    if (!subject) return null;
    const lab = subject.labs.find(l => l.id === labId);
    if (!lab) return null;
    const parts: string[] = [
      `Subject: ${subject.name}`, `Experiment: ${lab.title} (${lab.id})`,
      `Category: ${lab.category}`, `Difficulty: ${lab.difficulty}`, `Duration: ${lab.duration}`,
    ];
    if (lab.content?.aim) parts.push(`Aim: ${lab.content.aim}`);
    if (lab.content?.theory) {
      let theory = lab.content.theory;
      if (theory.length > 800) theory = theory.slice(0, 800) + '…';
      parts.push(`Theory Summary:\n${theory}`);
    }
    if (lab.content?.procedure?.length) parts.push(`Procedure:\n${lab.content.procedure.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    if (lab.content?.vivaQuestions?.length) {
      const vivaSnippet = lab.content.vivaQuestions.slice(0, 5).map(v => `Q: ${v.question}\nA: ${v.answer}`).join('\n');
      parts.push(`Key Viva Questions:\n${vivaSnippet}`);
    }
    return { subjectName: subject.name, labTitle: lab.title, contextString: parts.join('\n\n') };
  }, [pathname]);
}

/* ─────────────── Inline Styles ─────────────── */
const styles = {
  fab: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 45%, #ec4899 100%)',
    boxShadow: '0 8px 32px rgba(139,92,246,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
  } as React.CSSProperties,
  fabHoverRing: {
    background: 'conic-gradient(from 0deg, #0ea5e9, #8b5cf6, #ec4899, #0ea5e9)',
  } as React.CSSProperties,
  panel: {
    background: 'linear-gradient(160deg, rgba(8,8,24,0.97) 0%, rgba(15,10,30,0.97) 100%)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.18)',
  } as React.CSSProperties,
  header: {
    background: 'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(139,92,246,0.2) 50%, rgba(236,72,153,0.12) 100%)',
    borderBottom: '1px solid rgba(139,92,246,0.2)',
  } as React.CSSProperties,
  botAvatar: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 50%, #ec4899 100%)',
    boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
  } as React.CSSProperties,
  msgBotAvatar: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
  } as React.CSSProperties,
  msgUserBubble: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
    boxShadow: '0 4px 16px rgba(14,165,233,0.25)',
  } as React.CSSProperties,
  msgAiBubble: {
    background: 'rgba(139,92,246,0.08)',
    border: '1px solid rgba(139,92,246,0.15)',
  } as React.CSSProperties,
  sendBtn: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
    boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
  } as React.CSSProperties,
  inputFocusRing: {
    border: '1px solid rgba(139,92,246,0.4)',
  } as React.CSSProperties,
  footerBar: {
    background: 'rgba(0,0,0,0.3)',
    borderTop: '1px solid rgba(139,92,246,0.1)',
  } as React.CSSProperties,
};

const AIFloatingTutor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const activeContextRef = useRef<string | null>('__UNINITIALIZED__');
  const labContext = useLabContext();
  const location = useLocation();
  const { t } = useLang();
  const isOnTutorPage = location.pathname === '/tutor';
  const isOnLoginPage = location.pathname === '/login';

  useEffect(() => {
    const newCtx = labContext ? labContext.contextString : null;
    if (newCtx === activeContextRef.current) return;
    activeContextRef.current = newCtx;
    try { chatSessionRef.current = createChatSession(newCtx ?? undefined); } catch { chatSessionRef.current = null; }
    let welcomeText: string;
    if (!chatSessionRef.current) {
      welcomeText = t.aiError;
    } else if (labContext) {
      welcomeText = t.aiGreetingLab.replace('{lab}', labContext.labTitle).replace('{subject}', labContext.subjectName);
    } else {
      welcomeText = t.aiGreeting;
    }
    setMessages([{ id: 'welcome', role: 'model', text: welcomeText, timestamp: Date.now() }]);
  }, [labContext, t.aiGreeting, t.aiGreetingLab, t.aiError]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !chatSessionRef.current) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    const tempId = 'temp-' + Date.now();
    setMessages(prev => [...prev, { id: tempId, role: 'model', text: '', timestamp: Date.now(), isThinking: true }]);
    try {
      await sendMessageToGemini(
        chatSessionRef.current,
        userMsg.text,
        (chunk: string) => {
          setMessages(prev => prev.map(msg =>
            msg.id === tempId
              ? { ...msg, text: msg.text + chunk, isThinking: false }
              : msg
          ));
        }
      );
    } catch (error: any) {
      let errorMessage = t.aiError;
      if (error?.message?.includes('429')) errorMessage = t.aiRateLimit;
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? { ...msg, text: errorMessage, isThinking: false } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, t.aiError, t.aiRateLimit]);

  if (isOnTutorPage || isOnLoginPage) return null;

  const panelHeight = isExpanded ? 'h-[85vh]' : 'h-[520px]';
  const panelWidth = isExpanded ? 'w-[480px]' : 'w-[380px]';

  return (
    <>
      {/* Gradient shimmer keyframe */}
      <style>{`
        @keyframes ai-shimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes ai-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .ai-fab-ring {
          background: conic-gradient(from 0deg, #0ea5e9, #8b5cf6, #ec4899, #f59e0b, #0ea5e9);
          animation: ai-orbit 3s linear infinite;
        }
        .ai-gradient-text {
          background: linear-gradient(90deg, #0ea5e9, #8b5cf6, #ec4899);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: ai-shimmer 3s ease infinite;
        }
        .ai-scrollbar::-webkit-scrollbar { width: 4px; }
        .ai-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .ai-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #0ea5e9, #8b5cf6);
          border-radius: 4px;
        }
        .ai-dot-bounce-1 { animation: bounce 1s infinite 0ms; }
        .ai-dot-bounce-2 { animation: bounce 1s infinite 150ms; }
        .ai-dot-bounce-3 { animation: bounce 1s infinite 300ms; }
      `}</style>

      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <MotionButton
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 size-14 rounded-full flex items-center justify-center cursor-pointer group"
            style={styles.fab}
            aria-label="Open AI Tutor"
            id="ai-tutor-fab"
          >
            <Bot size={24} className="text-white group-hover:rotate-12 transition-transform duration-200 relative z-10" />

            {/* Rotating conic ring */}
            <span
              className="absolute inset-[-3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ai-fab-ring"
              style={{ zIndex: 0, padding: '2px' }}
            />
            <span className="absolute inset-0 rounded-full opacity-60" style={styles.fab} />

            {/* Pulse rings */}
            <span className="absolute inset-0 rounded-full border-2 border-sky-400 animate-ping opacity-20" />

            {/* Lab context indicator */}
            {labContext && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full border-2 border-[#08081a] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
                <Sparkles size={8} className="text-white" />
              </span>
            )}
          </MotionButton>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={`fixed bottom-6 right-6 z-40 ${panelWidth} ${panelHeight} flex flex-col rounded-2xl overflow-hidden backdrop-blur-xl`}
            style={styles.panel}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3" style={styles.header}>
              <div className="flex items-center gap-3 min-w-0">
                {/* Bot avatar with animated gradient ring */}
                <div className="relative size-9 flex-shrink-0">
                  <div className="absolute inset-[-2px] rounded-full ai-fab-ring opacity-70" />
                  <div className="relative w-full h-full rounded-full flex items-center justify-center" style={styles.botAvatar}>
                    <Bot size={17} className="text-white" />
                  </div>
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold flex items-center gap-1.5 truncate">
                    <span className="ai-gradient-text">AI Lab Tutor</span>
                    <Sparkles size={12} className="text-amber-400 animate-pulse flex-shrink-0" />
                  </h2>
                  {labContext ? (
                    <p className="text-[10px] font-mono truncate flex items-center gap-1" style={{ color: '#a78bfa' }}>
                      <MapPin size={10} className="shrink-0" />
                      <span>{labContext.labTitle}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] font-mono" style={{ color: 'rgba(167,139,250,0.6)' }}>{t.aiGeneral}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setIsExpanded(e => !e)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(236,72,153,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 ai-scrollbar"
              style={{ background: 'rgba(0,0,0,0.25)' }}
            >
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div
                    className="size-7 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                    style={msg.role === 'model' ? styles.msgBotAvatar : { background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' }}
                  >
                    {msg.role === 'model' ? <Bot size={13} /> : <User size={13} />}
                  </div>

                  {/* Bubble */}
                  <div
                    className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed text-white"
                    style={msg.role === 'user'
                      ? { ...styles.msgUserBubble, borderRadius: '16px 4px 16px 16px' }
                      : { ...styles.msgAiBubble, color: '#e2e8f0', borderRadius: '4px 16px 16px 16px' }}
                  >
                    {msg.isThinking && msg.text === '' ? (
                      <div className="flex gap-1.5 h-5 items-center py-1">
                        <span className="size-1.5 rounded-full ai-dot-bounce-1" style={{ background: 'linear-gradient(135deg,#0ea5e9,#8b5cf6)' }} />
                        <span className="size-1.5 rounded-full ai-dot-bounce-2" style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }} />
                        <span className="size-1.5 rounded-full ai-dot-bounce-3" style={{ background: 'linear-gradient(135deg,#ec4899,#f59e0b)' }} />
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Input Footer ── */}
            <div className="px-3 py-3" style={styles.footerBar}>
              <div
                className="relative flex items-center rounded-full transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: inputFocused
                    ? '1px solid rgba(139,92,246,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: inputFocused ? '0 0 0 3px rgba(139,92,246,0.12)' : 'none',
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full bg-transparent py-3 pl-4 pr-12 text-sm text-white placeholder-zinc-500 focus:outline-none"
                  placeholder={labContext ? t.aiAskLabPlaceholder.replace('{lab}', labContext.labTitle) : t.aiAskPlaceholder}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1.5 size-8 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 active:scale-95"
                  style={styles.sendBtn}
                >
                  <Send size={13} />
                </button>
              </div>
              <p className="text-center mt-1.5" style={{ fontSize: '9px', color: 'rgba(139,92,246,0.4)' }}>
                {t.aiDisclaimer}
              </p>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIFloatingTutor;
