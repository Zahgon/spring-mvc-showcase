/**
 * `RequestMappingHandlerMapping`: turns the declared mappings into a lookup
 * from a request to a handler method.
 *
 * Every condition the showcase uses is here — method, path, `params`,
 * `headers`, `consumes`, `produces` — because each one is what distinguishes
 * two handlers mapped to the same path in `MappingController`.
 */

import { MediaType } from '../http/MediaType.js';
import {
  HttpMediaTypeNotAcceptableException,
  HttpMediaTypeNotSupportedException,
  HttpRequestMethodNotSupportedException,
} from '../converter/HttpMessageConverter.js';
import type { HttpServletRequest } from '../http/Servlet.js';
import type { ControllerMetadata, HandlerMethodMetadata, MappingMetadata } from '../web/metadata.js';
import { combinePatterns, comparePatterns, matchPath } from './PathPattern.js';

export interface HandlerMethod {
  readonly bean: object;
  readonly controller: ControllerMetadata;
  readonly method: HandlerMethodMetadata;
  readonly pattern: string;
  readonly mapping: MappingMetadata;
}

export interface HandlerMatch {
  readonly handler: HandlerMethod;
  readonly uriVariables: Map<string, string>;
  /** Matrix variables, keyed by the URI variable whose segment carried them. */
  readonly matrixVariables: Map<string, Map<string, string[]>>;
  readonly extension: string | null;
  /** The media types the response may produce, from the `produces` condition. */
  readonly producible: MediaType[];
}

/** The extensions Spring's default content negotiation knows. */
const EXTENSION_MEDIA_TYPES: Readonly<Record<string, string>> = {
  json: MediaType.APPLICATION_JSON_VALUE,
  xml: MediaType.APPLICATION_XML_VALUE,
  atom: MediaType.APPLICATION_ATOM_XML_VALUE,
  rss: MediaType.APPLICATION_RSS_XML_VALUE,
  html: MediaType.TEXT_HTML_VALUE,
  txt: MediaType.TEXT_PLAIN_VALUE,
};

export class HandlerMapping {
  private readonly handlers: HandlerMethod[] = [];

  register(bean: object, controller: ControllerMetadata): void {
    for (const method of controller.methods) {
      if (method.mapping === undefined) {
        continue;
      }
      const typePath = controller.mapping?.path ?? '';
      const pattern = combinePatterns(typePath, method.mapping.path ?? '');
      const inheritedMethod = method.mapping.method ?? controller.mapping?.method;
      const mapping: MappingMetadata = {
        ...method.mapping,
        ...(inheritedMethod === undefined ? {} : { method: inheritedMethod }),
        ...mediaTypeConditions(method.mapping),
        path: pattern,
      };
      this.handlers.push({ bean, controller, method, pattern, mapping });
    }
  }

  /** The media types a request is asking for: path extension first, then Accept. */
  static requestedMediaTypes(request: HttpServletRequest, extension: string | null): MediaType[] {
    if (extension !== null) {
      const mapped = EXTENSION_MEDIA_TYPES[extension.toLowerCase()];
      if (mapped !== undefined) {
        return [MediaType.parse(mapped)];
      }
    }
    const accept = request.headers.getAccept();
    return accept.length === 0 ? [MediaType.ALL] : MediaType.sortBySpecificityAndQuality(accept);
  }

  /** The lookup path: the request URI without its query string. */
  static lookupPath(request: HttpServletRequest): string {
    return request.getRequestURI();
  }

