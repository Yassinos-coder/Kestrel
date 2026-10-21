export class DayWindow {
  static startOfWeek(timeZone: string, now: Date = new Date()): Date {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
    const daysSinceMonday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
    const noonToday = DayWindow.startOfDay(timeZone, now).getTime() + 12 * 60 * 60 * 1000;
    return DayWindow.startOfDay(timeZone, new Date(noonToday - daysSinceMonday * 24 * 60 * 60 * 1000));
  }

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
