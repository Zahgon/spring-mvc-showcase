/**
 * `MockMvcResultMatchers` and the Hamcrest matchers the suite uses.
 *
 * Each one carries the failure message shape of its Java counterpart, so a
 * ported test that fails says the same thing the original would have said.
 */

import { expect } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { MediaType } from '../../src/framework/http/MediaType.js';
import type { MvcResult } from './MockMvc.js';

export type ValueMatcher<T> = (actual: T) => void;

export function startsWith(prefix: string): ValueMatcher<string> {
  return (actual) => {
    expect(actual.startsWith(prefix), `expected "${actual}" to start with "${prefix}"`).toBe(true);
  };
}

export function endsWith(suffix: string): ValueMatcher<string> {
  return (actual) => {
    expect(actual.endsWith(suffix), `expected "${actual}" to end with "${suffix}"`).toBe(true);
  };
}

export function containsString(fragment: string): ValueMatcher<string> {
  return (actual) => {
    expect(actual.includes(fragment), `expected "${actual}" to contain "${fragment}"`).toBe(true);
  };
}

export function status() {
  return {
    isOk: () => (result: MvcResult) => {
      expect(result.response.getStatus()).toBe(200);
    },
    isForbidden: () => (result: MvcResult) => {
      expect(result.response.getStatus()).toBe(403);
    },
    isMovedTemporarily: () => (result: MvcResult) => {
      expect(result.response.getStatus()).toBe(302);
    },
    isFound: () => (result: MvcResult) => {
      expect(result.response.getStatus()).toBe(302);
    },
  };
}

export function content() {
  return {
    string: (expected: string | ValueMatcher<string>) => (result: MvcResult) => {
      const actual = result.response.getContentAsString();
      if (typeof expected === 'string') {
        expect(actual).toBe(expected);
      } else {
        expected(actual);
      }
    },
    contentType: (expected: string | MediaType) => (result: MvcResult) => {
      expect(result.response.getContentType()).toBe(String(expected));
    },
    /**
     * `content().xml(...)`: XML equivalence, not string equality — whitespace
     * between elements and the XML declaration do not participate.
     */
    xml: (expected: string) => (result: MvcResult) => {
      expect(canonicalXml(result.response.getContentAsString())).toBe(canonicalXml(expected));
    },
  };
}

/**
 * `MockMvcResultMatchers.jsonPath`, restricted to the `$.property` expressions
 * the suite uses.
 */
export function jsonPath(expression: string) {
  return {
    value: (expected: unknown) => (result: MvcResult) => {
      const body: unknown = JSON.parse(result.response.getContentAsString());
      expect(evaluateJsonPath(body, expression)).toEqual(expected);
    },
  };
}

