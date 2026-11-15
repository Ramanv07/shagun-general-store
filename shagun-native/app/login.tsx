import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Eye,
  EyeOff,
  ShoppingBag,
  ArrowRight,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  X,
  Phone,
  ChevronLeft,
} from 'lucide-react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../constants/theme';
import { ADMIN_WHATSAPP } from '../constants';
import { signInWithGoogleWeb } from '../services/firebaseAuth';
import { ErrorBoundary } from '../components/ErrorBoundary';

function LoginScreenInner() {
  const { login } = useAuth();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot password modal
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<'phone' | 'otp'>('phone');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleRequestResetOtp = async () => {
    setForgotError('');
    setForgotSuccess('');
    const clean = forgotPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setForgotError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.forgotPassword(clean);
      setForgotSuccess(res.message || 'OTP sent successfully!');
      setForgotStep('otp');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCompleteReset = async () => {
    setForgotError('');
    setForgotSuccess('');
    const clean = forgotPhone.replace(/\D/g, '').slice(-10);
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit OTP code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.resetPassword(clean, forgotOtp.trim(), forgotNewPassword);
      setSuccess(res.message || 'Password reset successfully! Please log in.');
      setShowForgot(false);
      setForgotStep('phone');
      setForgotPhone('');
      setForgotOtp('');
      setForgotNewPassword('');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Google Sign In Handler ──────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setGoogleLoading(true);
    try {
      if (Platform.OS === 'web') {
        const fbUser = await signInWithGoogleWeb();
        if (!fbUser || !fbUser.email) {
          throw new Error('Google sign-in was cancelled or returned no email.');
        }

        const user = await api.loginWithGoogle({
          name: fbUser.displayName || 'Google User',
          email: fbUser.email,
          photoUrl: fbUser.photoURL || undefined,
          googleId: fbUser.uid,
        });

        await login(user);
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          'Google Sign-In',
          'Google 1-click sign-in is available in web browser mode. On mobile, please sign in with your email or mobile number.'
        );
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Email / Mobile Sign In Handler ───────────────────────────────────────
  const handleSignIn = async () => {
    setError('');
    setSuccess('');

    const cleanId = identifier.trim();
    if (!cleanId || !loginPassword) {
      setError('Please enter your email/mobile and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await api.login(cleanId, loginPassword);
      await login(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Login Error:', err);
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up Handler ─────────────────────────────────────────────────────
  const handleSignUp = async () => {
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
    if (!signupPassword || signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    setLoading(true);
    try {
      const user = await api.register(name.trim(), email.trim(), signupPassword, cleanPhone || undefined);
      await login(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />

      {/* ── Top Bar with Back Button ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={THEME.colors.ink900} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{isLogin ? 'Login' : 'Sign Up'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header (Matching original Shagun Mart branding) ── */}
          <View style={styles.brandHeader}>
            <View style={styles.brandIconCircle}>
              <Image source={require('../assets/icon.png')} style={styles.brandLogoImg} resizeMode="cover" />
            </View>
            <Text style={styles.brandTitleText}>SHAGUN MART</Text>
            <Text style={styles.brandTagline}>Beauty • Personal Care • Daily Essentials</Text>
          </View>

          {/* ── Main Auth Card ── */}
          <View style={styles.card}>
            {/* Segmented Pill Switcher [ Login ] [ Sign Up ] */}
            <View style={styles.pillSwitcher}>
              <TouchableOpacity
                style={[styles.pillBtn, isLogin && styles.pillBtnActive]}
                onPress={() => {
                  setIsLogin(true);
                  setError('');
                  setSuccess('');
                }}
                activeOpacity={0.8}
              >
                <LogIn size={14} color={isLogin ? THEME.colors.ink900 : THEME.colors.ink500} strokeWidth={2} />
                <Text style={[styles.pillBtnText, isLogin && styles.pillBtnTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillBtn, !isLogin && styles.pillBtnActive]}
                onPress={() => {
                  setIsLogin(false);
                  setError('');
                  setSuccess('');
                }}
                activeOpacity={0.8}
              >
                <UserPlus size={14} color={!isLogin ? THEME.colors.ink900 : THEME.colors.ink500} strokeWidth={2} />
                <Text style={[styles.pillBtnText, !isLogin && styles.pillBtnTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color={THEME.colors.error} strokeWidth={2} style={{ marginTop: 1 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Success Banner */}
            {success ? (
              <View style={styles.successBox}>
                <CheckCircle size={15} color={THEME.colors.success} strokeWidth={2} style={{ marginTop: 1 }} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {/* ── Continue with Google Button ── */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={THEME.colors.maroon700} />
              ) : (
                <>
                  <View style={styles.googleGContainer}>
                    <Text style={styles.googleGText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {isLogin ? 'OR EMAIL / MOBILE' : 'OR WITH EMAIL'}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── LOGIN FORM ── */}
            {isLogin ? (
              <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email or Mobile Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@email.com or 10-digit mobile"
                    placeholderTextColor={THEME.colors.ink500}
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TouchableOpacity onPress={() => setShowForgot(true)}>
                      <Text style={styles.forgotLink}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter your password"
                      placeholderTextColor={THEME.colors.ink500}
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      secureTextEntry={!showLoginPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeToggleBtn}
                      onPress={() => setShowLoginPassword(!showLoginPassword)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showLoginPassword ? (
                        <EyeOff size={18} color={THEME.colors.ink500} />
                      ) : (
                        <Eye size={18} color={THEME.colors.ink500} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={THEME.colors.white} />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Sign In</Text>
                      <ArrowRight size={16} color={THEME.colors.white} strokeWidth={2} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ── SIGN UP FORM ── */
              <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor={THEME.colors.ink500}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@email.com"
                    placeholderTextColor={THEME.colors.ink500}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number (optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={THEME.colors.ink500}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="At least 6 characters"
                      placeholderTextColor={THEME.colors.ink500}
                      value={signupPassword}
                      onChangeText={setSignupPassword}
                      secureTextEntry={!showSignupPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeToggleBtn}
                      onPress={() => setShowSignupPassword(!showSignupPassword)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showSignupPassword ? (
                        <EyeOff size={18} color={THEME.colors.ink500} />
                      ) : (
                        <Eye size={18} color={THEME.colors.ink500} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={THEME.colors.white} />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Create Account</Text>
                      <ArrowRight size={16} color={THEME.colors.white} strokeWidth={2} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Skip / Browse as Guest */}
            <TouchableOpacity
              style={styles.guestLink}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
            >
              <Text style={styles.guestLinkText}>Browse as Guest →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ── */}
      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={() => setShowForgot(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {forgotStep === 'phone' ? 'Reset Password' : 'Enter OTP & New Password'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForgot(false);
                  setForgotStep('phone');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={THEME.colors.ink500} />
              </TouchableOpacity>
            </View>

            {forgotError ? (
              <View style={[styles.alertBox, styles.alertError, { marginBottom: 12 }]}>
                <AlertCircle size={15} color={THEME.colors.error} />
                <Text style={styles.alertText}>{forgotError}</Text>
              </View>
            ) : null}

            {forgotSuccess ? (
              <View style={[styles.alertBox, styles.alertSuccess, { marginBottom: 12 }]}>
                <CheckCircle size={15} color={THEME.colors.success} />
                <Text style={styles.alertText}>{forgotSuccess}</Text>
              </View>
            ) : null}

            {forgotStep === 'phone' ? (
              <>
                <Text style={styles.modalBodyText}>
                  Enter your registered 10-digit mobile number to receive a secure one-time verification code.
                </Text>
                <TextInput
                  style={[styles.textInput, { marginBottom: 14 }]}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={THEME.colors.ink500}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={forgotPhone}
                  onChangeText={setForgotPhone}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginBottom: 10 }]}
                  onPress={handleRequestResetOtp}
                  disabled={forgotLoading}
                  activeOpacity={0.85}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color={THEME.colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Verification OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalBodyText}>
                  Enter the 6-digit OTP sent to +91 {forgotPhone.slice(-10)} and your new password.
                </Text>
                <TextInput
                  style={[styles.textInput, { marginBottom: 10 }]}
                  placeholder="6-digit OTP"
                  placeholderTextColor={THEME.colors.ink500}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={forgotOtp}
                  onChangeText={setForgotOtp}
                />
                <TextInput
                  style={[styles.textInput, { marginBottom: 14 }]}
                  placeholder="New password (min 6 characters)"
                  placeholderTextColor={THEME.colors.ink500}
                  secureTextEntry
                  value={forgotNewPassword}
                  onChangeText={setForgotNewPassword}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginBottom: 10 }]}
                  onPress={handleCompleteReset}
                  disabled={forgotLoading}
                  activeOpacity={0.85}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color={THEME.colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset Password & Log In</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setForgotStep('phone');
                    setForgotError('');
                  }}
                  style={{ alignSelf: 'center', paddingVertical: 4 }}
                >
                  <Text style={[styles.forgotLink, { fontSize: 12 }]}>← Change phone number</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={{ borderTopWidth: 1, borderTopColor: THEME.colors.line, marginTop: 12, paddingTop: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL(
                    `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(
                      'Hello Shagun Mart, I need assistance resetting my password.'
                    )}`
                  );
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Phone size={13} color={THEME.colors.success} />
                <Text style={{ fontSize: 11.5, color: THEME.colors.success, fontWeight: '600' }}>
                  Need help? Contact WhatsApp Support
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.colors.blush50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.blush50,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
    ...THEME.shadow,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.maroon900,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: THEME.colors.blushCard,
    borderWidth: 1,
    borderColor: THEME.colors.blush200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...THEME.shadow,
  },
  brandLogoImg: {
    width: '100%',
    height: '100%',
  },
  brandTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.maroon900,
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontSize: 11.5,
    color: THEME.colors.ink500,
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    ...THEME.shadow,
    elevation: 3,
  },
  pillSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F3ECE9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  pillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pillBtnActive: {
    backgroundColor: THEME.colors.white,
    ...THEME.shadow,
    elevation: 1,
  },
  pillBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.ink500,
  },
  pillBtnTextActive: {
    color: THEME.colors.ink900,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.error,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 14,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.success,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: THEME.radius.card,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...THEME.shadow,
    elevation: 1,
  },
  googleGContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: {
    color: THEME.colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: THEME.colors.ink900,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.line,
  },
  dividerText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.ink500,
    letterSpacing: 0.8,
    paddingHorizontal: 10,
  },
  formSection: {
    gap: 14,
  },
  inputGroup: {},
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.ink900,
    marginBottom: 5,
  },
  forgotLink: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.colors.maroon700,
  },
  textInput: {
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: THEME.colors.ink900,
    outlineStyle: 'none',
  } as any,
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13.5,
    color: THEME.colors.ink900,
    outlineStyle: 'none',
  } as any,
  eyeToggleBtn: {
    padding: 6,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.maroon700,
    borderRadius: THEME.radius.card,
    paddingVertical: 13,
    marginTop: 6,
    ...THEME.shadow,
    elevation: 2,
  },
  submitBtnText: {
    color: THEME.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  guestLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.ink500,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 20,
    ...THEME.shadow,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.ink900,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBodyText: {
    fontSize: 13,
    color: THEME.colors.ink500,
    lineHeight: 19,
    marginBottom: 18,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 12,
  },
  whatsappBtnText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  alertSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.ink900,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: THEME.colors.maroon700,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default function LoginScreen() {
  return (
    <ErrorBoundary fallbackTitle="Login Error">
      <LoginScreenInner />
    </ErrorBoundary>
  );
}
