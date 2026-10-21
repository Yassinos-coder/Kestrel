import { BadGatewayException } from '@nestjs/common';

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 2;
const BACKOFF_BASE_MS = 400;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface FetchJsonOptions {
  timeoutMs?: number;
  retries?: number;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
}

export class HttpFetcher {
  static async json<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
    const retries = options.retries ?? DEFAULT_RETRIES;
    let lastError = 'unknown error';

    for (let attempt = 0; attempt <= retries; attempt++) {
      const outcome = await HttpFetcher.attempt<T>(url, options);
      if (outcome.ok) return outcome.value;
      lastError = outcome.error;
      if (!outcome.retryable || attempt === retries) break;
      await HttpFetcher.sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }

    throw new BadGatewayException(`Request to ${new URL(url).host} failed: ${lastError}`);
  }

  private static async attempt<T>(
    url: string,
    options: FetchJsonOptions,
  ): Promise<{ ok: true; value: T } | { ok: false; error: string; retryable: boolean }> {
    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: { accept: 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}`, retryable: RETRYABLE_STATUS.has(response.status) };
      }
      return { ok: true, value: (await response.json()) as T };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'network error', retryable: true };
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