function evaluateJsonPath(body: unknown, expression: string): unknown {
  if (!expression.startsWith('$')) {
    throw new Error('unsupported JSONPath expression: ' + expression);
  }
  let current = body;
  for (const segment of expression.slice(1).split('.').filter((part) => part !== '')) {
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * `MockMvcResultMatchers.xpath`, restricted to the `/root/child` expressions
 * the suite uses.
 */
export function xpath(expression: string) {
  return {
    string: (expected: string) => (result: MvcResult) => {
      const document = new DOMParser().parseFromString(result.response.getContentAsString(), 'text/xml');
      expect(evaluateXPath(document as unknown as XmlNode, expression)).toBe(expected);
    },
  };
}

interface XmlNode {
  documentElement?: XmlNode | null;
  firstChild?: XmlNode | null;
  nextSibling?: XmlNode | null;
  nodeType?: number;
  localName?: string;
  nodeName?: string;
  textContent?: string | null;
}

function evaluateXPath(document: XmlNode, expression: string): string | null {
  const steps = expression.split('/').filter((step) => step !== '');
  let node: XmlNode | null | undefined = document.documentElement;
  if (node === null || node === undefined) {
    return null;
  }
  if ((node.localName ?? node.nodeName) !== steps[0]) {
    return null;
  }
  for (const step of steps.slice(1)) {
    let child: XmlNode | null | undefined = node.firstChild;
    let found: XmlNode | null = null;
    while (child !== null && child !== undefined) {
      if (child.nodeType === 1 && (child.localName ?? child.nodeName) === step) {
        found = child;
        break;
      }
      child = child.nextSibling;
    }
    if (found === null) {
      return null;
    }
    node = found;
  }
  return node.textContent ?? null;
}

/** Canonical form of an XML document, for the equivalence comparison. */
function canonicalXml(text: string): string {
  const document = new DOMParser().parseFromString(text.trim(), 'text/xml');
  const root = (document as unknown as { documentElement: XmlNode | null }).documentElement;
  return root === null ? '' : canonicalNode(root);
}

function canonicalNode(node: XmlNode): string {
  const name = node.localName ?? node.nodeName ?? '';
  const children: string[] = [];
  let text = '';
  let child = node.firstChild;
  while (child !== null && child !== undefined) {
    if (child.nodeType === 1) {
      children.push(canonicalNode(child));
    } else if (child.nodeType === 3) {
      text += child.textContent ?? '';
    }
    child = child.nextSibling;
  }
  const body = children.length > 0 ? children.join('') : text.trim();
  return '<' + name + '>' + body + '</' + name + '>';
}

/** `MockMvcResultMatchers.view()`. */
export function view() {
  return {
    name: (expected: string | ValueMatcher<string>) => (result: MvcResult) => {
      const actual = result.state.viewName ?? '';
      if (typeof expected === 'string') {
        expect(actual).toBe(expected);
      } else {
        expected(actual);
      }
    },
  };
}

/** `MockMvcResultMatchers.model()`. */
export function model() {
  return {
    attribute: (name: string, expected: unknown) => (result: MvcResult) => {
      expect(result.state.model.get(name)).toEqual(expected);
    },
    attributeExists: (name: string) => (result: MvcResult) => {
      expect(result.state.model.has(name)).toBe(true);
    },
    /** Spring counts only the attributes, not the BindingResult entries. */
    size: (expected: number) => (result: MvcResult) => {
      expect(modelAttributeNames(result).length).toBe(expected);
    },
    hasNoErrors: () => (result: MvcResult) => {
      for (const binding of result.state.bindingResults.values()) {
        expect(binding.getErrorCount()).toBe(0);
      }
    },
    errorCount: (expected: number) => (result: MvcResult) => {
      let total = 0;
      for (const binding of result.state.bindingResults.values()) {
        total += binding.getErrorCount();
      }
      expect(total).toBe(expected);
    },
    attributeHasFieldErrors: (name: string, ...fields: string[]) => (result: MvcResult) => {
      const binding = result.state.bindingResults.get(name);
      expect(binding, 'no BindingResult for "' + name + '"').toBeDefined();
      for (const field of fields) {
        expect(binding!.hasFieldErrors(field), 'expected a field error on "' + field + '"').toBe(true);
      }
    },
  };
}

function modelAttributeNames(result: MvcResult): string[] {
  return [...result.state.model.keys()].filter(
    (key) => !key.startsWith('org.springframework.validation.BindingResult.'),
  );
}

/** `MockMvcResultMatchers.redirectedUrl` and `forwardedUrl`. */
export function redirectedUrl(expected: string) {
  return (result: MvcResult) => {
    expect(result.response.getRedirectedUrl()).toBe(expected);
  };
}

export function forwardedUrl(expected: string) {
  return (result: MvcResult) => {
    expect(result.response.getForwardedUrl()).toBe(expected);
  };
}

/** `MockMvcResultMatchers.flash()`. */
export function flash() {
  return {
    attribute: (name: string, expected: unknown) => (result: MvcResult) => {
      expect(result.state.flashAttributes.get(name)).toEqual(expected);
    },
  };
}

/** `MockMvcResultMatchers.request()`. */
export function request() {
  return {
    asyncStarted: () => (result: MvcResult) => {
      expect(result.state.asyncStarted, 'expected async processing to have started').toBe(true);
    },
    /** Blocks on the eventual value, as the Java matcher does. */
    asyncResult:
      (expected: unknown | ValueMatcher<unknown>) =>
      async (result: MvcResult): Promise<void> => {
        const actual = await result.state.asyncResult;
        if (typeof expected === 'function') {
          (expected as ValueMatcher<unknown>)(actual);
        } else {
          expect(actual).toEqual(expected);
        }
      },
  };
}

/** Hamcrest's `instanceOf`. */
export function instanceOf(ctor: abstract new (...args: never[]) => object): ValueMatcher<unknown> {
  return (actual) => {
    expect(actual, 'expected an instance of ' + ctor.name).toBeInstanceOf(ctor);
  };
}
