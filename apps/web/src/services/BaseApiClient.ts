import { useAuthStore } from '@/store/authStore';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
}

export class BaseApiClient {
  protected async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(options.authenticated !== false && token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401 && options.authenticated !== false) useAuthStore.getState().logout();
    if (!response.ok) throw new ApiError(await this.readMessage(response), response.status);
    return (await response.json()) as T;
  }

  private async readMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
      return message ?? `Request failed (${response.status})`;
    } catch {
      return `Request failed (${response.status})`;
    }
  }
}