  /**
   * `RequestMappingInfoHandlerMapping.handleNoMatch`.
   *
   * A request whose path matched a mapping but whose method or media types did
   * not is not "not found": Spring re-checks the conditions in order and raises
   * the one that failed, so the client is told *why*. A path that matched
   * nothing at all, and a condition Spring does not single out — headers — both
   * still fall through to 404.
   */
  private explainNoMatch(request: HttpServletRequest, path: string): never | void {
    const byPath = this.handlers.filter((handler) => matchPath(handler.pattern, path) !== null);
    if (byPath.length === 0) {
      return;
    }
    const allowed = new Set<string>();
    for (const handler of byPath) {
      allowed.add(handler.mapping.method ?? 'GET');
    }
    if (![...allowed].some((method) => matchesMethod(method, request.getMethod()))) {
      throw new HttpRequestMethodNotSupportedException(request.getMethod(), [...allowed]);
    }
    const byMethod = byPath.filter(
      (handler) => (handler.mapping.method ?? request.getMethod()) === request.getMethod(),
    );
    if (!byMethod.some((handler) => matchesConsumes(handler.mapping.consumes, request))) {
      throw new HttpMediaTypeNotSupportedException(request.getContentType());
    }
    const byConsumes = byMethod.filter((handler) =>
      matchesConsumes(handler.mapping.consumes, request),
    );
    const producible = byConsumes.flatMap((handler) =>
      (handler.mapping.produces ?? []).map((value) => MediaType.parse(value)),
    );
    if (producible.length > 0) {
      const extension = matchPath(byConsumes[0]!.pattern, path)?.extension ?? null;
      const requested = HandlerMapping.requestedMediaTypes(request, extension);
      if (!producible.some((type) => requested.some((accept) => accept.isCompatibleWith(type)))) {
        throw new HttpMediaTypeNotAcceptableException();
      }
    }
  }

  getHandler(request: HttpServletRequest): HandlerMatch | null {
    const path = HandlerMapping.lookupPath(request);
    const candidates: HandlerMatch[] = [];
    for (const handler of this.handlers) {
      const match = this.matchHandler(handler, request, path);
      if (match !== null) {
        candidates.push(match);
      }
    }
    if (candidates.length === 0) {
      this.explainNoMatch(request, path);
      return null;
    }
    candidates.sort((left, right) => {
      const byPattern = comparePatterns(left.handler.pattern, right.handler.pattern);
      if (byPattern !== 0) {
        return byPattern;
      }
      // A handler that names its producible types outranks one that does not.
      return right.producible.length - left.producible.length;
    });
    return candidates[0]!;
  }

  private matchHandler(
    handler: HandlerMethod,
    request: HttpServletRequest,
    path: string,
  ): HandlerMatch | null {
    const mapping = handler.mapping;
    if (mapping.method !== undefined && !matchesMethod(mapping.method, request.getMethod())) {
      return null;
    }
    const pathMatch = matchPath(handler.pattern, path);
    if (pathMatch === null) {
      return null;
    }
    if (!matchesParams(mapping.params, request)) {
      return null;
    }
    if (!matchesHeaders(mapping.headers, request)) {
      return null;
    }
    if (!matchesConsumes(mapping.consumes, request)) {
      return null;
    }
    const producible = (mapping.produces ?? []).map((value) => MediaType.parse(value));
    if (producible.length > 0) {
      const requested = HandlerMapping.requestedMediaTypes(request, pathMatch.extension);
      if (!producible.some((type) => requested.some((accept) => accept.isCompatibleWith(type)))) {
        return null;
      }
    }
    const { uriVariables, matrixVariables } = extractMatrixVariables(pathMatch.uriVariables);
    return {
      handler,
      uriVariables,
      matrixVariables,
      extension: pathMatch.extension,
      producible,
    };
  }
}

/**
 * `RequestMappingInfoHandlerMapping.extractMatrixVariables`.
 *
 * The lookup path keeps its `;`-delimited content — `WebMvcConfig` sets
 * `setRemoveSemicolonContent(false)` precisely so it does — so each URI
 * variable is split here into its value and the matrix variables it carried.
 */
function extractMatrixVariables(raw: Map<string, string>): {
  uriVariables: Map<string, string>;
  matrixVariables: Map<string, Map<string, string[]>>;
} {
  const uriVariables = new Map<string, string>();
  const matrixVariables = new Map<string, Map<string, string[]>>();
  for (const [name, value] of raw) {
    const semicolon = value.indexOf(';');
    if (semicolon < 0) {
      uriVariables.set(name, value);
      continue;
    }
    uriVariables.set(name, value.slice(0, semicolon));
    const variables = new Map<string, string[]>();
    for (const pair of value.slice(semicolon + 1).split(';')) {
      if (pair === '') {
        continue;
      }
      const equals = pair.indexOf('=');
      const key = equals < 0 ? pair : pair.slice(0, equals);
      const values = equals < 0 ? [] : pair.slice(equals + 1).split(',');
      variables.set(key, values);
    }
    matrixVariables.set(name, variables);
  }
  return { uriVariables, matrixVariables };
}

