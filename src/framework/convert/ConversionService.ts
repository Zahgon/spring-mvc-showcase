/**
 * `org.springframework.format.support.DefaultFormattingConversionService`,
 * narrowed to the conversions the showcase performs.
 *
 * The formatting layer is annotation-driven in the original — `@DateTimeFormat`,
 * `@NumberFormat` and the application's own `@MaskFormat` each change how a
 * string becomes a value — so the annotations travel with the declaration and
 * are applied here.
 */

import { BigDecimal } from '../../java/math/BigDecimal.js';
import { JavaDate } from '../../java/util/Date.js';
import { LocalDate } from '../../java/time/LocalDate.js';
import { MaskFormatter } from '../../java/text/MaskFormatter.js';
import {
  formatPercent,
  formatWithPattern,
  parsePercent,
  parseWithPattern,
} from '../../java/text/NumberFormat.js';
import type { Declaration, FormatAnnotations, TypeDescriptor } from './TypeDescriptor.js';

export class ConversionFailedException extends Error {
  /** The Java class of the exception that actually stopped the conversion. */
  readonly causeClass: string;
  readonly causeMessage: string;

  constructor(
    readonly value: string,
    readonly target: string,
    cause?: unknown,
  ) {
    super(
      "Failed to convert value of type 'java.lang.String' to required type '" + target + "'",
      cause === undefined ? undefined : { cause },
    );
    const described = describeCause(cause, value);
    this.causeClass = described.className;
    this.causeMessage = described.message;
  }
}

/**
 * What `ParserConverter` hands on. A parser that raised an
 * `IllegalArgumentException` of its own keeps its message; anything else is
 * wrapped in Spring's own.
 */
function describeCause(cause: unknown, value: string): { className: string; message: string } {
  if (cause instanceof Error && cause.name === 'ParseException') {
    return {
      className: 'java.lang.IllegalArgumentException',
      message: 'Parse attempt failed for value [' + value + ']',
    };
  }
  if (cause instanceof Error) {
    return { className: 'java.lang.IllegalArgumentException', message: cause.message };
  }
  return {
    className: 'java.lang.IllegalArgumentException',
    message: 'Parse attempt failed for value [' + value + ']',
  };
}

/** An annotation-driven formatter, as `addFormatterForFieldAnnotation` registers. */
export interface AnnotationFormatter {
  readonly annotation: keyof FormatAnnotations;
  parse(text: string, annotationValue: unknown): unknown;
  print(value: unknown, annotationValue: unknown): string;
}

export class FormattingConversionService {
  private readonly annotationFormatters: AnnotationFormatter[] = [];

  addFormatterForFieldAnnotation(formatter: AnnotationFormatter): void {
    this.annotationFormatters.push(formatter);
  }

  /** Converts one string to the declared type, honouring its annotations. */
  convert(text: string, declaration: Declaration): unknown {
    const format = declaration.format ?? {};
    for (const formatter of this.annotationFormatters) {
      const annotationValue = format[formatter.annotation];
      if (annotationValue !== undefined) {
        try {
          return formatter.parse(text, annotationValue);
        } catch (cause) {
          // `ParserConverter` turns anything a parser raises into a conversion
          // failure, so a bad value is reported on the field rather than
          // escaping as a server error.
          if (cause instanceof ConversionFailedException) {
            throw cause;
          }
          throw new ConversionFailedException(text, declaration.type.kind, cause);
        }
      }
    }
    return this.convertToType(text, declaration.type, format);
  }

