import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ServerErrorPage } from './ErrorPage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ServerErrorPage
          error={this.state.error}
          showDebugInfo={true}
          showRetryButton={true}
          onRetry={this.handleRetry}
          debugInfo={{
            componentStack: 'ErrorBoundary caught an error',
            errorBoundary: true
          }}
        />
      );
    }

    return this.props.children;
  }
}