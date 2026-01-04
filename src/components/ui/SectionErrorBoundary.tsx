/**
 * Section Error Boundary
 * A reusable error boundary for wrapping page sections
 * Provides isolated error handling for non-critical UI sections
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  sectionName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`Section "${this.props.sectionName}" crashed`, error, {
      errorType: 'react',
      severity: 'error',
      componentName: 'SectionErrorBoundary',
      sectionName: this.props.sectionName,
      componentStack: errorInfo.componentStack,
    });

    Sentry.captureException(error, {
      extra: {
        sectionName: this.props.sectionName,
        componentStack: errorInfo.componentStack,
      },
    });

    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Failed to load {this.props.sectionName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              An error occurred while loading this section.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Export a simpler inline error boundary HOC for quick wrapping
export function withSectionErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  sectionName: string
) {
  return function WithSectionErrorBoundary(props: P) {
    return (
      <SectionErrorBoundary sectionName={sectionName}>
        <WrappedComponent {...props} />
      </SectionErrorBoundary>
    );
  };
}
