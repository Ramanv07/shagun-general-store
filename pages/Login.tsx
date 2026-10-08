import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockApi } from '../services/mockService';
import { auth, googleProvider, signInWithPopup } from '../services/firebase';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after login/signup
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || '/';
  const customMessage = searchParams.get('msg');

  // Sign In form state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot password modal
  const [showForgot, setShowForgot] = useState(false);

  // Close forgot password modal on Escape
  useEffect(() => {
    if (!showForgot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowForgot(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgot]);

  // Handle Google Sign-In (1-click)
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser) throw new Error('Google sign-in was cancelled');

      const user = await mockApi.loginWithGoogle({
        name: fbUser.displayName || 'Google User',
        email: fbUser.email || '',
        avatar: fbUser.photoURL || undefined,
        googleId: fbUser.uid
      });

      login(user);
      sessionStorage.setItem('shagun_guest_browse', 'true');
      navigate(redirectUrl);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim() || !loginPassword) {
      setError('Please enter your email/phone and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await mockApi.login(identifier.trim(), loginPassword);
      login(user);
      sessionStorage.setItem('shagun_guest_browse', 'true');
      navigate(redirectUrl);
    } catch (err: any) {
      console.error('Login Error:', err);
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Handler (Direct Registration - No OTP)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    setLoading(true);
    try {
      const user = await mockApi.register(name.trim(), email.trim(), password, cleanPhone);
      login(user);
      sessionStorage.setItem('shagun_guest_browse', 'true');
      navigate(redirectUrl);
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Skip for now — Guest Browse
  const handleSkip = () => {
    sessionStorage.setItem('shagun_guest_browse', 'true');
    navigate(redirectUrl || '/');
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex flex-col justify-center items-center px-4 py-12">
      {/* Top Brand Logo / Header */}
      <div className="mb-6 text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-700 shadow-2xs group-hover:scale-105 transition-transform">
            <i className="fas fa-store text-lg" />
          </div>
          <div className="text-left">
            <span className="font-serif tracking-wider text-xl font-bold text-gray-900 block leading-tight">
              SHAGUN
            </span>
            <span className="text-[10px] tracking-[0.25em] text-gray-500 font-medium block">
              MART
            </span>
          </div>
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-sm border border-gray-100/80">
          {/* Centered Pill Switcher [ Login ] [ Sign Up ] */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-gray-100/90 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setSuccess('');
                }}
                className={`flex items-center gap-1.5 px-6 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isLogin
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <i className="fas fa-arrow-right-to-bracket text-[11px]" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setSuccess('');
                }}
                className={`flex items-center gap-1.5 px-6 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !isLogin
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <i className="fas fa-user-plus text-[11px]" />
                <span>Sign Up</span>
              </button>
            </div>
          </div>

          {/* Checkout redirect message */}
          {customMessage && (
            <div className="mb-5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <i className="fas fa-info-circle text-amber-600 shrink-0 text-sm" />
              <span>{customMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="mb-5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-fade-in"
            >
              <i className="fas fa-circle-exclamation text-rose-500 shrink-0 mt-0.5 text-sm" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div
              role="status"
              className="mb-5 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fade-in"
            >
              <i className="fas fa-circle-check text-emerald-600 shrink-0 text-sm" />
              <span>{success}</span>
            </div>
          )}

          {/* Continue with Google button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-sm font-medium rounded-xl flex items-center justify-center gap-3 transition-colors shadow-2xs cursor-pointer mb-5"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* OR Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white px-3 text-gray-400 font-medium">
                {isLogin ? 'OR EMAIL / MOBILE' : 'OR WITH EMAIL'}
              </span>
            </div>
          </div>

          {/* ─────────────────── LOGIN VIEW ─────────────────── */}
          {isLogin ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
                  Email or Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="name@email.com or 10-digit mobile"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-medium text-gray-700 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#18181b] hover:bg-black text-white font-medium text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin text-sm" /> Signing in…</>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          ) : (
            /* ─────────────────── SIGN UP VIEW ─────────────────── */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
                  Mobile Number <span className="text-gray-400 font-normal">(for delivery orders)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shrink-0">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas ${showSignupPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#18181b] hover:bg-black text-white font-medium text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin text-sm" /> Creating account…</>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>
          )}

          {/* Bottom Switch Prompt */}
          <div className="text-center text-xs text-gray-500 mt-6 pt-5 border-t border-gray-100">
            {isLogin ? (
              <span>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="font-semibold text-gray-900 hover:underline cursor-pointer ml-1"
                >
                  Sign up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="font-semibold text-gray-900 hover:underline cursor-pointer ml-1"
                >
                  Login
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Skip for now / Browse as Guest Button */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-lg hover:bg-gray-200/50"
          >
            <span>Skip for now — Browse Store as Guest</span>
            <i className="fas fa-arrow-right text-[10px]" />
          </button>
        </div>

        {/* Creator Signature */}
        <div className="mt-5 text-center text-[11px] text-gray-400 font-medium tracking-wide">
          Created by <span className="font-semibold text-gray-700">R-V</span>
        </div>

        {/* Forgot Password Modal */}
        {showForgot && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center animate-scale-in border border-gray-100">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-800 text-lg">
                <i className="fas fa-key" />
              </div>
              <h2 className="font-semibold text-base text-gray-900 mb-1.5">Reset Password</h2>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Contact store administration via WhatsApp with your registered mobile or email to receive reset assistance.
              </p>
              <div className="space-y-2">
                <a
                  href="https://wa.me/918827259023?text=Hello,%20I%20need%20assistance%20resetting%20my%20Shagun%20Store%20account%20password."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-[#18181b] hover:bg-black text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <i className="fab fa-whatsapp text-sm" /> WhatsApp Support
                </a>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
