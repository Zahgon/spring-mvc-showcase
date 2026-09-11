/**
 * A `ServletContainer` wired the way `main.ts` wires it, driven directly rather
 * than over a socket.
 */

import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { ServletContainer, SESSION_COOKIE } from '../../src/framework/web/ServletContainer.js';
import { conversionService, webMvcConfig } from '../../src/config/WebMvcConfig.js';
import { csrfFilter } from '../../src/config/RootConfig.js';
import { VIEWS } from '../../src/webapp/views/index.js';

export const CONTEXT_PATH = '/spring-mvc-showcase';

/** One container plus the cookie jar a browser would keep alongside it. */
export class TestClient {
  private readonly container: ServletContainer;
  private sessionId: string | null = null;

  constructor() {
    this.container = new ServletContainer({
      contextPath: CONTEXT_PATH,
      resourceRoots: [resolve('public/resources'), resolve('vendor')],
      dispatcher: webMvcConfig(),
      conversionService: conversionService(),
      csrf: csrfFilter(),
      views: VIEWS,
    });
  }

  async request(
    method: string,
    path: string,
    options: { headers?: Record<string, string>; body?: Buffer | string } = {},
  ): Promise<{ status: number; headers: [string, string][]; text: string; body: Buffer }> {
    const headers: Record<string, string> = { ...options.headers };
    if (this.sessionId !== null) {
      headers['cookie'] = `${SESSION_COOKIE}=${this.sessionId}`;
    }
    const body =
      typeof options.body === 'string' ? Buffer.from(options.body, 'utf8') : (options.body ?? Buffer.alloc(0));
    const answer = await this.container.service({
      method,
      url: CONTEXT_PATH + path,
      headers,
      body,
    });
    for (const [name, value] of answer.headers) {
      const match = name.toLowerCase() === 'set-cookie' ? /JSESSIONID=([^;]+)/.exec(value) : null;
      if (match !== null) {
        this.sessionId = match[1]!;
      }
    }
    return {
      status: answer.status,
      headers: answer.headers,
      text: answer.body.toString('latin1'),
      body: answer.body,
    };
  }

  get(path: string, headers?: Record<string, string>): ReturnType<TestClient['request']> {
    return this.request('GET', path, headers === undefined ? {} : { headers });
  }

  form(path: string, fields: string): ReturnType<TestClient['request']> {
    return this.request('POST', path, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: fields,
    });
  }

  header(response: { headers: [string, string][] }, name: string): string | undefined {
    return response.headers.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  }

  /**
   * The CSRF token the page carries, which an unsafe request has to echo. Each
   * page carries it differently: `form.jsp` in a hidden input, `home.jsp` in a
   * meta tag, and `fileupload.jsp` in the form's action URL, because a
   * multipart body is not parsed before the filter checks it.
   */
  static tokenOf(html: string): string {
    return (
      /name="_csrf" value="([^"]+)"/.exec(html)?.[1] ??
      /name="_csrf" content="([^"]+)"/.exec(html)?.[1] ??
      /[?&]_csrf=([^"&]+)/.exec(html)?.[1] ??
      ''
    );
  }
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

/** The page as it was captured, with the one value that changes per run masked. */
export function normalise(html: string): string {
  return html.replace(UUID, '<csrf-token>');
}

export async function fixture(name: string): Promise<string> {
  return await readFile('test/fixtures/rendered/' + name + '.html', 'latin1');
}
