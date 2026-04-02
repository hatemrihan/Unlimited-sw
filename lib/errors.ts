/**
 * Typed application errors with HTTP status codes.
 * Throw these from the service/repository layer.
 * Routes map error.statusCode to the HTTP response — no hardcoded 500 everywhere.
 */

export class UnauthorizedError extends Error {
  readonly statusCode = 401;
  constructor(msg = 'Unauthorized') {
    super(msg);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  readonly statusCode = 404;
  readonly userMessage: string;
  constructor(msg = 'Not found', userMessage = 'This item could not be found.') {
    super(msg);
    this.name = 'NotFoundError';
    this.userMessage = userMessage;
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  readonly userMessage: string;
  constructor(msg = 'Validation failed', userMessage = 'Please check your input and try again.') {
    super(msg);
    this.name = 'ValidationError';
    this.userMessage = userMessage;
  }
}

export class DatabaseError extends Error {
  readonly statusCode = 500;
  readonly userMessage: string;
  constructor(msg = 'Database error', userMessage = 'Something went wrong. Please try again.') {
    super(msg);
    this.name = 'DatabaseError';
    this.userMessage = userMessage;
  }
}

/** Extracts the HTTP status code from any error, defaulting to 500. */
export function toStatusCode(err: unknown): number {
  if (
    err instanceof NotFoundError ||
    err instanceof ValidationError ||
    err instanceof DatabaseError ||
    err instanceof UnauthorizedError
  ) {
    return err.statusCode;
  }
  return 500;
}