  private convertToType(text: string, type: TypeDescriptor, format: FormatAnnotations): unknown {
    switch (type.kind) {
      case 'string':
        return text;
      case 'integer':
      case 'long': {
        const value = parseJavaInt(text);
        if (value === null) {
          // `Integer.parseInt` names the string it could not read.
          throw new ConversionFailedException(
            text,
            type.kind === 'integer' ? 'java.lang.Integer' : 'java.lang.Long',
            new Error('For input string: "' + text + '"'),
          );
        }
        return value;
      }
      case 'boolean':
        return text.toLowerCase() === 'true' || text === 'on' || text === '1';
      case 'date':
        return this.toDate(text, format);
      case 'localDate':
        return format.isoDate === true ? LocalDate.parseIso(text) : LocalDate.parseShort(text);
      case 'bigDecimal':
        return this.toBigDecimal(text, format);
      case 'enum':
        if (!type.values.includes(text)) {
          throw new ConversionFailedException(text, type.name);
        }
        return text;
      case 'valueObject':
        return type.valueOf(this.convert(text, { type: Types_STRING, format: type.parameter }) as string);
      case 'list':
        // One parameter may carry a comma-separated list, as `values=1,2,3` does.
        return text.split(',').map((part) => this.convert(part.trim(), type.element));
      default:
        return text;
    }
  }

  private toDate(text: string, format: FormatAnnotations): JavaDate {
    if (format.isoDate === true) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
      if (match === null) {
        throw new ConversionFailedException(
          text,
          'java.util.Date',
          new Error('Invalid format: "' + text + '"'),
        );
      }
      return JavaDate.from(
        Number.parseInt(match[1]!, 10),
        Number.parseInt(match[2]!, 10),
        Number.parseInt(match[3]!, 10),
      );
    }
    const parsed = Date.parse(text);
    if (Number.isNaN(parsed)) {
      throw new ConversionFailedException(text, 'java.util.Date');
    }
    return new JavaDate(parsed);
  }

  private toBigDecimal(text: string, format: FormatAnnotations): BigDecimal {
    try {
      if (format.numberPercent === true) {
        return parsePercent(text);
      }
      if (format.numberPattern !== undefined) {
        return parseWithPattern(text, format.numberPattern);
      }
      return BigDecimal.valueOf(text);
    } catch (cause) {
      throw new ConversionFailedException(text, 'java.math.BigDecimal', cause);
    }
  }

  /**
   * The reverse of {@link convert}: what a bound value looks like when it is
   * written back into a form field. The annotation that parsed it prints it,
   * so `currency` comes back as `$4.20` rather than as `4.20`.
   */
  printValue(value: unknown, declaration: Declaration): string {
    if (value === null || value === undefined) {
      return '';
    }
    const format = declaration.format ?? {};
    for (const formatter of this.annotationFormatters) {
      const annotationValue = format[formatter.annotation];
      if (annotationValue !== undefined) {
        return formatter.print(value, annotationValue);
      }
    }
    switch (declaration.type.kind) {
      case 'date':
        return format.isoDate === true ? (value as JavaDate).toIsoDate() : String(value);
      case 'localDate':
        return format.isoDate === true
          ? (value as LocalDate).toString()
          : (value as LocalDate).toShortString();
      case 'bigDecimal':
        if (format.numberPercent === true) {
          return formatPercent(value as BigDecimal);
        }
        if (format.numberPattern !== undefined) {
          return formatWithPattern(value as BigDecimal, format.numberPattern);
        }
        return String(value);
      default:
        return this.print(value);
    }
  }

  /** Used when a value is written back into a URI. */
  print(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof LocalDate) {
      return value.toShortString();
    }
    return String(value);
  }
}

const Types_STRING: TypeDescriptor = { kind: 'string' };

/** `Integer.parseInt` / `Long.parseLong`: an optional sign, then digits. */
function parseJavaInt(text: string): number | null {
  const trimmed = text.trim();
  return /^[+-]?\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : null;
}

/**
 * The application's `MaskFormatAnnotationFormatterFactory`, expressed as the
 * annotation-driven formatter the conversion service registers.
 */
export const maskFormatFormatter: AnnotationFormatter = {
  annotation: 'maskFormat',
  parse(text: string, mask: unknown): unknown {
    return new MaskFormatter(mask as string).stringToValue(text);
  },
  print(value: unknown, mask: unknown): string {
    return new MaskFormatter(mask as string).valueToString(value as string | null);
  },
};
