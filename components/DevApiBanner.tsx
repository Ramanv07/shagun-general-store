import React from 'react';
import { isLiveHost, getDisplayHost } from '../utils/hostSafety';

export { isLiveHost, getDisplayHost };

export const DevApiBanner: React.FC = () => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const isLive = isLiveHost(apiUrl);
  const displayHost = getDisplayHost(apiUrl);

  if (isLive) {
    return (
      <aside aria-label="Development environment safety notice" className="bg-rose-700 text-white text-xs font-bold py-2 px-4 text-center sticky top-0 z-[10000] shadow-md flex items-center justify-center gap-2">
        <span>⚠️ Dev build is pointed at the live server ({displayHost})</span>
      </aside>
    );
  }

  return (
    <div className="fixed bottom-2 right-2 bg-slate-900/80 text-sky-400 font-mono text-[10px] px-2 py-1 rounded shadow pointer-events-none z-[10000] border border-slate-700">
      API: {displayHost}
    </div>
  );
};
