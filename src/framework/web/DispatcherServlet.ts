/**
 * `org.springframework.web.servlet.DispatcherServlet`.
 *
 * Finds the handler for a request, resolves its arguments, invokes it and
 * turns what it returned into a response. Every branch here corresponds to one
 * Spring MVC feature the showcase exercises.
 */

import { HandlerMapping, type HandlerMatch } from '../mapping/HandlerMapping.js';
import type { HttpMessageConverter } from '../converter/HttpMessageConverter.js';
import {
  HttpMediaTypeNotAcceptableException,
  HttpMediaTypeNotSupportedException,
  HttpMessageNotReadableException,
  HttpRequestMethodNotSupportedException,
  writeWithMessageConverters,
} from '../converter/HttpMessageConverter.js';
import type { HttpServletRequest, HttpServletResponse } from '../http/Servlet.js';
import { ResponseEntity } from '../http/ResponseEntity.js';
import { FormattingConversionService } from '../convert/ConversionService.js';
import { resolveArgument, type ResolverContext } from '../method/ArgumentResolver.js';
import { RedirectAttributes } from '../ui/Model.js';
import { asyncValue } from '../async/Async.js';
import { ModelAndView } from './ModelAndView.js';
import { BindingResult } from '../bind/BindingResult.js';
import { HttpHeaders } from '../http/HttpHeaders.js';
import { ConversionFailedException } from '../convert/ConversionService.js';

/** `HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE`. */
export const URI_TEMPLATE_VARIABLES_ATTRIBUTE =
  'org.springframework.web.servlet.HandlerMapping.uriTemplateVariables';
import { JavaDate } from '../../java/util/Date.js';
import { LocalDate } from '../../java/time/LocalDate.js';
import { BigDecimal } from '../../java/math/BigDecimal.js';
import type { ControllerMetadata } from './metadata.js';
import { matchesExceptionType } from './exceptions.js';
import {
  expandRedirectUrl,
  InternalResourceViewResolver,
  REDIRECT_URL_PREFIX,
  renderView,
  viewNameFromPath,
} from '../view/ViewResolver.js';

export interface MvcResultState {
  /** The handler that ran, once one has been chosen. */
  match: HandlerMatch | null;
  /** The model, for the assertions that inspect it. */
  model: Map<string, unknown>;
  /** Binding results, so `model().errorCount(...)` can see them. */
  bindingResults: Map<string, BindingResult>;
  /** The selected view name, or null when the handler wrote the body itself. */
  viewName: string | null;
  /** Flash attributes stored for the request after a redirect. */
  flashAttributes: Map<string, unknown>;
  /** Set when the handler returned a Callable, DeferredResult or WebAsyncTask. */
  asyncStarted: boolean;
  /** The eventual value of an async handler, awaited by the second dispatch. */
  asyncResult: Promise<unknown> | null;
  /** Everything the second dispatch needs to finish the request. */
  asyncContinuation: (() => Promise<void>) | null;
}

const NOT_HANDLED = Symbol('not handled');

export function newResultState(): MvcResultState {
  return {
    match: null,
    model: new Map(),
    bindingResults: new Map(),
    viewName: null,
    flashAttributes: new Map(),
    asyncStarted: false,
    asyncResult: null,
    asyncContinuation: null,
  };
}

export class DispatcherServlet {
  private readonly mapping = new HandlerMapping();

  /** `@ControllerAdvice` beans, consulted when no controller-local handler matches. */
  private readonly advice: { bean: object; metadata: ControllerMetadata }[] = [];

  constructor(
    private readonly converters: readonly HttpMessageConverter[],
    private readonly conversionService: FormattingConversionService = new FormattingConversionService(),
    private readonly viewResolver: InternalResourceViewResolver | null = null,
    /** `addViewController(path).setViewName(name)`. */
    private readonly viewControllers: ReadonlyMap<string, string> = new Map(),
  ) {}

