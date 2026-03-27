import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Video, RefreshCw, PhoneOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  meetingId?: string;
  onLeave?: () => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'media' | 'connection' | 'permission' | 'unknown';
}

/**
 * Specialized ErrorBoundary for Meeting/Video Call components
 * Provides recovery options specific to video conferencing issues
 */
export class MeetingErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorType: 'unknown',
  };

  public static getDerivedStateFromError(error: Error): State {
    // Categorize the error type
    let errorType: State['errorType'] = 'unknown';
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('denied') || message.includes('notallowed')) {
      errorType = 'permission';
    } else if (message.includes('media') || message.includes('track') || message.includes('stream')) {
      errorType = 'media';
    } else if (message.includes('connection') || message.includes('ice') || message.includes('peer')) {
      errorType = 'connection';
    }
    
    return { hasError: true, error, errorType };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.critical('Meeting component crashed', error, {
      errorType: 'react',
      severity: 'critical',
      componentName: 'MeetingErrorBoundary',
      meetingId: this.props.meetingId,
      errorCategory: this.state.errorType,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
    this.props.onRetry?.();
  };

  private handleLeave = () => {
    this.props.onLeave?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <MeetingErrorFallback
          errorType={this.state.errorType}
          error={this.state.error}
          onRetry={this.handleRetry}
          onLeave={this.handleLeave}
        />
      );
    }

    return this.props.children;
  }
}

function MeetingErrorFallback({
  errorType,
  error,
  onRetry,
  onLeave,
}: {
  errorType: State['errorType'];
  error: Error | null;
  onRetry: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation('common');

  const getErrorContent = () => {
    switch (errorType) {
      case 'permission':
        return {
          icon: <Video className="h-8 w-8 text-amber-500" />,
          title: t("errors.cameraAccessRequired", "Camera/Microphone Access Required"),
          description: t("errors.cameraAccessDesc", "Please allow access to your camera and microphone to join the meeting."),
          suggestion: t("errors.cameraAccessSuggestion", "Click the camera icon in your browser's address bar to update permissions."),
        };
      case 'media':
        return {
          icon: <Video className="h-8 w-8 text-amber-500" />,
          title: t("errors.mediaDeviceError", "Media Device Error"),
          description: t("errors.mediaDeviceDesc", "There was a problem with your camera or microphone."),
          suggestion: t("errors.mediaDeviceSuggestion", "Try closing other apps using your camera, or try a different device."),
        };
      case 'connection':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
          title: t("errors.connectionLost", "Connection Lost"),
          description: t("errors.connectionLostDesc", "The connection to the meeting was interrupted."),
          suggestion: t("errors.connectionLostSuggestion", "Check your internet connection and try rejoining."),
        };
      default:
        return {
          icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
          title: t("errors.meetingError", "Meeting Error"),
          description: error?.message || t("errors.unexpectedMeetingError", "An unexpected error occurred in the meeting."),
          suggestion: t("errors.meetingRetrySuggestion", "Try refreshing the page or rejoining the meeting."),
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="max-w-lg w-full mx-4 border-destructive/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-4 rounded-full bg-muted">
            {content.icon}
          </div>
          <CardTitle className="text-xl">{content.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <strong>{t("errors.suggestion", "Suggestion:")}</strong> {content.suggestion}
          </div>

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
            <Button
              onClick={onLeave}
              variant="outline"
              className="flex-1"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              {t("actions.leaveMeeting", "Leave Meeting")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
