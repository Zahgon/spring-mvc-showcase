/**
 * `ClasslevelMappingController` — the same nine mappings as
 * `MappingController`, declared relative to a class-level `/class-mapping/*`.
 *
 * The original ships no test for this controller, which is why its behaviour is
 * pinned here instead: the expectations are the responses the Java original
 * gave for these nine requests, captured through MockMvc.
 */

import { beforeEach, test } from 'vitest';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { get, post, type MockMvc } from '../support/MockMvc.js';
import { content, jsonPath, status } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().alwaysExpect(status().isOk()).build();
});

test('byPath', async () => {
  await mockMvc.perform(get('/class-mapping/path')).andExpect(content().string('Mapped by path!'));
});

test('byPathPattern', async () => {
  // The class-level wildcard is not a segment of its own: `/class-mapping/*`
  // combined with `/path/*` is `/class-mapping/path/*`.
  await mockMvc
    .perform(get('/class-mapping/path/wildcard'))
    .andExpect(content().string("Mapped by path pattern ('/class-mapping/path/wildcard')"));
});

test('byMethod', async () => {
  await mockMvc
    .perform(get('/class-mapping/method'))
    .andExpect(content().string('Mapped by path + method'));
});

test('byParameter', async () => {
  await mockMvc
    .perform(get('/class-mapping/parameter?foo=bar'))
    .andExpect(content().string('Mapped by path + method + presence of query parameter!'));
});

test('byParameterNegation', async () => {
  await mockMvc
    .perform(get('/class-mapping/parameter'))
    .andExpect(content().string('Mapped by path + method + not presence of query!'));
});

test('byHeader', async () => {
  await mockMvc
    .perform(get('/class-mapping/header').header('FooHeader', 'foo'))
    .andExpect(content().string('Mapped by path + method + presence of header!'));
});

test('byHeaderNegation', async () => {
  await mockMvc
    .perform(get('/class-mapping/notheader'))
    .andExpect(content().string('Mapped by path + method + absence of header!'));
});

test('byConsumes', async () => {
  await mockMvc
    .perform(
      post('/class-mapping/consumes')
        .contentType(MediaType.APPLICATION_JSON)
        .content(Buffer.from('{ "foo": "bar", "fruit": "apple" }')),
    )
    .andExpect(
      content().string(
        "Mapped by path + method + consumable media type (javaBean 'JavaBean {foo=[bar], fruit=[apple]}')",
      ),
    );
});

test('byProduces', async () => {
  await mockMvc
    .perform(get('/class-mapping/produces').accept(MediaType.APPLICATION_JSON))
    .andExpect(content().contentType('application/json;charset=UTF-8'))
    .andExpect(jsonPath('$.foo').value('bar'))
    .andExpect(jsonPath('$.fruit').value('apple'));
});