  register(bean: object, metadata: ControllerMetadata): void {
    this.mapping.register(bean, metadata);
    if (metadata.controllerAdvice === true) {
      this.advice.push({ bean, metadata });
    }
  }

  /**
   * `ExceptionHandlerExceptionResolver`: a controller-local `@ExceptionHandler`
   * is tried first, then any `@ControllerAdvice`.
   */
  private async handleException(
    error: unknown,
    controller: ControllerMetadata,
    bean: object,
    context: ResolverContext,
  ): Promise<unknown> {
    // The handler receives the exception it was declared for.
    const handlerContext: ResolverContext = { ...context, exception: error };
    const local = controller.methods.find(
      (method) =>
        method.exceptionHandler !== undefined && matchesExceptionType(error, method.exceptionHandler),
    );
    if (local !== undefined) {
      const target = bean as Record<string, (...args: unknown[]) => unknown>;
      const args = (local.parameters ?? []).map((parameter) =>
        resolveArgument(parameter, handlerContext),
      );
      return await target[local.name]!.call(target, ...args);
    }
    for (const { bean: adviceBean, metadata } of this.advice) {
      const method = metadata.methods.find(
        (candidate) =>
          candidate.exceptionHandler !== undefined &&
          matchesExceptionType(error, candidate.exceptionHandler),
      );
      if (method !== undefined) {
        const target = adviceBean as Record<string, (...args: unknown[]) => unknown>;
        const args = (method.parameters ?? []).map((parameter) =>
          resolveArgument(parameter, handlerContext),
        );
        return await target[method.name]!.call(target, ...args);
      }
    }
    return NOT_HANDLED;
  }

  /** Resolves a view name and renders it, or sends a redirect. */
  /** The other half of `@SessionAttributes`: what the handler leaves behind. */
  private storeSessionAttributes(
    request: HttpServletRequest,
    controller: ControllerMetadata,
    state: MvcResultState,
  ): void {
    const names = controller.sessionAttributes ?? [];
    if (names.length === 0) {
      return;
    }
    const session = request.getSession(true)!;
    for (const name of names) {
      if (state.model.has(name)) {
        session.setAttribute(name, state.model.get(name));
      }
    }
  }

  /**
   * `ModelFactory.updateModel`. Before a view renders, every model attribute
   * that could have been bound gets a BindingResult of its own, whether or not
   * a handler ever declared it: a bean put in the model by a `@ModelAttribute`
   * method or added to a `ModelAndView` is exposed to the view the same way a
   * bound command object is. Simple values, arrays, collections and maps are
   * not binding candidates and are left alone.
   */
  private updateBindingResult(state: MvcResultState): void {
    for (const [name, value] of [...state.model]) {
      if (name.startsWith(BindingResult.modelKey(''))) {
        continue;
      }
      if (!isBindingCandidate(value) || state.model.has(BindingResult.modelKey(name))) {
        continue;
      }
      const result = new BindingResult(name, value as object);
      state.model.set(BindingResult.modelKey(name), result);
      state.bindingResults.set(name, result);
    }
  }

  private render(
    viewName: string,
    request: HttpServletRequest,
    response: HttpServletResponse,
    state: MvcResultState,
    redirectAttributes: RedirectAttributes | null = null,
  ): void {
    this.updateBindingResult(state);
    state.viewName = viewName;
    if (viewName.startsWith(REDIRECT_URL_PREFIX)) {
      const url = expandRedirectUrl(
        viewName.slice(REDIRECT_URL_PREFIX.length),
        redirectAttributes,
        this.conversionService,
      );
      // `RedirectView` makes a context-relative URL absolute; a URL the handler
      // built itself already carries whatever prefix it wanted.
      response.sendRedirect(url.startsWith('/') ? request.getContextPath() + url : url);
      return;
    }
    if (this.viewResolver !== null) {
      renderView(response, this.viewResolver.resolve(viewName), request.getLocale());
    }
  }

  /** `asyncDispatch`: the container's second pass over an async request. */
  async dispatchAsync(state: MvcResultState): Promise<void> {
    if (state.asyncContinuation !== null) {
      await state.asyncContinuation();
    }
  }

