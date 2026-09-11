/**
 * `javax.swing.text.MaskFormatter`, with `setValueContainsLiteralCharacters(false)`.
 *
 * The showcase registers it as a Spring `Formatter`, so both directions are
 * observable: `(205) 333-3333` parses to `2053333333`, and `2053333333` prints
 * back as `(205) 333-3333`.
 */

export class ParseException extends Error {
  constructor(
    message: string,
    readonly errorOffset: number,
  ) {
    super(message);
    this.name = 'ParseException';
  }
}

/** The mask characters Swing defines. Only the ones the showcase uses matter. */
const PLACEHOLDERS = new Set(['#', "'", 'U', 'L', 'A', '?', '*', 'H']);

function matches(maskChar: string, character: string): boolean {
  switch (maskChar) {
    case '#':
      return /[0-9]/.test(character);
    case 'U':
    case 'L':
    case 'A':
      return /[0-9A-Za-z]/.test(character);
    case '?':
      return /[A-Za-z]/.test(character);
    case 'H':
      return /[0-9A-Fa-f]/.test(character);
    case '*':
      return true;
    default:
      return false;
  }
}

function transform(maskChar: string, character: string): string {
  if (maskChar === 'U') {
    return character.toUpperCase();
  }
  if (maskChar === 'L') {
    return character.toLowerCase();
  }
  return character;
}

export class MaskFormatter {
  private readonly mask: string;

  constructor(mask: string) {
    this.mask = mask;
  }

  getMask(): string {
    return this.mask;
  }

  /**
   * `stringToValue`. With `valueContainsLiteralCharacters` false the literals
   * are stripped, so only the characters matched by a placeholder come back.
   */
  stringToValue(text: string): string {
    let value = '';
    let index = 0;
    for (let position = 0; position < this.mask.length; position++) {
      const maskChar = this.mask[position]!;
      const character = text[index];
      if (maskChar === "'") {
        // an escaped literal: the next mask character is taken verbatim
        position++;
        if (text[index] === this.mask[position]) {
          index++;
        }
        continue;
      }
      if (!PLACEHOLDERS.has(maskChar)) {
        if (character === maskChar) {
          index++;
        }
        continue;
      }
      if (character === undefined || !matches(maskChar, character)) {
        throw new ParseException(`Invalid character: ${character ?? ''}`, index);
      }
      value += transform(maskChar, character);
      index++;
    }
    if (index !== text.length) {
      throw new ParseException(`Invalid character: ${text[index] ?? ''}`, index);
    }
    return value;
  }

  /** `valueToString`: the literals go back in around the value's characters. */
  valueToString(value: string | null): string {
    const source = value ?? '';
    let result = '';
    let index = 0;
    for (let position = 0; position < this.mask.length; position++) {
      const maskChar = this.mask[position]!;
      if (maskChar === "'") {
        position++;
        result += this.mask[position] ?? '';
        continue;
      }
      if (!PLACEHOLDERS.has(maskChar)) {
        result += maskChar;
        continue;
      }
      const character = source[index];
      if (character === undefined) {
        throw new ParseException('Invalid value', index);
      }
      if (!matches(maskChar, character)) {
        throw new ParseException(`Invalid character: ${character}`, index);
      }
      result += transform(maskChar, character);
      index++;
    }
    return result;
  }
}
