/**
 * A repeated request parameter bound into a list-typed bean property.
 *
 * `/convert/bean?list=1&list=2&list=3` takes every value and converts each one
 * through the element's own declaration. The original ships this behaviour
 * untested; the expectations here are its answers to these two requests.
 */

import { beforeEach, test } from 'vitest';
import { get, type MockMvc } from '../support/MockMvc.js';
import { content, status } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().alwaysExpect(status().isOk()).build();
});

test('repeatedParameterFillsTheList', async () => {
  await mockMvc
    .perform(get('/convert/bean?list=1&list=2&list=3'))
    .andExpect(content().string('Converted JavaBean list=[1, 2, 3]'));
});

test('everyElementGoesThroughItsOwnFormat', async () => {
  // `formattedList` is a list of dates under `@DateTimeFormat(iso=DATE)`, so
  // the annotation applies to each element rather than to the list.
  await mockMvc
    .perform(get('/convert/bean?formattedList=2010-07-04&formattedList=2011-01-01'))
    .andExpect(
      content().string(
        'Converted JavaBean formattedList=[Sun Jul 04 00:00:00 IST 2010, Sat Jan 01 00:00:00 IST 2011]',
      ),
    );
});
