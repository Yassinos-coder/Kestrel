import { Injectable } from '@nestjs/common';

@Injectable()
export class EngineStatusService {
  scoutLastRunAt: Date | null = null;
  guardianLastRunAt: Date | null = null;
  watchlistSize = 0;

  markScout(watchlistSize: number): void {
    this.scoutLastRunAt = new Date();
    this.watchlistSize = watchlistSize;
  }

  markGuardian(): void {
    this.guardianLastRunAt = new Date();
  }
}
