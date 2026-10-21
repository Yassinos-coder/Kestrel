import type { HealthStatus } from '@kestrel/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

class HealthService {
  async getLive(): Promise<HealthStatus> {
    const response = await fetch(`${API_URL}/health/live`);
    if (!response.ok) throw new Error(`Health check failed with ${response.status}`);
    return response.json() as Promise<HealthStatus>;
  }
}

export const healthService = new HealthService();
