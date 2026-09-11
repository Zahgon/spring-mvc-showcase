/**
 * `java.util.TimeZone`, reduced to the two questions `java.util.Date.toString()`
 * and `ConvertControllerTests` ask of it: is this instant in daylight time, and
 * what is this zone's short display name.
 *
 * `Intl` cannot answer the second one the way the JDK does. For `Asia/Kolkata`
 * the JDK reports `IST`/`IDT` and `Intl.DateTimeFormat` reports `GMT+5:30`, and
 * the abbreviation ends up inside a response body, so the JDK's own table is
 * reproduced here. Zones the JDK does not name fall back to `GMT±HH:MM`,
 * exactly as the JDK does.
 */

interface ZoneNames {
  readonly std: string;
  readonly dst: string;
}

/**
 * `sun.util.resources.TimeZoneNames` short names, for the zones the JDK names.
 * A zone absent from this table is rendered as a GMT offset, which is what the
 * JDK falls back to as well.
 */
const SHORT_NAMES: Readonly<Record<string, ZoneNames>> = {
  'Africa/Cairo': { std: 'EET', dst: 'EEST' },
  'Africa/Johannesburg': { std: 'SAST', dst: 'SAST' },
  'Africa/Lagos': { std: 'WAT', dst: 'WAT' },
  'America/Anchorage': { std: 'AKST', dst: 'AKDT' },
  'America/Argentina/Buenos_Aires': { std: 'ART', dst: 'ARST' },
  'America/Bogota': { std: 'COT', dst: 'COST' },
  'America/Chicago': { std: 'CST', dst: 'CDT' },
  'America/Denver': { std: 'MST', dst: 'MDT' },
  'America/Halifax': { std: 'AST', dst: 'ADT' },
  'America/Los_Angeles': { std: 'PST', dst: 'PDT' },
  'America/Mexico_City': { std: 'CST', dst: 'CDT' },
  'America/New_York': { std: 'EST', dst: 'EDT' },
  'America/Phoenix': { std: 'MST', dst: 'MST' },
  'America/Sao_Paulo': { std: 'BRT', dst: 'BRST' },
  'America/Toronto': { std: 'EST', dst: 'EDT' },
  'America/Vancouver': { std: 'PST', dst: 'PDT' },
  'Asia/Bangkok': { std: 'ICT', dst: 'ICT' },
  'Asia/Calcutta': { std: 'IST', dst: 'IDT' },
  'Asia/Dubai': { std: 'GST', dst: 'GST' },
  'Asia/Hong_Kong': { std: 'HKT', dst: 'HKST' },
  'Asia/Jakarta': { std: 'WIB', dst: 'WIB' },
  'Asia/Jerusalem': { std: 'IST', dst: 'IDT' },
  'Asia/Karachi': { std: 'PKT', dst: 'PKST' },
  'Asia/Kolkata': { std: 'IST', dst: 'IDT' },
  'Asia/Manila': { std: 'PHT', dst: 'PHST' },
  'Asia/Seoul': { std: 'KST', dst: 'KDT' },
  'Asia/Shanghai': { std: 'CST', dst: 'CDT' },
  'Asia/Singapore': { std: 'SGT', dst: 'SGT' },
  'Asia/Taipei': { std: 'CST', dst: 'CDT' },
  'Asia/Tokyo': { std: 'JST', dst: 'JDT' },
  'Australia/Adelaide': { std: 'ACST', dst: 'ACDT' },
  'Australia/Brisbane': { std: 'AEST', dst: 'AEDT' },
  'Australia/Melbourne': { std: 'AEST', dst: 'AEDT' },
  'Australia/Perth': { std: 'AWST', dst: 'AWDT' },
  'Australia/Sydney': { std: 'AEST', dst: 'AEDT' },
  'Europe/Amsterdam': { std: 'CET', dst: 'CEST' },
  'Europe/Athens': { std: 'EET', dst: 'EEST' },
  'Europe/Berlin': { std: 'CET', dst: 'CEST' },
  'Europe/Brussels': { std: 'CET', dst: 'CEST' },
  'Europe/Dublin': { std: 'GMT', dst: 'IST' },
  'Europe/Helsinki': { std: 'EET', dst: 'EEST' },
  'Europe/Istanbul': { std: 'TRT', dst: 'TRT' },
  'Europe/Lisbon': { std: 'WET', dst: 'WEST' },
  'Europe/London': { std: 'GMT', dst: 'BST' },
  'Europe/Madrid': { std: 'CET', dst: 'CEST' },
  'Europe/Moscow': { std: 'MSK', dst: 'MSD' },
  'Europe/Paris': { std: 'CET', dst: 'CEST' },
  'Europe/Prague': { std: 'CET', dst: 'CEST' },
  'Europe/Rome': { std: 'CET', dst: 'CEST' },
  'Europe/Stockholm': { std: 'CET', dst: 'CEST' },
  'Europe/Vienna': { std: 'CET', dst: 'CEST' },
  'Europe/Warsaw': { std: 'CET', dst: 'CEST' },
  'Europe/Zurich': { std: 'CET', dst: 'CEST' },
  'Pacific/Auckland': { std: 'NZST', dst: 'NZDT' },
  'Pacific/Honolulu': { std: 'HST', dst: 'HST' },
  UTC: { std: 'UTC', dst: 'UTC' },
};

