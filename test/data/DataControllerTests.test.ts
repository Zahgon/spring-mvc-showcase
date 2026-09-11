import { beforeEach, test } from 'vitest';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { get, post, type MockMvc } from '../support/MockMvc.js';
import { content, startsWith, status } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().alwaysExpect(status().isOk()).build();
});

test('param', async () => {
  await mockMvc
    .perform(get('/data/param?foo=bar'))
    .andExpect(content().string("Obtained 'foo' query parameter value 'bar'"));
});

test('group', async () => {
  await mockMvc
    .perform(get('/data/group?param1=foo&param2=bar&param3=baz'))
    .andExpect(
      content().string(
        startsWith('Obtained parameter group org.springframework.samples.mvc.data.JavaBean@'),
      ),
    );
});

test('pathVar', async () => {
  await mockMvc
    .perform(get('/data/path/foo'))
    .andExpect(content().string("Obtained 'var' path variable value 'foo'"));
});

test('matrixVar', async () => {
  await mockMvc
    .perform(get('/data/matrixvars;foo=bar/simple'))
    .andExpect(
      content().string("Obtained matrix variable 'foo=bar' from path segment 'matrixvars'"),
    );
});

test('matrixVarMultiple', async () => {
  await mockMvc
    .perform(get('/data/matrixvars;foo=bar1/multiple;foo=bar2'))
    .andExpect(
      content().string(
        "Obtained matrix variable foo=bar1 from path segment 'matrixvars' and variable 'foo=bar2 from path segment 'multiple'",
      ),
    );
});

test('header', async () => {
  await mockMvc
    .perform(get('/data/header').accept(MediaType.ALL))
    .andExpect(content().string("Obtained 'Accept' header '*/*'"));
});

test('requestBody', async () => {
  await mockMvc
    .perform(post('/data/body').contentType(MediaType.TEXT_PLAIN).content(Buffer.from('foo')))
    .andExpect(content().string("Posted request body 'foo'"));
});

test('requestBodyAndHeaders', async () => {
  await mockMvc
    .perform(post('/data/entity').contentType(MediaType.TEXT_PLAIN).content(Buffer.from('foo')))
    .andExpect(
      content().string(
        "Posted request body 'foo'; headers = {Content-Type=[text/plain], Content-Length=[3]}",
      ),
    );
});
