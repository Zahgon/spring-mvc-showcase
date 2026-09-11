import { beforeEach, test } from 'vitest';
import { CustomArgumentController } from '../../src/samples/mvc/data/custom/CustomArgumentController.js';
import { get, type MockMvc } from '../support/MockMvc.js';
import { content } from '../support/matchers.js';
import { standaloneSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = standaloneSetup(new CustomArgumentController()).build();
});

test('param', async () => {
  await mockMvc
    .perform(get('/data/custom'))
    .andExpect(content().string("Got 'foo' request attribute value 'bar'"));
});
