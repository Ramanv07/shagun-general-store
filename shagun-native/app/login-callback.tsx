import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../constants/theme';

export default function LoginCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; user?: string }>();
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function handleAuth() {
      try {
        const { token, user: userParam } = params;
        if (!userParam && !token) {
          throw new Error('Authentication data was missing.');
        }

        let userData: any = null;
        if (userParam) {
          try {
            userData = typeof userParam === 'string' ? JSON.parse(userParam) : userParam;
          } catch (e) {
            console.error('Failed to parse user param:', e);
          }
        }

        if (!userData && token) {
          userData = { token };
        }

        if (userData) {
          if (token && !userData.token) {
            userData.token = token;
          }
          await login(userData);
          if (isMounted) {
            router.replace('/(tabs)');
          }
        } else {
          throw new Error('Could not process user account.');
        }
      } catch (err: any) {
        console.error('Login callback error:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to complete Google Sign-In.');
          setTimeout(() => {
            router.replace('/login');
          }, 2000);
        }
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [params]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={THEME.colors.emerald600} />
        <Text style={styles.title}>Completing Google Sign-In...</Text>
        <Text style={styles.subtitle}>Setting up your session</Text>
        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
  },
  title: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    color: '#D32F2F',
    textAlign: 'center',
  },
});
