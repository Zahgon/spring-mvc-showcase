/**
 * The exception types the showcase throws and handles, and the lookup
 * `ExceptionHandlerExceptionResolver` performs.
 *
 * `@ExceptionHandler` is matched by exception type: a controller-local handler
 * is tried first, then a `@ControllerAdvice` one.
 */

export class JavaException extends Error {
  constructor(message?: string) {
    super(message ?? '');
    this.name = new.target.name;
  }
}

export class IllegalStateException extends JavaException {}

export class IllegalArgumentException extends JavaException {}

/** The exception names `@ExceptionHandler` is declared against. */
export const ExceptionTypes: Readonly<Record<string, new (message?: string) => Error>> = {
  IllegalStateException,
  IllegalArgumentException,
};

/** Does `error` match the exception type an `@ExceptionHandler` declares? */
export function matchesExceptionType(error: unknown, declared: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  for (
    let ctor: unknown = error.constructor;
    typeof ctor === 'function';
    ctor = Object.getPrototypeOf(ctor)
  ) {
    if ((ctor as { name?: string }).name === declared) {
      return true;
    }
  }
  return false;
}
