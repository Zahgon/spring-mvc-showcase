/**
 * `AtomFeedHttpMessageConverter` and `RssChannelHttpMessageConverter`.
 *
 * Both write `charset=UTF-8` on the content type, neither reports a content
 * length, and each ends with exactly one newline after the closing element —
 * all three confirmed against the captured responses.
 */

import { DOMParser } from '@xmldom/xmldom';
import { MediaType } from '../http/MediaType.js';
import type { HttpServletRequest, HttpServletResponse } from '../http/Servlet.js';
import { Channel, Feed } from '../feed/Feed.js';
import { applyDefaultHeaders, HttpMessageNotReadableException } from './HttpMessageConverter.js';
import type { HttpMessageConverter } from './HttpMessageConverter.js';

const DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';

export class AtomFeedHttpMessageConverter implements HttpMessageConverter {
  readonly supportedMediaTypes = [MediaType.APPLICATION_ATOM_XML];

  readonly defaultCharset = 'UTF-8';

  readonly setsContentLength = false;

  canWrite(value: unknown, mediaType: MediaType | null): boolean {
    if (!(value instanceof Feed)) {
      return false;
    }
    return mediaType === null || this.supportedMediaTypes.some((type) => type.isCompatibleWith(mediaType));
  }

  canRead(target: string, mediaType: MediaType | null): boolean {
    return (
      target === 'feed' && mediaType !== null && this.supportedMediaTypes.some((type) => type.includes(mediaType))
    );
  }

  write(value: unknown, contentType: MediaType, response: HttpServletResponse): void {
    const feed = value as Feed;
    const xml =
      DECLARATION +
      '<feed xmlns="http://www.w3.org/2005/Atom">\n' +
      '  <title>' +
      escapeXml(feed.getTitle()) +
      '</title>\n' +
      '</feed>\n';
    const body = Buffer.from(xml, 'utf8');
    applyDefaultHeaders(response, this, contentType, body);
    response.write(body);
  }

  read(_target: string, request: HttpServletRequest): unknown {
    const feed = new Feed();
    feed.setTitle(readElementText(request.getInputStream().toString('utf8'), 'title'));
    return feed;
  }
}

export class RssChannelHttpMessageConverter implements HttpMessageConverter {
  readonly supportedMediaTypes = [MediaType.APPLICATION_RSS_XML];

  readonly defaultCharset = 'UTF-8';

  readonly setsContentLength = false;

  canWrite(value: unknown, mediaType: MediaType | null): boolean {
    if (!(value instanceof Channel)) {
      return false;
    }
    return mediaType === null || this.supportedMediaTypes.some((type) => type.isCompatibleWith(mediaType));
  }

  canRead(target: string, mediaType: MediaType | null): boolean {
    return (
      target === 'channel' &&
      mediaType !== null &&
      this.supportedMediaTypes.some((type) => type.includes(mediaType))
    );
  }

  write(value: unknown, contentType: MediaType, response: HttpServletResponse): void {
    const channel = value as Channel;
    const xml =
      DECLARATION +
      '<rss version="2.0">\n' +
      '  <channel>\n' +
      '    <title>' +
      escapeXml(channel.getTitle()) +
      '</title>\n' +
      '    <link>' +
      escapeXml(channel.getLink()) +
      '</link>\n' +
      '    <description>' +
      escapeXml(channel.getDescription()) +
      '</description>\n' +
      '  </channel>\n' +
      '</rss>\n';
    const body = Buffer.from(xml, 'utf8');
    applyDefaultHeaders(response, this, contentType, body);
    response.write(body);
  }

  read(_target: string, request: HttpServletRequest): unknown {
    const channel = new Channel();
    channel.setTitle(readElementText(request.getInputStream().toString('utf8'), 'title'));
    return channel;
  }
}

function readElementText(xml: string, name: string): string {
  let document;
  try {
    document = new DOMParser().parseFromString(xml, 'text/xml');
  } catch (cause) {
    throw new HttpMessageNotReadableException('Could not read feed', { cause });
  }
  const elements = (document as unknown as { getElementsByTagName(tag: string): { length: number; item(i: number): { textContent: string | null } | null } }).getElementsByTagName(name);
  const first = elements.length > 0 ? elements.item(0) : null;
  return first?.textContent ?? '';
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
