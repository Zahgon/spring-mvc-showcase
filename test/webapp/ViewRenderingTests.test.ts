/**
 * Every view, rendered and compared byte for byte against the page the Java
 * original served for the same request.
 *
 * The fixtures under `test/fixtures/rendered/` are exactly that: captured from
 * the original running under Jetty, with only the per-run CSRF token masked.
 * The 81 ported MockMvc tests assert the *forwarded URL* and never the rendered
 * page -- as the Java suite does -- so this is where the views themselves are
 * held to the original.
 */

import { expect, test } from 'vitest';
import { fixture, normalise, TestClient } from '../support/container.js';

test('home', async () => {
  const client = new TestClient();
  const response = await client.get('/');
  expect(response.status).toBe(200);
  expect(normalise(response.text)).toBe(await fixture('home'));
});

test('htmlView', async () => {
  const response = await new TestClient().get('/views/html');
  expect(response.status).toBe(200);
  expect(response.text).toBe(await fixture('views-html'));
});

test('viewName', async () => {
  const response = await new TestClient().get('/views/viewName');
  expect(response.text).toBe(await fixture('views-viewName'));
});

test('dataBinding', async () => {
  const response = await new TestClient().get('/views/dataBinding/bar/apple');
  expect(response.text).toBe(await fixture('views-dataBinding'));
});

test('form', async () => {
  const client = new TestClient();
  const response = await client.get('/form');
  expect(response.status).toBe(200);
  expect(client.header(response, 'Cache-Control')).toBe('no-store');
  expect(normalise(response.text)).toBe(await fixture('form'));
});

test('formAjaxFragment', async () => {
  const response = await new TestClient().get('/form', { 'x-requested-with': 'XMLHttpRequest' });
  expect(normalise(response.text)).toBe(await fixture('form-ajax'));
});

test('fileupload', async () => {
  const response = await new TestClient().get('/fileupload');
  expect(normalise(response.text)).toBe(await fixture('fileupload'));
});

test('fileuploadAjaxFragment', async () => {
  const response = await new TestClient().get('/fileupload', {
    'x-requested-with': 'XMLHttpRequest',
  });
  expect(normalise(response.text)).toBe(await fixture('fileupload-ajax'));
});

test('formWithBindingErrors', async () => {
  const client = new TestClient();
  const token = TestClient.tokenOf((await client.get('/form')).text);
  const response = await client.form(
    '/form',
    '_csrf=' +
      token +
      '&name=&age=abc&inquiry=comment&inquiryDetails=&subscribeNewsletter=false' +
      '&_additionalInfo%5Bmvc%5D=on&_additionalInfo%5Bjava%5D=on',
  );
  expect(response.status).toBe(200);
  expect(normalise(response.text)).toBe(await fixture('form-errors'));
});

test('formAfterSuccessfulPost', async () => {
  const client = new TestClient();
  const token = TestClient.tokenOf((await client.get('/form')).text);
  const posted = await client.form(
    '/form',
    '_csrf=' +
      token +
      '&name=Bob&age=30&birthDate=1980-01-01&phone=' +
      encodeURIComponent('(123) 456-7890') +
      '&currency=' +
      encodeURIComponent('$4.20') +
      '&percent=' +
      encodeURIComponent('15%') +
      '&inquiry=feedback&inquiryDetails=' +
      encodeURIComponent('hi there') +
      '&subscribeNewsletter=true&additionalInfo%5Bmvc%5D=true' +
      '&_additionalInfo%5Bmvc%5D=on&_additionalInfo%5Bjava%5D=on',
  );
  // The successful submit redirects, and the flash message rides across.
  expect(posted.status).toBe(302);
  expect(client.header(posted, 'Location')).toBe('/spring-mvc-showcase/form');
  const response = await client.get('/form');
  expect(normalise(response.text)).toBe(await fixture('form-success'));
});
