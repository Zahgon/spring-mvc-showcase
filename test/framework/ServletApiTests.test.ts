/**
 * The servlet and HTTP types the framework hands to a handler.
 *
 * `MockHttpServletRequest`, `MockHttpServletResponse`, `HttpHeaders`,
 * `MediaType` and `LinkedMultiValueMap` are the vocabulary every controller in
 * the showcase is written against, so their behaviour is part of the contract
 * even where the showcase itself only takes one path through them.
 */

import { describe, expect, test } from 'vitest';
import { HttpHeaders } from '../../src/framework/http/HttpHeaders.js';
import { MediaType } from '../../src/framework/http/MediaType.js';
import { LinkedMultiValueMap } from '../../src/framework/util/MultiValueMap.js';
import { Model, RedirectAttributes } from '../../src/framework/ui/Model.js';
import { ModelAndView } from '../../src/framework/web/ModelAndView.js';
import { Channel, Feed } from '../../src/framework/feed/Feed.js';
import { BindingResult } from '../../src/framework/bind/BindingResult.js';
import { AjaxUtils } from '../../src/mvc/extensions/ajax/AjaxUtils.js';
import {
  HttpServletRequest,
  HttpServletResponse,
  StandardMultipartFile,
} from '../../src/framework/http/Servlet.js';

function request(init: Partial<ConstructorParameters<typeof HttpServletRequest>[0]> = {}): HttpServletRequest {
  const headers = new HttpHeaders();
  headers.add('Accept', 'text/plain');
  headers.add('Accept', 'application/json');
  return new HttpServletRequest({
    method: 'GET',
    requestURI: '/data/param',
    headers,
    parameters: new Map([
      ['foo', ['bar']],
      ['values', ['1', '2']],
    ]),
    ...init,
  });
}

describe('HttpServletRequest', () => {
  test('listsItsHeadersAndEveryValueOfOne', () => {
    expect(request().getHeaderNames().sort()).toEqual(['Accept']);
    expect(request().getHeaders('Accept')).toEqual(['text/plain', 'application/json']);
    // A header nobody set has no values rather than a null entry.
    expect(request().getHeaders('X-Absent')).toEqual([]);
  });

  test('listsItsParameters', () => {
    expect(request().getParameterNames().sort()).toEqual(['foo', 'values']);
    expect(request().getParameterMap().get('values')).toEqual(['1', '2']);
  });

  test('keepsAndDropsAttributes', () => {
    const held = request();
    held.setAttribute('one', 1);
    held.setAttribute('two', 2);
    expect(held.getAttributeNames().sort()).toEqual(['one', 'two']);
    held.removeAttribute('one');
    expect(held.getAttributeNames()).toEqual(['two']);
    expect(held.getAttribute('one')).toBeNull();
  });

  test('readsItsBodyUnderTheEncodingItWasGiven', () => {
    const held = request({ method: 'POST' });
    held.setCharacterEncoding('UTF-8');
    held.setContent(Buffer.from('héllo', 'utf8'));
    expect(held.getReader()).toBe('héllo');
    expect(held.getInputStream()).toEqual(Buffer.from('héllo', 'utf8'));
    // The same bytes under the servlet default are not the same characters.
    held.setCharacterEncoding('ISO-8859-1');
    expect(held.getReader()).not.toBe('héllo');
  });

  test('isMultipartOnlyWhenItCarriesFiles', () => {
    expect(request().isMultipart()).toBe(false);
    const upload = request({
      method: 'POST',
      files: [new StandardMultipartFile('file', 'upload.txt', 'text/plain', Buffer.from('hi'))],
    });
    expect(upload.isMultipart()).toBe(true);
  });
});

describe('MultipartFile', () => {
  const file = (bytes: string): StandardMultipartFile =>
    new StandardMultipartFile('file', 'upload.txt', 'text/plain', Buffer.from(bytes));

  test('reportsItsSizeAndWhetherItIsEmpty', () => {
    expect(file('hello').getSize()).toBe(5);
    expect(file('hello').isEmpty()).toBe(false);
    expect(file('').getSize()).toBe(0);
    expect(file('').isEmpty()).toBe(true);
  });
});

