import { beforeEach, test } from 'vitest';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { get, post, type MockMvc } from '../support/MockMvc.js';
import { content, jsonPath, startsWith, status, xpath } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().alwaysExpect(status().isOk()).build();
});

test('byPath', async () => {
  await mockMvc.perform(get('/mapping/path')).andExpect(content().string('Mapped by path!'));
});

test('byPathPattern', async () => {
  await mockMvc
    .perform(get('/mapping/path/wildcard'))
    .andExpect(content().string("Mapped by path pattern ('/mapping/path/wildcard')"));
});

test('byMethod', async () => {
  await mockMvc
    .perform(get('/mapping/method'))
    .andExpect(content().string('Mapped by path + method'));
});

test('byParameter', async () => {
  await mockMvc
    .perform(get('/mapping/parameter?foo=bar'))
    .andExpect(content().string('Mapped by path + method + presence of query parameter!'));
});

test('byNotParameter', async () => {
  await mockMvc
    .perform(get('/mapping/parameter'))
    .andExpect(content().string('Mapped by path + method + not presence of query parameter!'));
});

test('byHeader', async () => {
  await mockMvc
    .perform(get('/mapping/header').header('FooHeader', 'foo'))
    .andExpect(content().string('Mapped by path + method + presence of header!'));
});

test('byHeaderNegation', async () => {
  await mockMvc
    .perform(get('/mapping/header'))
    .andExpect(content().string('Mapped by path + method + absence of header!'));
});

test('byConsumes', async () => {
  await mockMvc
    .perform(
      post('/mapping/consumes')
        .contentType(MediaType.APPLICATION_JSON)
        .content(Buffer.from('{ "foo": "bar", "fruit": "apple" }')),
    )
    .andExpect(
      content().string(startsWith('Mapped by path + method + consumable media type (javaBean')),
    );
});

test('byProducesAcceptJson', async () => {
  await mockMvc
    .perform(get('/mapping/produces').accept(MediaType.APPLICATION_JSON))
    .andExpect(jsonPath('$.foo').value('bar'))
    .andExpect(jsonPath('$.fruit').value('apple'));
});

test('byProducesAcceptXml', async () => {
  await mockMvc
    .perform(get('/mapping/produces').accept(MediaType.APPLICATION_XML))
    .andExpect(xpath('/javaBean/foo').string('bar'))
    .andExpect(xpath('/javaBean/fruit').string('apple'));
});

test('byProducesJsonExtension', async () => {
  await mockMvc
    .perform(get('/mapping/produces.json'))
    .andExpect(jsonPath('$.foo').value('bar'))
    .andExpect(jsonPath('$.fruit').value('apple'));
});

test('byProducesXmlExtension', async () => {
  await mockMvc
    .perform(get('/mapping/produces.xml'))
    .andExpect(xpath('/javaBean/foo').string('bar'))
    .andExpect(xpath('/javaBean/fruit').string('apple'));
});
