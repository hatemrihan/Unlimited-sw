import { logger } from './logger';

/**
 * Enterprise Resilience API Wrapper
 * Retries execution up to N times exclusively on 5XX (Server Crash) or Network Exceptions.
 * Relinquishes connection on 4XX Client defects to preserve backend cycle weight.
 */
export async function fetchWithRetry(url: string, options?: RequestInit, retries = 2, backoffDelay = 500, timeoutMs = 8000): Promise<Response> {
  // Safely mount the abort signal protecting against hanging promises
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Merge the upstream signal if passed directly via arguments preventing component unmount bleeds
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort());
    }
  }

  const enhancedOptions = {
    ...options,
    signal: controller.signal
  };

  const jitter = Math.random() * 100; // Offset preventing thundering herds

  try {
    const response = await fetch(url, enhancedOptions);
    clearTimeout(timeoutId);

    // If server failure (5XX), we retry gracefully
    if (!response.ok && response.status >= 500 && retries > 0) {
      logger.warn(`[5XX] Retrying fetch for ${url}. ${retries} attempts left.`);
      await new Promise(res => setTimeout(res, backoffDelay + jitter));
      return fetchWithRetry(url, options, retries - 1, backoffDelay * 2, timeoutMs);
    }
    
    // Fall-through 4XX gracefully or 2XX successes
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    
    // Skip retry safely if intentionally aborted by the front-end user
    if (err.name === 'AbortError' && !options?.signal?.aborted && controller.signal.aborted) {
       // Only counts as a Timeout if the root upstream signal hasn't been aborted
       logger.warn(`[Timeout] Network dropped waiting for ${url}`);
    } else if (err.name === 'AbortError') {
       throw err; 
    }

    // If pure network failure (Offline/Connection Reset) or timeout, we retry gracefully
    if (retries > 0) {
      logger.warn(`[Network Drop] Retrying fetch for ${url}. ${retries} attempts left.`);
      await new Promise(res => setTimeout(res, backoffDelay + jitter));
      return fetchWithRetry(url, options, retries - 1, backoffDelay * 2, timeoutMs);
    }
    
    // Terminal failure
    throw err;
  }
}
