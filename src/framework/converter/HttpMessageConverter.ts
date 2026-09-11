/**
 * `org.springframework.http.converter.HttpMessageConverter` and the negotiation
 * `AbstractMessageConverterMethodProcessor` performs around it.
 *
 * The negotiation is what decides the `Content-Type` of every response body in
 * the showcase, so its steps are reproduced rather than guessed: intersect what
 * the handler can produce with what the request asked for, sort by specificity
 * and quality, take the first concrete type, drop its `q`, and let the
 * converter add its default charset if the type carries none.
 */

import { HttpHeaders } from '../http/HttpHeaders.js';
import { MediaType } from '../http/MediaType.js';
import type { HttpServletRequest, HttpServletResponse } from '../http/Servlet.js';

export interface HttpMessageConverter {
  readonly supportedMediaTypes: readonly MediaType[];
  /** The charset appended when the negotiated type carries none. */
  readonly defaultCharset?: string;
  /**
   * Whether the converter reports a content length. Only the String and form
   * converters do; the streaming ones leave the header off, exactly as the
   * captured responses show.
   */
  readonly setsContentLength?: boolean;
  canWrite(value: unknown, mediaType: MediaType | null): boolean;
  canRead(target: string, mediaType: MediaType | null): boolean;
  write(value: unknown, contentType: MediaType, response: HttpServletResponse): void;
  read(target: string, request: HttpServletRequest, declaration?: unknown): unknown;
}

export class HttpMediaTypeNotAcceptableException extends Error {
  constructor() {
    super('Could not find acceptable representation');
  }
}

/** The request's `Content-Type` is one no handler declares it consumes. */
export class HttpMediaTypeNotSupportedException extends Error {
  constructor(readonly contentType: string | null) {
    super("Content type '" + (contentType ?? '') + "' not supported");
  }
}

/** The path matched, the method did not. Answers carry an `Allow` header. */
export class HttpRequestMethodNotSupportedException extends Error {
  constructor(
    readonly method: string,
    readonly supportedMethods: readonly string[],
  ) {
    super("Request method '" + method + "' not supported");
  }
}

export class HttpMessageNotReadableException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** `AbstractHttpMessageConverter.addDefaultHeaders`. */
export function applyDefaultHeaders(
  response: HttpServletResponse,
  converter: HttpMessageConverter,
  contentType: MediaType,
  body: Buffer,
): void {
  if (!response.containsHeader(HttpHeaders.CONTENT_TYPE)) {
    let resolved = contentType;
    if (resolved.isWildcardType() || resolved.isWildcardSubtype()) {
      resolved = converter.supportedMediaTypes[0] ?? MediaType.APPLICATION_OCTET_STREAM;
    }
    if (resolved.getCharset() === null && converter.defaultCharset !== undefined) {
      resolved = resolved.withCharset(converter.defaultCharset);
    }
    response.setContentType(resolved.toString());
  }
  if ((converter.setsContentLength ?? true) && response.headers.getContentLength() < 0) {
    response.setContentLength(body.length);
  }
}

/**
 * `AbstractMessageConverterMethodProcessor.writeWithMessageConverters`.
 *
 * `producible` is the handler's `produces` condition, empty when it has none.
 */
export function writeWithMessageConverters(
  value: unknown,
  converters: readonly HttpMessageConverter[],
  requested: readonly MediaType[],
  producible: readonly MediaType[],
  response: HttpServletResponse,
): void {
  const producibleTypes =
    producible.length > 0
      ? [...producible]
      : converters
          .filter((converter) => converter.canWrite(value, null))
          .flatMap((converter) => [...converter.supportedMediaTypes]);

  const compatible: MediaType[] = [];
  for (const accept of requested) {
    for (const produce of producibleTypes) {
      if (accept.isCompatibleWith(produce)) {
        compatible.push(mostSpecific(accept, produce));
      }
    }
  }
  if (compatible.length === 0) {
    throw new HttpMediaTypeNotAcceptableException();
  }

  const sorted = MediaType.sortBySpecificityAndQuality(compatible);
  const selected = sorted.find((type) => type.isConcrete()) ?? sorted[0]!;
  const contentType = selected.removeQualityValue();

  for (const converter of converters) {
    if (converter.canWrite(value, contentType)) {
      converter.write(value, contentType, response);
      return;
    }
  }
  throw new HttpMediaTypeNotAcceptableException();
}

/** `MediaType.getMostSpecific`: the concrete side of an `Accept`/`produces` pair. */
function mostSpecific(accept: MediaType, produce: MediaType): MediaType {
  if (accept.isWildcardType() || accept.isWildcardSubtype()) {
    return produce.getCharset() === null && accept.getCharset() !== null
      ? produce.withCharset(accept.getCharset()!)
      : produce;
  }
  if (produce.isWildcardType() || produce.isWildcardSubtype()) {
    return accept;
  }
  // Both concrete: keep the accepted one, which is what carries a charset.
  return accept.parameters.size >= produce.parameters.size ? accept : produce;
}
