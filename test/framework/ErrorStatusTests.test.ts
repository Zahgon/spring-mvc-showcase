/**
 * `DefaultHandlerExceptionResolver`, and the `handleNoMatch` rules behind it.
 *
 * A request whose path matched a mapping but whose method or media types did
 * not is not "not found": Spring re-checks the conditions in order and answers
 * with the one that failed. None of the 81 ported tests goes down these paths —
 * every status below was read off the Java original.
 */

import { describe, expect, test } from 'vitest';
import { TestClient } from '../support/container.js';

async function tokenised(): Promise<[TestClient, string]> {
  const client = new TestClient();
  return [client, TestClient.tokenOf((await client.get('/form')).text)];
}

describe('handleNoMatch', () => {
  test('answers405WhenOnlyTheMethodIsWrong', async () => {
    const [client, token] = await tokenised();
    const response = await client.request('POST', '/mapping/path', {
      headers: { 'x-csrf-token': token },
    });
    expect(response.status).toBe(405);
    expect(client.header(response, 'Allow')).toBe('GET');
  });

  test('answers415WhenNoHandlerConsumesThatContentType', async () => {
    const [client, token] = await tokenised();
    const response = await client.request('POST', '/mapping/consumes', {
      headers: { 'content-type': 'application/xml', 'x-csrf-token': token },
      body: '<x/>',
    });
    expect(response.status).toBe(415);
  });

  test('answers406WhenNothingCanProduceWhatWasAccepted', async () => {
    const response = await new TestClient().get('/mapping/produces', { accept: 'image/png' });
    expect(response.status).toBe(406);
  });

  test('answers404WhenThePathMatchesNothingAtAll', async () => {
    expect((await new TestClient().get('/nothing/here')).status).toBe(404);
  });

  test('answers404WhenOnlyAHeaderConditionIsUnmet', async () => {
    // Spring singles out method, consumes and produces; a header condition is
    // not one of them, so it falls through to 404 as any unmapped path does.
    expect((await new TestClient().get('/class-mapping/header')).status).toBe(404);
  });
});

describe('method and type conditions Spring gives for free', () => {
  test('headMatchesAGetMappingAndSendsNoBody', async () => {
    // The handler runs exactly as it would for GET; the container sends
    // everything but the body.
    const client = new TestClient();
    const get = await client.get('/simple');
    const head = await client.request('HEAD', '/simple');
    expect(head.status).toBe(200);
    expect(client.header(head, 'Content-Type')).toBe(client.header(get, 'Content-Type'));
    expect(head.text).toBe('');
    expect(get.text).toBe('Hello world!');
  });

  test('answers400WhenAParameterWillNotConvert', async () => {
    // MethodArgumentTypeMismatchException, which the resolver answers with 400.
    // A command object is different -- see BindingFailureMessageTests.
    expect((await new TestClient().get('/convert/primitive?value=notanumber')).status).toBe(400);
    expect((await new TestClient().get('/convert/date/notadate')).status).toBe(400);
  });

  test('leavesAPropertyAloneWhenItsElementWillNotConvert', async () => {
    // The value is converted before the container is reached, so `list` is
    // never grown and the bean prints without it.
    const response = await new TestClient().get('/convert/bean?list%5B0%5D=apple');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Converted JavaBean');
  });
});

describe('message converters', () => {
  test('answers400WhenTheBodyWillNotParse', async () => {
    const [client, token] = await tokenised();
    const response = await client.request('POST', '/messageconverters/json', {
      headers: { 'content-type': 'application/json', 'x-csrf-token': token },
      body: '{ not json',
    });
    expect(response.status).toBe(400);
  });

  test('readsAFormEncodedBodyIntoTheCommandObject', async () => {
    const [client, token] = await tokenised();
    const response = await client.request('POST', '/messageconverters/form', {
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': token },
      body: 'foo=bar&fruit=apple',
    });
    expect(response.status).toBe(200);
    expect(response.text).toBe('Read x-www-form-urlencoded: JavaBean {foo=[bar], fruit=[apple]}');
  });
});