const OFFSET_FORMAT_CACHE = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(zoneId: string): Intl.DateTimeFormat {
  let formatter = OFFSET_FORMAT_CACHE.get(zoneId);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zoneId,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      era: 'short',
    });
    OFFSET_FORMAT_CACHE.set(zoneId, formatter);
  }
  return formatter;
}

/** The zone's UTC offset, in minutes, at a given instant. */
export function offsetMinutesAt(zoneId: string, epochMillis: number): number {
  const parts = offsetFormatter(zoneId).formatToParts(new Date(epochMillis));
  const field = (type: string): number =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? '0', 10);
  const era = parts.find((part) => part.type === 'era')?.value;
  const year = era === 'BC' ? 1 - field('year') : field('year');
  const asUtc = Date.UTC(year, field('month') - 1, field('day'), field('hour') % 24, field('minute'), field('second'));
  return Math.round((asUtc - Math.floor(epochMillis / 1000) * 1000) / 60000);
}

export class TimeZone {
  static SHORT = 0;

  static LONG = 1;

  private constructor(private readonly zoneId: string) {}

  static getDefault(): TimeZone {
    return new TimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }

  static getTimeZone(zoneId: string): TimeZone {
    return new TimeZone(zoneId);
  }

  getID(): string {
    return this.zoneId;
  }

  /**
   * `getRawOffset()`: the zone's standard offset, i.e. the smaller of the two
   * offsets it uses across the current year.
   */
  getRawOffset(): number {
    const year = new Date().getUTCFullYear();
    const january = offsetMinutesAt(this.zoneId, Date.UTC(year, 0, 15));
    const july = offsetMinutesAt(this.zoneId, Date.UTC(year, 6, 15));
    return Math.min(january, july) * 60_000;
  }

  getOffset(epochMillis: number): number {
    return offsetMinutesAt(this.zoneId, epochMillis) * 60_000;
  }

  /** True when the instant's offset is ahead of the zone's standard offset. */
  inDaylightTime(date: { getTime(): number }): boolean {
    return this.getOffset(date.getTime()) > this.getRawOffset();
  }

  getDisplayName(daylight: boolean, style: number): string {
    if (style !== TimeZone.SHORT) {
      throw new Error('only TimeZone.SHORT display names are reproduced');
    }
    const names = SHORT_NAMES[this.zoneId];
    if (names !== undefined) {
      return daylight ? names.dst : names.std;
    }
    return gmtOffsetName(this.getRawOffset() + (daylight ? 3_600_000 : 0));
  }
}

/** The JDK's fallback rendering for a zone with no short name: `GMT+05:30`. */
function gmtOffsetName(offsetMillis: number): string {
  if (offsetMillis === 0) {
    return 'GMT';
  }
  const sign = offsetMillis < 0 ? '-' : '+';
  const totalMinutes = Math.abs(Math.trunc(offsetMillis / 60_000));
  const hours = Math.trunc(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `GMT${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
