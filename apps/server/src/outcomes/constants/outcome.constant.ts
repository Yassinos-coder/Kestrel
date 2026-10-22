const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const OUTCOME_HORIZONS = [
  { field: 'change1hPct', afterMs: HOUR_MS },
  { field: 'change4hPct', afterMs: 4 * HOUR_MS },
  { field: 'change24hPct', afterMs: 24 * HOUR_MS },
] as const;

export const TRACK_INTERVAL_MS = 10 * MINUTE_MS;
export const TRACK_WINDOW_MS = 26 * HOUR_MS;
export const MAX_DECISIONS_PER_TICK = 150;
export const MISSED_WINNER_PCT = 50;
export const GOOD_PASS_PCT = -50;
export const GONE_CHANGE_PCT = -100;
export const REPORT_WINDOW_HOURS = 48;
export const MAX_REPORT_ITEMS = 40;
export const DIGEST_WINNERS = 8;
export const DIGEST_GOOD_PASSES = 4;
export const REASONING_LIMIT = 280;
export const UNTRACKED_REASONS = ['Not enough free funds', 'Order failed'];
