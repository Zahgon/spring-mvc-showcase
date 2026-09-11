/**
 * The container itself: the work Jetty did before Spring ever saw a request.
 *
 * The MockMvc suite starts after all of this — it hands the dispatcher a
 * request that is already parsed — so nothing else in the suite covers cookie
 * parsing, multipart decoding, static resources, the session or the CSRF
 * filter. The expectations come from the same Jetty capture the view fixtures
 * do.
 */

import { expect, test } from 'vitest';
import {
  addParameter,
  contentTypeOf,
  parseCookies,
  parseMultipart,
} from '../../src/framework/web/ServletContainer.js';
import { fixture, normalise, TestClient } from '../support/container.js';

test('parsesCookieHeader', () => {
  const cookies = parseCookies('JSESSIONID=abc123; theme=dark');
  expect(cookies.get('JSESSIONID')).toBe('abc123');
  expect(cookies.get('theme')).toBe('dark');
  expect(parseCookies(undefined).size).toBe(0);
  // A bare token is not a cookie, and must not become one with an empty name.
  expect(parseCookies('novalue').size).toBe(0);
});

test('repeatedParameterKeepsEveryValue', () => {
  const parameters = new Map<string, string[]>();
  addParameter(parameters, 'values', '1');
  addParameter(parameters, 'values', '2');
  expect(parameters.get('values')).toEqual(['1', '2']);
});

test('parsesMultipartFileAndFields', () => {
  const boundary = 'X-BOUNDARY';
  const body = Buffer.from(
    `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="file"; filename="upload.txt"\r\n' +
      'Content-Type: text/plain\r\n\r\n' +
      'hello upload\n\r\n' +
      `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="ajaxUpload"\r\n\r\n' +
      'true\r\n' +
      `--${boundary}--\r\n`,
    'latin1',
  );
  const parameters = new Map<string, string[]>();
  const files = parseMultipart(body, boundary, parameters);
  expect(files).toHaveLength(1);
  expect(files[0]!.getName()).toBe('file');
  expect(files[0]!.getOriginalFilename()).toBe('upload.txt');
  expect(files[0]!.getContentType()).toBe('text/plain');
  expect(files[0]!.getBytes().toString('utf8')).toBe('hello upload\n');
  expect(parameters.get('ajaxUpload')).toEqual(['true']);
});

test('mapsStaticExtensionsToMediaTypes', () => {
  expect(contentTypeOf('form.css')).toBe('text/css');
  expect(contentTypeOf('jquery.js')).toBe('application/javascript');
  expect(contentTypeOf('ui-bg_flat_0_aaaaaa_40x100.png')).toBe('image/png');
  expect(contentTypeOf('LICENCE')).toBe('application/octet-stream');
});

test('servesStaticResources', async () => {
  const client = new TestClient();
  const response = await client.get('/resources/form.css');
  expect(response.status).toBe(200);
  expect(client.header(response, 'Content-Type')).toBe('text/css');
  expect(response.body.length).toBeGreaterThan(0);
  expect(client.header(response, 'Content-Length')).toBe(String(response.body.length));
});

test('doesNotServeAboveTheResourceRoot', async () => {
  const response = await new TestClient().get('/resources/../../package.json');
  expect(response.status).toBe(404);
});

test('answersAnUnmappedPathWith404', async () => {
  const response = await new TestClient().get('/nosuchpath');
  expect(response.status).toBe(404);
  expect(response.text).toBe('');
});

test('issuesASessionCookieOnceAndKeepsTheSession', async () => {
  const client = new TestClient();
  const first = await client.get('/form');
  expect(client.header(first, 'Set-Cookie')).toMatch(
    /^JSESSIONID=[^;]+; Path=\/spring-mvc-showcase$/,
  );
  const second = await client.get('/form');
  expect(client.header(second, 'Set-Cookie')).toBeUndefined();
  // The same session means the same CSRF token.
  expect(TestClient.tokenOf(second.text)).toBe(TestClient.tokenOf(first.text));
});

test('rejectsAnUnsafeRequestWithoutItsToken', async () => {
  const client = new TestClient();
  await client.get('/form');
  const response = await client.form('/form', 'name=Bob&age=30');
  expect(response.status).toBe(403);
});

test('acceptsTheTokenFromTheHeaderToo', async () => {
  const client = new TestClient();
  const token = TestClient.tokenOf((await client.get('/form')).text);
  const response = await client.request('POST', '/form', {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-csrf-token': token,
    },
    body: 'name=Bob&age=30&inquiry=comment&subscribeNewsletter=false',
  });
  expect(response.status).toBe(302);
});

test('uploadsAFile', async () => {
  const client = new TestClient();
  const token = TestClient.tokenOf((await client.get('/fileupload')).text);
  const response = await client.request('POST', '/fileupload?_csrf=' + token, {
    headers: { 'content-type': 'multipart/form-data; boundary=B' },
    body: Buffer.from(
      '--B\r\nContent-Disposition: form-data; name="file"; filename="upload.txt"\r\n' +
        'Content-Type: text/plain\r\n\r\nhello upload\n\r\n--B--\r\n',
      'latin1',
    ),
  });
  expect(response.status).toBe(200);
  expect(normalise(response.text)).toBe(await fixture('fileupload-posted'));
});

test('uploadsAFileOverAjax', async () => {
  const client = new TestClient();
  const token = TestClient.tokenOf((await client.get('/fileupload')).text);
  const response = await client.request('POST', '/fileupload?_csrf=' + token, {
    headers: { 'content-type': 'multipart/form-data; boundary=B' },
    body: Buffer.from(
      '--B\r\nContent-Disposition: form-data; name="file"; filename="upload.txt"\r\n' +
        'Content-Type: text/plain\r\n\r\nhello upload\n\r\n' +
        '--B\r\nContent-Disposition: form-data; name="ajaxUpload"\r\n\r\ntrue\r\n--B--\r\n',
      'latin1',
    ),
  });
  expect(normalise(response.text)).toBe(await fixture('fileupload-posted-ajax'));
});

test('reportsAnEmptyUpload', async () => {
  const client = new TestClient();
  const token = TestClient.tokenOf((await client.get('/fileupload')).text);
  const response = await client.request('POST', '/fileupload?_csrf=' + token, {
    headers: { 'content-type': 'multipart/form-data; boundary=B' },
    body: Buffer.from(
      '--B\r\nContent-Disposition: form-data; name="file"; filename=""\r\n' +
        'Content-Type: application/octet-stream\r\n\r\n\r\n--B--\r\n',
      'latin1',
    ),
  });
  expect(normalise(response.text)).toBe(await fixture('fileupload-empty'));
});

test('rendersTheRedirectResultsPageWithItsPathVariable', async () => {
  const client = new TestClient();
  const redirect = await client.get('/redirect/uriTemplate?account=a123&date=12-31-2011');
  expect(redirect.status).toBe(302);
  expect(client.header(redirect, 'Location')).toBe(
    '/spring-mvc-showcase/redirect/a123?date=12%2F31%2F11',
  );
  const page = await client.get('/redirect/a123?date=12%2F31%2F11');
  expect(page.text).toContain("<h3>Path variable 'account': a123</h3>");
  expect(page.text).toContain("<h3>Query param 'date': 12/31/11</h3>");
});

test('servesTheAsyncEndpointsThroughTheSecondDispatch', async () => {
  const client = new TestClient();
  expect((await client.get('/async/callable/response-body')).text).toBe('Callable result');
  expect((await client.get('/async/callable/exception')).text).toBe(
    'Handled exception: Callable error',
  );
});
