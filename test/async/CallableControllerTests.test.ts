import { beforeEach, test } from 'vitest';
import { IllegalStateException } from '../../src/framework/web/exceptions.js';
import { asyncDispatch, get, type MockMvc } from '../support/MockMvc.js';
import {
  content,
  forwardedUrl,
  instanceOf,
  model,
  request,
  status,
} from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().build();
});

test('responseBody', async () => {
  const mvcResult = await mockMvc
    .perform(get('/async/callable/response-body'))
    .andExpect(request().asyncStarted())
    .andExpect(request().asyncResult('Callable result'))
    .andReturn();

  await mockMvc
    .perform(asyncDispatch(mvcResult))
    .andExpect(status().isOk())
    .andExpect(content().contentType('text/plain;charset=ISO-8859-1'))
    .andExpect(content().string('Callable result'));
});

test('view', async () => {
  const mvcResult = await mockMvc
    .perform(get('/async/callable/view'))
    .andExpect(request().asyncStarted())
    .andExpect(request().asyncResult('views/html'))
    .andReturn();

  await mockMvc
    .perform(asyncDispatch(mvcResult))
    .andExpect(status().isOk())
    .andExpect(forwardedUrl('/WEB-INF/views/views/html.jsp'))
    .andExpect(model().attribute('foo', 'bar'))
    .andExpect(model().attribute('fruit', 'apple'));
});

test('exception', async () => {
  const mvcResult = await mockMvc
    .perform(get('/async/callable/exception'))
    .andExpect(request().asyncStarted())
    .andExpect(request().asyncResult(instanceOf(IllegalStateException)))
    .andReturn();

  await mockMvc
    .perform(asyncDispatch(mvcResult))
    .andExpect(status().isOk())
    .andExpect(content().contentType('text/plain;charset=ISO-8859-1'))
    .andExpect(content().string('Handled exception: Callable error'));
});
