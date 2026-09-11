/**
 * The `org.springframework.test.web.servlet` surface the suite is written
 * against: `MockMvc`, its request builders and its result matchers.
 *
 * The tests are ported as they are, so the vocabulary they use has to exist:
 * `perform(get(...)).andExpect(status().isOk())`. `perform` returns a chainable
 * thenable so a ported test reads exactly like its Java original, with an
 * `await` in front.
 */

import { HttpHeaders } from '../../src/framework/http/HttpHeaders.js';
import { MediaType } from '../../src/framework/http/MediaType.js';
import {
  HttpServletRequest,
  HttpServletResponse,
  StandardMultipartFile,
  type MultipartFile,
} from '../../src/framework/http/Servlet.js';
import { newResultState } from '../../src/framework/web/DispatcherServlet.js';
import type { DispatcherServlet, MvcResultState } from '../../src/framework/web/DispatcherServlet.js';

export interface MvcResult {
  readonly request: HttpServletRequest;
  readonly response: HttpServletResponse;
  readonly state: MvcResultState;
}

export type ResultMatcher = (result: MvcResult) => void | Promise<void>;

export class MockHttpServletRequestBuilder {
  private readonly headers = new HttpHeaders();
  private readonly parameters = new Map<string, string[]>();
  private readonly cookies = new Map<string, string>();
  private readonly files: MultipartFile[] = [];
  private body: Buffer = Buffer.alloc(0);
  private contentTypeValue: string | null = null;

  constructor(
    private readonly method: string,
    private readonly uri: string,
  ) {}

  param(name: string, ...values: string[]): this {
    const existing = this.parameters.get(name) ?? [];
    existing.push(...values);
    this.parameters.set(name, existing);
    return this;
  }

  header(name: string, value: string): this {
    this.headers.add(name, value);
    return this;
  }

  accept(...types: (MediaType | string)[]): this {
    this.headers.set(HttpHeaders.ACCEPT, types.map((type) => String(type)).join(', '));
    return this;
  }

  contentType(type: MediaType | string): this {
    this.contentTypeValue = String(type);
    return this;
  }

  content(body: Buffer | string): this {
    this.body = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
    return this;
  }

  cookie(name: string, value: string): this {
    this.cookies.set(name, value);
    return this;
  }

  file(file: MultipartFile): this {
    this.files.push(file);
    return this;
  }

  build(): HttpServletRequest {
    const questionMark = this.uri.indexOf('?');
    const path = questionMark < 0 ? this.uri : this.uri.slice(0, questionMark);
    const queryString = questionMark < 0 ? null : this.uri.slice(questionMark + 1);
    const parameters = new Map(this.parameters);
    if (queryString !== null) {
      for (const [name, value] of new URLSearchParams(queryString)) {
        const existing = parameters.get(name) ?? [];
        existing.push(value);
        parameters.set(name, existing);
      }
    }
    return new HttpServletRequest({
      method: this.method,
      requestURI: path,
      queryString,
      headers: this.headers,
      parameters,
      cookies: this.cookies,
      content: this.body,
      contentType: this.contentTypeValue,
      files: this.files,
    });
  }
}

/** Expands `{action}`-style URI template variables, as `get(URI, "string")` does. */
function expand(uri: string, variables: readonly string[]): string {
  let index = 0;
  return uri.replace(/\{[^}]*\}/g, () => encodeURIComponent(variables[index++] ?? ''));
}

export function get(uri: string, ...variables: string[]): MockHttpServletRequestBuilder {
  return new MockHttpServletRequestBuilder('GET', expand(uri, variables));
}

export function post(uri: string, ...variables: string[]): MockHttpServletRequestBuilder {
  return new MockHttpServletRequestBuilder('POST', expand(uri, variables));
}

export function multipart(uri: string, ...variables: string[]): MockHttpServletRequestBuilder {
  return new MockHttpServletRequestBuilder('POST', expand(uri, variables)).contentType(
    MediaType.MULTIPART_FORM_DATA_VALUE,
  );
}

export class MockMultipartFile extends StandardMultipartFile {}

/** The chainable result of `perform`, awaited by the caller. */
export class ResultActions implements PromiseLike<MvcResult> {
  constructor(private readonly pending: Promise<MvcResult>) {}

  andExpect(matcher: ResultMatcher): ResultActions {
    return new ResultActions(
      this.pending.then(async (result) => {
        await matcher(result);
        return result;
      }),
    );
  }

  andReturn(): Promise<MvcResult> {
    return this.pending;
  }

  then<TResult1 = MvcResult, TResult2 = never>(
    onfulfilled?: ((value: MvcResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.pending.then(onfulfilled, onrejected);
  }
}

/** `MockMvcRequestBuilders.asyncDispatch(mvcResult)`: the container's second pass. */
export class AsyncDispatchBuilder {
  constructor(readonly original: MvcResult) {}
}

export function asyncDispatch(result: MvcResult): AsyncDispatchBuilder {
  return new AsyncDispatchBuilder(result);
}

export class MockMvc {
  constructor(
    private readonly dispatcher: DispatcherServlet,
    private readonly alwaysExpectations: readonly ResultMatcher[],
  ) {}


  perform(builder: MockHttpServletRequestBuilder | AsyncDispatchBuilder): ResultActions {
    if (builder instanceof AsyncDispatchBuilder) {
      const original = builder.original;
      const pending = this.dispatcher.dispatchAsync(original.state).then(() => {
        for (const expectation of this.alwaysExpectations) {
          expectation(original);
        }
        return original;
      });
      return new ResultActions(pending);
    }
    const request = builder.build();
    const response = new HttpServletResponse();
    const state: MvcResultState = newResultState();
    const pending = this.dispatcher.service(request, response, state).then(() => {
      const result: MvcResult = { request, response, state };
      for (const expectation of this.alwaysExpectations) {
        expectation(result);
      }
      return result;
    });
    return new ResultActions(pending);
  }
}

export class MockMvcBuilder {
  protected readonly alwaysExpectations: ResultMatcher[] = [];

  constructor(private readonly dispatcher: DispatcherServlet) {}

  alwaysExpect(matcher: ResultMatcher): this {
    this.alwaysExpectations.push(matcher);
    return this;
  }

  build(): MockMvc {
    return this.buildWith(this.dispatcher);
  }

  protected buildWith(dispatcher: DispatcherServlet): MockMvc {
    return new MockMvc(dispatcher, this.alwaysExpectations);
  }
}
