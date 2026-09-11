/**
 * The JDK behaviour the port reproduces, held to the JVM directly.
 *
 * These shims exist because their output is observable — a `Date` printed into
 * a response, a `BigDecimal` written back into a form field — and because
 * JavaScript's own facilities do not produce the same bytes. Every expectation
 * below was read off OpenJDK 11 under `Asia/Kolkata`, which is the zone the
 * suite pins.
 */

import { describe, expect, test } from 'vitest';
import { BigDecimal } from '../../src/java/math/BigDecimal.js';
import { JavaDate } from '../../src/java/util/Date.js';
import { LocalDate } from '../../src/java/time/LocalDate.js';
import { MaskFormatter, ParseException } from '../../src/java/text/MaskFormatter.js';
import { TimeZone } from '../../src/java/util/TimeZone.js';
import {
  formatPercent,
  formatWithPattern,
  parsePercent,
  parseWithPattern,
} from '../../src/java/text/NumberFormat.js';
import { identityHashCode, objectToString, stringValueOf } from '../../src/java/lang/Objects.js';

describe('java.util.Date', () => {
  test('printsEeeMmmDdHhMmSsZzzYyyy', () => {
    expect(JavaDate.from(2010, 7, 4).toString()).toBe('Sun Jul 04 00:00:00 IST 2010');
  });

  test('namesTheZoneAsItWasAtThatInstant', () => {
    // India kept summer time during the war; the JDK's own tables say IDT.
    expect(JavaDate.from(1941, 12, 16).toString()).toBe('Tue Dec 16 00:00:00 IDT 1941');
  });

  test('printsIsoForDateTimeFormat', () => {
    expect(JavaDate.from(1980, 1, 1).toIsoDate()).toBe('1980-01-01');
    expect(JavaDate.from(2010, 7, 4).toIsoDate()).toBe('2010-07-04');
  });

  test('comparesByInstant', () => {
    expect(JavaDate.from(2010, 7, 4).equals(JavaDate.from(2010, 7, 4))).toBe(true);
    expect(JavaDate.from(2010, 7, 4).equals(JavaDate.from(2010, 7, 5))).toBe(false);
    expect(JavaDate.from(2010, 7, 4).equals('not a date')).toBe(false);
  });
});

describe('java.util.TimeZone', () => {
  test('usesTheJdkShortNames', () => {
    expect(TimeZone.getTimeZone('Asia/Kolkata').getDisplayName(false, TimeZone.SHORT)).toBe('IST');
    expect(TimeZone.getTimeZone('America/New_York').getDisplayName(false, TimeZone.SHORT)).toBe(
      'EST',
    );
    expect(TimeZone.getTimeZone('UTC').getDisplayName(false, TimeZone.SHORT)).toBe('UTC');
  });

  test('fallsBackToGmtOffsetWhenTheZoneHasNoShortName', () => {
    // The JDK prints GMT-03:00 for a zone it has no abbreviation for.
    expect(TimeZone.getTimeZone('Etc/GMT+3').getDisplayName(false, TimeZone.SHORT)).toBe(
      'GMT-03:00',
    );
  });

  test('reportsTheRawOffset', () => {
    expect(TimeZone.getTimeZone('Asia/Kolkata').getRawOffset()).toBe(19_800_000);
    expect(TimeZone.getTimeZone('America/New_York').getRawOffset()).toBe(-18_000_000);
  });
});

describe('java.math.BigDecimal', () => {
  test('keepsItsScale', () => {
    expect(BigDecimal.valueOf('4.20').toString()).toBe('4.20');
    expect(BigDecimal.valueOf('123.33').toString()).toBe('123.33');
    expect(BigDecimal.valueOf('-0.5').toString()).toBe('-0.5');
  });

  test('movesThePointWithoutLosingPrecision', () => {
    expect(BigDecimal.valueOf('89').movePointLeft(2).toString()).toBe('0.89');
    expect(BigDecimal.valueOf('0.89').movePointRight(2).toString()).toBe('89');
  });

  test('roundsHalfEven', () => {
    expect(BigDecimal.valueOf('0.125').setScaleHalfEven(2).toString()).toBe('0.12');
    expect(BigDecimal.valueOf('0.135').setScaleHalfEven(2).toString()).toBe('0.14');
    expect(BigDecimal.valueOf('-0.125').setScaleHalfEven(2).toString()).toBe('-0.12');
  });

  test('convertsToANumberAndComparesByValueAndScale', () => {
    expect(BigDecimal.valueOf('4.20').toNumber()).toBeCloseTo(4.2, 10);
    expect(BigDecimal.valueOf('4.20').equals(BigDecimal.valueOf('4.20'))).toBe(true);
    // 4.2 and 4.20 differ in scale, and BigDecimal.equals says so.
    expect(BigDecimal.valueOf('4.20').equals(BigDecimal.valueOf('4.2'))).toBe(false);
    expect(BigDecimal.valueOf('4.20').equals(4.2)).toBe(false);
  });

  test('namesTheCharacterItCouldNotRead', () => {
    expect(() => BigDecimal.valueOf('zzz')).toThrow(
      'Character z is neither a decimal digit number, decimal point, nor "e" notation exponential mark.',
    );
  });
});

