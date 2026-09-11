import { test } from 'vitest';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { SimpleControllerRevisited } from '../../src/samples/mvc/simple/SimpleControllerRevisited.js';
import { get } from '../support/MockMvc.js';
import { content, status } from '../support/matchers.js';
import { standaloneSetup } from '../support/context.js';

test('simple', async () => {
  await standaloneSetup(new SimpleControllerRevisited())
    .build()
    .perform(get('/simple/revisited').accept(MediaType.TEXT_PLAIN))
    .andExpect(status().isOk())
    .andExpect(content().contentType('text/plain;charset=ISO-8859-1'))
    .andExpect(content().string('Hello world revisited!'));
});
