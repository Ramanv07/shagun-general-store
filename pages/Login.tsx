import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockApi } from '../services/mockService';
import { 
  auth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  googleProvider, 
  signInWithPopup, 
  ConfirmationResult 
} from '../services/firebase';

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

  // Sign In state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up state
  const [signupStep, setSignupStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [showForgot, setShowForgot] = useState(false);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  // Close forgot password modal on Escape
  useEffect(() => {
    if (!showForgot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowForgot(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgot]);

  // Initialize invisible reCAPTCHA verifier
  const getRecaptchaVerifier = () => {
    if (typeof window === 'undefined') return null;
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch {
        // ignore
      }
      (window as any).recaptchaVerifier = null;
    }

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please try sending OTP again.');
      }
    });

    (window as any).recaptchaVerifier = verifier;
    return verifier;
  };

  // STEP 1: Send OTP to Phone
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      // Check if number already registered
      const exists = await mockApi.checkPhone(cleanPhone);
      if (exists) {
        setError('An account with this mobile number already exists. Please switch to Sign In.');
        setLoading(false);
        return;
      }

      const verifier = getRecaptchaVerifier();
      if (!verifier) {
        throw new Error('Could not initialize reCAPTCHA verifier.');
      }

      const formattedPhone = `+91${cleanPhone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setSignupStep('otp');
      setResendTimer(60);
      setSuccess(`OTP sent to +91 ${cleanPhone}`);
    } catch (err: any) {
      console.error('Firebase OTP Error:', err);
      if (err?.code === 'auth/invalid-phone-number') {
        setError('Invalid mobile number format.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('Phone Authentication is not enabled or India (+91) region is not allowed in Firebase Console. Please enable Phone in Firebase > Authentication > Sign-in method.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many OTP attempts. Please wait a few minutes before trying again.');
      } else if (err?.code === 'auth/quota-exceeded') {
        setError('Daily SMS quota exceeded. Please contact support or try later.');
      } else {
        setError(err?.message || 'Failed to send OTP. Please check your connection and try again.');
      }

      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the 6-digit OTP code received on your mobile.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      setSignupStep('phone');
      return;
    }

    setLoading(true);
    try {
      await confirmationResult.confirm(cleanOtp);
      setSuccess('Mobile number verified! Enter your details to create your account.');
      setSignupStep('details');
    } catch (err: any) {
      console.error('OTP Verification Error:', err);
      if (err?.code === 'auth/invalid-verification-code') {
        setError('Incorrect OTP code. Please check your SMS and try again.');
      } else if (err?.code === 'auth/code-expired') {
        setError('This OTP has expired. Please request a new code.');
      } else {
        setError('Verification failed. Please enter the correct code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Complete Registration
  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
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
      console.error('Signup Error:', err);
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // SIGN IN Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim()) {
      setError('Please enter your mobile number or email.');
      return;
    }

    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const user = await mockApi.login(identifier.trim(), loginPassword);
      login(user);
      sessionStorage.setItem('shagun_guest_browse', 'true');
      navigate(user.role === 'admin' ? '/admin' : redirectUrl);
    } catch (err: any) {
      console.error('Login Error:', err);
      setError(err?.message || 'Invalid credentials. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // GOOGLE SIGN IN Handler
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser || !fbUser.email) {
        throw new Error('Could not retrieve email from Google account.');
      }

      const user = await mockApi.loginWithGoogle({
        name: fbUser.displayName || fbUser.email.split('@')[0],
        email: fbUser.email,
        googleId: fbUser.uid,
        photoUrl: fbUser.photoURL || ''
      });

      login(user);
      sessionStorage.setItem('shagun_guest_browse', 'true');
      navigate(user.role === 'admin' ? '/admin' : redirectUrl);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        // user clicked again or cancelled
      } else {
        setError(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Skip Login / Guest Browse
  const handleSkip = () => {
    sessionStorage.setItem('shagun_guest_browse', 'true');
    navigate('/');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FBF3E7 0%, #F0E4CC 100%)' }}
    >
      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="recaptcha-container"></div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-2xl gradient-maroon flex items-center justify-center shadow-maroon-md group-hover:scale-105 transition-transform border border-amber-200/40">
              <span className="text-2xl font-serif font-bold text-gold-400">S</span>
            </div>
            <div>
              <div className="font-serif font-bold text-maroon-700 text-lg tracking-wider">SHAGUN</div>
              <div className="text-[10px] tracking-widest text-cream-700 font-semibold uppercase">General Store & Parlor</div>
            </div>
          </Link>
        </div>

        <div className="card p-6 sm:p-8 bg-white/95 backdrop-blur-md shadow-xl border border-amber-100">
          {/* Tabs */}
          <div className="flex bg-cream-200/80 p-1 rounded-2xl mb-6" role="tablist" aria-label="Sign in or register options">
            <button
              role="tab"
              type="button"
              aria-selected={isLogin}
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                isLogin
                  ? 'bg-maroon-900 text-white shadow-md'
                  : 'text-cream-800 hover:text-maroon-900'
              }`}
            >
              <i className="fas fa-right-to-bracket mr-1.5" /> Sign In
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={!isLogin}
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                !isLogin
                  ? 'bg-maroon-900 text-white shadow-md'
                  : 'text-cream-800 hover:text-maroon-900'
              }`}
            >
              <i className="fas fa-user-plus mr-1.5" /> Sign Up (OTP)
            </button>
          </div>

          {/* Heading */}
          <h1 className="font-serif text-xl font-bold text-maroon-800 mb-1">
            {isLogin ? 'Welcome Back!' : 'Create New Account'}
          </h1>
          <p className="text-xs text-cream-700 mb-5">
            {isLogin
              ? 'Enter your credentials or continue with Google.'
              : 'Sign up with Google or verified mobile OTP.'}
          </p>

          {/* Checkout redirect message */}
          {customMessage && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <i className="fas fa-info-circle text-amber-600 shrink-0" />
              <span>{customMessage}</span>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div
              role="alert"
              className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2"
            >
              <i className="fas fa-circle-exclamation shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2"
            >
              <i className="fas fa-circle-check shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-cream-300 bg-white hover:bg-cream-100/70 text-ink-900 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 transition-all shadow-xs hover:shadow-sm cursor-pointer mb-4"
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
            <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cream-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-white px-2.5 text-cream-600 font-semibold">
                {isLogin ? 'Or with Phone / Email' : 'Or with Mobile OTP'}
              </span>
            </div>
          </div>

          {/* ─────────────────── SIGN IN FORM ─────────────────── */}
          {isLogin ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-maroon-800 uppercase tracking-wider mb-1 block">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <i className="fas fa-user-shield absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-xs" />
                  <input
                    type="text"
                    placeholder="10-digit mobile or email address"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="input-field pl-9 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-maroon-800 uppercase tracking-wider block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[11px] text-maroon-600 hover:text-gold-700 font-medium transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-xs" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="input-field pl-9 pr-10 text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-600 hover:text-maroon-800 text-xs p-1"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center btn-lg mt-2 font-medium"
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin mr-2" /> Signing in…</>
                ) : (
                  <><i className="fas fa-right-to-bracket mr-2" /> Sign In</>
                )}
              </button>
            </form>
          ) : (
            /* ─────────────────── SIGN UP WITH OTP FORM ─────────────────── */
            <div>
              {/* Stepper indicator */}
              <div className="flex items-center justify-between mb-5 px-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    signupStep === 'phone' ? 'bg-maroon-900 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {signupStep === 'phone' ? '1' : '✓'}
                  </span>
                  <span className="text-[11px] font-medium text-ink-700">Mobile</span>
                </div>
                <div className="h-0.5 w-8 bg-cream-300" />
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    signupStep === 'otp' ? 'bg-maroon-900 text-white' : (signupStep === 'details' ? 'bg-emerald-600 text-white' : 'bg-cream-300 text-cream-700')
                  }`}>
                    {signupStep === 'details' ? '✓' : '2'}
                  </span>
                  <span className="text-[11px] font-medium text-ink-700">OTP</span>
                </div>
                <div className="h-0.5 w-8 bg-cream-300" />
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    signupStep === 'details' ? 'bg-maroon-900 text-white' : 'bg-cream-300 text-cream-700'
                  }`}>
                    3
                  </span>
                  <span className="text-[11px] font-medium text-ink-700">Profile</span>
                </div>
              </div>

              {/* Step 1: Mobile Number Input */}
              {signupStep === 'phone' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold text-maroon-800 uppercase tracking-wider mb-1 block">
                      Mobile Number (India)
                    </label>
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 bg-cream-100 border border-cream-300 rounded-xl text-xs font-semibold text-maroon-900 shrink-0">
                        🇮🇳 +91
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          required
                          className="input-field text-xs sm:text-sm font-medium tracking-wider"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-cream-700 mt-1.5">
                      We will send a 6-digit verification OTP to this number.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.replace(/\D/g, '').length !== 10}
                    className="btn btn-primary w-full justify-center btn-lg mt-2"
                  >
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin mr-2" /> Sending OTP…</>
                    ) : (
                      <><i className="fas fa-paper-plane mr-2" /> Send Verification OTP</>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {signupStep === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-maroon-800 uppercase tracking-wider block">
                        Enter 6-Digit OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSignupStep('phone');
                          setError('');
                        }}
                        className="text-[10px] text-maroon-600 hover:underline font-semibold cursor-pointer"
                      >
                        Change Number
                      </button>
                    </div>

                    <div className="relative">
                      <i className="fas fa-key absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-xs" />
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        autoFocus
                        className="input-field pl-9 text-base tracking-[0.3em] font-mono font-bold text-maroon-900"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-2 text-cream-700">
                      <span>Sent to +91 {phone}</span>
                      {resendTimer > 0 ? (
                        <span className="text-cream-600 font-medium">Resend in {resendTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          disabled={loading}
                          className="text-maroon-700 hover:text-gold-700 font-bold hover:underline cursor-pointer"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="btn btn-primary w-full justify-center btn-lg mt-2"
                  >
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin mr-2" /> Verifying…</>
                    ) : (
                      <><i className="fas fa-shield-check mr-2" /> Verify OTP</>
                    )}
                  </button>
                </form>
              )}

              {/* Step 3: Account Name & Password Setup */}
              {signupStep === 'details' && (
                <form onSubmit={handleCompleteSignup} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-check-circle text-emerald-600" />
                      <span className="font-semibold">+91 {phone}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-maroon-800 uppercase tracking-wider mb-1 block">
                      Full Name *
                    </label>
                    <div className="relative">
                      <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-xs" />
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="input-field pl-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-maroon-800 uppercase tracking-wider mb-1 block">
                      Create Password *
                    </label>
                    <div className="relative">
                      <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-xs" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="input-field pl-9 pr-10 text-xs sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-600 hover:text-maroon-800 text-xs p-1"
                      >
                        <i className={`fas ${showSignupPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-maroon-800 uppercase tracking-wider mb-1 block">
                      Email Address <span className="text-cream-600 font-normal lowercase">(optional)</span>
                    </label>
                    <div className="relative">
                      <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-xs" />
                      <input
                        type="email"
                        placeholder="name@gmail.com (for order invoices)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field pl-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full justify-center btn-lg mt-3"
                  >
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin mr-2" /> Creating Account…</>
                    ) : (
                      <><i className="fas fa-circle-check mr-2" /> Create Account & Shop</>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cream-300"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-white px-2.5 text-cream-600 font-semibold">Or</span>
            </div>
          </div>

          {/* Skip for Guest Browse Button */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/50 hover:bg-amber-100/60 text-maroon-900 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer group"
          >
            <span>Skip for now — Browse Store as Guest</span>
            <i className="fas fa-arrow-right text-[11px] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-cream-700 mt-5">
          By signing up or signing in, you agree to our{' '}
          <Link to="/privacy" className="text-maroon-700 hover:underline font-medium">Privacy Policy</Link> and{' '}
          <Link to="/privacy" className="text-maroon-700 hover:underline font-medium">Terms</Link>.
        </p>

        {/* Forgot Password Modal */}
        {showForgot && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center animate-scale-in">
              <div className="w-12 h-12 bg-maroon-50 rounded-full flex items-center justify-center mx-auto mb-3 text-maroon-600 text-xl">
                <i className="fas fa-key" />
              </div>
              <h2 className="font-serif font-bold text-base text-maroon-800 mb-1.5">Reset Password</h2>
              <p className="text-xs text-cream-700 mb-5 leading-relaxed">
                Please contact store administration via WhatsApp or phone with your registered mobile number or email to receive password reset assistance.
              </p>
              <div className="space-y-2">
                <a
                  href="https://wa.me/918827259023?text=Hello,%20I%20need%20assistance%20resetting%20my%20Shagun%20Store%20account%20password."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full justify-center text-xs"
                >
                  <i className="fab fa-whatsapp mr-1 text-sm" /> Contact on WhatsApp
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
