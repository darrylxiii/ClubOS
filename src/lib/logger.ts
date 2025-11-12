type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface ErrorWithStack {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

class Logger {
  private isDev = import.meta.env.DEV;
  
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
  }
  
  critical(message: string, error?: Error | ErrorWithStack | unknown, context?: LogContext) {
    this.error(`[CRITICAL] ${message}`, error, { ...context, level: 'critical' });
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
