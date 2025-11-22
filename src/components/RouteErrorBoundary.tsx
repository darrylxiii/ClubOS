import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Route Error Caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // Enhanced error reporting
    import('@/utils/errorReporting').then(({ logErrorToDatabase }) => {
      logErrorToDatabase(error, 'error', 'RouteErrorBoundary', {
        componentStack: errorInfo.componentStack,
        errorType: 'route',
      });
    });
    
    logger.error('Route chunk failed to load', error, { 
      componentStack: errorInfo.componentStack,
      errorType: 'react',
      severity: 'error',
      componentName: 'RouteErrorBoundary'
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/home';
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-muted/20 p-6">
                <AlertCircle className="w-12 h-12 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Failed to Load Page
              </h2>
              <p className="text-muted-foreground">
                This page couldn't be loaded. This might be due to a network issue or outdated cache.
              </p>
            </div>

            {this.state.error && import.meta.env.DEV && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-muted/20 p-3 rounded-lg overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center pt-4">
              <Button 
                onClick={this.handleReload}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
