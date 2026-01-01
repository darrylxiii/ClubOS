import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorCategory = 
  | 'audio' 
  | 'video' 
  | 'network' 
  | 'webrtc' 
  | 'permissions' 
  | 'browser' 
  | 'ai' 
  | 'performance'
  | 'unknown';

export interface MeetingError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  timestamp: number;
  isRecoverable: boolean;
  recoveryAction?: () => Promise<void>;
  retryCount: number;
  maxRetries: number;
}

interface ErrorHandlerConfig {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRecoverable?: boolean;
  maxRetries?: number;
  recoveryAction?: () => Promise<void>;
  onError?: (error: MeetingError) => void;
}

interface UseMeetingErrorBoundaryReturn {
  errors: MeetingError[];
  currentError: MeetingError | null;
  hasErrors: boolean;
  hasCriticalError: boolean;
  
  // Error management
  reportError: (message: string, config: ErrorHandlerConfig) => string;
  dismissError: (errorId: string) => void;
  clearAllErrors: () => void;
  retryRecovery: (errorId: string) => Promise<boolean>;
  
  // Wrapper for async operations
  withErrorHandling: <T>(
    operation: () => Promise<T>,
    config: ErrorHandlerConfig
  ) => Promise<T | null>;
  
  // Pre-built handlers
  handleAudioError: (error: Error) => void;
  handleVideoError: (error: Error) => void;
  handleNetworkError: (error: Error) => void;
  handleWebRTCError: (error: Error) => void;
  handlePermissionError: (error: Error) => void;
  
  // Graceful degradation
  degradationState: DegradationState;
  applyDegradation: (level: DegradationLevel) => void;
}

type DegradationLevel = 'none' | 'low' | 'medium' | 'high' | 'audio-only';

interface DegradationState {
  level: DegradationLevel;
  disabledFeatures: string[];
  suggestedActions: string[];
  lastDegradation: number | null;
}

const SEVERITY_PRIORITY: Record<ErrorSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

const DEFAULT_MAX_RETRIES = 3;
const ERROR_RETENTION_MS = 5 * 60 * 1000; // 5 minutes

