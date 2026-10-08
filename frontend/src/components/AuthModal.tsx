import React, { useState, useEffect } from 'react';
import { loginApi, registerApi, type User } from '../api/auth';
import { Lock, Mail, User as UserIcon, AlertCircle, ArrowRight, Sparkles, X } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: User) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onClose, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await loginApi(username, password);
      } else {
        if (!email) {
          setError('Email is required for registration');
          setLoading(false);
          return;
        }
        res = await registerApi(username, email, password);
      }
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    setLoading(true);
    const demoUser = 'student_demo';
    const demoEmail = 'student@university.edu';
    const demoPass = 'Password123!';

    try {
      let res;
      try {
        res = await loginApi(demoUser, demoPass);
      } catch {
        res = await registerApi(demoUser, demoEmail, demoPass);
      }
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-[#11141D] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="text-center space-y-3 mb-6">
          <div className="flex justify-center mb-1">
            <img
              src="/logo_white.png"
              alt="Finora"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isLogin
                ? 'Enter your credentials to access your dashboard'
                : 'Start tracking expenses, receipts, and budgets'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Username {isLogin && 'or Email'}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isLogin ? 'Enter username or email' : 'Choose a username'}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#161A26] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#161A26] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#161A26] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/25 active:scale-[0.99]"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.08]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#11141D] px-2 text-slate-500 font-medium">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleQuickDemo}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#161A26] hover:bg-[#1C2232] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Quick Demo Login (One Click)
        </button>

        <div className="mt-5 text-center text-xs text-slate-400">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-indigo-400 hover:text-indigo-300 font-medium underline-offset-2 hover:underline ml-1"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
