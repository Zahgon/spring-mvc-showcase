/**
 * Prints what the application answers to each request in `behaviour-cases.json`,
 * one line per case, and exits.
 *
 * `probe/BehaviourProbe.java` in the source repository reads the same case list
 * and prints the same shape, so the two outputs can be diffed directly — which
 * is what QC's behaviour gate does, and what the behaviour-verification sheet is
 * built from.
 */

// `Date.toString()` prints the default zone's short name, so the probe fixes the
// zone rather than reporting whichever one the host has. This has to happen
// before anything reads a date.
process.env['TZ'] = 'UTC';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { newResultState } from '../src/framework/web/DispatcherServlet.js';
import { HttpHeaders } from '../src/framework/http/HttpHeaders.js';
import {
  HttpServletRequest,
  HttpServletResponse,
  StandardMultipartFile,
  type MultipartFile,
} from '../src/framework/http/Servlet.js';
import { webMvcConfig } from '../src/config/WebMvcConfig.js';

interface Case {
  readonly id: string;
  readonly method?: string;
  readonly uri: string;
  readonly headers?: Record<string, string>;
  readonly cookies?: Record<string, string>;
  readonly parameters?: Record<string, string | string[]>;
  readonly contentType?: string;
  readonly body?: string;
  readonly multipart?: {
    name?: string;
    filename?: string;
    contentType?: string | null;
    content?: string;
  };
}

const path =
  process.argv[2] ?? fileURLToPath(new URL('behaviour-cases.json', import.meta.url));
const cases = JSON.parse(readFileSync(path, 'utf8')) as Case[];
const dispatcher = webMvcConfig();

// The DeferredResult queue is drained by a scheduled task whose timer is
// unref'd, so nothing else holds the event loop open while the probe awaits it.
const keepAlive = setInterval(() => undefined, 1000);

function build(testCase: Case): HttpServletRequest {
  const target = testCase.uri;
  const queryIndex = target.indexOf('?');
  const requestURI = queryIndex < 0 ? target : target.slice(0, queryIndex);
  const queryString = queryIndex < 0 ? null : target.slice(queryIndex + 1);

  const parameters = new Map<string, string[]>();
  const add = (name: string, value: string): void => {
    const existing = parameters.get(name);
    if (existing === undefined) {
      parameters.set(name, [value]);
    } else {
      existing.push(value);
    }
  };
  for (const [name, value] of new URLSearchParams(queryString ?? '')) {
    add(name, value);
  }
  for (const [name, value] of Object.entries(testCase.parameters ?? {})) {
    for (const single of Array.isArray(value) ? value : [value]) {
      add(name, single);
    }
  }

  const headers = new HttpHeaders();
  for (const [name, value] of Object.entries(testCase.headers ?? {})) {
    headers.set(name, value);
  }
  const cookies = new Map(Object.entries(testCase.cookies ?? {}));

  const files: MultipartFile[] = [];
  if (testCase.multipart !== undefined) {
    const part = testCase.multipart;
    files.push(
      new StandardMultipartFile(
        part.name ?? 'file',
        part.filename ?? '',
        part.contentType ?? null,
        Buffer.from(part.content ?? '', 'utf8'),
      ),
    );
  }

  return new HttpServletRequest({
    method: testCase.method ?? 'GET',
    requestURI: decodeURIComponent(requestURI),
    queryString,
    headers,
    parameters,
    cookies,
    ...(testCase.contentType === undefined ? {} : { contentType: testCase.contentType }),
    ...(testCase.body === undefined ? {} : { content: Buffer.from(testCase.body, 'utf8') }),
    files,
  });
}

for (const testCase of cases) {
  const response = new HttpServletResponse();
  const state = newResultState();
  // Anything the framework does not answer for itself is what a container
  // reports as a server error. The message is not compared: it is the one thing
  // two languages cannot say the same way.
  let unhandled = false;
  try {
    await dispatcher.service(build(testCase), response, state);
    if (state.asyncStarted) {
      await dispatcher.dispatchAsync(state);
    }
  } catch {
    unhandled = true;
  }
  if (unhandled) {
    process.stdout.write(
      `${testCase.id} | status=500 | type=null | forward=null | redirect=null | body=<unhandled>\n`,
    );
    continue;
  }
  // An identity hash is a JVM address: it differs between two runs of the same
  // program, and its width differs between JVMs, so it is masked rather than
  // compared.
  const body = response
    .getContentAsBuffer()
    .toString('utf8')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
    .replace(/@[0-9a-f]{3,}/g, '@<identity>');
  process.stdout.write(
    `${testCase.id}` +
      ` | status=${String(response.getStatus())}` +
      ` | type=${String(response.getContentType())}` +
      ` | forward=${String(response.getForwardedUrl())}` +
      ` | redirect=${String(response.getRedirectedUrl())}` +
      ` | body=${body}\n`,
  );
}

clearInterval(keepAlive);
