/**
 * The message converters, on the paths the showcase's own endpoints do not
 * take.
 *
 * `/messageconverters/json` writes a bean of two strings, so nothing in the
 * application ever asks Jackson to write a collection; and the form converter
 * is registered but never read from, because form data reaches a handler
 * through parameter binding instead.
 */

import { expect, test } from 'vitest';
import { JacksonHttpMessageConverter } from '../../src/framework/converter/JacksonHttpMessageConverter.js';
import { FormHttpMessageConverter } from '../../src/framework/converter/FormHttpMessageConverter.js';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { HttpServletRequest, HttpServletResponse } from '../../src/framework/http/Servlet.js';
import { JavaBean } from '../../src/samples/mvc/convert/JavaBean.js';

test('jacksonWritesACollectionPropertyAsAJsonArray', () => {
  const bean = new JavaBean();
  bean.setList([1, 2, 3]);
  bean.setPrimitive(7);

  const response = new HttpServletResponse();
  new JacksonHttpMessageConverter().write(bean, MediaType.APPLICATION_JSON, response);
  const written = JSON.parse(response.getContentAsBuffer().toString('utf8')) as Record<
    string,
    unknown
  >;

  expect(written['list']).toEqual([1, 2, 3]);
  expect(written['primitive']).toBe(7);
});

test('jacksonWritesAnArrayAtTheTopLevelToo', () => {
  const response = new HttpServletResponse();
  new JacksonHttpMessageConverter().write(['a', 'b'], MediaType.APPLICATION_JSON, response);
  expect(response.getContentAsBuffer().toString('utf8')).toBe('["a","b"]');
});

test('theFormConverterIsWriteOnlyHere', () => {
  // Registered so that content negotiation knows the media type, but a form
  // body reaches the handler through parameter binding, never through `read`.
  const converter = new FormHttpMessageConverter();
  const request = new HttpServletRequest({ method: 'POST', requestURI: '/messageconverters/form' });
  expect(() => converter.read('JavaBean', request)).toThrow(
    'form data is read through parameter binding',
  );
});
