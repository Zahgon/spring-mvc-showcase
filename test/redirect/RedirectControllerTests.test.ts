import { beforeEach, test } from 'vitest';
import { RedirectController } from '../../src/samples/mvc/redirect/RedirectController.js';
import { FormattingConversionService } from '../../src/framework/convert/ConversionService.js';
import { get, type MockMvc } from '../support/MockMvc.js';
import { redirectedUrl, status } from '../support/matchers.js';
import { standaloneSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = standaloneSetup(new RedirectController(new FormattingConversionService()))
    .alwaysExpect(status().isFound())
    .build();
});

test('uriTemplate', async () => {
  await mockMvc
    .perform(get('/redirect/uriTemplate'))
    .andExpect(redirectedUrl('/redirect/a123?date=12%2F31%2F11'));
});

test('uriComponentsBuilder', async () => {
  await mockMvc
    .perform(get('/redirect/uriComponentsBuilder'))
    .andExpect(redirectedUrl('/redirect/a123?date=12/31/11'));
});
