/**
 * The entry point, started for real.
 *
 * Everything else in the suite drives the container directly; this goes over a
 * socket, because `main.ts` is exactly the adapter between `node:http` and the
 * container and there is nothing else to check it.
 */

import { afterAll, beforeAll, expect, test } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { createApplication, start } from '../src/main.js';

let server: Server;
let base: string;

beforeAll(async () => {
  // `start` is what `npm start` runs; 0 asks the OS for a free port.
  server = start(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/spring-mvc-showcase`;
});

afterAll(async () => {
  server.close();
  await once(server, 'close');
});

test('servesTheHomePage', async () => {
  const response = await fetch(base + '/');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/html;charset=iso-8859-1');
  expect(await response.text()).toContain('<title>spring-mvc-showcase</title>');
});

test('servesTheApplicationsOwnStylesheet', async () => {
  const response = await fetch(base + '/resources/form.css');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/css');
});

test('servesAVendoredLibraryUnderTheSameUrlSpace', async () => {
  const response = await fetch(base + '/resources/jquery/1.6/jquery.js');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/javascript');
});

test('servesAControllerResponse', async () => {
  const response = await fetch(base + '/simple');
  expect(response.status).toBe(200);
  expect(await response.text()).toBe('Hello world!');
});

test('answersOutsideTheContextPathWith404', async () => {
  const response = await fetch(base.replace('/spring-mvc-showcase', '') + '/elsewhere');
  expect(response.status).toBe(404);
});

test('servesAHandledException', async () => {
  const response = await fetch(base + '/exception');
  expect(response.status).toBe(200);
  expect(await response.text()).toBe('IllegalStateException handled!');
});

test('servesAControllerAdviceException', async () => {
  const response = await fetch(base + '/global-exception');
  expect(response.status).toBe(200);
  expect(await response.text()).toBe('Handled BusinessException');
});

test('readsAPostedBody', async () => {
  // The CSRF filter is in front of every unsafe method, so a POST has to carry
  // the session's token -- which the home page publishes in a meta tag.
  const home = await fetch(base + '/');
  const session = home.headers.get('set-cookie')!.split(';')[0]!;
  const token = /name="_csrf" content="([^"]+)"/.exec(await home.text())![1]!;
  const response = await fetch(base + '/data/body', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', cookie: session, 'x-csrf-token': token },
    body: 'Hello world!',
  });
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Posted request body 'Hello world!'");
});

test('rejectsAnUnsafeRequestWithoutItsToken', async () => {
  const response = await fetch(base + '/data/body', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'Hello world!',
  });
  expect(response.status).toBe(403);
});

test('answers500WhenTheContainerItselfFails', async () => {
  // Nothing in the application can fail this way, so the adapter's last-resort
  // branch is shown a container that throws.
  const broken = createApplication({
    service: () => Promise.reject(new Error('container failure')),
  } as unknown as Parameters<typeof createApplication>[0]).listen(0);
  await once(broken, 'listening');
  try {
    const port = (broken.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${String(port)}/anything`);
    expect(response.status).toBe(500);
    expect(await response.text()).toContain('container failure');
  } finally {
    broken.close();
    await once(broken, 'close');
  }
});
