import { beforeEach, test } from 'vitest';
import { ValidationController } from '../../src/samples/mvc/validation/ValidationController.js';
import { get, type MockMvc } from '../support/MockMvc.js';
import { content, status } from '../support/matchers.js';
import { standaloneSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = standaloneSetup(new ValidationController()).alwaysExpect(status().isOk()).build();
});

test('validateSuccess', async () => {
  await mockMvc
    .perform(get('/validate?number=3&date=2029-07-04'))
    .andExpect(content().string('No errors'));
});

test('validateErrors', async () => {
  await mockMvc
    .perform(get('/validate?number=3&date=2010-07-01'))
    .andExpect(content().string('Object has validation errors'));
});
