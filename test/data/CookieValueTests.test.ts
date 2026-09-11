/**
 * `@CookieValue`, which the original ships and never tests.
 *
 * The expectation is the response the Java original gave for the same request:
 * `Obtained 'openid_provider' cookie 'myprovider.com'`.
 */

import { test } from 'vitest';
import { get } from '../support/MockMvc.js';
import { content, status } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

test('withCookie', async () => {
  await webAppContextSetup()
    .build()
    .perform(get('/data/cookie').cookie('openid_provider', 'myprovider.com'))
    .andExpect(status().isOk())
    .andExpect(content().contentType('text/plain;charset=ISO-8859-1'))
    .andExpect(content().string("Obtained 'openid_provider' cookie 'myprovider.com'"));
});
