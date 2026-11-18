import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', zIndex: 9999, position: 'relative' }}>
          <h1>Something went wrong.</h1>
          {import.meta.env.DEV ? (
            <>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</pre>
            </>
          ) : (
            <p>Please refresh the page. If this continues, contact your teacher.</p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