  /**
   * `DefaultHandlerExceptionResolver`: the exceptions the framework itself
   * raises each answer with their own status rather than with a server error.
   */
  private resolveFrameworkException(error: unknown, response: HttpServletResponse): boolean {
    if (error instanceof HttpRequestMethodNotSupportedException) {
      response.setHeader('Allow', error.supportedMethods.join(', '));
      response.sendError(405);
      return true;
    }
    if (error instanceof HttpMediaTypeNotSupportedException) {
      response.sendError(415);
      return true;
    }
    if (error instanceof HttpMediaTypeNotAcceptableException) {
      response.sendError(406);
      return true;
    }
    if (error instanceof HttpMessageNotReadableException) {
      response.sendError(400);
      return true;
    }
    // A value that will not convert into a `@RequestParam` or `@PathVariable`
    // is `MethodArgumentTypeMismatchException`, which the resolver answers with
    // 400. A command object is different: `WebDataBinder` catches its own
    // conversion failures and records them as field errors instead.
    if (error instanceof ConversionFailedException) {
      response.sendError(400);
      return true;
    }
    return false;
  }

  async service(
    request: HttpServletRequest,
    response: HttpServletResponse,
    state: MvcResultState,
  ): Promise<void> {
    try {
      await this.doService(request, response, state);
    } catch (error) {
      if (!this.resolveFrameworkException(error, response)) {
        throw error;
      }
    }
    // A HEAD request runs the handler that a GET would, and the container sends
    // everything but the body.
    if (request.getMethod() === 'HEAD') {
      response.discardBody();
    }
  }

  private async doService(
    request: HttpServletRequest,
    response: HttpServletResponse,
    state: MvcResultState,
  ): Promise<void> {
    const match = this.mapping.getHandler(request);
    state.match = match;
    if (match === null) {
      const viewControllerName = this.viewControllers.get(request.getRequestURI());
      if (viewControllerName !== undefined) {
        this.render(viewControllerName, request, response, state);
        return;
      }
      response.sendError(404);
      return;
    }

    // `AbstractView` exposes the URI template variables to the view, which is
    // how `redirectResults.jsp` reads `${account}` without the handler ever
    // putting it in the model.
    request.setAttribute(URI_TEMPLATE_VARIABLES_ATTRIBUTE, match.uriVariables);

    const handler = match.handler;
    const bean = handler.bean as Record<string, (...args: unknown[]) => unknown>;
    const redirectAttributes = new RedirectAttributes(new Map());
    const context: ResolverContext = {
      request,
      response,
      match,
      conversionService: this.conversionService,
      converters: this.converters,
      model: state.model,
      bindingResults: state.bindingResults,
      redirectAttributes,
    };

    // `@SessionAttributes` names survive between requests: an attribute already
    // in the session goes back into the model before the `@ModelAttribute`
    // methods run, which is what stops the form bean being rebuilt each time.
    const sessionAttributes = handler.controller.sessionAttributes ?? [];
    if (sessionAttributes.length > 0) {
      // A handler that keeps state in the session must not be cached, so the
      // adapter sets the no-store header before the handler ever runs.
      response.setHeader(HttpHeaders.CACHE_CONTROL, 'no-store');
      const session = request.getSession(false);
      for (const name of sessionAttributes) {
        const stored = session?.getAttribute(name) ?? null;
        if (stored !== null) {
          state.model.set(name, stored);
        }
      }
    }

    // `@ModelAttribute` methods run before the handler, on every request. One
    // that names an attribute contributes its return value under that name,
    // which is how the command object is created before it is bound.
    for (const method of handler.controller.methods) {
      if (method.modelAttribute !== true) {
        continue;
      }
      const args = (method.parameters ?? []).map((parameter) => resolveArgument(parameter, context));
      const produced: unknown = await bean[method.name]!.call(bean, ...args);
      if (method.modelAttributeName !== undefined && !state.model.has(method.modelAttributeName)) {
        state.model.set(method.modelAttributeName, produced);
      }
    }

    const args = (handler.method.parameters ?? []).map((parameter) =>
      resolveArgument(parameter, context),
    );
    let returned: unknown;
    try {
      returned = await bean[handler.method.name]!.call(bean, ...args);
    } catch (error) {
      const handled = await this.handleException(error, handler.controller, bean, context);
      if (handled === NOT_HANDLED) {
        throw error;
      }
      returned = handled;
    }

    // A Callable, DeferredResult or WebAsyncTask starts async processing: this
    // dispatch produces no response, and the container comes back with the
    // resolved value.
    const pending = asyncValue(returned);
    if (pending !== null) {
      state.asyncStarted = true;
      state.asyncResult = pending.catch((error: unknown) => error);
      state.asyncContinuation = async (): Promise<void> => {
        let resolved: unknown;
        try {
          resolved = await pending;
        } catch (error) {
          const handled = await this.handleException(error, handler.controller, bean, context);
          if (handled === NOT_HANDLED) {
            throw error;
          }
          resolved = handled;
        }
        this.storeSessionAttributes(request, handler.controller, state);
        await this.handleReturnValue(resolved, handler, match, request, response, state, redirectAttributes);
      };
      return;
    }


    this.storeSessionAttributes(request, handler.controller, state);
    await this.handleReturnValue(returned, handler, match, request, response, state, redirectAttributes);
  }

