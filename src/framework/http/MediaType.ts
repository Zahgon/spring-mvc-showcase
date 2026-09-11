/**
 * `org.springframework.http.MediaType`.
 *
 * Content negotiation is contract: `/mapping/produces` picks between two
 * handler methods by `Accept`, and `text/plain;charset=ISO-8859-1` is asserted
 * verbatim by four tests. Parsing, parameters, compatibility and the sort by
 * specificity and quality are therefore reproduced rather than approximated.
 */

export class MediaType {
  static readonly ALL_VALUE = '*/*';
  static readonly APPLICATION_JSON_VALUE = 'application/json';
  static readonly APPLICATION_XML_VALUE = 'application/xml';
  static readonly APPLICATION_ATOM_XML_VALUE = 'application/atom+xml';
  static readonly APPLICATION_RSS_XML_VALUE = 'application/rss+xml';
  static readonly APPLICATION_FORM_URLENCODED_VALUE = 'application/x-www-form-urlencoded';
  static readonly MULTIPART_FORM_DATA_VALUE = 'multipart/form-data';
  static readonly TEXT_PLAIN_VALUE = 'text/plain';
  static readonly TEXT_HTML_VALUE = 'text/html';
  static readonly APPLICATION_OCTET_STREAM_VALUE = 'application/octet-stream';

  private constructor(
    readonly type: string,
    readonly subtype: string,
    readonly parameters: ReadonlyMap<string, string>,
  ) {}

  static parse(value: string): MediaType {
    const parts = value.split(';');
    const essence = parts[0] ?? '';
    const slash = essence.indexOf('/');
    const type = slash < 0 ? essence.trim() : essence.slice(0, slash).trim();
    const subtype = slash < 0 ? '*' : essence.slice(slash + 1).trim();
    const parameters = new Map<string, string>();
    for (const parameter of parts.slice(1)) {
      const equals = parameter.indexOf('=');
      if (equals < 0) {
        continue;
      }
      const name = parameter.slice(0, equals).trim().toLowerCase();
      let raw = parameter.slice(equals + 1).trim();
      if (raw.startsWith('"') && raw.endsWith('"')) {
        raw = raw.slice(1, -1);
      }
      parameters.set(name, raw);
    }
    return new MediaType(type.toLowerCase(), subtype.toLowerCase(), parameters);
  }

  static parseList(value: string | null | undefined): MediaType[] {
    if (value === null || value === undefined || value.trim() === '') {
      return [];
    }
    return splitTopLevel(value).map((part) => MediaType.parse(part));
  }

  static readonly ALL = MediaType.parse('*/*');
  static readonly APPLICATION_JSON = MediaType.parse('application/json');
  static readonly APPLICATION_XML = MediaType.parse('application/xml');
  static readonly APPLICATION_ATOM_XML = MediaType.parse('application/atom+xml');
  static readonly APPLICATION_RSS_XML = MediaType.parse('application/rss+xml');
  static readonly APPLICATION_FORM_URLENCODED = MediaType.parse('application/x-www-form-urlencoded');
  static readonly MULTIPART_FORM_DATA = MediaType.parse('multipart/form-data');
  static readonly TEXT_PLAIN = MediaType.parse('text/plain');
  static readonly TEXT_HTML = MediaType.parse('text/html');
  static readonly APPLICATION_OCTET_STREAM = MediaType.parse('application/octet-stream');

  withCharset(charset: string): MediaType {
    const parameters = new Map(this.parameters);
    parameters.set('charset', charset);
    return new MediaType(this.type, this.subtype, parameters);
  }

  withoutParameters(): MediaType {
    return new MediaType(this.type, this.subtype, new Map());
  }

  getCharset(): string | null {
    return this.parameters.get('charset') ?? null;
  }

  isWildcardType(): boolean {
    return this.type === '*';
  }

  isWildcardSubtype(): boolean {
    return this.subtype === '*' || this.subtype.startsWith('*+');
  }

  isConcrete(): boolean {
    return !this.isWildcardType() && !this.isWildcardSubtype();
  }

  /** `MediaType#includes`: does this range cover `other`? */
  includes(other: MediaType): boolean {
    if (this.isWildcardType()) {
      return true;
    }
    if (this.type !== other.type) {
      return false;
    }
    if (this.subtype === other.subtype) {
      return true;
    }
    if (!this.isWildcardSubtype()) {
      return false;
    }
    const plus = this.subtype.indexOf('+');
    if (plus < 0) {
      return true;
    }
    const otherPlus = other.subtype.indexOf('+');
    return otherPlus >= 0 && this.subtype.slice(plus + 1) === other.subtype.slice(otherPlus + 1);
  }

  isCompatibleWith(other: MediaType): boolean {
    return this.includes(other) || other.includes(this);
  }

  equalsTypeAndSubtype(other: MediaType): boolean {
    return this.type === other.type && this.subtype === other.subtype;
  }

  getQualityValue(): number {
    const quality = this.parameters.get('q');
    return quality === undefined ? 1 : Number.parseFloat(quality);
  }

  removeQualityValue(): MediaType {
    if (!this.parameters.has('q')) {
      return this;
    }
    const parameters = new Map(this.parameters);
    parameters.delete('q');
    return new MediaType(this.type, this.subtype, parameters);
  }

  toString(): string {
    let result = this.type + '/' + this.subtype;
    for (const [name, value] of this.parameters) {
      result += ';' + name + '=' + value;
    }
    return result;
  }

  /** `MediaType.sortBySpecificityAndQuality`: most specific and highest q first. */
  static sortBySpecificityAndQuality(types: MediaType[]): MediaType[] {
    return [...types].sort((left, right) => {
      if (left.isWildcardType() !== right.isWildcardType()) {
        return left.isWildcardType() ? 1 : -1;
      }
      if (left.isWildcardSubtype() !== right.isWildcardSubtype()) {
        return left.isWildcardSubtype() ? 1 : -1;
      }
      const quality = right.getQualityValue() - left.getQualityValue();
      if (quality !== 0) {
        return quality;
      }
      return right.parameters.size - left.parameters.size;
    });
  }
}

/** Splits a header on commas that are not inside a quoted string. */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quoted = false;
  for (const character of value) {
    if (character === '"') {
      quoted = !quoted;
    }
    if (character === ',' && !quoted) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}
