import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { THEME } from '../constants/theme';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { router } from 'expo-router';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, errorMessage: '' });
    try {
      router.replace('/(tabs)');
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={36} color={THEME.colors.error} />
            </View>
            <Text style={styles.title}>{this.props.fallbackTitle || 'Something went wrong'}</Text>
            <Text style={styles.message}>
              {this.state.errorMessage || 'Please try again or return to the main store.'}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryBtn} onPress={this.handleReset} activeOpacity={0.8}>
                <RefreshCw size={16} color={THEME.colors.white} />
                <Text style={styles.primaryBtnText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={this.handleGoHome} activeOpacity={0.8}>
                <Home size={16} color={THEME.colors.maroon900} />
                <Text style={styles.secondaryBtnText}>Go to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.blush50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: THEME.colors.white,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    ...THEME.shadow,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.maroon900,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: THEME.colors.ink500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.maroon700,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: THEME.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.blushCard,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: THEME.colors.maroon900,
    fontWeight: '700',
    fontSize: 14,
  },
});
