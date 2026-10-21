import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@kestrel/shared';

@Controller('health')
export class HealthController {
  @Get('live')
  getLive(): HealthStatus {
    return { status: 'ok', service: 'kestrel-server', uptimeSeconds: Math.floor(process.uptime()) };
  }
}
