import { beforeEach, test } from 'vitest';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { get, post, type MockMvc } from '../support/MockMvc.js';
import { content, jsonPath, status } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

const URI = '/messageconverters/{action}';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = webAppContextSetup().alwaysExpect(status().isOk()).build();
});

test('readString', async () => {
  await mockMvc
    .perform(post(URI, 'string').content(Buffer.from('foo')))
    .andExpect(content().string("Read string 'foo'"));
});

test('writeString', async () => {
  await mockMvc.perform(get(URI, 'string')).andExpect(content().string('Wrote a string'));
});

test('readForm', async () => {
  await mockMvc
    .perform(
      post(URI, 'form')
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .param('foo', 'bar')
        .param('fruit', 'apple'),
    )
    .andExpect(content().string('Read x-www-form-urlencoded: JavaBean {foo=[bar], fruit=[apple]}'));
});

test('writeForm', async () => {
  await mockMvc
    .perform(get(URI, 'form'))
    .andExpect(content().contentType(MediaType.APPLICATION_FORM_URLENCODED))
    .andExpect(content().string('foo=bar&fruit=apple'));
});

const XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<javaBean><foo>bar</foo><fruit>apple</fruit></javaBean>';

test('readXml', async () => {
  await mockMvc
    .perform(post(URI, 'xml').contentType(MediaType.APPLICATION_XML).content(Buffer.from(XML)))
    .andExpect(content().string('Read from XML: JavaBean {foo=[bar], fruit=[apple]}'));
});

test('writeXml', async () => {
  await mockMvc
    .perform(get(URI, 'xml').accept(MediaType.APPLICATION_XML))
    .andExpect(content().xml(XML));
});

test('readJson', async () => {
  await mockMvc
    .perform(
      post(URI, 'json')
        .contentType(MediaType.APPLICATION_JSON)
        .content(Buffer.from('{ "foo": "bar", "fruit": "apple" }')),
    )
    .andExpect(content().string('Read from JSON: JavaBean {foo=[bar], fruit=[apple]}'));
});

test('writeJson', async () => {
  await mockMvc
    .perform(get(URI, 'json').accept(MediaType.APPLICATION_JSON))
    .andExpect(jsonPath('$.foo').value('bar'))
    .andExpect(jsonPath('$.fruit').value('apple'));
});

test('writeJson2', async () => {
  await mockMvc
    .perform(get(URI, 'json').accept(MediaType.APPLICATION_JSON))
    .andExpect(jsonPath('$.foo').value('bar'))
    .andExpect(jsonPath('$.fruit').value('apple'));
});

const ATOM_XML =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<feed xmlns="http://www.w3.org/2005/Atom"><title>My Atom feed</title></feed>';

test('readAtom', async () => {
  await mockMvc
    .perform(
      post(URI, 'atom').contentType(MediaType.APPLICATION_ATOM_XML).content(Buffer.from(ATOM_XML)),
    )
    .andExpect(content().string('Read My Atom feed'));
});

test('writeAtom', async () => {
  await mockMvc
    .perform(get(URI, 'atom').accept(MediaType.APPLICATION_ATOM_XML))
    .andExpect(content().xml(ATOM_XML));
});

test('readRss', async () => {
  const rss =
    '<?xml version="1.0" encoding="UTF-8"?> <rss version="2.0">' +
    '<channel><title>My RSS feed</title></channel></rss>';

  await mockMvc
    .perform(
      post(URI, 'rss')
        .contentType(MediaType.parse('application/rss+xml'))
        .content(Buffer.from(rss)),
    )
    .andExpect(content().string('Read My RSS feed'));
});

test('writeRss', async () => {
  const rss =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0"><channel><title>My RSS feed</title>' +
    '<link>http://localhost:8080/mvc-showcase/rss</link>' +
    '<description>Description</description></channel></rss>';

  await mockMvc
    .perform(get(URI, 'rss').accept(MediaType.parse('application/rss+xml')))
    .andExpect(content().xml(rss));
});
