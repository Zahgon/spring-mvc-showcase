import { beforeEach, test } from 'vitest';
import { get, type MockMvc } from '../support/MockMvc.js';
import { containsString, model, status, view } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().alwaysExpect(status().isOk()).build();
});

test('htmlView', async () => {
  await mockMvc
    .perform(get('/views/html'))
    .andExpect(view().name(containsString('views/html')))
    .andExpect(model().attribute('foo', 'bar'))
    .andExpect(model().attribute('fruit', 'apple'))
    .andExpect(model().size(2));
});

test('viewName', async () => {
  await mockMvc
    .perform(get('/views/viewName'))
    .andExpect(view().name(containsString('views/viewName')))
    .andExpect(model().attribute('foo', 'bar'))
    .andExpect(model().attribute('fruit', 'apple'))
    .andExpect(model().size(2));
});

test('uriTemplate', async () => {
  await mockMvc
    .perform(get('/views/pathVariables/bar/apple'))
    .andExpect(view().name(containsString('views/html')));
});
