import { GmailAttachment } from './gmailService';
import { ParsingResult } from './pdfParser';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ErrorContext {
  operation: string;
  userId: string;
  gmailMessageId?: string;
  attachmentId?: string;
  timestamp: Date;
  retryCount: number;
}

export class RetryableError extends Error {
  public readonly retryable: boolean;
  public readonly context: ErrorContext;

  constructor(message: string, retryable: boolean, context: ErrorContext) {
    super(message);
    this.name = 'RetryableError';
    this.retryable = retryable;
    this.context = context;
  }
}

export class InvoiceProcessingError extends Error {
  public readonly context: ErrorContext;
  public readonly originalError?: Error;

  constructor(message: string, context: ErrorContext, originalError?: Error) {
    super(message);
    this.name = 'InvoiceProcessingError';
    this.context = context;
    this.originalError = originalError;
  }
}

export class ErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  /**
   * Execute a function with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    config: RetryConfig = this.DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === config.maxRetries) {
          throw new InvoiceProcessingError(
            `Operation failed after ${attempt + 1} attempts: ${error.message}`,
            { ...context, retryCount: attempt },
            error
          );
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: any): boolean {
    // Network/connection errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND') {
      return true;
    }

    // Gmail API rate limiting
    if (error.code === 429 || 
        error.message?.includes('rate limit') ||
        error.message?.includes('quota exceeded')) {
      return true;
    }

    // Temporary server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Gmail API temporary errors
    if (error.code === 503 || error.code === 502) {
      return true;
    }

    // Authentication errors that might be temporary
    if (error.code === 401 && error.message?.includes('token')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle Gmail API errors
   */
  static handleGmailError(error: any, context: ErrorContext): never {
    let message = 'Gmail API error';
    let retryable = false;

    switch (error.code) {
      case 401:
        message = 'Gmail authentication failed - please re-authenticate';
        retryable = false;
        break;
      case 403:
        message = 'Gmail access denied - insufficient permissions';
        retryable = false;
        break;
      case 429:
        message = 'Gmail API rate limit exceeded - retrying with backoff';
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
        message = 'Gmail API server error - retrying';
        retryable = true;
        break;
      default:
        message = `Gmail API error: ${error.message}`;
        retryable = this.isRetryableError(error);
    }

    throw new RetryableError(message, retryable, context);
  }

  /**
   * Handle PDF parsing errors
   */
  static handleParsingError(error: any, context: ErrorContext): never {
    let message = 'PDF parsing error';
    let retryable = false;

    if (error.message?.includes('quota')) {
      message = 'AI service quota exceeded - retrying later';
      retryable = true;
    } else if (error.message?.includes('timeout')) {
      message = 'PDF parsing timeout - retrying';
      retryable = true;
    } else if (error.message?.includes('network')) {
      message = 'Network error during PDF parsing - retrying';
      retryable = true;
    } else {
      message = `PDF parsing failed: ${error.message}`;
      retryable = false;
    }

    throw new RetryableError(message, retryable, context);
  }

  /**
   * Handle database errors
   */
  static handleDatabaseError(error: any, context: ErrorContext): never {
    let message = 'Database error';
    let retryable = false;

    if (error.code === '23505') { // Unique constraint violation
      message = 'Invoice already exists - skipping';
      retryable = false;
    } else if (error.code === '23503') { // Foreign key constraint violation
      message = 'Invalid user reference - skipping';
      retryable = false;
    } else if (error.message?.includes('connection')) {
      message = 'Database connection error - retrying';
      retryable = true;
    } else if (error.message?.includes('timeout')) {
      message = 'Database timeout - retrying';
      retryable = true;
    } else {
      message = `Database error: ${error.message}`;
      retryable = this.isRetryableError(error);
    }

    throw new RetryableError(message, retryable, context);
  }

  /**
   * Log error with context
   */
  static logError(error: Error, context: ErrorContext): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context: {
        operation: context.operation,
        userId: context.userId,
        gmailMessageId: context.gmailMessageId,
        attachmentId: context.attachmentId,
        timestamp: context.timestamp.toISOString(),
        retryCount: context.retryCount
      }
    };

    if (error instanceof RetryableError && error.retryable) {
      
    } else {
      
    }
  }

  /**
   * Create error context
   */
  static createContext(
    operation: string,
    userId: string,
    gmailMessageId?: string,
    attachmentId?: string
  ): ErrorContext {
    return {
      operation,
      userId,
      gmailMessageId,
      attachmentId,
      timestamp: new Date(),
      retryCount: 0
    };
  }

  /**
   * Wrap operation with error handling
   */
  static async wrapOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    userId: string,
    gmailMessageId?: string,
    attachmentId?: string
  ): Promise<T> {
    const context = this.createContext(operationName, userId, gmailMessageId, attachmentId);
    
    try {
      return await this.withRetry(operation, context);
    } catch (error: any) {
      this.logError(error, context);
      throw error;
    }
  }
}

/**
 * Utility function to safely execute operations with error handling
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  operationName: string,
  userId: string,
  gmailMessageId?: string,
  attachmentId?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await ErrorHandler.wrapOperation(
      operation,
      operationName,
      userId,
      gmailMessageId,
      attachmentId
    );
    
    return { success: true, data };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
}
