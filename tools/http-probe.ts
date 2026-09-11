/**
 * The migrated side of the differential harness.
 *
 * Replays the same request list the Java probe replays against the original,
 * in the same order and the same output format, so the two can be diffed line
 * for line. Endpoints that are not ported yet report `UNMAPPED`, which makes
 * this a progress meter as well as a check.
 */

import { readFileSync } from 'node:fs';
import { stringValueOf } from '../src/java/lang/Objects.js';
import { webMvcConfig } from '../src/config/WebMvcConfig.js';
import { newResultState } from '../src/framework/web/DispatcherServlet.js';
import { HttpHeaders } from '../src/framework/http/HttpHeaders.js';
import {
  HttpServletRequest,
  HttpServletResponse,
  StandardMultipartFile,
  type MultipartFile,
} from '../src/framework/http/Servlet.js';

interface MultipartPart {
  readonly name: string;
  readonly filename: string;
  readonly content: string;
}

interface ProbeRequest {
  readonly label: string;
  readonly method: string;
  readonly uri: string;
  readonly headers?: Record<string, string>;
  readonly contentType?: string;
  readonly body?: string;
  readonly parameters?: Record<string, string[]>;
  readonly multipart?: MultipartPart;
}

const REQUESTS = JSON.parse(
  readFileSync(new URL('probe-requests.json', import.meta.url), 'utf8'),
) as ProbeRequest[];

function buildRequest(probe: ProbeRequest): HttpServletRequest {
  const questionMark = probe.uri.indexOf('?');
  const path = questionMark < 0 ? probe.uri : probe.uri.slice(0, questionMark);
  const queryString = questionMark < 0 ? null : probe.uri.slice(questionMark + 1);
  const headers = new HttpHeaders();
  for (const [name, value] of Object.entries(probe.headers ?? {})) {
    headers.add(name, value);
  }
  const parameters = new Map<string, string[]>();
  for (const [name, values] of Object.entries(probe.parameters ?? {})) {
    parameters.set(name, [...values]);
  }
  if (queryString !== null) {
    for (const [name, value] of new URLSearchParams(queryString)) {
      const existing = parameters.get(name) ?? [];
      existing.push(value);
      parameters.set(name, existing);
    }
  }
  const files: MultipartFile[] =
    probe.multipart === undefined
      ? []
      : [
          new StandardMultipartFile(
            probe.multipart.name,
            probe.multipart.filename,
            null,
            Buffer.from(probe.multipart.content, 'utf8'),
          ),
        ];
  return new HttpServletRequest({
    method: probe.method,
    requestURI: path,
    queryString,
    headers,
    parameters,
    files,
    content: probe.body === undefined ? Buffer.alloc(0) : Buffer.from(probe.body, 'utf8'),
    contentType: probe.contentType ?? (probe.multipart === undefined ? null : 'multipart/form-data'),
  });
}

const dispatcher = webMvcConfig();

// The DeferredResult queue is drained by a scheduled task whose timer is
// unref'd, so nothing else holds the event loop open while the probe awaits it.
const keepAlive = setInterval(() => undefined, 1000);

for (const probe of REQUESTS) {
  const request = buildRequest(probe);
  const response = new HttpServletResponse();
  const state = newResultState();
  console.log('### ' + probe.label);
  try {
    await dispatcher.service(request, response, state);
    // The container comes back for a second pass when the handler went async,
    // exactly as the Java probe does.
    if (state.asyncStarted) {
      await dispatcher.dispatchAsync(state);
    }
    // A view controller answers without a handler method, so an absent match
    // only means "unmapped" when nothing rendered either.
    if (state.match === null && state.viewName === null) {
      console.log('UNMAPPED');
      console.log('---');
      continue;
    }
    console.log('status: ' + String(response.getStatus()));
    for (const name of [...response.headers.names()].sort()) {
      console.log('header: ' + name + ': [' + response.headers.get(name).join(', ') + ']');
    }
    console.log('forwardedUrl: ' + String(response.getForwardedUrl()));
    console.log('redirectedUrl: ' + String(response.getRedirectedUrl()));
    // Java prints the view name and the model only when the handler produced a
    // ModelAndView; a @ResponseBody handler has none.
    if (state.viewName !== null) {
      console.log('viewName: ' + state.viewName);
    }
    if (state.viewName !== null && state.model.size > 0) {
      for (const key of [...state.model.keys()].sort()) {
        // Java concatenates the value, which calls Object.toString().
        console.log('model: ' + key + ' = ' + stringValueOf(state.model.get(key)));
      }
    }
    console.log('body: ' + response.getContentAsString());
  } catch (error) {
    console.log('THREW: ' + String(error));
  }
  console.log('---');
}

clearInterval(keepAlive);
