export interface HealthStatus {
  status: 'ok';
  service: string;
  uptimeSeconds: number;
}
