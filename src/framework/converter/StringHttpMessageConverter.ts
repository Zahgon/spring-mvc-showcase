/**
 * `org.springframework.http.converter.StringHttpMessageConverter`.
 *
 * Its default charset is ISO-8859-1, which is why every plain `String` return
 * value in the showcase comes back as `text/plain;charset=ISO-8859-1` — four
 * tests assert that header verbatim.
 */

import { MediaType } from '../http/MediaType.js';
import { nodeCharset, type HttpServletRequest, type HttpServletResponse } from '../http/Servlet.js';
import { applyDefaultHeaders, type HttpMessageConverter } from './HttpMessageConverter.js';

export class StringHttpMessageConverter implements HttpMessageConverter {
  readonly supportedMediaTypes = [MediaType.TEXT_PLAIN, MediaType.ALL];

  readonly defaultCharset = 'ISO-8859-1';

  canWrite(value: unknown, _mediaType: MediaType | null): boolean {
    return typeof value === 'string';
  }

  canRead(target: string, _mediaType: MediaType | null): boolean {
    return target === 'string';
  }

  write(value: unknown, contentType: MediaType, response: HttpServletResponse): void {
    const charset = contentType.getCharset() ?? this.defaultCharset;
    const body = Buffer.from(String(value), nodeCharset(charset));
    applyDefaultHeaders(response, this, contentType, body);
    response.write(body);
  }

  read(_target: string, request: HttpServletRequest, _declaration?: unknown): unknown {
    const charset = request.getCharacterEncoding() ?? this.defaultCharset;
    return request.getInputStream().toString(nodeCharset(charset));
  }
}
