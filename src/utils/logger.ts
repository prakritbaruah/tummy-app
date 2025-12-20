/**
 * Simple logger utility for the application.
 * In development, logs to console. In production, can be extended to send to logging service.
 */

type LogLevel =  'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV !== 'production';

class Logger {
  private formatMessage(
    level: LogLevel,
    filename: string,
    functionName: string,
    message: string,
    ...args: unknown[]
  ): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${filename}] [${functionName}]`;
    return `${prefix} ${message}`;
  }


  info(filename: string, functionName: string, message: string, ...args: unknown[]): void {
    if (isDevelopment) {
      console.log(this.formatMessage('info', filename, functionName, message), ...args);
    }
    // In production, you could send to error tracking service here
  }

  warn(filename: string, functionName: string, message: string, ...args: unknown[]): void {
    if (isDevelopment) {
      console.warn(this.formatMessage('warn', filename, functionName, message), ...args);
    }
    // In production, you could send to error tracking service here
  }

  error(
    filename: string,
    functionName: string,
    message: string,
    error?: Error | unknown,
    ...args: unknown[]
  ): void {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;
    
    if (isDevelopment) {
      console.error(this.formatMessage('error', filename, functionName, message), errorDetails, ...args);
    }
    // In production, you could send to error tracking service here
  }
}

export const logger = new Logger();
