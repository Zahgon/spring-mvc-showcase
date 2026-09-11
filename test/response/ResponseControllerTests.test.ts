import { beforeEach, test } from 'vitest';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { ResponseController } from '../../src/samples/mvc/response/ResponseController.js';
import { get, type MockMvc } from '../support/MockMvc.js';
import { content, status } from '../support/matchers.js';
import { standaloneSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = standaloneSetup(new ResponseController()).build();
});

test('responseBody', async () => {
  await mockMvc
    .perform(get('/response/annotation'))
    .andExpect(status().isOk())
    .andExpect(content().string('The String ResponseBody'));
});

test('responseCharsetAccept', async () => {
  await mockMvc
    .perform(get('/response/charset/accept').accept(MediaType.parse('text/plain;charset=UTF-8')))
    .andExpect(status().isOk())
    .andExpect(
      content().string('こんにちは世界！ ("Hello world!" in Japanese)'),
    );
});

test('responseCharsetProduce', async () => {
  await mockMvc
    .perform(get('/response/charset/produce'))
    .andExpect(status().isOk())
    .andExpect(
      content().string('こんにちは世界！ ("Hello world!" in Japanese)'),
    );
});

test('responseEntityStatus', async () => {
  await mockMvc
    .perform(get('/response/entity/status'))
    .andExpect(status().isForbidden())
    .andExpect(content().string('The String ResponseBody with custom status code (403 Forbidden)'));
});

test('responseEntityHeaders', async () => {
  await mockMvc
    .perform(get('/response/entity/headers'))
    .andExpect(status().isOk())
    .andExpect(
      content().string('The String ResponseBody with custom header Content-Type=text/plain'),
    );
});