describe('java.text.DecimalFormat', () => {
  // Every pair here was produced by `new DecimalFormat("$###,###.00")` and by
  // `NumberFormat.getPercentInstance(Locale.US)` on OpenJDK 11.
  const PATTERN: [string, string][] = [
    ['0', '$.00'],
    ['0.5', '$.50'],
    ['4.2', '$4.20'],
    ['4.205', '$4.20'],
    ['-4.2', '-$4.20'],
    ['1234567.891', '$1,234,567.89'],
    ['-0.125', '-$.12'],
    ['0.135', '$.14'],
    ['0.001', '$.00'],
    ['99999999.999', '$100,000,000.00'],
    ['-1234.5', '-$1,234.50'],
    ['0.05', '$.05'],
    ['12.345', '$12.34'],
  ];
  const PERCENT: [string, string][] = [
    ['0', '0%'],
    ['0.5', '50%'],
    ['4.2', '420%'],
    ['-4.2', '-420%'],
    ['1234567.891', '123,456,789%'],
    ['-0.125', '-12%'],
    ['0.135', '14%'],
    ['0.001', '0%'],
    ['0.05', '5%'],
    ['12.345', '1,234%'],
  ];

  test.each(PATTERN)('formats %s under $###,###.00 as %s', (value, expected) => {
    expect(formatWithPattern(BigDecimal.valueOf(value), '$###,###.00')).toBe(expected);
  });

  test.each(PERCENT)('formats %s as a percentage as %s', (value, expected) => {
    expect(formatPercent(BigDecimal.valueOf(value))).toBe(expected);
  });

  test('parsesBackWhatItPrinted', () => {
    expect(parseWithPattern('$4.20', '$###,###.00').toString()).toBe('4.20');
    expect(parseWithPattern('$1,234,567.89', '$###,###.00').toString()).toBe('1234567.89');
    expect(parsePercent('89%').toString()).toBe('0.89');
  });
});

describe('javax.swing.text.MaskFormatter', () => {
  const mask = (): MaskFormatter => new MaskFormatter('(###) ###-####');

  test('stripsTheLiteralsOffTheValue', () => {
    expect(mask().stringToValue('(123) 456-7890')).toBe('1234567890');
  });

  test('putsTheLiteralsBack', () => {
    expect(mask().valueToString('1234567890')).toBe('(123) 456-7890');
  });

  test('reportsItsMask', () => {
    expect(mask().getMask()).toBe('(###) ###-####');
  });

  test('refusesAValueThatDoesNotFitTheMask', () => {
    expect(() => mask().stringToValue('123')).toThrow(ParseException);
    expect(() => mask().stringToValue('(abc) def-ghij')).toThrow(ParseException);
  });
});

describe('org.joda.time.LocalDate', () => {
  test('readsBackItsParts', () => {
    const date = new LocalDate(2011, 12, 31);
    expect(date.getYear()).toBe(2011);
    expect(date.getMonthOfYear()).toBe(12);
    expect(date.getDayOfMonth()).toBe(31);
  });

  test('printsIsoAndTheShortEnStyle', () => {
    expect(new LocalDate(2011, 12, 31).toString()).toBe('2011-12-31');
    expect(new LocalDate(2011, 12, 31).toShortString()).toBe('12/31/11');
    expect(new LocalDate(2011, 1, 2).toShortString()).toBe('1/2/11');
  });

  test('parsesTheShortEnStyle', () => {
    expect(LocalDate.parseShort('12/31/11').equals(new LocalDate(2011, 12, 31))).toBe(true);
    expect(LocalDate.parseShort('12/31/2011').equals(new LocalDate(2011, 12, 31))).toBe(true);
    expect(() => LocalDate.parseShort('nonsense')).toThrow('Invalid format');
  });

  test('comparesByValue', () => {
    expect(new LocalDate(2011, 12, 31).equals(new LocalDate(2011, 12, 31))).toBe(true);
    expect(new LocalDate(2011, 12, 31).equals(new LocalDate(2011, 12, 30))).toBe(false);
    expect(new LocalDate(2011, 12, 31).equals('2011-12-31')).toBe(false);
  });
});

describe('java.lang.Object', () => {
  class Anything {}

  test('printsFullyQualifiedNameAtIdentityHash', () => {
    const text = objectToString(new Anything());
    // Integer.toHexString is unsigned, and a JVM identity hash is eight wide.
    expect(text).toMatch(/@[0-9a-f]{8}$/);
  });

  test('givesEachObjectItsOwnStableIdentity', () => {
    const one = new Anything();
    const two = new Anything();
    expect(identityHashCode(one)).toBe(identityHashCode(one));
    expect(identityHashCode(one)).not.toBe(identityHashCode(two));
  });

  test('stringValueOfPrintsNullAsTheWordNull', () => {
    expect(stringValueOf(null)).toBe('null');
    expect(stringValueOf(undefined)).toBe('null');
    expect(stringValueOf(42)).toBe('42');
    expect(stringValueOf('text')).toBe('text');
  });
});
