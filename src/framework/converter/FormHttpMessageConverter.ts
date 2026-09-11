/**
 * `FormHttpMessageConverter`, write side.
 *
 * Serialises a `MultiValueMap` as `foo=bar&fruit=apple` and, unlike the
 * streaming converters, does report a `Content-Length` — which the captured
 * response confirms.
 */

import { MediaType } from '../http/MediaType.js';
import type { HttpServletRequest, HttpServletResponse } from '../http/Servlet.js';
import { LinkedMultiValueMap } from '../util/MultiValueMap.js';
import { applyDefaultHeaders, type HttpMessageConverter } from './HttpMessageConverter.js';

export class FormHttpMessageConverter implements HttpMessageConverter {
  readonly supportedMediaTypes = [MediaType.APPLICATION_FORM_URLENCODED];

  canWrite(value: unknown, mediaType: MediaType | null): boolean {
    if (!(value instanceof LinkedMultiValueMap)) {
      return false;
    }
    return mediaType === null || this.supportedMediaTypes.some((type) => type.isCompatibleWith(mediaType));
  }

  canRead(_target: string, _mediaType: MediaType | null): boolean {
    // The showcase reads form data through parameter binding, not the converter.
    return false;
  }

  write(value: unknown, contentType: MediaType, response: HttpServletResponse): void {
    const map = value as LinkedMultiValueMap<string, string>;
    const parts: string[] = [];
    for (const [name, values] of map) {
      for (const single of values) {
        parts.push(encodeFormComponent(name) + '=' + encodeFormComponent(single));
      }
    }
    const body = Buffer.from(parts.join('&'), 'utf8');
    applyDefaultHeaders(response, this, contentType, body);
    response.write(body);
  }

  read(_target: string, _request: HttpServletRequest): unknown {
    throw new Error('form data is read through parameter binding');
  }
}

/** `URLEncoder.encode`, which writes a space as `+`. */
function encodeFormComponent(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}
