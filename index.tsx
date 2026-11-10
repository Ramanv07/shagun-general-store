
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Web API base URL configuration: read from VITE_API_URL, defaulting to http://localhost:5000/api in dev
const rawWebUrl = (import.meta.env.VITE_API_URL as string | undefined) || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');
const normalizedWebBase = rawWebUrl ? rawWebUrl.replace(/\/api\/?$/, '') : '';

if (normalizedWebBase) {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    let [resource, config] = args;
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      resource = `${normalizedWebBase}${resource}`;
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