export function useMeetingErrorBoundary(): UseMeetingErrorBoundaryReturn {
  const [errors, setErrors] = useState<MeetingError[]>([]);
  const [degradationState, setDegradationState] = useState<DegradationState>({
    level: 'none',
    disabledFeatures: [],
    suggestedActions: [],
    lastDegradation: null,
  });

  const errorIdCounter = useRef(0);

  // Generate unique error ID
  const generateErrorId = useCallback(() => {
    return `error-${Date.now()}-${++errorIdCounter.current}`;
  }, []);

  // Report an error
  const reportError = useCallback((
    message: string,
    config: ErrorHandlerConfig
  ): string => {
    const errorId = generateErrorId();
    
    const newError: MeetingError = {
      id: errorId,
      category: config.category,
      severity: config.severity,
      message,
      timestamp: Date.now(),
      isRecoverable: config.isRecoverable ?? true,
      recoveryAction: config.recoveryAction,
      retryCount: 0,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
    };

    setErrors(prev => [...prev, newError]);

    // Show toast based on severity
    switch (config.severity) {
      case 'info':
        toast.info(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      case 'error':
      case 'critical':
        toast.error(message);
        break;
    }

    // Call custom error handler if provided
    config.onError?.(newError);

    console.error(`[MeetingError] [${config.category}] [${config.severity}]`, message);

    return errorId;
  }, [generateErrorId]);

  // Dismiss an error
  const dismissError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Retry recovery for an error
  const retryRecovery = useCallback(async (errorId: string): Promise<boolean> => {
    const error = errors.find(e => e.id === errorId);
    if (!error || !error.isRecoverable || !error.recoveryAction) {
      return false;
    }

    if (error.retryCount >= error.maxRetries) {
      toast.error(`Maximum retry attempts reached for: ${error.message}`);
      return false;
    }

    try {
      // Update retry count
      setErrors(prev => prev.map(e =>
        e.id === errorId ? { ...e, retryCount: e.retryCount + 1 } : e
      ));

      await error.recoveryAction();
      
      // Remove error on successful recovery
      dismissError(errorId);
      toast.success('Issue resolved');
      return true;
    } catch (recoveryError) {
      console.error('[MeetingError] Recovery failed:', recoveryError);
      return false;
    }
  }, [errors, dismissError]);

  // Wrapper for async operations with error handling
  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    config: ErrorHandlerConfig
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      reportError(message, config);
      return null;
    }
  }, [reportError]);

  // Pre-built error handlers
  const handleAudioError = useCallback((error: Error) => {
    const message = getAudioErrorMessage(error);
    reportError(message, {
      category: 'audio',
      severity: 'warning',
      isRecoverable: true,
    });
  }, [reportError]);

  const handleVideoError = useCallback((error: Error) => {
    const message = getVideoErrorMessage(error);
    reportError(message, {
      category: 'video',
      severity: 'warning',
      isRecoverable: true,
    });
  }, [reportError]);

  const handleNetworkError = useCallback((error: Error) => {
    reportError('Network connection issue detected', {
      category: 'network',
      severity: 'error',
      isRecoverable: true,
    });
  }, [reportError]);

  const handleWebRTCError = useCallback((error: Error) => {
    reportError('Connection to peer failed', {
      category: 'webrtc',
      severity: 'error',
      isRecoverable: true,
    });
  }, [reportError]);

  const handlePermissionError = useCallback((error: Error) => {
    reportError('Camera or microphone permission denied', {
      category: 'permissions',
      severity: 'error',
      isRecoverable: false,
    });
  }, [reportError]);

  // Apply degradation based on level
  const applyDegradation = useCallback((level: DegradationLevel) => {
    const disabledFeatures: string[] = [];
    const suggestedActions: string[] = [];

    switch (level) {
      case 'low':
        disabledFeatures.push('lowLightEnhancement', 'gestureRecognition', 'virtualBackground');
        suggestedActions.push('Some visual effects have been disabled to improve performance');
        break;
      case 'medium':
        disabledFeatures.push(
          'lowLightEnhancement',
          'gestureRecognition', 
          'virtualBackground',
          'svc',
          'hdScreenShare'
        );
        suggestedActions.push('Video quality has been reduced to maintain connection stability');
        break;
      case 'high':
        disabledFeatures.push(
          'lowLightEnhancement',
          'gestureRecognition',
          'virtualBackground',
          'svc',
          'hdScreenShare',
          'transcription',
          'autoHighlight'
        );
        suggestedActions.push('AI features have been disabled to improve performance');
        break;
      case 'audio-only':
        disabledFeatures.push('video', 'screenShare', 'virtualBackground', 'lowLightEnhancement', 'svc');
        suggestedActions.push('Video has been disabled due to poor connection. Audio only mode active.');
        break;
    }

    setDegradationState({
      level,
      disabledFeatures,
      suggestedActions,
      lastDegradation: Date.now(),
    });

    if (level !== 'none') {
      toast.warning(`Performance mode: ${level}`, {
        description: suggestedActions[0],
      });
    }
  }, []);

  // Clean up old errors periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - ERROR_RETENTION_MS;
      setErrors(prev => prev.filter(e => e.timestamp > cutoff));
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  // Computed values
  const currentError = errors.length > 0
    ? errors.reduce((highest, current) => 
        SEVERITY_PRIORITY[current.severity] > SEVERITY_PRIORITY[highest.severity]
          ? current
          : highest
      )
    : null;

  const hasErrors = errors.length > 0;
  const hasCriticalError = errors.some(e => e.severity === 'critical');

  return {
    errors,
    currentError,
    hasErrors,
    hasCriticalError,
    reportError,
    dismissError,
    clearAllErrors,
    retryRecovery,
    withErrorHandling,
    handleAudioError,
    handleVideoError,
    handleNetworkError,
    handleWebRTCError,
    handlePermissionError,
    degradationState,
    applyDegradation,
  };
}

// Helper functions for error messages
function getAudioErrorMessage(error: Error): string {
  if (error.name === 'NotAllowedError') {
    return 'Microphone access denied';
  }
  if (error.name === 'NotFoundError') {
    return 'No microphone found';
  }
  if (error.name === 'NotReadableError') {
    return 'Microphone is in use by another application';
  }
  return 'Audio processing error';
}

function getVideoErrorMessage(error: Error): string {
  if (error.name === 'NotAllowedError') {
    return 'Camera access denied';
  }
  if (error.name === 'NotFoundError') {
    return 'No camera found';
  }
  if (error.name === 'NotReadableError') {
    return 'Camera is in use by another application';
  }
  if (error.message.includes('WebGL')) {
    return 'Graphics acceleration unavailable';
  }
  return 'Video processing error';
}