/** `params="foo"`, `params="!foo"`, `params="foo=bar"`. */
function matchesParams(expressions: readonly string[] | undefined, request: HttpServletRequest): boolean {
  for (const expression of expressions ?? []) {
    if (expression.startsWith('!')) {
      if (request.getParameter(expression.slice(1)) !== null) {
        return false;
      }
      continue;
    }
    const equals = expression.indexOf('=');
    if (equals < 0) {
      if (request.getParameter(expression) === null) {
        return false;
      }
      continue;
    }
    if (request.getParameter(expression.slice(0, equals)) !== expression.slice(equals + 1)) {
      return false;
    }
  }
  return true;
}

/**
 * `headers="FooHeader=foo"`, `headers="!FooHeader"`.
 *
 * `Accept` and `Content-Type` expressions are media-type conditions rather than
 * plain string comparisons, which is what makes
 * `headers="Accept=text/plain"` on `/simple/revisited` match an
 * `Accept: text/plain` request.
 */
/**
 * `RequestMappingInfo.Builder.build()`.
 *
 * A `headers` expression naming `Accept` or `Content-Type` is not a header
 * condition at all: `ProducesRequestCondition` and `ConsumesRequestCondition`
 * are each built from the mapping's own list *and* the matching header
 * expressions, and `HeadersRequestCondition` drops both. So
 * `@GetMapping(headers="Accept=text/plain")` matches a request that sends no
 * `Accept` header at all, and answers 406 — not 404 — to one that asks for
 * something else.
 */
function mediaTypeConditions(mapping: MappingMetadata): Partial<MappingMetadata> {
  const headers = mapping.headers ?? [];
  if (!headers.some((expression) => isMediaTypeHeader(expression))) {
    return {};
  }
  const valueOf = (expression: string, name: string): string | null => {
    const separator = expression.indexOf('=');
    if (separator < 0 || expression.slice(0, separator).trim().toLowerCase() !== name) {
      return null;
    }
    return expression.slice(separator + 1).trim();
  };
  const collect = (name: string): string[] =>
    headers.map((expression) => valueOf(expression, name)).filter((value): value is string => value !== null);
  const produces = [...(mapping.produces ?? []), ...collect('accept')];
  const consumes = [...(mapping.consumes ?? []), ...collect('content-type')];
  return {
    headers: headers.filter((expression) => !isMediaTypeHeader(expression)),
    ...(produces.length > 0 ? { produces } : {}),
    ...(consumes.length > 0 ? { consumes } : {}),
  };
}

function isMediaTypeHeader(expression: string): boolean {
  const name = expression.replace(/^!/, '').split(/[=!]/, 1)[0]!.trim().toLowerCase();
  return name === 'accept' || name === 'content-type';
}

/**
 * `RequestMethodsRequestCondition`: a HEAD request matches a GET mapping. The
 * container is what suppresses the body, so the handler runs either way.
 */
function matchesMethod(mapped: string, actual: string): boolean {
  return mapped === actual || (mapped === 'GET' && actual === 'HEAD');
}

function matchesHeaders(expressions: readonly string[] | undefined, request: HttpServletRequest): boolean {
  for (const expression of expressions ?? []) {
    if (expression.startsWith('!')) {
      if (request.getHeader(expression.slice(1)) !== null) {
        return false;
      }
      continue;
    }
    const equals = expression.indexOf('=');
    if (equals < 0) {
      if (request.getHeader(expression) === null) {
        return false;
      }
      continue;
    }
    // `Accept` and `Content-Type` never reach here: `mediaTypeConditions` has
    // already turned them into produces and consumes conditions, which is where
    // Spring evaluates them.
    const name = expression.slice(0, equals).trim();
    const expected = expression.slice(equals + 1).trim();
    if (request.getHeader(name) !== expected) {
      return false;
    }
  }
  return true;
}

/** `consumes="application/json"`, matched against the request's Content-Type. */
function matchesConsumes(expressions: readonly string[] | undefined, request: HttpServletRequest): boolean {
  if (expressions === undefined || expressions.length === 0) {
    return true;
  }
  const contentTypeValue = request.getContentType();
  const contentType =
    contentTypeValue === null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parse(contentTypeValue);
  return expressions.some((expression) => MediaType.parse(expression).includes(contentType));
}
