/**
 * What the servlet container did.
 *
 * The original is a war: Jetty accepts the connection, parses the request,
 * keeps the sessions and the flash map, serves `/resources/**` off the
 * filesystem, runs the CSRF filter, hands what is left to the dispatcher and
 * renders whatever view the dispatcher forwarded to. None of that is Spring,
 * and none of it is the application — but all of it is observable, so it is
 * reproduced here rather than assumed.
 *
 * The transport is deliberately not part of this: a request is a plain object
 * and a response is a plain object, so the whole path is exercised in a test
 * without opening a socket. `main.ts` is the adapter onto `node:http`.
 */

import { randomUUID } from 'node:crypto';
import { extname, join, normalize, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { HttpHeaders } from '../http/HttpHeaders.js';
import {
  HttpServletRequest,
  HttpServletResponse,
  HttpSession,
  StandardMultipartFile,
  type MultipartFile,
} from '../http/Servlet.js';
import type { DispatcherServlet } from './DispatcherServlet.js';
import { newResultState, URI_TEMPLATE_VARIABLES_ATTRIBUTE } from './DispatcherServlet.js';
import type { CsrfFilter } from './CsrfFilter.js';
import type { FormattingConversionService } from '../convert/ConversionService.js';
import type { ViewModel } from '../view/ViewTemplate.js';

export const SESSION_COOKIE = 'JSESSIONID';

const CONTENT_TYPES = new Map([
  ['.css', 'text/css'],
  ['.js', 'application/javascript'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.jpg', 'image/jpeg'],
  ['.html', 'text/html'],
]);

export interface ContainerRequest {
  readonly method: string;
  /** The request target, context path and query string included. */
  readonly url: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: Buffer;
}

export interface ContainerResponse {
  status: number;
  headers: [string, string][];
  body: Buffer;
}

export interface ViewContext {
  readonly model: ViewModel;
  readonly contextPath: string;
  readonly request: HttpServletRequest;
  readonly conversionService: FormattingConversionService;
}

export interface ContainerOptions {
  readonly contextPath: string;
  /**
   * Where `/resources/**` is served from, tried in order. The application's own
   * assets live under one root and the vendored browser libraries under
   * another; the URL space they share is the one every page links to.
   */
  readonly resourceRoots: readonly string[];
  readonly dispatcher: DispatcherServlet;
  readonly conversionService: FormattingConversionService;
  readonly csrf: CsrfFilter;
  readonly views: ReadonlyMap<string, (context: ViewContext) => string>;
}

/** `Cookie: a=1; b=2`. */
export function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0) {
      cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
    }
  }
  return cookies;
}

/** A repeated parameter keeps every value, in the order they arrived. */
export function addParameter(
  parameters: Map<string, string[]>,
  name: string,
  value: string,
): void {
  const existing = parameters.get(name);
  if (existing === undefined) {
    parameters.set(name, [value]);
  } else {
    existing.push(value);
  }
}

/**
 * `multipart/form-data`, which the container parses before the dispatcher ever
 * sees the request. A part with a `filename` becomes a file; anything else is
 * an ordinary request parameter.
 */
export function parseMultipart(
  body: Buffer,
  boundary: string,
  parameters: Map<string, string[]>,
): MultipartFile[] {
  const files: MultipartFile[] = [];
  const separator = Buffer.from('--' + boundary);
  let index = body.indexOf(separator);
  while (index >= 0) {
    const start = index + separator.length;
    const next = body.indexOf(separator, start);
    if (next < 0) {
      break;
    }
    const part = body.subarray(start, next);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd > 0) {
      const rawHeaders = part.subarray(0, headerEnd).toString('latin1');
      const content = part.subarray(headerEnd + 4, part.length - 2);
      const name = /name="([^"]*)"/.exec(rawHeaders)?.[1] ?? '';
      const filename = /filename="([^"]*)"/.exec(rawHeaders)?.[1];
      const contentType = /Content-Type:\s*(\S+)/i.exec(rawHeaders)?.[1] ?? null;
      if (filename === undefined) {
        addParameter(parameters, name, content.toString('utf8'));
      } else {
        files.push(new StandardMultipartFile(name, filename, contentType, content));
      }
    }
    index = next;
  }
  return files;
}

/** The media type the container serves a static file under. */
export function contentTypeOf(path: string): string {
  return CONTENT_TYPES.get(extname(path)) ?? 'application/octet-stream';
}

export class ServletContainer {
  private readonly sessions = new Map<string, HttpSession>();
  /** `FlashMap`: what a redirect leaves for the request that follows it. */
  private readonly flashMaps = new Map<string, Map<string, unknown>>();
  private readonly resourceRoots: readonly string[];

  constructor(private readonly options: ContainerOptions) {
    this.resourceRoots = options.resourceRoots.map((root) => resolve(root));
  }

  private async serveResource(path: string): Promise<ContainerResponse | null> {
    const relative = normalize(path).replace(/^(\.\.[/\\])+/, '');
    for (const root of this.resourceRoots) {
      const file = join(root, relative);
      if (!file.startsWith(root)) {
        continue;
      }
      try {
        const content = await readFile(file);
        return {
          status: 200,
          headers: [
            ['Content-Type', contentTypeOf(file)],
            ['Content-Length', String(content.length)],
          ],
          body: content,
        };
      } catch {
        // Not under this root; try the next one.
      }
    }
    return null;
  }

