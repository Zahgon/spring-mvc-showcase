/**
 * `org.springframework.http.HttpHeaders`: a case-insensitive multi-value map
 * that remembers the case and the insertion order of the names it was given.
 *
 * Both matter — `/data/entity` prints the header map straight into the response
 * body as `{Content-Type=[text/plain], Content-Length=[3]}`.
 */

import { MediaType } from './MediaType.js';

export class HttpHeaders {
  static readonly ACCEPT = 'Accept';
  static readonly CACHE_CONTROL = 'Cache-Control';
  static readonly CONTENT_TYPE = 'Content-Type';
  static readonly CONTENT_LENGTH = 'Content-Length';
  static readonly CONTENT_LANGUAGE = 'Content-Language';
  static readonly LOCATION = 'Location';

  private readonly entries = new Map<string, { name: string; values: string[] }>();

  static of(values: Record<string, string | string[]>): HttpHeaders {
    const headers = new HttpHeaders();
    for (const [name, value] of Object.entries(values)) {
      for (const single of Array.isArray(value) ? value : [value]) {
        headers.add(name, single);
      }
    }
    return headers;
  }

  add(name: string, value: string): void {
    const key = name.toLowerCase();
    const existing = this.entries.get(key);
    if (existing === undefined) {
      this.entries.set(key, { name, values: [value] });
    } else {
      existing.values.push(value);
    }
  }

  set(name: string, value: string): void {
    this.entries.set(name.toLowerCase(), { name, values: [value] });
  }

  remove(name: string): void {
    this.entries.delete(name.toLowerCase());
  }

  containsKey(name: string): boolean {
    return this.entries.has(name.toLowerCase());
  }

  getFirst(name: string): string | null {
    return this.entries.get(name.toLowerCase())?.values[0] ?? null;
  }

  get(name: string): string[] {
    return [...(this.entries.get(name.toLowerCase())?.values ?? [])];
  }

  names(): string[] {
    return [...this.entries.values()].map((entry) => entry.name);
  }

  isEmpty(): boolean {
    return this.entries.size === 0;
  }

  setContentType(mediaType: MediaType): void {
    this.set(HttpHeaders.CONTENT_TYPE, mediaType.toString());
  }

  getContentType(): MediaType | null {
    const value = this.getFirst(HttpHeaders.CONTENT_TYPE);
    return value === null ? null : MediaType.parse(value);
  }

  setContentLength(length: number): void {
    this.set(HttpHeaders.CONTENT_LENGTH, String(length));
  }

  getContentLength(): number {
    const value = this.getFirst(HttpHeaders.CONTENT_LENGTH);
    return value === null ? -1 : Number.parseInt(value, 10);
  }

  getAccept(): MediaType[] {
    return this.get(HttpHeaders.ACCEPT).flatMap((value) => MediaType.parseList(value));
  }

  setLocation(location: string): void {
    this.set(HttpHeaders.LOCATION, location);
  }

  copy(): HttpHeaders {
    const headers = new HttpHeaders();
    for (const { name, values } of this.entries.values()) {
      for (const value of values) {
        headers.add(name, value);
      }
    }
    return headers;
  }

  /** `{Content-Type=[text/plain], Content-Length=[3]}`, as `/data/entity` prints. */
  toString(): string {
    const rendered = [...this.entries.values()]
      .map((entry) => entry.name + '=[' + entry.values.join(', ') + ']')
      .join(', ');
    return '{' + rendered + '}';
  }
}
