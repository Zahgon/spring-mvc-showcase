import { beforeEach, test } from 'vitest';
import { IllegalStateException } from '../../src/framework/web/exceptions.js';
import { ModelAndView } from '../../src/framework/web/ModelAndView.js';
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
    .perform(get('/async/deferred-result/response-body'))
    .andExpect(status().isOk())
    .andExpect(request().asyncStarted())
    .andExpect(request().asyncResult('Deferred result'))
    .andReturn();

  await mockMvc
    .perform(asyncDispatch(mvcResult))
    .andExpect(status().isOk())
    .andExpect(content().contentType('text/plain;charset=ISO-8859-1'))
    .andExpect(content().string('Deferred result'));
});

test('view', async () => {
  const mvcResult = await mockMvc
    .perform(get('/async/deferred-result/model-and-view'))
    .andExpect(status().isOk())
    .andExpect(request().asyncStarted())
    .andExpect(request().asyncResult(instanceOf(ModelAndView)))
    .andReturn();

  await mockMvc
    .perform(asyncDispatch(mvcResult))
    .andExpect(status().isOk())
    .andExpect(forwardedUrl('/WEB-INF/views/views/html.jsp'))
    .andExpect(model().attributeExists('javaBean'));
});

test('exception', async () => {
  const mvcResult = await mockMvc
    .perform(get('/async/deferred-result/exception'))
    .andExpect(status().isOk())
    .andExpect(request().asyncStarted())
    .andExpect(request().asyncResult(instanceOf(IllegalStateException)))
    .andReturn();

  await mockMvc
    .perform(asyncDispatch(mvcResult))
    .andExpect(status().isOk())
    .andExpect(content().contentType('text/plain;charset=ISO-8859-1'))
    .andExpect(content().string('Handled exception: DeferredResult error'));
});
