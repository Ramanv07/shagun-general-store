import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shagungeneralstore.app',
  appName: 'Shagun Mart',
  webDir: 'dist',
  server: {
    url: 'https://shagun-general-store.vercel.app',
    cleartext: true
  }
};

export default config;
