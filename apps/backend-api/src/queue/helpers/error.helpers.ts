
// ERROR HANDLING HELPER FUNCTIONS
// ============================================

export function getErrorMessage(error: unknown): string {
  // Check if error is an Error instance
  if (error instanceof Error) {
    return error.message;
  }

  // Check if error is a string 
  if (typeof error === 'string') {
    return error;
  }

  // Check if error is an object with a message property
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as any).message === 'string'
  ) {
    return (error as any).message;
  }

  // Fallback: convert to string
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}


export function getErrorStack(error: unknown): string | undefined {
  // Only Error instances have stack traces
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return undefined;
}


export function getErrorCode(error: unknown): string | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as any).code === 'string'
  ) {
    return (error as any).code;
  }

  return undefined;
}


export function isErrorType(error: unknown, errorName: string): boolean {
  if (error instanceof Error) {
    return error.name === errorName || error.constructor.name === errorName;
  }

  return false;
}


 //Create a formatted error log entry
 
export function formatErrorLog(
  error: unknown,
  context?: Record<string, any>,
): string {
  const parts: string[] = [];

  // Error message
  parts.push(`Error: ${getErrorMessage(error)}`);

  // Error code (if available)
  const code = getErrorCode(error);
  if (code) {
    parts.push(`Code: ${code}`);
  }

  // Context (if provided)
  if (context && Object.keys(context).length > 0) {
    parts.push(`Context: ${JSON.stringify(context, null, 2)}`);
  }

  // Stack trace (if available)
  const stack = getErrorStack(error);
  if (stack) {
    parts.push(`Stack: ${stack}`);
  }

  return parts.join('\n');
}


 // Check if error indicates a temporary/transient failure
 
export function isTransientError(error: unknown): boolean {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  // Network-related transient errors
  const transientCodes = [
    'ECONNREFUSED',  // Connection refused
    'ETIMEDOUT',     // Timeout
    'ECONNRESET',    // Connection reset
    'EPIPE',         // Broken pipe
    'ENOTFOUND',     // DNS lookup failed
    'ENETUNREACH',   // Network unreachable
    'EAI_AGAIN',     // DNS temporary failure
  ];

  if (code && transientCodes.includes(code)) {
    return true;
  }

  // Message-based detection (some errors don't have codes)
  const transientMessages = [
    'timeout',
    'timed out',
    'connection refused',
    'connection reset',
    'network error',
    'temporary failure',
    'service unavailable',
  ];

  return transientMessages.some((msg) => message.includes(msg));
}


// Sanitize error for safe logging (remove sensitive data)
export function sanitizeError(error: unknown): any {
  if (!(error instanceof Error)) {
    return error;
  }

  const sanitized: any = {
    name: error.name,
    message: error.message,
  };

  // Copy stack if available
  if (error.stack) {
    sanitized.stack = error.stack;
  }

  // Copy other properties, but filter sensitive keys
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'session',
  ];

  for (const [key, value] of Object.entries(error)) {
    const keyLower = key.toLowerCase();
    
    if (sensitiveKeys.some((sensitive) => keyLower.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}