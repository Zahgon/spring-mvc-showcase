/**
 * `org.joda.time.LocalDate`, as the redirect controller uses it: a date with no
 * zone, and a conversion to `12/31/11` — Spring's default `LocalDate -> String`
 * for the `en` locale, which is the JDK's SHORT date style.
 */

export class LocalDate {
  constructor(
    readonly year: number,
    readonly monthOfYear: number,
    readonly dayOfMonth: number,
  ) {}

  getYear(): number {
    return this.year;
  }

  getMonthOfYear(): number {
    return this.monthOfYear;
  }

  getDayOfMonth(): number {
    return this.dayOfMonth;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof LocalDate &&
      other.year === this.year &&
      other.monthOfYear === this.monthOfYear &&
      other.dayOfMonth === this.dayOfMonth
    );
  }

  /** Joda's own `toString()` is ISO-8601. */
  toString(): string {
    return (
      `${String(this.year).padStart(4, '0')}-` +
      `${String(this.monthOfYear).padStart(2, '0')}-` +
      `${String(this.dayOfMonth).padStart(2, '0')}`
    );
  }

  /** `M/d/yy`, the SHORT date pattern for the `en` locale. */
  toShortString(): string {
    return `${String(this.monthOfYear)}/${String(this.dayOfMonth)}/${String(this.year % 100).padStart(2, '0')}`;
  }

  static parseShort(text: string): LocalDate {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(text);
    if (match === null) {
      throw new Error(`Invalid format: "${text}"`);
    }
    const year = Number.parseInt(match[3]!, 10);
    return new LocalDate(year < 100 ? 2000 + year : year, Number.parseInt(match[1]!, 10), Number.parseInt(match[2]!, 10));
  }

  static parseIso(text: string): LocalDate {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (match === null) {
      throw new Error(`Invalid format: "${text}"`);
    }
    return new LocalDate(
      Number.parseInt(match[1]!, 10),
      Number.parseInt(match[2]!, 10),
      Number.parseInt(match[3]!, 10),
    );
  }
}
