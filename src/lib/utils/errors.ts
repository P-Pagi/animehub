import { logger } from './logger';

export type ErrorCode =
  | 'SOURCE_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'PARSING_ERROR'
  | 'INVALID_INPUT'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function createErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  // Handle Zod Error
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    const zodError = error as { errors?: Array<{ message?: string }> };
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: zodError.errors?.[0]?.message || 'Invalid input data',
        },
      },
    };
  }

  logger.error('API', 'Unhandled API route error', error);

  return {
    status: 500,
    body: {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    },
  };
}
