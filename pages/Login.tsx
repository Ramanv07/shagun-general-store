
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockApi } from '../services/mockService';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const user = await mockApi.login(formData.email, formData.password);
        login(user);
        navigate(user.role === 'admin' ? '/admin' : '/');
      } else {
        if (!formData.email.endsWith('@gmail.com')) {
          setError('Only @gmail.com accounts are allowed.');
          setLoading(false);
          return;
        }
        const user = await mockApi.register(formData.name, formData.email, formData.password);
        login(user);
        navigate('/');
      }
    } catch {
      setError('Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const [showForgot, setShowForgot] = useState(false);

  // WCAG 2.1.2: Close forgot password modal on Escape
  useEffect(() => {
    if (!showForgot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowForgot(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgot]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FBF3E7 0%, #F0E4CC 100%)' }}
    >
      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full gradient-maroon flex items-center justify-center shadow-maroon-md">
              <span className="text-2xl font-serif font-bold text-gold-400">S</span>
            </div>
            <div>
              <div className="font-serif font-bold text-maroon-700 text-lg tracking-wide">SHAGUN</div>
              <div className="text-[9px] tracking-widest text-cream-700">GENERAL STORE</div>
            </div>
          </Link>
        </div>

        <div className="card p-8">
          {/* Tabs */}
          <div className="flex bg-cream-200/80 p-1.5 rounded-2xl mb-7" role="tablist" aria-label="Sign in or register options">
            <button
              role="tab"
              type="button"
              aria-selected={isLogin}
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                isLogin
                  ? 'bg-maroon-900 text-white shadow-md'
                  : 'text-cream-800 hover:text-maroon-900'
              }`}
            >
              Sign In
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={!isLogin}
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                !isLogin
                  ? 'bg-maroon-900 text-white shadow-md'
                  : 'text-cream-800 hover:text-maroon-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          <h1 className="font-serif text-xl font-bold text-maroon-700 mb-1">
            {isLogin ? 'Welcome back!' : 'Create an account'}
          </h1>
          <p className="text-sm text-cream-700 mb-6">
            {isLogin ? 'Enter your credentials to continue shopping.' : 'Join us and enjoy exclusive deals.'}
          </p>

          {/* Error */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2"
            >
              <i className="fas fa-circle-exclamation flex-shrink-0" aria-hidden="true" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="login-name-input" className="text-xs font-semibold text-maroon-700 uppercase tracking-wider mb-1.5 block">
                  Full Name
                </label>
                <div className="relative">
                  <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-sm" aria-hidden="true" />
                  <input
                    id="login-name-input"
                    type="text"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={set('name')}
                    required
                    className="input-field pl-10"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="login-email-input" className="text-xs font-semibold text-maroon-700 uppercase tracking-wider mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-sm" aria-hidden="true" />
                <input
                  id="login-email-input"
                  type="email"
                  placeholder="you@gmail.com"
                  value={formData.email}
                  onChange={set('email')}
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password-input" className="text-xs font-semibold text-maroon-700 uppercase tracking-wider block">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-maroon-600 hover:text-gold-700 transition-colors font-medium focus-visible:outline-2 focus-visible:outline-maroon-900"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-sm" aria-hidden="true" />
                <input
                  id="login-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={set('password')}
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center btn-lg mt-2"
            >
              {loading
                ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Processing…</>
                : isLogin
                  ? <><i className="fas fa-right-to-bracket" aria-hidden="true" /> Sign In</>
                  : <><i className="fas fa-user-plus" aria-hidden="true" /> Create Account</>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-cream-700 mt-6">
          By continuing you agree to our{' '}
          <Link to="/privacy" className="text-maroon-600 hover:underline">Terms</Link> and{' '}
          <Link to="/privacy" className="text-maroon-600 hover:underline">Privacy Policy</Link>.
        </p>

        {/* Forgot Password Modal (WCAG 4.1.2 Dialog) */}
        {showForgot && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-password-dialog-title"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center animate-scale-in">
              <div className="w-14 h-14 bg-maroon-50 rounded-full flex items-center justify-center mx-auto mb-4 text-maroon-600 text-2xl">
                <i className="fas fa-key" aria-hidden="true" />
              </div>
              <h2 id="reset-password-dialog-title" className="font-serif font-bold text-lg text-maroon-800 mb-2">Reset Password</h2>
              <p className="text-xs text-cream-700 mb-6 leading-relaxed">
                For security, please contact store administration via WhatsApp or phone with your registered email address to receive a secure password reset link.
              </p>
              <div className="space-y-2">
                <a
                  href="https://wa.me/918827259023?text=Hello,%20I%20need%20assistance%20resetting%20my%20Shagun%20Store%20account%20password."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full justify-center text-xs"
                >
                  <i className="fab fa-whatsapp mr-1 text-sm" aria-hidden="true" /> Contact on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="btn btn-outline w-full justify-center text-xs"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
