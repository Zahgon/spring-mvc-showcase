/**
 * `org.springframework.util.AntPathMatcher`, plus the pattern combination
 * `RequestMappingInfo` performs between a class-level and a method-level
 * mapping.
 *
 * Three behaviours are load-bearing here and none is obvious. A class-level
 * pattern ending in a wildcard segment has that segment REPLACED by the
 * method-level pattern rather than extended by it. A single asterisk matches
 * within one path segment only. And suffix pattern matching lets
 * `/mapping/produces` match `/mapping/produces.json`, which is what makes the
 * two path-extension tests select different handlers.
 */

export interface PathMatch {
  readonly uriVariables: Map<string, string>;
  /** The `json` in `/mapping/produces.json`, when matched by suffix. */
  readonly extension: string | null;
}

/** `AntPathMatcher.combine(first, second)`. */
export function combinePatterns(first: string, second: string): string {
  if (first === '' && second === '') {
    return '';
  }
  if (first === '') {
    return second;
  }
  if (second === '') {
    return first;
  }
  if (first !== second && !first.includes('{') && matchPath(first, second) !== null) {
    return second;
  }
  if (first.endsWith('/*')) {
    return concat(first.slice(0, -2), second);
  }
  if (first.endsWith('/**')) {
    return concat(first.slice(0, -3), second);
  }
  return concat(first, second);
}

function concat(first: string, second: string): string {
  const firstEnds = first.endsWith('/');
  const secondStarts = second.startsWith('/');
  if (firstEnds && secondStarts) {
    return first + second.slice(1);
  }
  if (firstEnds || secondStarts) {
    return first + second;
  }
  return first + '/' + second;
}

function segmentRegex(segment: string): string {
  let source = '';
  for (let i = 0; i < segment.length; i++) {
    const character = segment[i]!;
    if (character === '*') {
      source += '[^/]*';
    } else if (character === '?') {
      source += '[^/]';
    } else if (character === '{') {
      const close = segment.indexOf('}', i);
      const inner = segment.slice(i + 1, close);
      const colon = inner.indexOf(':');
      const name = colon < 0 ? inner : inner.slice(0, colon);
      const pattern = colon < 0 ? '[^/]+' : inner.slice(colon + 1);
      source += '(?<' + name.replace(/[^0-9A-Za-z_]/g, '_') + '>' + pattern + ')';
      i = close;
    } else {
      source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return source;
}

function toRegexSource(pattern: string): string {
  const segments = pattern.split('/');
  let source = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    if (segment === '**') {
      source += '(?:/.*)?';
      continue;
    }
    if (i > 0) {
      source += '/';
    }
    source += segmentRegex(segment);
  }
  return source;
}

const CACHE = new Map<string, RegExp>();

function regexFor(pattern: string): RegExp {
  let regex = CACHE.get(pattern);
  if (regex === undefined) {
    regex = new RegExp('^' + toRegexSource(pattern) + '$');
    CACHE.set(pattern, regex);
  }
  return regex;
}

/** Matches a lookup path against a pattern, extracting the URI variables. */
export function matchPath(pattern: string, path: string): PathMatch | null {
  const direct = regexFor(pattern).exec(path);
  if (direct !== null) {
    return { uriVariables: toVariables(direct), extension: null };
  }
  // Suffix pattern matching: `/mapping/produces` also matches
  // `/mapping/produces.json`, and the extension drives content negotiation.
  const lastSlash = path.lastIndexOf('/');
  const dot = path.indexOf('.', lastSlash + 1);
  if (dot >= 0 && !pattern.includes('.') && !pattern.endsWith('*')) {
    const suffixed = regexFor(pattern).exec(path.slice(0, dot));
    if (suffixed !== null) {
      return { uriVariables: toVariables(suffixed), extension: path.slice(dot + 1) };
    }
  }
  return null;
}

function toVariables(match: RegExpExecArray): Map<string, string> {
  const variables = new Map<string, string>();
  for (const [name, value] of Object.entries(match.groups ?? {})) {
    if (value !== undefined) {
      variables.set(name, value);
    }
  }
  return variables;
}

/**
 * `AntPatternComparator`, reduced to what ranks these mappings: a pattern with
 * no wildcard beats one with a wildcard, and more literal characters win.
 */
export function comparePatterns(left: string, right: string): number {
  const score = (pattern: string): number =>
    (pattern.includes('**') ? 100 : 0) +
    (pattern.includes('*') ? 10 : 0) +
    (pattern.match(/\{/g) ?? []).length;
  const difference = score(left) - score(right);
  return difference !== 0 ? difference : right.length - left.length;
}
