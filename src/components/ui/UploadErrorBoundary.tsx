import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Upload, AlertTriangle, RefreshCw, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fileName?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'size' | 'type' | 'network' | 'storage' | 'unknown';
}

/**
 * Specialized ErrorBoundary for File Upload components
 * Handles upload-specific errors with appropriate recovery options
 */
export class UploadErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorType: 'unknown',
  };

  public static getDerivedStateFromError(error: Error): State {
    let errorType: State['errorType'] = 'unknown';
    const message = error.message.toLowerCase();
    
    if (message.includes('size') || message.includes('too large') || message.includes('limit')) {
      errorType = 'size';
    } else if (message.includes('type') || message.includes('format') || message.includes('mime') || message.includes('extension')) {
      errorType = 'type';
    } else if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('abort')) {
      errorType = 'network';
    } else if (message.includes('storage') || message.includes('bucket') || message.includes('quota')) {
      errorType = 'storage';
    }
    
    return { hasError: true, error, errorType };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Upload component crashed', error, {
      errorType: 'react',
      severity: 'error',
      componentName: 'UploadErrorBoundary',
      fileName: this.props.fileName,
      errorCategory: this.state.errorType,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
    this.props.onRetry?.();
  };

  private handleCancel = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
    this.props.onCancel?.();
  };

  private getErrorContent() {
    const { errorType, error } = this.state;
    
    switch (errorType) {
      case 'size':
        return {
          icon: <FileX className="h-8 w-8 text-amber-500" />,
          title: 'File Too Large',
          description: 'The file you\'re trying to upload exceeds the size limit.',
          suggestion: 'Please compress the file or choose a smaller one. Maximum size is typically 10MB.',
        };
      case 'type':
        return {
          icon: <FileX className="h-8 w-8 text-amber-500" />,
          title: 'Unsupported File Type',
          description: 'This file format is not supported.',
          suggestion: 'Please upload a file in a supported format (PDF, DOCX, PNG, JPG, etc.).',
        };
      case 'network':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-amber-500" />,
          title: 'Upload Interrupted',
          description: 'The upload was interrupted due to a network issue.',
          suggestion: 'Check your internet connection and try again. The file will not be partially uploaded.',
        };
      case 'storage':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
          title: 'Storage Error',
          description: 'There was a problem with the file storage service.',
          suggestion: 'Please try again later. If the problem persists, contact support.',
        };
      default:
        return {
          icon: <Upload className="h-8 w-8 text-destructive" />,
          title: 'Upload Failed',
          description: error?.message || 'An unexpected error occurred during upload.',
          suggestion: 'Please try uploading the file again.',
        };
    }
  }

  public render() {
    if (this.state.hasError) {
      const content = this.getErrorContent();
      
      return (
        <Card className="max-w-md w-full mx-auto border-amber-500/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-4 rounded-full bg-muted">
              {content.icon}
            </div>
            <CardTitle className="text-lg">{content.title}</CardTitle>
            <CardDescription className="text-sm mt-2">
              {content.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.props.fileName && (
              <div className="text-sm text-muted-foreground text-center truncate">
                File: {this.props.fileName}
              </div>
            )}
            
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              {content.suggestion}
            </div>
            
            {this.state.error && import.meta.env.DEV && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Technical Details
                </summary>
                <pre className="mt-2 bg-muted p-3 rounded overflow-auto max-h-24 text-xs">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={this.handleRetry}
                className="flex-1"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleCancel}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
