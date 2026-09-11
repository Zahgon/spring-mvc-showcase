/**
 * `MappingJackson2HttpMessageConverter`.
 *
 * Writes `application/json;charset=UTF-8` with the bean's properties in
 * declaration order, and sets no `Content-Length` — Jackson's converter
 * streams, so Spring leaves the length off, which the captured responses show.
 */

import { MediaType } from '../http/MediaType.js';
import type { HttpServletRequest, HttpServletResponse } from '../http/Servlet.js';
import { beanMetadataOf, beanMetadataOfClass, propertyEntries } from '../bind/BeanMetadata.js';
import type { Declaration } from '../convert/TypeDescriptor.js';
import { applyDefaultHeaders, type HttpMessageConverter } from './HttpMessageConverter.js';
import { HttpMessageNotReadableException } from './HttpMessageConverter.js';

export class JacksonHttpMessageConverter implements HttpMessageConverter {
  readonly supportedMediaTypes = [
    MediaType.APPLICATION_JSON,
    MediaType.parse('application/*+json'),
  ];

  readonly defaultCharset = 'UTF-8';

  readonly setsContentLength = false;

  canWrite(value: unknown, mediaType: MediaType | null): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    return mediaType === null || this.supportedMediaTypes.some((type) => type.isCompatibleWith(mediaType));
  }

  canRead(target: string, mediaType: MediaType | null): boolean {
    if (target !== 'bean') {
      return false;
    }
    return mediaType !== null && this.supportedMediaTypes.some((type) => type.includes(mediaType));
  }

  write(value: unknown, contentType: MediaType, response: HttpServletResponse): void {
    const body = Buffer.from(JSON.stringify(toJsonValue(value)), 'utf8');
    applyDefaultHeaders(response, this, contentType, body);
    response.write(body);
  }

  read(_target: string, request: HttpServletRequest, declaration?: unknown): unknown {
    const text = request.getInputStream().toString('utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (cause) {
      throw new HttpMessageNotReadableException('JSON parse error', { cause });
    }
    return bindJson(parsed, declaration as Declaration | undefined);
  }
}

/** Renders a bean the way Jackson does: declared properties, in order. */
function toJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((element) => toJsonValue(element));
  }
  if (typeof value !== 'object') {
    return value;
  }
  const metadata = beanMetadataOf(value);
  if (metadata === undefined) {
    return value;
  }
  const rendered: Record<string, unknown> = {};
  for (const property of Object.keys(metadata.properties)) {
    rendered[property] = toJsonValue((value as Record<string, unknown>)[property]);
  }
  return rendered;
}

/** Populates a declared bean from parsed JSON, coercing scalars as Jackson does. */
function bindJson(parsed: unknown, declaration: Declaration | undefined): unknown {
  if (declaration === undefined || declaration.type.kind !== 'bean') {
    return parsed;
  }
  const instance = declaration.type.create();
  const metadata = beanMetadataOfClass(instance.constructor);
  if (metadata === undefined || typeof parsed !== 'object' || parsed === null) {
    return instance;
  }
  for (const [property, propertyDeclaration] of propertyEntries(metadata)) {
    const raw = (parsed as Record<string, unknown>)[property];
    if (raw === undefined) {
      continue;
    }
    (instance as Record<string, unknown>)[property] =
      propertyDeclaration.type.kind === 'bean'
        ? bindJson(raw, propertyDeclaration)
        : coerceScalar(raw, propertyDeclaration);
  }
  return instance;
}

function coerceScalar(raw: unknown, declaration: Declaration): unknown {
  switch (declaration.type.kind) {
    case 'string':
      return typeof raw === 'string' ? raw : String(raw);
    case 'integer':
    case 'long':
      return typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
    case 'boolean':
      return typeof raw === 'boolean' ? raw : String(raw) === 'true';
    default:
      return raw;
  }
}
