
import React, { useState } from 'react';
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

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FBF3E7 0%, #F0E4CC 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[120px] opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(122,31,46,0.15), transparent)' }} />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full blur-[100px] opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(201,162,75,0.2), transparent)' }} />

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
          <div className="flex rounded-xl overflow-hidden border border-cream-300 mb-7">
            {(['Sign In', 'Sign Up'] as const).map((label, i) => (
              <button
                key={label}
                onClick={() => { setIsLogin(i === 0); setError(''); }}
                className={`flex-1 py-3 text-sm font-semibold transition-all
                  ${(isLogin && i === 0) || (!isLogin && i === 1)
                    ? 'bg-maroon-600 text-white'
                    : 'bg-white text-cream-700 hover:text-maroon-600'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <h2 className="font-serif text-xl font-bold text-maroon-700 mb-1">
            {isLogin ? 'Welcome back!' : 'Create an account'}
          </h2>
          <p className="text-sm text-cream-700 mb-6">
            {isLogin ? 'Enter your credentials to continue shopping.' : 'Join us and enjoy exclusive deals.'}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
              <i className="fas fa-circle-exclamation flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs font-semibold text-maroon-700 uppercase tracking-wider mb-1.5 block">
                  Full Name
                </label>
                <div className="relative">
                  <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-sm" />
                  <input
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
              <label className="text-xs font-semibold text-maroon-700 uppercase tracking-wider mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-sm" />
                <input
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
              <label className="text-xs font-semibold text-maroon-700 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-sm" />
                <input
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
                ? <><i className="fas fa-spinner fa-spin" /> Processing…</>
                : isLogin
                  ? <><i className="fas fa-right-to-bracket" /> Sign In</>
                  : <><i className="fas fa-user-plus" /> Create Account</>
              }
            </button>
          </form>

          {/* Admin hint */}
          {isLogin && (
            <div className="mt-4 p-3 rounded-xl bg-cream-200 text-xs text-cream-700 text-center">
              <i className="fas fa-shield text-gold-500 mr-1" />
              Admin: <strong>admin@shagun.com</strong> / <strong>admin123</strong>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-cream-700 mt-6">
          By continuing you agree to our{' '}
          <a href="#" className="text-maroon-600 hover:underline">Terms</a> and{' '}
          <a href="#" className="text-maroon-600 hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};
