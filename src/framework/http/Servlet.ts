/**
 * The servlet contract the showcase's handlers see.
 *
 * `javax.servlet` has no TypeScript counterpart, and the handlers take
 * `HttpServletRequest`, `HttpServletResponse`, `HttpSession`, `Reader`,
 * `Writer`, `InputStream` and `OutputStream` as arguments, so the parts of it
 * they touch are reproduced here. One pair of classes serves both the test
 * harness and the real HTTP server, exactly as `MockHttpServletRequest` and a
 * container's request are two implementations of one interface in the original.
 */

import { HttpHeaders } from './HttpHeaders.js';
import { MediaType } from './MediaType.js';
import { JavaClass, objectToString } from '../../java/lang/Objects.js';

@JavaClass('org.springframework.samples.mvc.HttpSession')
export class HttpSession {
  private readonly attributes = new Map<string, unknown>();

  constructor(readonly id: string) {}

  getAttribute(name: string): unknown {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name: string, value: unknown): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  toString(): string {
    return objectToString(this);
  }
}

export interface MultipartFile {
  getName(): string;
  getOriginalFilename(): string | null;
  getContentType(): string | null;
  getBytes(): Buffer;
  getSize(): number;
  isEmpty(): boolean;
}

export class StandardMultipartFile implements MultipartFile {
  constructor(
    private readonly name: string,
    private readonly originalFilename: string | null,
    private readonly contentType: string | null,
    private readonly bytes: Buffer,
  ) {}

  getName(): string {
    return this.name;
  }

  getOriginalFilename(): string | null {
    return this.originalFilename;
  }

  getContentType(): string | null {
    return this.contentType;
  }

  getBytes(): Buffer {
    return this.bytes;
  }

  getSize(): number {
    return this.bytes.length;
  }

  isEmpty(): boolean {
    return this.bytes.length === 0;
  }
}

export interface RequestInit {
  method: string;
  requestURI: string;
  contextPath?: string;
  queryString?: string | null;
  headers?: HttpHeaders;
  parameters?: Map<string, string[]>;
  cookies?: Map<string, string>;
  content?: Buffer;
  contentType?: string | null;
  characterEncoding?: string | null;
  files?: MultipartFile[];
  session?: HttpSession | null;
  locale?: string;
}

let sessionCounter = 0;

@JavaClass('org.springframework.samples.mvc.HttpServletRequest')
export class HttpServletRequest {
  readonly method: string;
  /** The request URI, matrix parameters included, query string excluded. */
  readonly requestURI: string;
  /** The path the application is deployed under, `""` when it is the root. */
  readonly contextPath: string;
  readonly queryString: string | null;
  readonly headers: HttpHeaders;
  readonly cookies: Map<string, string>;
  readonly files: MultipartFile[];
  readonly locale: string;

  private readonly parameters: Map<string, string[]>;
  private readonly attributes = new Map<string, unknown>();
  private content: Buffer;
  private contentTypeValue: string | null;
  private characterEncoding: string | null;
  private session: HttpSession | null;

  constructor(init: RequestInit) {
    this.method = init.method.toUpperCase();
    this.requestURI = init.requestURI;
    this.contextPath = init.contextPath ?? '';
    this.queryString = init.queryString ?? null;
    this.headers = init.headers ?? new HttpHeaders();
    this.cookies = init.cookies ?? new Map();
    this.files = init.files ?? [];
    this.locale = init.locale ?? 'en';
    this.parameters = init.parameters ?? new Map();
    this.content = init.content ?? Buffer.alloc(0);
    this.contentTypeValue = init.contentType ?? this.headers.getFirst(HttpHeaders.CONTENT_TYPE);
    this.characterEncoding = init.characterEncoding ?? null;
    this.session = init.session ?? null;
    if (this.contentTypeValue !== null && !this.headers.containsKey(HttpHeaders.CONTENT_TYPE)) {
      this.headers.set(HttpHeaders.CONTENT_TYPE, this.contentTypeValue);
    }
  }

  getMethod(): string {
    return this.method;
  }

  getRequestURI(): string {
    return this.requestURI;
  }

  getContextPath(): string {
    return this.contextPath;
  }

  getQueryString(): string | null {
    return this.queryString;
  }

  getHeader(name: string): string | null {
    return this.headers.getFirst(name);
  }

  getHeaders(name: string): string[] {
    return this.headers.get(name);
  }

  getHeaderNames(): string[] {
    return this.headers.names();
  }

  getParameter(name: string): string | null {
    return this.parameters.get(name)?.[0] ?? null;
  }

  getParameterValues(name: string): string[] | null {
    const values = this.parameters.get(name);
    return values === undefined ? null : [...values];
  }

  getParameterNames(): string[] {
    return [...this.parameters.keys()];
  }

  getParameterMap(): Map<string, string[]> {
    return new Map([...this.parameters].map(([key, values]) => [key, [...values]]));
  }

  getCookieValue(name: string): string | null {
    return this.cookies.get(name) ?? null;
  }

