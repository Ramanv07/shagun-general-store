import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.raman.shagunmart',
  appName: 'Shagun Mart',
  webDir: 'dist',
  server: {
    url: process.env.VITE_API_URL || 'http://localhost:5000/api',
    cleartext: true
  }
};

export default config;
