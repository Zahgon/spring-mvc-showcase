/**
 * `java.math.BigDecimal`, reduced to what the form binding needs: an exact
 * decimal that keeps its scale, so `$123.33` prints back as `123.33` and `89%`
 * as `0.89` rather than as a binary float.
 */

export class BigDecimal {
  private constructor(
    private readonly unscaled: bigint,
    private readonly scale: number,
  ) {}

  static valueOf(text: string): BigDecimal {
    const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text.trim());
    if (match === null || (match[2] === '' && (match[3] ?? '') === '')) {
      const offending = /[^0-9.+-]/.exec(text.trim())?.[0];
      throw new Error(
        offending === undefined
          ? 'Character array is missing "exponent" mark.'
          : `Character ${offending} is neither a decimal digit number, decimal point, nor "e" notation exponential mark.`,
      );
    }
    const sign = match[1] === '-' ? -1n : 1n;
    const whole = match[2] === '' ? '0' : match[2]!;
    const fraction = match[3] ?? '';
    return new BigDecimal(sign * BigInt(whole + fraction), fraction.length);
  }

  static of(unscaled: bigint, scale: number): BigDecimal {
    return new BigDecimal(unscaled, scale);
  }

  /** `movePointLeft(n)`, which is how a percentage becomes a fraction. */
  movePointLeft(places: number): BigDecimal {
    const scale = this.scale + places;
    return scale >= 0
      ? new BigDecimal(this.unscaled, scale)
      : new BigDecimal(this.unscaled * 10n ** BigInt(-scale), 0);
  }

  /** `setScale(n, RoundingMode.HALF_EVEN)`, the rounding `DecimalFormat` uses. */
  setScaleHalfEven(target: number): BigDecimal {
    if (target >= this.scale) {
      return new BigDecimal(this.unscaled * 10n ** BigInt(target - this.scale), target);
    }
    const divisor = 10n ** BigInt(this.scale - target);
    const negative = this.unscaled < 0n;
    const magnitude = negative ? -this.unscaled : this.unscaled;
    const quotient = magnitude / divisor;
    const remainder = magnitude % divisor;
    const twice = remainder * 2n;
    let rounded = quotient;
    if (twice > divisor || (twice === divisor && quotient % 2n === 1n)) {
      rounded = quotient + 1n;
    }
    return new BigDecimal(negative ? -rounded : rounded, target);
  }

  /** `movePointRight(n)`, which is how a fraction becomes a percentage. */
  movePointRight(places: number): BigDecimal {
    return this.movePointLeft(-places);
  }

  signum(): number {
    return this.unscaled < 0n ? -1 : this.unscaled > 0n ? 1 : 0;
  }

  toNumber(): number {
    return Number(this.unscaled) / 10 ** this.scale;
  }

  equals(other: unknown): boolean {
    return other instanceof BigDecimal && other.unscaled === this.unscaled && other.scale === this.scale;
  }

  toString(): string {
    const negative = this.unscaled < 0n;
    const digits = (negative ? -this.unscaled : this.unscaled).toString();
    if (this.scale <= 0) {
      return (negative ? '-' : '') + digits + '0'.repeat(-this.scale);
    }
    const padded = digits.padStart(this.scale + 1, '0');
    const whole = padded.slice(0, padded.length - this.scale);
    const fraction = padded.slice(padded.length - this.scale);
    return `${negative ? '-' : ''}${whole}.${fraction}`;
  }
}
