import { beforeEach, test } from 'vitest';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { StandardArgumentsController } from '../../src/samples/mvc/data/standard/StandardArgumentsController.js';
import { get, post, type MockMvc } from '../support/MockMvc.js';
import { content, startsWith, status } from '../support/matchers.js';
import { standaloneSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = standaloneSetup(new StandardArgumentsController()).alwaysExpect(status().isOk()).build();
});

test('request', async () => {
  await mockMvc
    .perform(get('/data/standard/request'))
    .andExpect(
      content().string(startsWith('request = org.springframework.samples.mvc.HttpServletRequest@')),
    );
});

test('requestReader', async () => {
  await mockMvc
    .perform(
      post('/data/standard/request/reader')
        .contentType(MediaType.TEXT_PLAIN)
        .content(Buffer.from('foo')),
    )
    .andExpect(content().string('Read char request body = foo'));
});

test('requestIs', async () => {
  await mockMvc
    .perform(
      post('/data/standard/request/is').contentType(MediaType.TEXT_PLAIN).content(Buffer.from('foo')),
    )
    .andExpect(content().string('Read binary request body = foo'));
});

test('response', async () => {
  await mockMvc
    .perform(get('/data/standard/response'))
    .andExpect(
      content().string(startsWith('response = org.springframework.samples.mvc.HttpServletResponse@')),
    );
});

test('writer', async () => {
  await mockMvc
    .perform(get('/data/standard/response/writer'))
    .andExpect(content().string('Wrote char response using Writer'));
});

test('os', async () => {
  await mockMvc
    .perform(get('/data/standard/response/os'))
    .andExpect(content().string('Wrote binary response using OutputStream'));
});

test('session', async () => {
  await mockMvc
    .perform(get('/data/standard/session'))
    .andExpect(content().string(startsWith('session=org.springframework.samples.mvc.HttpSession@')));
});
