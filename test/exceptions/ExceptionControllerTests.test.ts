import { beforeEach, test } from 'vitest';
import { get, type MockMvc } from '../support/MockMvc.js';
import { content, status } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().build();
});

test('controllerExceptionHandler', async () => {
  await mockMvc
    .perform(get('/exception'))
    .andExpect(status().isOk())
    .andExpect(content().string('IllegalStateException handled!'));
});

test('globalExceptionHandler', async () => {
  await mockMvc
    .perform(get('/global-exception'))
    .andExpect(status().isOk())
    .andExpect(content().string('Handled BusinessException'));
});
