/**
 * What a field says when its value will not convert.
 *
 * These messages are rendered into the page next to the field, so they are
 * observable, and they are not the port's own wording: they are
 * `TypeMismatchException`'s. Which nested exception each one names is decided
 * by `TypeConverterDelegate`, which tries the conversion service first and then
 * falls back to the required type's default `PropertyEditor` — so `int` and
 * `BigDecimal` report their own `NumberFormatException` while `Date` and the
 * `@MaskFormat` `String` report the conversion failure itself.
 *
 * Every expectation here was read off the Java original, asked the same
 * question.
 */

import { expect, test } from 'vitest';
import { TestClient } from '../support/container.js';

const EXPECTED: Record<string, string> = {
  age:
    'Failed to convert property value of type java.lang.String to required type int ' +
    'for property age; nested exception is java.lang.NumberFormatException: ' +
    'For input string: &quot;abc&quot;',
  birthDate:
    'Failed to convert property value of type java.lang.String to required type ' +
    'java.util.Date for property birthDate; nested exception is ' +
    'org.springframework.core.convert.ConversionFailedException: Failed to convert from ' +
    'type [java.lang.String] to type [@org.springframework.format.annotation.DateTimeFormat ' +
    '@javax.validation.constraints.Past java.util.Date] for value notadate; nested exception ' +
    'is java.lang.IllegalArgumentException: Invalid format: &quot;notadate&quot;',
  phone:
    'Failed to convert property value of type java.lang.String to required type ' +
    'java.lang.String for property phone; nested exception is ' +
    'org.springframework.core.convert.ConversionFailedException: Failed to convert from ' +
    'type [java.lang.String] to type [@org.springframework.samples.mvc.convert.MaskFormat ' +
    'java.lang.String] for value 123; nested exception is ' +
    'java.lang.IllegalArgumentException: Parse attempt failed for value [123]',
  currency:
    'Failed to convert property value of type java.lang.String to required type ' +
    'java.math.BigDecimal for property currency; nested exception is ' +
    'java.lang.NumberFormatException: Character z is neither a decimal digit number, ' +
    'decimal point, nor &quot;e&quot; notation exponential mark.',
  percent:
    'Failed to convert property value of type java.lang.String to required type ' +
    'java.math.BigDecimal for property percent; nested exception is ' +
    'java.lang.NumberFormatException: Character q is neither a decimal digit number, ' +
    'decimal point, nor &quot;e&quot; notation exponential mark.',
};

async function submitUnconvertibleValues(): Promise<string> {
  const client = new TestClient();
  const token = TestClient.tokenOf((await client.get('/form')).text);
  const response = await client.form(
    '/form',
    '_csrf=' +
      token +
      '&name=x&age=abc&birthDate=notadate&currency=zzz&percent=qq&phone=123' +
      '&inquiry=comment&subscribeNewsletter=false',
  );
  return response.text;
}

test('reportsEveryConversionFailureAsTheOriginalDoes', async () => {
  const page = await submitUnconvertibleValues();
  const spans = [...page.matchAll(/<span id="([^"]+)\.errors" class="error">([^<]*)<\/span>/g)];
  expect(Object.fromEntries(spans.map((m) => [m[1]!, m[2]!]))).toEqual(EXPECTED);
});

test('doesNotAlsoJudgeAFieldThatFailedToBind', async () => {
  // age is @Min(21) and the bean still holds its default 0, but the submitted
  // value never reached it -- SpringValidatorAdapter leaves such a field alone.
  const page = await submitUnconvertibleValues();
  expect(page).not.toContain('must be greater than or equal to 21');
});

test('echoesTheRejectedValueBackIntoTheField', async () => {
  const page = await submitUnconvertibleValues();
  expect(page).toContain('<input id="age" name="age" type="text" value="abc"/>');
  expect(page).toContain('<input id="phone" name="phone" type="text" value="123"/>');
});
