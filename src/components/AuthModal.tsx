/**
 * AuthModal.tsx — Slide-in modal for Login / Register.
 * Supports guest mode (close without logging in).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Tab = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const reset = () => {
    setError(null);
    setEmail('');
    setUsername('');
    setPassword('');
    setLoading(false);
  };

  const switchTab = (t: Tab) => {
    reset();
    setTab(t);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">

              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary to-primary/80 p-8 text-white">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    {tab === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                  </div>
                  <h2 className="text-2xl font-black">
                    {tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                  </h2>
                </div>
                <p className="text-white/70 text-sm">
                  {tab === 'login'
                    ? 'Đăng nhập để lưu lịch sử phân tích của bạn.'
                    : 'Tạo tài khoản miễn phí để lưu kết quả phân tích.'}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                {(['login', 'register'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                      tab === t
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm"
                    >
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Username (register only) */}
                <AnimatePresence>
                  {tab === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Username</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required={tab === 'register'}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="myusername"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mật khẩu</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : tab === 'login' ? (
                    <><LogIn size={18} /> Đăng nhập</>
                  ) : (
                    <><UserPlus size={18} /> Tạo tài khoản</>
                  )}
                </button>

                {/* Guest hint */}
                <p className="text-center text-xs text-slate-400">
                  Bạn có thể{' '}
                  <button type="button" onClick={onClose} className="text-primary font-bold hover:underline">
                    dùng thử mà không cần đăng nhập
                  </button>
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
