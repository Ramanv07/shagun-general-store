import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../constants';

export function isLiveHost(urlOrHost: string): boolean {
  if (!urlOrHost) return false;
  const normalized = urlOrHost.toLowerCase().trim();
  if (/vercel\.app|shagunmart\.com|mongodb\.net/i.test(normalized)) {
    return true;
  }
  try {
    const parsed = normalized.includes('://') ? new URL(normalized) : new URL(`http://${normalized}`);
    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return /vercel\.app|shagunmart\.com/i.test(normalized);
  }
}

export function getDisplayHost(urlOrHost: string): string {
  try {
    const parsed = urlOrHost.includes('://') ? new URL(urlOrHost) : new URL(`http://${urlOrHost}`);
    return parsed.host;
  } catch {
    return urlOrHost || 'localhost:5000';
  }
}

export default function DevApiBanner() {
  if (!__DEV__) {
    return null;
  }

  const isLive = isLiveHost(API_BASE_URL);
  const displayHost = getDisplayHost(API_BASE_URL);

  if (isLive) {
    return (
      <View style={styles.liveWarningBanner}>
        <Text style={styles.liveWarningText}>
          ⚠️ Dev build is pointed at the live server ({displayHost})
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.devBadge}>
      <Text style={styles.devBadgeText}>API: {displayHost}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  liveWarningBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  liveWarningText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  devBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    zIndex: 9999,
  },
  devBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});

