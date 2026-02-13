export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

export class ServiceError extends Error {
  public code?: string;
  public details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'ServiceError';
  }
}

export function createUserFriendlyError(error: any): AppError {
  // Handle Supabase specific errors
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return {
          message: 'No data found',
          code: error.code,
          details: error
        };
      case '23505':
        return {
          message: 'This item already exists',
          code: error.code,
          details: error
        };
      case '23503':
        return {
          message: 'Referenced item does not exist',
          code: error.code,
          details: error
        };
      case '42501':
        return {
          message: 'You do not have permission to perform this action',
          code: error.code,
          details: error
        };
      default:
        break;
    }
  }

  // Handle network errors
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
      details: error
    };
  }

  // Handle authentication errors
  if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
    return {
      message: 'Authentication error. Please sign in again.',
      code: 'AUTH_ERROR',
      details: error
    };
  }

  // Default error handling
  return {
    message: error?.message || 'An unexpected error occurred. Please try again.',
    code: error?.code || 'UNKNOWN_ERROR',
    details: error
  };
}

export function handleServiceError(error: any, context?: string): never {
  const friendlyError = createUserFriendlyError(error);
  const contextMessage = context ? `${context}: ${friendlyError.message}` : friendlyError.message;
  
  throw new ServiceError(contextMessage, friendlyError.code, friendlyError.details);
}