  /** `HandlerMethodReturnValueHandler`: a view name, a ResponseEntity or a body. */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async handleReturnValue(
    returnValue: unknown,
    handler: HandlerMatch['handler'],
    match: HandlerMatch,
    request: HttpServletRequest,
    response: HttpServletResponse,
    state: MvcResultState,
    redirectAttributes: RedirectAttributes,
  ): Promise<void> {
    const responseBody = handler.method.responseBody ?? handler.controller.restController ?? false;
    if (returnValue instanceof ModelAndView) {
      for (const [name, value] of returnValue.model) {
        state.model.set(name, value);
      }
      this.render(returnValue.getViewName(), request, response, state);
      return;
    }
    if (!responseBody && !(returnValue instanceof ResponseEntity)) {
      // A view name, or the request path when the handler returns void.
      const viewName =
        typeof returnValue === 'string'
          ? returnValue
          : returnValue === undefined || returnValue === null
            ? viewNameFromPath(request.getRequestURI())
            : null;
      if (viewName !== null) {
        for (const [name, value] of redirectAttributes.flashAttributes) {
          state.flashAttributes.set(name, value);
        }
        this.render(viewName, request, response, state, redirectAttributes);
      }
      return;
    }
    if (returnValue instanceof ResponseEntity) {
      // The handler set the status and the headers itself; copying the headers
      // in before writing is what stops the converter appending its default
      // charset to a Content-Type the handler chose.
      response.setStatus(returnValue.getStatusCodeValue());
      for (const name of returnValue.getHeaders().names()) {
        for (const value of returnValue.getHeaders().get(name)) {
          response.addHeader(name, value);
        }
      }
      const body: unknown = returnValue.getBody();
      if (body !== null && body !== undefined) {
        writeWithMessageConverters(
          body,
          this.converters,
          HandlerMapping.requestedMediaTypes(request, match.extension),
          match.producible,
          response,
        );
      }
      return;
    }
    if (responseBody && returnValue !== undefined) {
      writeWithMessageConverters(
        returnValue,
        this.converters,
        HandlerMapping.requestedMediaTypes(request, match.extension),
        match.producible,
        response,
      );
    }
  }
}
/** `BeanUtils.isSimpleValueType` inverted, plus the container types. */
function isBindingCandidate(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value) || value instanceof Map || value instanceof Set) {
    return false;
  }
  return !(
    value instanceof Date ||
    value instanceof JavaDate ||
    value instanceof LocalDate ||
    value instanceof BigDecimal
  );
}
