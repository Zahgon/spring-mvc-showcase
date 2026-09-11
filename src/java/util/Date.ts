/**
 * `java.util.Date`, for its `toString()`.
 *
 * The showcase prints dates straight into response bodies, so the exact
 * rendering — `EEE MMM dd HH:mm:ss zzz yyyy`, English, in the JVM's default
 * zone, with the zone abbreviation chosen by whether the instant is in daylight
 * time — is part of the HTTP contract.
 */

import { TimeZone, offsetMinutesAt } from './TimeZone.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export class JavaDate {
  constructor(private readonly millis: number) {}

  static from(year: number, month: number, day: number, zoneId?: string): JavaDate {
    const zone = zoneId ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Resolve the zone offset iteratively: the offset itself depends on the
    // instant, which depends on the offset.
    let guess = Date.UTC(year, month - 1, day);
    for (let i = 0; i < 3; i++) {
      const offset = offsetMinutesAt(zone, guess);
      const next = Date.UTC(year, month - 1, day) - offset * 60_000;
      if (next === guess) {
        break;
      }
      guess = next;
    }
    return new JavaDate(guess);
  }

  getTime(): number {
    return this.millis;
  }

  equals(other: unknown): boolean {
    return other instanceof JavaDate && other.millis === this.millis;
  }

  /** `yyyy-MM-dd` in the default time zone, as `@DateTimeFormat(iso=DATE)` prints. */
  toIsoDate(): string {
    const offsetMinutes = offsetMinutesAt(TimeZone.getDefault().getID(), this.millis);
    const local = new Date(this.millis + offsetMinutes * 60_000);
    return (
      `${String(local.getUTCFullYear()).padStart(4, '0')}-` +
      `${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`
    );
  }

  /** `EEE MMM dd HH:mm:ss zzz yyyy` in the default time zone. */
  toString(): string {
    const zone = TimeZone.getDefault();
    const offsetMinutes = offsetMinutesAt(zone.getID(), this.millis);
    const local = new Date(this.millis + offsetMinutes * 60_000);
    const weekday = DAYS[local.getUTCDay()]!;
    const month = MONTHS[local.getUTCMonth()]!;
    const zoneName = zone.getDisplayName(zone.inDaylightTime(this), TimeZone.SHORT);
    return (
      `${weekday} ${month} ${pad(local.getUTCDate())} ` +
      `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())} ` +
      `${zoneName} ${String(local.getUTCFullYear())}`
    );
  }
}
