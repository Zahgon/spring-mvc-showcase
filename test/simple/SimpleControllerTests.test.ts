import { test } from 'vitest';
import { SimpleController } from '../../src/samples/mvc/simple/SimpleController.js';
import { get } from '../support/MockMvc.js';
import { content, status } from '../support/matchers.js';
import { standaloneSetup } from '../support/context.js';

test('simple', async () => {
  await standaloneSetup(new SimpleController())
    .build()
    .perform(get('/simple'))
    .andExpect(status().isOk())
    .andExpect(content().contentType('text/plain;charset=ISO-8859-1'))
    .andExpect(content().string('Hello world!'));
});