  getAttribute(name: string): unknown {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name: string, value: unknown): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  getContentType(): string | null {
    return this.contentTypeValue;
  }

  getCharacterEncoding(): string | null {
    if (this.characterEncoding !== null) {
      return this.characterEncoding;
    }
    return this.contentTypeValue === null ? null : MediaType.parse(this.contentTypeValue).getCharset();
  }

  setCharacterEncoding(encoding: string): void {
    this.characterEncoding = encoding;
  }

  getContentLength(): number {
    return this.content.length;
  }

  /** `getInputStream()`. */
  getInputStream(): Buffer {
    return this.content;
  }

  setContent(content: Buffer): void {
    this.content = content;
  }

  /** `getReader()`, decoded with the request charset (ISO-8859-1 by default). */
  getReader(): string {
    return this.content.toString(nodeCharset(this.getCharacterEncoding() ?? 'ISO-8859-1'));
  }

  getFile(name: string): MultipartFile | null {
    return this.files.find((file) => file.getName() === name) ?? null;
  }

  isMultipart(): boolean {
    return this.files.length > 0;
  }

  getSession(create = true): HttpSession | null {
    if (this.session === null && create) {
      sessionCounter++;
      this.session = new HttpSession('session-' + String(sessionCounter));
    }
    return this.session;
  }

  getLocale(): string {
    return this.locale;
  }

  getUserPrincipal(): unknown {
    return null;
  }

  toString(): string {
    return objectToString(this);
  }
}

@JavaClass('org.springframework.samples.mvc.HttpServletResponse')
export class HttpServletResponse {
  private statusValue = 200;
  readonly headers = new HttpHeaders();
  private buffer: Buffer = Buffer.alloc(0);
  private characterEncoding: string | null = null;
  private forwardedUrl: string | null = null;
  private redirectedUrl: string | null = null;
  private committed = false;

  getStatus(): number {
    return this.statusValue;
  }

  setStatus(status: number): void {
    this.statusValue = status;
  }

  sendError(status: number): void {
    this.statusValue = status;
    this.committed = true;
  }

  setHeader(name: string, value: string): void {
    this.headers.set(name, value);
  }

  addHeader(name: string, value: string): void {
    this.headers.add(name, value);
  }

  getHeader(name: string): string | null {
    return this.headers.getFirst(name);
  }

  containsHeader(name: string): boolean {
    return this.headers.containsKey(name);
  }

  setContentType(value: string): void {
    this.headers.set(HttpHeaders.CONTENT_TYPE, value);
    const charset = MediaType.parse(value).getCharset();
    if (charset !== null) {
      this.characterEncoding = charset;
    }
  }

  getContentType(): string | null {
    return this.headers.getFirst(HttpHeaders.CONTENT_TYPE);
  }

  setCharacterEncoding(encoding: string): void {
    this.characterEncoding = encoding;
  }

  getCharacterEncoding(): string {
    return this.characterEncoding ?? 'ISO-8859-1';
  }

  setContentLength(length: number): void {
    this.headers.set(HttpHeaders.CONTENT_LENGTH, String(length));
  }

  /** `getOutputStream().write(...)`. */
  write(bytes: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, bytes]);
  }

  /** `getWriter().write(...)`, encoded with the response charset. */
  writeText(text: string): void {
    this.write(Buffer.from(text, nodeCharset(this.getCharacterEncoding())));
  }

  /**
   * Discards what was written while keeping the headers that describe it, which
   * is what the container does for a HEAD request.
   */
  discardBody(): void {
    this.buffer = Buffer.alloc(0);
  }

  getContentAsBuffer(): Buffer {
    return this.buffer;
  }

  getContentAsString(): string {
    return this.buffer.toString(nodeCharset(this.getCharacterEncoding()));
  }

  sendRedirect(location: string): void {
    this.statusValue = 302;
    this.redirectedUrl = location;
    this.headers.set(HttpHeaders.LOCATION, location);
    this.committed = true;
  }

  forward(path: string): void {
    this.forwardedUrl = path;
  }

  getForwardedUrl(): string | null {
    return this.forwardedUrl;
  }

  getRedirectedUrl(): string | null {
    return this.redirectedUrl;
  }

  isCommitted(): boolean {
    return this.committed;
  }

  toString(): string {
    return objectToString(this);
  }
}

/** Maps a Java charset name onto Node's buffer encodings. */
const NODE_CHARSETS: ReadonlyMap<string, BufferEncoding> = new Map([
  ['iso88591', 'latin1'],
  ['latin1', 'latin1'],
  ['usascii', 'ascii'],
  ['ascii', 'ascii'],
  ['utf8', 'utf8'],
  ['utf16', 'utf16le'],
]);

const DEFAULT_NODE_CHARSET: BufferEncoding = 'utf8';

export function nodeCharset(charset: string): BufferEncoding {
  const normalised = charset.toLowerCase().replace(/[-_]/g, '');
  return NODE_CHARSETS.get(normalised) ?? DEFAULT_NODE_CHARSET;
}
