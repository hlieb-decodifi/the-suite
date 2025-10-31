/**
 * Utility functions for error handling
 */

/**
 * Format error message for display to users
 */
export function formatErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred';

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Get error title based on error type
 */
export function getErrorTitle(error: unknown): string {
  if (!error) return 'Error';

  if (error instanceof Error) {
    if (error.name.includes('Network') || error.message.includes('network')) {
      return 'Network Error';
    }

    if (
      error.name.includes('Auth') ||
      error.message.toLowerCase().includes('auth')
    ) {
      return 'Authentication Error';
    }

    if (
      error.name.includes('Validation') ||
      error.message.toLowerCase().includes('valid')
    ) {
      return 'Validation Error';
    }
  }

  return 'Error';
}
