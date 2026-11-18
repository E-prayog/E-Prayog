import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Lock, Mail, ArrowRight, ShieldCheck, Link as LinkIcon, Loader2, BookOpen } from 'lucide-react';
import { m as motion } from 'framer-motion';

const StaffLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Pre-fill placeholder emails for convenience (no passwords auto-filled)
    if (type === 'admin') {
      setEmail('');
    } else if (type === 'teacher') {
      setEmail('');
    }
  }, [type]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (cred.user) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 size-96 bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 size-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className={`size-16 rounded-2xl bg-gradient-to-tr ${type === 'teacher' ? 'from-purple-600 to-violet-600 shadow-purple-500/20' : 'from-red-600 to-purple-600 shadow-red-500/20'} flex items-center justify-center mb-4 shadow-lg`}>
            {type === 'teacher' ? <BookOpen size={32} className="text-white" /> : <ShieldCheck size={32} className="text-white" />}
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            {type === 'teacher' ? 'Teacher Portal Access' : 'Admin Portal Access'}
          </h1>
          <p className="text-sm text-zinc-400 text-center">
            Restricted access for authorized personnel only.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Work Email</span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                id="staff-email"
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eprayog.com"
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Password</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                id="staff-password"
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>Secure Login <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <button onClick={() => navigate('/login')} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2 mx-auto">
            <LinkIcon size={14} /> Return to Student Login
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffLogin;
