import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CreditCard, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

  public render() {
    if (this.state.hasError) {
      return (
        <PaymentErrorFallback
          errorType={this.state.errorType}
          error={this.state.error}
          transactionId={this.props.transactionId}
          onRetry={this.handleRetry}
          onContactSupport={this.handleContactSupport}
        />
      );
    }

    return this.props.children;
  }
}

function PaymentErrorFallback({
  errorType,
  error,
  transactionId,
  onRetry,
  onContactSupport,
}: {
  errorType: State['errorType'];
  error: Error | null;
  transactionId?: string;
  onRetry: () => void;
  onContactSupport: () => void;
}) {
  const { t } = useTranslation('common');

  const getErrorContent = () => {
    switch (errorType) {
      case 'payment':
        return {
          icon: <CreditCard className="h-8 w-8 text-destructive" />,
          title: t("errors.paymentProcessingError", "Payment Processing Error"),
          description: t("errors.paymentNotCharged", "There was an issue processing your payment. You have NOT been charged."),
          suggestion: t("errors.paymentVerifyDetails", "Please verify your payment details and try again. If the problem persists, contact your bank."),
          showSupport: true,
        };
      case 'validation':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-amber-500" />,
          title: t("errors.invalidPaymentInfo", "Invalid Payment Information"),
          description: t("errors.paymentDetailsMissing", "Some payment details are missing or incorrect."),
          suggestion: t("errors.paymentCheckDetails", "Please check your card number, expiration date, and CVV."),
          showSupport: false,
        };
      case 'network':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-amber-500" />,
          title: t("errors.connectionError", "Connection Error"),
          description: t("errors.connectionNotCharged", "We couldn't connect to the payment service. You have NOT been charged."),
          suggestion: t("errors.checkConnection", "Check your internet connection and try again."),
          showSupport: false,
        };
      default:
        return {
          icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
          title: t("errors.paymentError", "Payment Error"),
          description: error?.message || t("errors.unexpectedPaymentError", "An unexpected error occurred during payment."),
          suggestion: t("errors.unsureCharged", "If you're unsure whether you were charged, please contact support before retrying."),
          showSupport: true,
        };
    }
  };

  const content = getErrorContent();

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
          <strong>{t("errors.whatToDo", "What to do:")}</strong> {content.suggestion}
        </div>

        {transactionId && (
          <div className="text-xs text-muted-foreground text-center">
            {t("errors.reference", "Reference:")} {transactionId}
          </div>
        )}

        {error && import.meta.env.DEV && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {t("errors.technicalDetails", "Technical Details")}
            </summary>
            <pre className="mt-2 bg-muted p-3 rounded overflow-auto max-h-32 text-xs">
              {error.stack || error.message}
            </pre>
          </details>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={onRetry}
            className="flex-1"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("actions.tryAgain", "Try Again")}
          </Button>
          {content.showSupport && (
            <Button
              onClick={onContactSupport}
              variant="outline"
              className="flex-1"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {t("actions.contactSupport", "Contact Support")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
