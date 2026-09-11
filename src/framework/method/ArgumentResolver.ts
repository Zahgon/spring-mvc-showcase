/**
 * `HandlerMethodArgumentResolver`: turns a declared parameter into the value
 * the handler is invoked with.
 *
 * The showcase's whole point is the breadth of argument types Spring supports,
 * so this is the file that reproduces `@RequestParam`, `@PathVariable`,
 * `@MatrixVariable`, `@RequestHeader`, `@CookieValue`, `@RequestBody`,
 * `HttpEntity` and the servlet-native arguments.
 */

import { HttpHeaders } from '../http/HttpHeaders.js';
import { MediaType } from '../http/MediaType.js';
import {
  type HttpServletRequest,
  type HttpServletResponse,
} from '../http/Servlet.js';
import type { FormattingConversionService } from '../convert/ConversionService.js';
import type { HttpMessageConverter } from '../converter/HttpMessageConverter.js';
import { HttpMessageNotReadableException } from '../converter/HttpMessageConverter.js';
import type { HandlerMatch } from '../mapping/HandlerMapping.js';
import type { ParameterMetadata } from '../web/metadata.js';
import { BindingResult } from '../bind/BindingResult.js';
import { WebDataBinder } from '../bind/WebDataBinder.js';
import { validate } from '../bind/Validator.js';
import { Model, type RedirectAttributes } from '../ui/Model.js';

export class MissingRequestValueException extends Error {}

/** `org.springframework.http.HttpEntity`, as `/data/entity` receives it. */
export class HttpEntity<T> {
  constructor(
    private readonly body: T,
    private readonly headers: HttpHeaders,
  ) {}

  getBody(): T {
    return this.body;
  }

  getHeaders(): HttpHeaders {
    return this.headers;
  }
}

export interface ResolverContext {
  readonly request: HttpServletRequest;
  readonly response: HttpServletResponse;
  readonly match: HandlerMatch;
  readonly conversionService: FormattingConversionService;
  readonly converters: readonly HttpMessageConverter[];
  /** Set by the caller for `@ModelAttribute` and `Model` parameters. */
  readonly model: Map<string, unknown>;
  /** The binding results, keyed by command-object name, for `BindingResult`. */
  readonly bindingResults: Map<string, BindingResult>;
  /** The `RedirectAttributes` a handler may add URI and flash attributes to. */
  readonly redirectAttributes: RedirectAttributes;
  /** The exception being handled, for an `@ExceptionHandler` parameter. */
  readonly exception?: unknown;
}

export function resolveArgument(parameter: ParameterMetadata, context: ResolverContext): unknown {
  const { request, response, match, conversionService } = context;
  switch (parameter.kind) {
    case 'requestParam':
      return resolveRequestParam(parameter, context);
    case 'pathVariable': {
      const raw = match.uriVariables.get(parameter.name ?? '');
      if (raw === undefined) {
        throw new MissingRequestValueException(
          "Missing URI template variable '" + String(parameter.name) + "'",
        );
      }
      return conversionService.convert(raw, parameter);
    }
    case 'matrixVariable':
      return resolveMatrixVariable(parameter, context);
    case 'requestHeader': {
      const raw = request.getHeader(parameter.name ?? '');
      if (raw === null) {
        if (parameter.required === false) {
          return null;
        }
        throw new MissingRequestValueException(
          "Missing request header '" + String(parameter.name) + "'",
        );
      }
      return conversionService.convert(raw, parameter);
    }
    case 'cookieValue': {
      const raw = request.getCookieValue(parameter.name ?? '');
      if (raw === null) {
        if (parameter.required === false) {
          return null;
        }
        throw new MissingRequestValueException(
          "Missing cookie value '" + String(parameter.name) + "'",
        );
      }
      return conversionService.convert(raw, parameter);
    }
    case 'requestBody':
      return readBody(parameter, context);
    case 'httpEntity':
      return new HttpEntity(readBody(parameter, context), requestHeaders(request));
    case 'request':
      return request;
    case 'response':
      return response;
    case 'session':
      return request.getSession(true);
    case 'principal':
      return request.getUserPrincipal();
    case 'locale':
      return request.getLocale();
    case 'reader':
      return request.getReader();
    case 'inputStream':
      return request.getInputStream();
    case 'writer':
    case 'outputStream':
      return response;
    case 'multipartFile':
      return request.getFile(parameter.name ?? '');
    case 'model':
      return new Model(context.model);
    case 'modelAttribute':
      return resolveModelAttribute(parameter, context);
    case 'modelValue':
      return context.model.get(parameter.name ?? '') ?? null;
    case 'exception':
      return context.exception;
    case 'redirectAttributes':
      return context.redirectAttributes;
    case 'bindingResult': {
      const [, latest] = [...context.bindingResults].pop() ?? [];
      return latest ?? null;
    }
    case 'webRequest':
      return request;
    case 'requestAttribute':
      return request.getAttribute(parameter.name ?? '');
    default:
      return null;
  }
}

