import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from '@/lib/logger';
import { logCriticalError } from '@/utils/errorReporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🔴 [ErrorBoundary] Caught error:", error);
    console.error("🔴 [ErrorBoundary] Error info:", errorInfo);
    console.error("🔴 [ErrorBoundary] Component stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
    
    // Log to database with enhanced error reporting
    logCriticalError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack ?? undefined,
      errorType: 'react',
    });
    
    // Also log via logger
    logger.error('React Error Boundary', error, { 
      componentStack: errorInfo.componentStack,
      errorType: 'react',
      severity: 'error',
      componentName: 'ErrorBoundary'
    });
  }

  public render() {
    if (this.state.hasError) {
      // Use inline styles to ensure visibility even if CSS fails
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            padding: '32px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e5e5e5'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              color: '#dc2626'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                Application Error
              </h2>
            </div>
            
            <div style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #fecaca'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#991b1b' }}>
                {this.state.error?.name || 'Error'}
              </p>
              <p style={{ margin: 0, color: '#7f1d1d', fontSize: '14px' }}>
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
            </div>

            {this.state.error?.stack && (
              <details style={{ marginBottom: '20px' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Error Stack
                </summary>
                <pre style={{
                  fontSize: '12px',
                  backgroundColor: '#f9fafb',
                  padding: '12px',
                  borderRadius: '6px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <button
              onClick={() => {
                console.log("🔄 [ErrorBoundary] Reloading application");
                window.location.href = "/home";
              }}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
