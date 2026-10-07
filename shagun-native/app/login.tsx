import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        user = await api.login(email.trim(), password);
      } else {
        if (!name.trim()) { Alert.alert('Error', 'Name is required.'); return; }
        user = await api.register(name.trim(), email.trim(), password, phone.trim() || undefined);
      }
      await login(user);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="bag-handle-outline" size={40} color="#7c1f3e" style={{ marginBottom: 6 }} />
          <Text style={styles.title}>Shagun Mart</Text>
          <Text style={styles.subtitle}>{mode === 'login' ? 'Welcome back!' : 'Create your account'}</Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggleRow} accessibilityRole="tablist">
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
            onPress={() => setMode('login')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'login' }}
            accessibilityLabel="Switch to Login tab"
          >
            <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
            onPress={() => setMode('register')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'register' }}
            accessibilityLabel="Switch to Register tab"
          >
            <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor="#9c7a8a"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              accessibilityLabel="Full Name"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor="#9c7a8a"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email address"
          />

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Password *"
              placeholderTextColor="#9c7a8a"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9c7a8a" />
            </TouchableOpacity>
          </View>

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              placeholderTextColor="#9c7a8a"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Phone number optional"
            />
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={mode === 'login' ? 'Log in' : 'Create Account'}
          >
            {loading
              ? <ActivityIndicator color="#1a0a12" />
              : <Text style={styles.submitBtnText}>{mode === 'login' ? 'Login' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Browse as guest without logging in"
          >
            <Text style={styles.skipText}>Browse as Guest →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5ede8', padding: 24 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 32 },
  logo: { fontSize: 52, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#7c1f3e', marginBottom: 4 },
  subtitle: { color: '#9c7a8a', fontSize: 14 },
  toggleRow: {
    flexDirection: 'row', backgroundColor: '#e8d5c4', borderRadius: 12, padding: 4, marginBottom: 24,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#7c1f3e' },
  toggleText: { fontWeight: '700', color: '#9c7a8a' },
  toggleTextActive: { color: '#f5ede8' },
  form: { gap: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: '#1a0a12', borderWidth: 1, borderColor: '#e8d5c4', marginBottom: 0,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    backgroundColor: '#fff', borderRadius: 12, padding: 13, borderWidth: 1, borderColor: '#e8d5c4',
  },
  submitBtn: {
    backgroundColor: '#d4a853', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnText: { color: '#1a0a12', fontWeight: '800', fontSize: 16 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: '#9c7a8a', fontSize: 14 },
});
