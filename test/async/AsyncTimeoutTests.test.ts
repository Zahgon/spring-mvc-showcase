/**
 * The two timeout paths the original ships and never tests.
 *
 * A `WebAsyncTask` whose callable outlives its timeout is not left hanging:
 * `TimeoutCallableProcessingInterceptor` throws an `IllegalStateException`,
 * which the controller's own `@ExceptionHandler` answers. A `DeferredResult`
 * constructed with a default value answers with that value instead.
 *
 * Both expectations come from the Java original, asked the same two questions:
 * `Handled exception: [...] timed out` and `Deferred result after timeout`.
 */

import { beforeEach, test } from 'vitest';
import { asyncDispatch, get, type MockMvc } from '../support/MockMvc.js';
import { content, endsWith, request, startsWith, status } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().build();
});

test('callableWithCustomTimeoutHandling', async () => {
  const mvcResult = await mockMvc
    .perform(get('/async/callable/custom-timeout-handling'))
    .andExpect(request().asyncStarted())
    .andReturn();

  // The original names the timed-out task by its JVM class, which is a
  // synthetic lambda name; what is reproducible is that the controller
  // handled it rather than the request failing.
  await mockMvc
    .perform(asyncDispatch(mvcResult))
    .andExpect(status().isOk())
    .andExpect(content().string(startsWith('Handled exception: [')))
    .andExpect(content().string(endsWith('] timed out')));
});

test('deferredResultWithTimeoutValue', async () => {
  const mvcResult = await mockMvc
    .perform(get('/async/deferred-result/timeout-value'))
    .andExpect(request().asyncStarted())
    .andReturn();

  await mockMvc
    .perform(asyncDispatch(mvcResult))
    .andExpect(status().isOk())
    .andExpect(content().contentType('text/plain;charset=ISO-8859-1'))
    .andExpect(content().string('Deferred result after timeout'));
});