function resolveRequestParam(parameter: ParameterMetadata, context: ResolverContext): unknown {
  const { request, conversionService } = context;
  const name = parameter.name ?? '';
  const values = request.getParameterValues(name);
  if (values === null || values.length === 0) {
    if (parameter.defaultValue !== undefined) {
      return conversionService.convert(parameter.defaultValue, parameter);
    }
    if (parameter.required === false) {
      return null;
    }
    throw new MissingRequestValueException(
      "Required request parameter '" + name + "' is not present",
    );
  }
  const type = parameter.type;
  if (type.kind === 'list') {
    // Repeated parameters and one comma-separated parameter both produce the
    // same collection: `values=1&values=2` and `values=1,2` are equivalent.
    if (values.length > 1) {
      return values.map((value) => conversionService.convert(value, type.element));
    }
    return conversionService.convert(values[0]!, parameter);
  }
  return conversionService.convert(values[0]!, parameter);
}

function resolveMatrixVariable(parameter: ParameterMetadata, context: ResolverContext): unknown {
  const { match, conversionService } = context;
  const name = parameter.name ?? '';
  const candidates =
    parameter.pathVar === undefined
      ? [...match.matrixVariables.values()]
      : [match.matrixVariables.get(parameter.pathVar) ?? new Map<string, string[]>()];
  for (const variables of candidates) {
    const values = variables.get(name);
    if (values !== undefined && values.length > 0) {
      return conversionService.convert(values[0]!, parameter);
    }
  }
  if (parameter.required === false) {
    return null;
  }
  throw new MissingRequestValueException("Missing matrix variable '" + name + "'");
}

/** The request headers, as `HttpEntity#getHeaders` exposes them. */
function requestHeaders(request: HttpServletRequest): HttpHeaders {
  const headers = request.headers.copy();
  if (!headers.containsKey(HttpHeaders.CONTENT_LENGTH)) {
    headers.setContentLength(request.getContentLength());
  }
  return headers;
}

function readBody(parameter: ParameterMetadata, context: ResolverContext): never | unknown {
  const { request, converters } = context;
  const contentTypeValue = request.getContentType();
  const contentType =
    contentTypeValue === null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parse(contentTypeValue);
  const target = parameter.type.kind;
  for (const converter of converters) {
    if (converter.canRead(target, contentType)) {
      return converter.read(target, request, parameter);
    }
  }
  throw new HttpMessageNotReadableException(
    'Content type ' + contentType.toString() + ' not supported',
  );
}

/**
 * `ModelAttributeMethodProcessor`: create the command object, bind the request
 * onto it, validate it if the parameter is `@Valid`, and expose both it and its
 * `BindingResult` in the model.
 */
function resolveModelAttribute(parameter: ParameterMetadata, context: ResolverContext): unknown {
  const { request, conversionService, model, bindingResults } = context;
  if (parameter.type.kind !== 'bean') {
    return null;
  }
  const name = parameter.name ?? decapitalise(parameter.type.name);
  const existing = model.get(name);
  const target = existing === undefined ? parameter.type.create() : (existing as object);
  const result = new BindingResult(name, target);
  const binder = new WebDataBinder(conversionService, result);

  const values = new Map(request.getParameterMap());
  for (const [uriName, uriValue] of context.match.uriVariables) {
    if (!values.has(uriName)) {
      values.set(uriName, [uriValue]);
    }
  }
  binder.bind(target, values);
  if (parameter.valid === true) {
    validate(target, result);
  }

  model.set(name, target);
  model.set(BindingResult.modelKey(name), result);
  bindingResults.set(name, result);
  return target;
}

function decapitalise(name: string): string {
  const simple = name.slice(name.lastIndexOf('.') + 1);
  return simple.charAt(0).toLowerCase() + simple.slice(1);
}
