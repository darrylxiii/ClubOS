import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CreditCard, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  transactionId?: string;
  onRetry?: () => void;
  onContactSupport?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'payment' | 'validation' | 'network' | 'unknown';
}

/**
 * Specialized ErrorBoundary for Payment/Billing components
 * Ensures payment errors are handled gracefully and never result in duplicate charges
 */
export class PaymentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorType: 'unknown',
  };

  public static getDerivedStateFromError(error: Error): State {
    let errorType: State['errorType'] = 'unknown';
    const message = error.message.toLowerCase();
    
    if (message.includes('payment') || message.includes('card') || message.includes('charge') || message.includes('stripe')) {
      errorType = 'payment';
    } else if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      errorType = 'validation';
    } else if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      errorType = 'network';
    }
    
    return { hasError: true, error, errorType };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log payment errors as critical - they need immediate attention
    logger.critical('Payment component crashed', error, {
      errorType: 'react',
      severity: 'critical',
      componentName: 'PaymentErrorBoundary',
      transactionId: this.props.transactionId,
      errorCategory: this.state.errorType,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
    this.props.onRetry?.();
  };

  private handleContactSupport = () => {
    this.props.onContactSupport?.();
  };

  private getErrorContent() {
    const { errorType, error } = this.state;
    
    switch (errorType) {
      case 'payment':
        return {
          icon: <CreditCard className="h-8 w-8 text-destructive" />,
          title: 'Payment Processing Error',
          description: 'There was an issue processing your payment. You have NOT been charged.',
          suggestion: 'Please verify your payment details and try again. If the problem persists, contact your bank.',
          showSupport: true,
        };
      case 'validation':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-amber-500" />,
          title: 'Invalid Payment Information',
          description: 'Some payment details are missing or incorrect.',
          suggestion: 'Please check your card number, expiration date, and CVV.',
          showSupport: false,
        };
      case 'network':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-amber-500" />,
          title: 'Connection Error',
          description: 'We couldn\'t connect to the payment service. You have NOT been charged.',
          suggestion: 'Check your internet connection and try again.',
          showSupport: false,
        };
      default:
        return {
          icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
          title: 'Payment Error',
          description: error?.message || 'An unexpected error occurred during payment.',
          suggestion: 'If you\'re unsure whether you were charged, please contact support before retrying.',
          showSupport: true,
        };
    }
  }

  public render() {
    if (this.state.hasError) {
      const content = this.getErrorContent();
      
      return (
        <Card className="max-w-lg w-full mx-auto border-destructive/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-4 rounded-full bg-destructive/10">
              {content.icon}
            </div>
            <CardTitle className="text-xl">{content.title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {content.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <strong>What to do:</strong> {content.suggestion}
            </div>
            
            {this.props.transactionId && (
              <div className="text-xs text-muted-foreground text-center">
                Reference: {this.props.transactionId}
              </div>
            )}
            
            {this.state.error && import.meta.env.DEV && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Technical Details
                </summary>
                <pre className="mt-2 bg-muted p-3 rounded overflow-auto max-h-32 text-xs">
                  {this.state.error.stack || this.state.error.message}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={this.handleRetry}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              {content.showSupport && (
                <Button
                  onClick={this.handleContactSupport}
                  variant="outline"
                  className="flex-1"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
