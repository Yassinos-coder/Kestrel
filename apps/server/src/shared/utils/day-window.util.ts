export class DayWindow {
  static startOfDay(timeZone: string, now: Date = new Date()): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, Number(part.value)]));
    const localAsUtc = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!, parts.second!);
    const offsetMs = localAsUtc - Math.floor(now.getTime() / 1000) * 1000;
    return new Date(Date.UTC(parts.year!, parts.month! - 1, parts.day!) - offsetMs);
  }
}
