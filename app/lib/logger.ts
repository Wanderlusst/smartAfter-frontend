/**
 * Centralized logging utility for SmartAfter application
 * Provides consistent logging format and easy log level management
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private isDevelopment: boolean = process.env.NODE_ENV === 'development';

  constructor() {
    // Set log level based on environment
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level}`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  // Email parsing specific logs
  emailParsed(emailId: string, vendor: string, amount: number, documentType: string, confidence: number) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    console.log(this.formatMessage('📧 EMAIL_PARSED', `Email ${emailId} parsed successfully`, {
      vendor,
      amount: `₹${amount}`,
      documentType,
      confidence: `${(confidence * 100).toFixed(1)}%`
    }));
  }

  emailSkipped(emailId: string, reason: string, vendor?: string) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    console.log(this.formatMessage('🚫 EMAIL_SKIPPED', `Email ${emailId} skipped`, {
      reason,
      vendor: vendor || 'Unknown'
    }));
  }

  emailProcessingStarted(emailId: string, subject: string, attachmentCount: number) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    console.log(this.formatMessage('🔄 EMAIL_PROCESSING', `Processing email ${emailId}`, {
      subject: subject.substring(0, 50) + (subject.length > 50 ? '...' : ''),
      attachmentCount
    }));
  }

  emailProcessingCompleted(emailId: string, processedCount: number, totalAmount: number) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    console.log(this.formatMessage('✅ EMAIL_COMPLETED', `Email ${emailId} processing completed`, {
      processedCount,
      totalAmount: `₹${totalAmount}`
    }));
  }

  // General application logs
  error(message: string, error?: any) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    console.error(this.formatMessage('❌ ERROR', message, error));
  }

  warn(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage('⚠️ WARN', message, data));
  }

  info(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.formatMessage('ℹ️ INFO', message, data));
  }

  debug(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.formatMessage('🔍 DEBUG', message, data));
  }

  // Performance logs
  performance(operation: string, duration: number, data?: any) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.formatMessage('⚡ PERFORMANCE', `${operation} completed in ${duration}ms`, data));
  }

  // API logs
  apiCall(endpoint: string, method: string, status: number, duration?: number) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const statusEmoji = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️';
    console.log(this.formatMessage(`${statusEmoji} API`, `${method} ${endpoint} - ${status}`, {
      duration: duration ? `${duration}ms` : undefined
    }));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const {
  emailParsed,
  emailSkipped,
  emailProcessingStarted,
  emailProcessingCompleted,
  error,
  warn,
  info,
  debug,
  performance,
  apiCall
} = logger;
