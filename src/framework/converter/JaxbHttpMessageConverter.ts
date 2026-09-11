/**
 * `Jaxb2RootElementHttpMessageConverter`.
 *
 * JAXB's marshaller emits a `standalone="yes"` declaration, no whitespace
 * between elements, and no charset on the `Content-Type` — all three are
 * visible in the captured `/messageconverters/xml` response and in the
 * `content().xml(...)` assertions.
 */

import { DOMParser } from '@xmldom/xmldom';
import { MediaType } from '../http/MediaType.js';
import type { HttpServletRequest, HttpServletResponse } from '../http/Servlet.js';
import { beanMetadataOf, beanMetadataOfClass, propertyEntries } from '../bind/BeanMetadata.js';
import type { Declaration } from '../convert/TypeDescriptor.js';
import { applyDefaultHeaders, HttpMessageNotReadableException } from './HttpMessageConverter.js';
import type { HttpMessageConverter } from './HttpMessageConverter.js';

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

export class JaxbHttpMessageConverter implements HttpMessageConverter {
  readonly supportedMediaTypes = [
    MediaType.APPLICATION_XML,
    MediaType.parse('text/xml'),
    MediaType.parse('application/*+xml'),
  ];

  readonly setsContentLength = false;

  canWrite(value: unknown, mediaType: MediaType | null): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    if (beanMetadataOf(value)?.xmlRootElement === undefined) {
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
    const metadata = beanMetadataOf(value as object)!;
    let xml = XML_DECLARATION + '<' + metadata.xmlRootElement! + '>';
    for (const [property] of propertyEntries(metadata)) {
      const propertyValue = (value as Record<string, unknown>)[property];
      if (propertyValue === null || propertyValue === undefined) {
        continue;
      }
      xml += '<' + property + '>' + escapeXml(String(propertyValue)) + '</' + property + '>';
    }
    xml += '</' + metadata.xmlRootElement! + '>';
    const body = Buffer.from(xml, 'utf8');
    applyDefaultHeaders(response, this, contentType, body);
    response.write(body);
  }

  read(_target: string, request: HttpServletRequest, declaration?: unknown): unknown {
    const text = request.getInputStream().toString('utf8');
    const target = declaration as Declaration | undefined;
    if (target === undefined || target.type.kind !== 'bean') {
      throw new HttpMessageNotReadableException('No JAXB-bound type declared');
    }
    let document;
    try {
      document = new DOMParser().parseFromString(text, 'text/xml');
    } catch (cause) {
      throw new HttpMessageNotReadableException('Could not unmarshal to XML', { cause });
    }
    const root = document.documentElement;
    if (root === null) {
      throw new HttpMessageNotReadableException('Could not unmarshal to XML');
    }
    const instance = target.type.create();
    const metadata = beanMetadataOfClass(instance.constructor);
    if (metadata !== undefined) {
      for (const [property] of propertyEntries(metadata)) {
        const element = childElementText(root, property);
        if (element !== null) {
          (instance as Record<string, unknown>)[property] = element;
        }
      }
    }
    return instance;
  }
}

function childElementText(root: unknown, name: string): string | null {
  const parent = root as { firstChild: unknown };
  for (let child = parent.firstChild; child !== null && child !== undefined; ) {
    const node = child as { nodeType: number; localName?: string; nodeName: string; textContent: string | null; nextSibling: unknown };
    if (node.nodeType === 1 && (node.localName ?? node.nodeName) === name) {
      return node.textContent ?? '';
    }
    child = node.nextSibling;
  }
  return null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
