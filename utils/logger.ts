/**
 * Centralized Application Logger
 * Future-proofed for rapid integration with Sentry, LogRocket, or Datadog strings.
 * Disables raw console leakage in favor of strict, trackable streams.
 */
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

const sanitizeMeta = (args: any[]) => {
  if (!args || args.length === 0) return undefined;
  
  const maskSensitive = (obj: any, depth = 0): any => {
    // 1. Terminate Infinite Loops and Depth Explosions
    if (depth > 3) return '[Truncated Depth Scope]';
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;
    
    // 2. Terminate Array Map Explosions 
    if (Array.isArray(obj)) {
      if (obj.length > 50) return `[Array(${obj.length}) Truncated Memory Cap]`;
      return obj.map(item => maskSensitive(item, depth + 1));
    }
    
    // 3. String Masking for Security Keys (DLP)
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const target = key.toLowerCase();
      if (target.includes('password') || target.includes('token') || target.includes('secret') || target.includes('cookie') || target.includes('authorization')) {
        sanitized[key] = '[REDACTED SECURE KEY]';
      } else {
        sanitized[key] = maskSensitive(value, depth + 1);
      }
    }
    return sanitized;
  };

  return maskSensitive(args);
};

const formatStructuredLog = (level: LogLevel, args: any[]) => {
  const message = typeof args[0] === 'string' ? args[0] : 'Event Checkpoint';
  const meta = args.length > 1 ? sanitizeMeta(args.slice(1)) : undefined;
  
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    meta
  });
};

export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (...args: any[]) => {
      if (process.env.NODE_ENV !== 'production') {
          console.info(formatStructuredLog(LogLevel.INFO, args));
      }
      // TODO: Pipe to Sentry/Datadog here natively later
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args: any[]) => {
      console.warn(formatStructuredLog(LogLevel.WARN, args));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args: any[]) => {
      console.error(formatStructuredLog(LogLevel.ERROR, args));
      // TODO: Pipe to Sentry.captureException natively later
  },
};
