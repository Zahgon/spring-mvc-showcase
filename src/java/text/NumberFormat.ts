/**
 * The `java.text.NumberFormat` behaviour behind Spring's `@NumberFormat`:
 * a `DecimalFormat` pattern, and the percent style.
 *
 * The MockMvc surface only ever parses — it binds `$123.33` and `89%` into
 * `BigDecimal` properties and prints the resulting `BigDecimal`. The rendered
 * form is the other direction: a bound `currency` comes back out of the input
 * field as `$4.20` and `percent` as `15%`, so both formats round-trip.
 */

import { BigDecimal } from '../math/BigDecimal.js';

/** Strips a `DecimalFormat` pattern's literal prefix/suffix and grouping. */
export function parseWithPattern(text: string, pattern: string): BigDecimal {
  const prefix = /^[^#0.,]*/.exec(pattern)?.[0] ?? '';
  const suffix = /[^#0.,]*$/.exec(pattern)?.[0] ?? '';
  let body = text.trim();
  if (prefix !== '' && body.startsWith(prefix)) {
    body = body.slice(prefix.length);
  }
  if (suffix !== '' && body.endsWith(suffix)) {
    body = body.slice(0, body.length - suffix.length);
  }
  return BigDecimal.valueOf(body.replace(/,/g, ''));
}

/** `NumberFormat.getPercentInstance().parse("89%")` -> `0.89`. */
export function parsePercent(text: string): BigDecimal {
  const body = text.trim().replace(/%$/, '').replace(/,/g, '');
  return BigDecimal.valueOf(body).movePointLeft(2);
}

/**
 * The pattern's fraction digits: `.00` means two, minimum and maximum, and a
 * `#` after the decimal point is optional rather than padded.
 */
function fractionDigits(pattern: string): { min: number; max: number } {
  const dot = pattern.indexOf('.');
  if (dot < 0) {
    return { min: 0, max: 0 };
  }
  const fraction = /^[0#]*/.exec(pattern.slice(dot + 1))?.[0] ?? '';
  return { min: (fraction.match(/0/g) ?? []).length, max: fraction.length };
}

/** Inserts `DecimalFormat`'s grouping separator every three digits. */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+$)/g, ',');
}

/**
 * The minimum digits the pattern demands before the decimal point. `###,###`
 * asks for none, which is why `$###,###.00` renders a half as `$.50` and not as
 * `$0.50`.
 */
function integerDigits(pattern: string): number {
  const dot = pattern.indexOf('.');
  const whole = dot < 0 ? pattern : pattern.slice(0, dot);
  return (whole.replace(/[^#0]/g, '').match(/0/g) ?? []).length;
}

/**
 * Renders a `BigDecimal` under a `DecimalFormat` pattern.
 *
 * With no negative subpattern the sign goes in front of the whole positive
 * form, prefix included: `-0.125` under `$###,###.00` is `-$.12`, not `$-0.12`.
 */
export function formatWithPattern(value: BigDecimal, pattern: string): string {
  const prefix = /^[^#0.,]*/.exec(pattern)?.[0] ?? '';
  const suffix = /[^#0.,]*$/.exec(pattern)?.[0] ?? '';
  const { min, max } = fractionDigits(pattern);
  const rounded = value.setScaleHalfEven(max);
  const sign = rounded.signum() < 0 ? '-' : '';
  return (
    sign + prefix + decimal(rounded, min, max, integerDigits(pattern), pattern.includes(',')) + suffix
  );
}

/** `NumberFormat.getPercentInstance().format(0.15)` -> `15%`. */
export function formatPercent(value: BigDecimal): string {
  const rounded = value.movePointRight(2).setScaleHalfEven(0);
  return (rounded.signum() < 0 ? '-' : '') + decimal(rounded, 0, 0, 1, true) + '%';
}

/** The unsigned body: grouped integer part, then the fraction digits kept. */
function decimal(
  rounded: BigDecimal,
  min: number,
  max: number,
  minIntegerDigits: number,
  grouping: boolean,
): string {
  const text = rounded.toString().replace(/^-/, '');
  const [whole = '0', fraction = ''] = text.split('.');
  let digits = fraction.slice(0, max);
  while (digits.length > min && digits.endsWith('0')) {
    digits = digits.slice(0, -1);
  }
  const integer = whole === '0' && minIntegerDigits === 0 ? '' : whole.padStart(minIntegerDigits, '0');
  const body = (grouping ? group(integer) : integer) + (digits === '' ? '' : '.' + digits);
  return body;
}
