import React, { Component, ErrorInfo, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props extends WithTranslation { children: ReactNode; fallback?: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void; }
interface State { hasError: boolean; error: Error | null; }

class BlogErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void { console.error('Blog Error Boundary:', error, errorInfo); this.props.onError?.(error, errorInfo); }
  handleRetry = (): void => { this.setState({ hasError: false, error: null }); };

  render(): ReactNode {
    const { t } = this.props;
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('common:blog.somethingWentWrong')}</h2>
          <p className="text-muted-foreground mb-6 max-w-md">{t('common:blog.errorLoadingContent')}</p>
          <Button onClick={this.handleRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> {t('common:blog.tryAgain')}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default withTranslation('common')(BlogErrorBoundary);
