/**
 * The controller metadata Spring reads from annotations and reflection.
 *
 * Java keeps annotations, parameter names and parameter types at run time;
 * TypeScript keeps none of them. A handler therefore declares what the
 * framework needs — each parameter's kind, name, declared type and format
 * annotations — which is exactly the information `@RequestParam String foo`
 * carries in the original.
 */

import type { Declaration } from '../convert/TypeDescriptor.js';

export type ParameterKind =
  | 'requestParam'
  | 'pathVariable'
  | 'matrixVariable'
  | 'requestHeader'
  | 'cookieValue'
  | 'requestBody'
  | 'httpEntity'
  | 'modelAttribute'
  | 'model'
  | 'bindingResult'
  | 'redirectAttributes'
  | 'request'
  | 'response'
  | 'session'
  | 'principal'
  | 'locale'
  | 'reader'
  | 'writer'
  | 'inputStream'
  | 'outputStream'
  | 'multipartFile'
  | 'webRequest'
  | 'requestAttribute'
  /** `@ModelAttribute("name")` on a non-command parameter: read from the model. */
  | 'modelValue'
  /** The exception an `@ExceptionHandler` was invoked for. */
  | 'exception';

export interface ParameterMetadata extends Declaration {
  readonly kind: ParameterKind;
  /** The parameter's name, which Java keeps and TypeScript does not. */
  readonly name?: string;
  readonly required?: boolean;
  readonly defaultValue?: string;
  /** `@MatrixVariable(pathVar=...)`. */
  readonly pathVar?: string;
  /** `@Valid` on the parameter. */
  readonly valid?: true;
}

export interface MappingMetadata {
  readonly path?: string;
  readonly method?: string;
  readonly params?: readonly string[];
  readonly headers?: readonly string[];
  readonly consumes?: readonly string[];
  readonly produces?: readonly string[];
}

export interface HandlerMethodMetadata {
  readonly name: string;
  readonly mapping?: MappingMetadata;
  readonly parameters?: readonly ParameterMetadata[];
  /** `@ResponseBody`, or inherited from `@RestController`. */
  readonly responseBody?: boolean;
  /** A `@ModelAttribute` method, run before every handler of the controller. */
  readonly modelAttribute?: true;
  /** `@ModelAttribute("name")`: the model key the method's return value takes. */
  readonly modelAttributeName?: string;
  /** `@ExceptionHandler`, keyed by the exception class it handles. */
  readonly exceptionHandler?: string;
}

export interface ControllerMetadata {
  /** The fully-qualified name the class had in the original. */
  readonly name: string;
  readonly mapping?: MappingMetadata;
  readonly restController?: boolean;
  readonly controllerAdvice?: boolean;
  readonly sessionAttributes?: readonly string[];
  readonly methods: readonly HandlerMethodMetadata[];
}

const CONTROLLERS = new WeakMap<object, ControllerMetadata>();

/** Declares a controller: its class-level mapping and its handler methods. */
export function Controller(metadata: ControllerMetadata) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function decorate<T extends abstract new (...args: any[]) => object>(ctor: T): T {
    CONTROLLERS.set(ctor, metadata);
    return ctor;
  };
}

export function controllerMetadataOf(instance: object): ControllerMetadata | undefined {
  const ctor: unknown = (instance as { constructor?: unknown }).constructor;
  return typeof ctor === 'function' ? CONTROLLERS.get(ctor as object) : undefined;
}
