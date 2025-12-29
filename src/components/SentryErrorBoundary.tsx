import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw, MessageCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  eventId: string | null;
}

/**
 * Top-level Sentry Error Boundary
 * Catches React errors, reports to Sentry, and provides user feedback option
 */
export class SentryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, eventId: null };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
    this.setState({ eventId });
    
    console.error('[SentryErrorBoundary] Error captured:', {
      error: error.message,
      eventId,
    });
  }

  handleReload = () => window.location.reload();
  
  handleGoHome = () => {
    window.location.href = '/home';
  };
  
  handleFeedback = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-6">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
              <p className="text-muted-foreground">
                We've been notified and are working to fix this. Please try again.
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-4 flex-wrap">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="w-4 h-4" />
                Go Home
              </Button>
              {this.state.eventId && (
                <Button onClick={this.handleFeedback} variant="ghost" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Report Issue
                </Button>
              )}
            </div>
            
            {this.state.eventId && (
              <p className="text-xs text-muted-foreground/60">
                Error ID: {this.state.eventId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