  async service(incoming: ContainerRequest): Promise<ContainerResponse> {
    const { contextPath, dispatcher, csrf, views, conversionService } = this.options;
    const queryIndex = incoming.url.indexOf('?');
    const rawPath = queryIndex < 0 ? incoming.url : incoming.url.slice(0, queryIndex);
    const queryString = queryIndex < 0 ? null : incoming.url.slice(queryIndex + 1);

    if (!rawPath.startsWith(contextPath)) {
      return { status: 404, headers: [], body: Buffer.alloc(0) };
    }
    const path = rawPath.slice(contextPath.length) || '/';
    if (path.startsWith('/resources/')) {
      const served = await this.serveResource(path.slice('/resources'.length));
      if (served !== null) {
        return served;
      }
    }

    const parameters = new Map<string, string[]>();
    for (const [name, value] of new URLSearchParams(queryString ?? '')) {
      addParameter(parameters, name, value);
    }

    const headers = new HttpHeaders();
    for (const [name, value] of Object.entries(incoming.headers)) {
      for (const single of Array.isArray(value) ? value : [value ?? '']) {
        headers.add(name, single);
      }
    }

    const contentType = header(incoming.headers, 'content-type');
    let files: MultipartFile[] = [];
    if (contentType?.startsWith('application/x-www-form-urlencoded') === true) {
      for (const [name, value] of new URLSearchParams(incoming.body.toString('utf8'))) {
        addParameter(parameters, name, value);
      }
    } else if (contentType?.startsWith('multipart/form-data') === true) {
      const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
      files = parseMultipart(incoming.body, (boundary?.[1] ?? boundary?.[2] ?? '').trim(), parameters);
    }

    const cookies = parseCookies(header(incoming.headers, 'cookie') ?? undefined);
    const existingId = cookies.get(SESSION_COOKIE);
    const existing = existingId === undefined ? undefined : this.sessions.get(existingId);
    const sessionId = existing === undefined ? randomUUID() : existingId!;
    const session = existing ?? new HttpSession(sessionId);
    this.sessions.set(sessionId, session);

    const request = new HttpServletRequest({
      method: incoming.method,
      requestURI: decodeURIComponent(path),
      contextPath,
      queryString,
      headers,
      parameters,
      cookies,
      content: incoming.body,
      contentType,
      files,
      session,
      locale: (header(incoming.headers, 'accept-language') ?? 'en-US').split(',')[0]!.trim(),
    });
    const response = new HttpServletResponse();

    // The flash attributes a redirect left behind belong to the request that
    // follows it, and are gone once it has seen them.
    const flash = this.flashMaps.get(sessionId);
    if (flash !== undefined) {
      this.flashMaps.delete(sessionId);
      for (const [name, value] of flash) {
        request.setAttribute(name, value);
      }
    }

    if (!csrf.doFilter(request, response)) {
      return this.finish(response, sessionId, cookies);
    }

    const state = newResultState();
    for (const [name, value] of flash ?? []) {
      state.model.set(name, value);
    }
    await dispatcher.service(request, response, state);
    if (state.asyncStarted) {
      await dispatcher.dispatchAsync(state);
    }
    if (state.flashAttributes.size > 0) {
      this.flashMaps.set(sessionId, new Map(state.flashAttributes));
    }

    const forwarded = response.getForwardedUrl();
    if (forwarded === null) {
      return this.finish(response, sessionId, cookies);
    }
    const template = views.get(forwarded);
    if (template === undefined) {
      return {
        status: 404,
        headers: [['Content-Type', 'text/plain']],
        body: Buffer.from('No view for ' + forwarded),
      };
    }
    // The view sees the path variables, then the request attributes, then the
    // model -- the order `AbstractView` merges them in.
    const model = new Map<string, unknown>();
    for (const [name, value] of (request.getAttribute(URI_TEMPLATE_VARIABLES_ATTRIBUTE) ??
      new Map<string, string>()) as Map<string, string>) {
      model.set(name, value);
    }
    for (const name of request.getAttributeNames()) {
      model.set(name, request.getAttribute(name));
    }
    for (const [name, value] of state.model) {
      model.set(name, value);
    }
    const rendered = Buffer.from(
      template({ model, contextPath, request, conversionService }),
      'latin1',
    );
    response.setHeader(HttpHeaders.CONTENT_TYPE, 'text/html;charset=iso-8859-1');
    response.setHeader(HttpHeaders.CONTENT_LENGTH, String(rendered.length));
    return this.finish(response, sessionId, cookies, rendered);
  }

  private finish(
    response: HttpServletResponse,
    sessionId: string,
    cookies: Map<string, string>,
    body?: Buffer,
  ): ContainerResponse {
    const headers: [string, string][] = [];
    for (const name of response.headers.names()) {
      for (const value of response.headers.get(name)) {
        headers.push([name, value]);
      }
    }
    if (!cookies.has(SESSION_COOKIE)) {
      headers.push([
        'Set-Cookie',
        `${SESSION_COOKIE}=${sessionId}; Path=${this.options.contextPath || '/'}`,
      ]);
    }
    return { status: response.getStatus(), headers, body: body ?? response.getContentAsBuffer() };
  }
}

function header(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  name: string,
): string | null {
  const value = headers[name];
  if (value === undefined) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
