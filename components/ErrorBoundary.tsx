import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled app error in ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4 text-center"
          style={{ backgroundColor: 'var(--clr-cream)' }}
        >
          <div className="card p-8 max-w-md w-full shadow-xl border border-cream-300">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl mx-auto mb-4">
              <i className="fas fa-triangle-exclamation" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-maroon-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-cream-700 text-sm mb-6 leading-relaxed">
              We encountered an unexpected error while loading this page. Please refresh or return to the main store.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-primary text-xs py-2.5 px-4"
              >
                <i className="fas fa-rotate-right mr-1.5" /> Refresh Page
              </button>
              <a
                href="/"
                className="btn btn-outline text-xs py-2.5 px-4"
              >
                Go to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
