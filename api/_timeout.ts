/**
 * Fetch wrapper with timeout support for Vercel serverless functions.
 * Prevents requests from hanging indefinitely if upstream APIs are slow.
 */

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Wrapper around fetch that adds timeout support.
 * @param url - The URL to fetch
 * @param options - Fetch options plus optional timeoutMs
 * @returns The fetch Response
 * @throws Error with message 'Request timeout' if the timeout is exceeded
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
