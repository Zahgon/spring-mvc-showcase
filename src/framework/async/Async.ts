/**
 * `Callable`, `DeferredResult` and `WebAsyncTask`, and the two-phase dispatch
 * Spring performs around them.
 *
 * A handler that returns one of these does not produce a response on the first
 * dispatch: the request is marked async-started and the container comes back
 * later with the resolved value. The suite asserts both phases —
 * `request().asyncStarted()`, then `asyncDispatch(...)` — so both exist here
 * rather than collapsing into a single await.
 */

import { IllegalStateException } from '../web/exceptions.js';

export class Callable<T> {
  constructor(readonly call: () => Promise<T> | T) {}
}

export class DeferredResult<T> {
  private resolveResult!: (value: T) => void;

  private rejectResult!: (error: unknown) => void;

  private settled = false;

  readonly promise: Promise<T>;

  constructor(
    private readonly timeoutMillis: number | null = null,
    private readonly timeoutResult: T | null = null,
  ) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolveResult = resolve;
      this.rejectResult = reject;
    });
    if (this.timeoutMillis !== null) {
      const timer = setTimeout(() => {
        if (!this.settled && this.timeoutResult !== null) {
          this.setResult(this.timeoutResult);
        }
      }, this.timeoutMillis);
      // The timer must not hold the process open.
      timer.unref?.();
    }
  }

  setResult(value: T): boolean {
    if (this.settled) {
      return false;
    }
    this.settled = true;
    this.resolveResult(value);
    return true;
  }

  setErrorResult(error: unknown): boolean {
    if (this.settled) {
      return false;
    }
    this.settled = true;
    this.rejectResult(error);
    return true;
  }
}

export class WebAsyncTask<T> {
  constructor(
    readonly timeout: number,
    readonly callable: () => Promise<T> | T,
  ) {}
}

/** Raised when a `WebAsyncTask` exceeds its timeout. */
/**
 * `TimeoutCallableProcessingInterceptor` throws an `IllegalStateException`, and
 * the type is the point: `CallableController` declares
 * `@ExceptionHandler public String handleException(IllegalStateException ex)`,
 * so a task that outlives its timeout is answered by the controller rather than
 * escaping as a server error.
 */
export class AsyncRequestTimeoutError extends IllegalStateException {}

/** Resolves whatever an async handler returned into its eventual value. */
export function asyncValue(returned: unknown): Promise<unknown> | null {
  if (returned instanceof Callable) {
    return Promise.resolve(returned.call());
  }
  if (returned instanceof DeferredResult) {
    return returned.promise;
  }
  if (returned instanceof WebAsyncTask) {
    return withTimeout(returned);
  }
  return null;
}

/**
 * `TimeoutCallableProcessingInterceptor`: when the task outlives its timeout,
 * the interceptor throws rather than letting the request hang.
 */
async function withTimeout<T>(task: WebAsyncTask<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new AsyncRequestTimeoutError('[' + task.callable.name + '] timed out'));
    }, task.timeout);
    timer.unref?.();
  });
  try {
    return await Promise.race([Promise.resolve(task.callable()), timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/** `Thread.sleep`, as the showcase's async handlers use it. */
export function sleep(millis: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, millis);
  });
}
