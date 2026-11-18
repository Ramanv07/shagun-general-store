import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { API_BASE_URL, APP_ENV, PRODUCTION_API_HOST } from '../constants';
import { isHostBlocked, getDisplayHost, isLiveHost } from '../utils/hostSafety';

export { isLiveHost, getDisplayHost, isHostBlocked };

export default function DevApiBanner() {
  return null;
}

const styles = StyleSheet.create({
  liveWarningBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  liveWarningText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  devBadge: {
    backgroundColor: '#e0f2fe',
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  devBadgeText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
