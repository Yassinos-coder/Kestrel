import { Injectable } from '@nestjs/common';

const DRAIN_POLL_MS = 250;
const DEFAULT_DRAIN_TIMEOUT_MS = 90_000;

@Injectable()
export class TradingGateService {
  private reason: string | null = null;
  private activeWork = 0;

  isPaused(): boolean {
    return this.reason !== null;
  }

  getPauseReason(): string | null {
    return this.reason;
  }

  async run<T>(work: () => Promise<T>): Promise<T | null> {
    if (this.reason !== null) return null;
    this.activeWork++;
    try {
      return await work();
    } finally {
      this.activeWork--;
    }
  }

  async pauseEntries(reason: string, drainTimeoutMs = DEFAULT_DRAIN_TIMEOUT_MS): Promise<void> {
    this.reason = reason;
    const deadline = Date.now() + drainTimeoutMs;
    while (this.activeWork > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, DRAIN_POLL_MS));
    }
  }

  resumeEntries(): void {
    this.reason = null;
  }
}
