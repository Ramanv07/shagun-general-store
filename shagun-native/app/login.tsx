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
import Svg, { Path } from 'react-native-svg';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../constants/theme';
import { ADMIN_WHATSAPP } from '../constants';
import { signInWithGoogleWeb } from '../services/firebaseAuth';

export default function LoginScreen() {
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
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <Path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <Path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <Path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </Svg>
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
              <Text style={styles.modalTitle}>Forgot Password?</Text>
              <TouchableOpacity onPress={() => setShowForgot(false)} style={styles.modalCloseBtn}>
                <X size={18} color={THEME.colors.ink500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBodyText}>
              To reset your password or recover your account, please connect with Shagun Mart support directly on WhatsApp.
            </Text>

            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={() => {
                setShowForgot(false);
                Linking.openURL(
                  `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(
                    'Hello Shagun Mart, I need help resetting my password.'
                  )}`
                );
              }}
              activeOpacity={0.85}
            >
              <Phone size={16} color={THEME.colors.white} />
              <Text style={styles.whatsappBtnText}>Contact Support on WhatsApp</Text>
            </TouchableOpacity>
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
});