describe('HttpServletResponse', () => {
  test('commitsOnSendErrorAndOnSendRedirect', () => {
    // Writing a body does not commit the response; the container commits when
    // the status line is decided, as MockHttpServletResponse does.
    const written = new HttpServletResponse();
    written.write(Buffer.from('body'));
    expect(written.isCommitted()).toBe(false);

    const failed = new HttpServletResponse();
    failed.sendError(404);
    expect(failed.isCommitted()).toBe(true);
    expect(failed.getStatus()).toBe(404);

    const redirected = new HttpServletResponse();
    redirected.sendRedirect('/elsewhere');
    expect(redirected.isCommitted()).toBe(true);
    expect(redirected.getStatus()).toBe(302);
    expect(redirected.getRedirectedUrl()).toBe('/elsewhere');
  });

  test('readsBackAHeaderItWasGiven', () => {
    const response = new HttpServletResponse();
    expect(response.getHeader('Content-Type')).toBeNull();
    response.setHeader('Content-Type', 'text/plain');
    expect(response.getHeader('Content-Type')).toBe('text/plain');
    expect(response.containsHeader('Content-Type')).toBe(true);
  });

  test('writesUnderTheEncodingItWasGiven', () => {
    const response = new HttpServletResponse();
    response.setCharacterEncoding('UTF-8');
    response.write(Buffer.from('héllo', 'utf8'));
    expect(response.getContentAsString()).toBe('héllo');
  });
});

describe('HttpSession', () => {
  test('keepsAndDropsAttributes', () => {
    const session = request().getSession(true)!;
    session.setAttribute('formBean', 'held');
    session.setAttribute('other', 1);
    expect(session.getAttributeNames().sort()).toEqual(['formBean', 'other']);
    expect(session.getAttribute('formBean')).toBe('held');
    session.removeAttribute('formBean');
    expect(session.getAttributeNames()).toEqual(['other']);
    expect(session.getAttribute('formBean')).toBeNull();
  });

  test('isCreatedOnlyWhenAsked', () => {
    expect(request().getSession(false)).toBeNull();
    expect(request().getSession(true)).not.toBeNull();
  });
});

describe('HttpHeaders', () => {
  test('addsSetsRemovesAndReportsEmptiness', () => {
    const headers = new HttpHeaders();
    expect(headers.isEmpty()).toBe(true);
    headers.add('Accept', 'text/plain');
    headers.add('Accept', 'application/json');
    expect(headers.get('Accept')).toEqual(['text/plain', 'application/json']);
    headers.set('Accept', 'text/html');
    expect(headers.get('Accept')).toEqual(['text/html']);
    expect(headers.isEmpty()).toBe(false);
    headers.remove('Accept');
    expect(headers.isEmpty()).toBe(true);
    expect(headers.getFirst('Accept')).toBeNull();
  });

  test('parsesContentTypeBackIntoAMediaType', () => {
    const headers = new HttpHeaders();
    expect(headers.getContentType()).toBeNull();
    headers.set(HttpHeaders.CONTENT_TYPE, 'text/plain;charset=ISO-8859-1');
    expect(headers.getContentType()!.toString()).toBe('text/plain;charset=ISO-8859-1');
  });

  test('setsLocation', () => {
    const headers = new HttpHeaders();
    headers.setLocation('/redirect/a123');
    expect(headers.getFirst(HttpHeaders.LOCATION)).toBe('/redirect/a123');
  });

  test('rendersAsJavaPrintsAMultiValueMap', () => {
    const headers = new HttpHeaders();
    headers.set(HttpHeaders.CONTENT_TYPE, 'text/plain');
    headers.set(HttpHeaders.CONTENT_LENGTH, '3');
    expect(headers.toString()).toBe('{Content-Type=[text/plain], Content-Length=[3]}');
  });
});

