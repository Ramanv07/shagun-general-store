
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Patch fetch for Capacitor/production to point to Vercel API only when not running on localhost
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
if (!isLocalhost) {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    let [resource, config] = args;
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      resource = 'https://shagun-general-store.vercel.app' + resource;
    }
    return originalFetch(resource, config);
  };
}
import './index.css'; // Tailwind directives injected via CDN but this ensures react build consistency if converted

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
