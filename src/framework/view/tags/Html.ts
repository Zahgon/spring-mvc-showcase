/**
 * `org.springframework.web.util.HtmlUtils` and the JSTL core tags the views
 * use. The JSPs are translated into TypeScript rather than interpreted, so
 * each tag becomes a function that emits exactly the markup the tag emitted.
 */

/** `HtmlUtils.htmlEscape`, over the characters the views actually carry. */
export function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * `<c:url value="..."/>`. A context-relative value is prefixed with the
 * context path; the container would also append `;jsessionid=...` while it is
 * still unsure the client keeps cookies, which is container state rather than
 * application behaviour.
 */
export function url(contextPath: string, value: string): string {
  return value.startsWith('/') ? contextPath + value : value;
}

/**
 * `<c:out value="..."/>`, which escapes by default. JSTL writes numeric
 * character references where Spring's `HtmlUtils` writes named ones, so an
 * apostrophe comes out as `&#039;` here and as `&#39;` from a form tag.
 */
export function out(value: unknown): string {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#034;')
    .replace(/'/g, '&#039;');
}

/**
 * EL's rendering of a value: `null` is the empty string, everything else is
 * its `toString`. `${expr}` interpolates without escaping.
 */
export function text(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/** `${a.b}` — a missing base yields the empty string rather than an error. */
export function property(base: unknown, name: string): unknown {
  if (base === null || base === undefined) {
    return null;
  }
  const getter = 'get' + name.charAt(0).toUpperCase() + name.slice(1);
  const holder = base as Record<string, unknown>;
  if (typeof holder[getter] === 'function') {
    return (holder[getter] as () => unknown)();
  }
  return holder[name] ?? null;
}

/** EL's `not empty`: null, the empty string and empty collections are empty. */
export function notEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size > 0;
  }
  return true;
}

/** EL's coercion to boolean, which treats a missing value as false. */
export function truthy(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === 'true';
  }
  return value !== null && value !== undefined && value !== false;
}