describe('MediaType', () => {
  test('dropsItsParameters', () => {
    const withCharset = MediaType.parse('text/plain;charset=UTF-8');
    expect(withCharset.withoutParameters().toString()).toBe('text/plain');
    expect(withCharset.getCharset()).toBe('UTF-8');
  });

  test('comparesTypeAndSubtypeIgnoringParameters', () => {
    const plain = MediaType.parse('text/plain');
    expect(plain.equalsTypeAndSubtype(MediaType.parse('text/plain;charset=UTF-8'))).toBe(true);
    expect(plain.equalsTypeAndSubtype(MediaType.parse('text/html'))).toBe(false);
  });
});

describe('LinkedMultiValueMap', () => {
  test('keepsEveryValueUnderAKeyAndAnswersWithTheFirst', () => {
    const map = new LinkedMultiValueMap<string, string>();
    map.add('foo', 'bar');
    map.add('foo', 'baz');
    map.add('other', 'value');
    expect(map.get('foo')).toEqual(['bar', 'baz']);
    expect(map.getFirst('foo')).toBe('bar');
    expect(map.get('absent')).toBeUndefined();
    expect(map.getFirst('absent')).toBeUndefined();
    expect(map.keys()).toEqual(['foo', 'other']);
  });
});

describe('Model and ModelAndView', () => {
  test('holdsAttributesAndSaysWhetherItHasOne', () => {
    const model = new Model(new Map());
    expect(model.containsAttribute('foo')).toBe(false);
    model.addAttribute('foo', 'bar');
    expect(model.containsAttribute('foo')).toBe(true);
    expect(model.getAttribute('foo')).toBe('bar');
    expect(model.getAttribute('absent')).toBeUndefined();
  });

  test('modelAndViewCarriesBothTheNameAndTheObjects', () => {
    const mav = new ModelAndView('views/html');
    mav.addObject('foo', 'bar');
    expect(mav.getViewName()).toBe('views/html');
    expect(mav.model.get('foo')).toBe('bar');
  });

  test('redirectAttributesSeparateFlashFromTheRest', () => {
    const attributes = new RedirectAttributes(new Map());
    attributes.addAttribute('account', 'a123');
    attributes.addFlashAttribute('message', 'done');
    expect([...attributes.asMap()]).toEqual([['account', 'a123']]);
    expect([...attributes.flashAttributes]).toEqual([['message', 'done']]);
  });
});

describe('Feed and Channel', () => {
  test('carryTheFeedTypeRomeWritesThemUnder', () => {
    const feed = new Feed();
    expect(feed.getFeedType()).toBe('atom_1.0');
    feed.setFeedType('atom_1.0');
    feed.setTitle('Atom Feed');
    expect(feed.getTitle()).toBe('Atom Feed');

    const channel = new Channel();
    expect(channel.getFeedType()).toBe('rss_2.0');
  });
});

describe('BindingResult', () => {
  test('rendersAsTheModelShowsIt', () => {
    const result = new BindingResult('javaBean', {});
    expect(result.toString()).toBe(
      'org.springframework.validation.BeanPropertyBindingResult: 0 errors',
    );
    result.rejectValue('name', 'NotEmpty', 'may not be empty', '');
    expect(result.toString()).toBe(
      'org.springframework.validation.BeanPropertyBindingResult: 1 errors',
    );
    expect(result.hasFieldErrors('name')).toBe(true);
    expect(result.getFieldError('name')!.defaultMessage).toBe('may not be empty');
  });
});

describe('AjaxUtils', () => {
  test('readsTheXRequestedWithHeader', () => {
    const headers = new HttpHeaders();
    headers.set('X-Requested-With', 'XMLHttpRequest');
    expect(AjaxUtils.isAjaxRequest(request({ headers }))).toBe(true);
    expect(AjaxUtils.isAjaxRequest(request())).toBe(false);
  });

  test('readsTheAjaxUploadParameterTheUploadFormAdds', () => {
    expect(
      AjaxUtils.isAjaxUploadRequest(request({ parameters: new Map([['ajaxUpload', ['true']]]) })),
    ).toBe(true);
    expect(AjaxUtils.isAjaxUploadRequest(request())).toBe(false);
  });
});
