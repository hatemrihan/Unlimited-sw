/**
 * Typed application errors with HTTP status codes.
 * Throw these from the service/repository layer.
 * Routes map error.statusCode to the HTTP response — no hardcoded 500 everywhere.
 */

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(msg = 'Not found') {
    super(msg);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(msg = 'Validation failed') {
    super(msg);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  readonly statusCode = 500;
  constructor(msg = 'Database error') {
    super(msg);
    this.name = 'DatabaseError';
  }
}

/** Extracts the HTTP status code from any error, defaulting to 500. */
export function toStatusCode(err: unknown): number {
  if (
    err instanceof NotFoundError ||
    err instanceof ValidationError ||
    err instanceof DatabaseError
  ) {
    return err.statusCode;
  }
  return 500;
}
