import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, '.', '');
    const apiUrl = env.VITE_API_URL || process.env.VITE_API_URL;
    if (command === 'build') {
        if (!apiUrl) {
            throw new Error('FATAL BUILD ERROR: VITE_API_URL is required for production builds. Configure VITE_API_URL=/api on Vercel or in environment.');
        }
        const trimmed = apiUrl.trim();
        if (trimmed.includes('<') || trimmed.includes('>')) {
            throw new Error('FATAL BUILD ERROR: VITE_API_URL cannot contain "<" or ">" placeholders');
        }
        if (trimmed.includes('YOUR')) {
            throw new Error('FATAL BUILD ERROR: VITE_API_URL cannot contain "YOUR" placeholders');
        }
        if (/^http:\/\//i.test(trimmed)) {
            throw new Error('FATAL BUILD ERROR: Production VITE_API_URL must use HTTPS, not HTTP');
        }
        if (!trimmed.startsWith('/')) {
            try {
                const parsed = new URL(trimmed);
                const hostname = parsed.hostname.toLowerCase();
                if (
                    hostname === 'localhost' ||
                    hostname === '127.0.0.1' ||
                    hostname === '0.0.0.0' ||
                    hostname === '10.0.2.2' ||
                    hostname.startsWith('10.') ||
                    hostname.startsWith('192.168.') ||
                    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
                ) {
                    throw new Error(`FATAL BUILD ERROR: Production VITE_API_URL cannot use localhost or private IP (${hostname})`);
                }
            } catch (e) {
                if (e.message && e.message.startsWith('FATAL BUILD ERROR:')) throw e;
                throw new Error('FATAL BUILD ERROR: Invalid VITE_API_URL format');
            }
        }
    }
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        },
        // Proxy /api calls to local backend during development
        proxy: {
          '/api': {
            target: env.VITE_API_URL || 'http://localhost:5000',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        '__API_URL__': JSON.stringify(env.VITE_API_URL || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Split chunks for faster loads
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom'],
              three: ['three', '@react-three/fiber', '@react-three/drei'],
            }
          }
        },
        // Warn if a chunk is over 500kb
        chunkSizeWarningLimit: 500,
      }
    };
});
