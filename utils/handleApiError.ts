import { toast } from 'sonner';
import { logger } from './logger';

/**
 * Standardizes UI / Frontend Exception interception
 * Unifies our messaging and prevents random string drops across hook catch blocks
 */
interface ApiErrorOptions {
  silent?: boolean;
}

export const handleApiError = (error: unknown, customMessage?: string, options?: ApiErrorOptions) => {
  // Always telemetry the stack trace for engineering regardless of the user Toast
  logger.error(customMessage ? `${customMessage}:` : 'API Error:', error);

  // Suppress visual noise on background sync queues
  if (options?.silent) {
    return;
  }

  // Check common backend leakage footprints (MongoDB, SQL, Network Sockets)
  const isSafeMessage = (msg: string) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    const unsafeStrings = ['mongo', 'sql', 'e11000', 'econn', 'timeout', 'undefined', 'token', 'database', 'internal server error', 'typeerror'];
    return !unsafeStrings.some(unsafe => lower.includes(unsafe));
  };

  const genericFallback = "An unexpected service error occurred. Please try again.";

  if (error instanceof Error) {
    const safePayload = isSafeMessage(error.message);
    toast.error(customMessage || (safePayload ? error.message : genericFallback));
  } else if (typeof error === 'string') {
    const safePayload = isSafeMessage(error);
    toast.error(customMessage || (safePayload ? error : genericFallback));
  } else {
    toast.error(customMessage || genericFallback);
  }
};
