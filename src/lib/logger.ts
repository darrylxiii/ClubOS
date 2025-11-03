type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
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
  
  error(message: string, error?: any, context?: LogContext) {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...context }
      : { error, ...context };
    console.error(`❌ ${this.formatMessage('error', message, errorDetails)}`);
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
