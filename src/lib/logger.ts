import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type ErrorType = 'react' | 'api' | 'edge_function' | 'database' | 'network' | 'unknown';
type Severity = 'info' | 'warning' | 'error' | 'critical';

interface LogContext {
  [key: string]: unknown;
  errorType?: ErrorType;
  severity?: Severity;
  componentName?: string;
}

interface ErrorWithStack {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

interface ErrorLogBatch {
  errorType: ErrorType;
  severity: Severity;
  errorMessage: string;
  errorStack?: string;
  componentName?: string;
  pageUrl: string;
  userAgent: string;
  metadata: Record<string, unknown>;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private errorBatch: ErrorLogBatch[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_TIMEOUT = 30000; // 30 seconds
  private lastErrors: Map<string, number> = new Map(); // For deduplication
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }
  
  debug(message: string, context?: LogContext) {
    if (this.isDev) {
      console.log(`🔍 ${this.formatMessage('debug', message, context)}`);
    }
  }
  
  info(message: string, context?: LogContext) {
    if (this.isDev) {
      console.log(`ℹ️  ${this.formatMessage('info', message, context)}`);
    }
  }
  
  warn(message: string, context?: LogContext) {
    console.warn(`⚠️  ${this.formatMessage('warn', message, context)}`);
  }
  
  error(message: string, error?: Error | ErrorWithStack | unknown, context?: LogContext) {
    let errorDetails: LogContext = { ...context };
    
    if (error instanceof Error) {
      errorDetails = { 
        message: error.message, 
        stack: error.stack,
        name: error.name,
        ...context 
      };
      
      // Capture in Sentry
      Sentry.captureException(error, {
        extra: { message, ...context },
        level: (context?.severity as Sentry.SeverityLevel) || 'error',
      });
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorDetails = { 
        message: (error as ErrorWithStack).message,
        stack: (error as ErrorWithStack).stack,
        code: (error as ErrorWithStack).code,
        ...context 
      };
    } else if (error) {
      errorDetails = { error: String(error), ...context };
    }
    
    console.error(`❌ ${this.formatMessage('error', message, errorDetails)}`);
    
    // Log to database
    this.logToDB(
      message,
      error,
      (context?.errorType as ErrorType) || 'unknown',
      (context?.severity as Severity) || 'error',
      context?.componentName as string | undefined,
      context
    );
  }
  
  /**
   * Add a breadcrumb for debugging context
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
    Sentry.addBreadcrumb({ message, category, data, level: 'info' });
  }
  
  critical(message: string, error?: Error | ErrorWithStack | unknown, context?: LogContext) {
    this.error(`[CRITICAL] ${message}`, error, { ...context, level: 'critical', severity: 'critical' });
  }
  
  private async logToDB(
    message: string,
    error: Error | ErrorWithStack | unknown,
    errorType: ErrorType,
    severity: Severity,
    componentName?: string,
    context?: LogContext
  ) {
    try {
      // Extract error details
      let errorMessage = message;
      let errorStack: string | undefined;
      const metadata: Record<string, unknown> = { ...context };
      
      if (error instanceof Error) {
        errorMessage = `${message}: ${error.message}`;
        errorStack = error.stack;
        metadata.errorName = error.name;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `${message}: ${(error as ErrorWithStack).message}`;
        errorStack = (error as ErrorWithStack).stack;
      }
      
      // Deduplication check
      const errorKey = `${errorMessage}-${componentName}`;
      const lastSeen = this.lastErrors.get(errorKey);
      const now = Date.now();
      if (lastSeen && now - lastSeen < 5000) {
        return; // Skip duplicate within 5 seconds
      }
      this.lastErrors.set(errorKey, now);
      
      // Add to batch
      const errorLog: ErrorLogBatch = {
        errorType,
        severity,
        errorMessage,
        errorStack,
        componentName,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        metadata,
      };
      
      this.errorBatch.push(errorLog);
      
      // Flush if batch is full
      if (this.errorBatch.length >= this.BATCH_SIZE) {
        await this.flushErrorBatch();
      } else {
        // Set timer for batch flush
        if (!this.batchTimer) {
          this.batchTimer = setTimeout(() => this.flushErrorBatch(), this.BATCH_TIMEOUT);
        }
      }
    } catch (err) {
      // Silent fail - don't break the app if logging fails
      console.warn('Failed to queue error log:', err);
    }
  }
  
  private async flushErrorBatch() {
    if (this.errorBatch.length === 0) return;
    
    const batch = [...this.errorBatch];
    this.errorBatch = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const records = batch.map(log => ({
        user_id: user?.id || null,
        error_type: log.errorType,
        severity: log.severity,
        error_message: log.errorMessage,
        error_stack: log.errorStack || null,
        component_name: log.componentName || null,
        page_url: log.pageUrl,
        user_agent: log.userAgent,
        metadata: (log.metadata ?? null) as { [key: string]: string | number | boolean | null | undefined } | null,
      }));
      
      const { error } = await supabase.from('error_logs').insert(records);
      
      if (error) {
        console.warn('Failed to insert error logs:', error);
      }
    } catch (err) {
      console.warn('Failed to flush error batch:', err);
    }
  }
  
  // Performance timing
  time(label: string) {
    if (this.isDev) {
      console.time(label);
    }
  }
  
  timeEnd(label: string) {
    if (this.isDev) {
      console.timeEnd(label);
    }
  }
}

export const logger = new Logger();
