const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export class FormatUtils {
  static sol(value: number, digits = 4): string {
    return `${value.toFixed(digits)} SOL`;
  }

  static signedSol(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(4)} SOL`;
  }

  static pct(value: number, digits = 1): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(digits)}%`;
  }

  static shortAddress(address: string): string {
    if (address.length <= 11) return address;
    return `${address.slice(0, 4)}…${address.slice(-4)}`;
  }

  static price(value: number): string {
    if (value === 0) return '0';
    if (value >= 0.01) return value.toFixed(4);
    return value.toExponential(2);
  }

  static timeAgo(iso: string | null): string {
    if (!iso) return 'never';
    const elapsed = Date.now() - new Date(iso).getTime();
    if (elapsed < MINUTE) return 'just now';
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
    return `${Math.floor(elapsed / DAY)}d ago`;
  }

  static dateTime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  static base64(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
}
