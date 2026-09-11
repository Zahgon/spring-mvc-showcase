/**
 * The `java.lang.Object` renderings that reach a response body.
 *
 * `Object.toString()` is `getClass().getName() + "@" + Integer.toHexString(hashCode())`.
 * Three tests assert the fully-qualified class name with `startsWith`, so the
 * name is contract; the identity hash is not, and is a stable per-object
 * counter here rather than a JVM address.
 */

const IDENTITY_HASHES = new WeakMap<object, number>();
let identitySeed = 0x2b3c4d5e;

export function identityHashCode(value: object): number {
  let hash = IDENTITY_HASHES.get(value);
  if (hash === undefined) {
    identitySeed = (Math.imul(identitySeed, 1664525) + 1013904223) | 0;
    // Java renders the identity hash with Integer.toHexString, which for a JVM
    // address is eight hex digits. The value cannot be reproduced, but the
    // width can, and Content-Length depends on it.
    // Integer.toHexString treats the value as unsigned, so it never carries a
    // sign, and for a JVM address it is eight hex digits wide.
    hash = (((identitySeed >>> 0) | 0x10000000) >>> 0);
    IDENTITY_HASHES.set(value, hash);
  }
  return hash;
}

const CLASS_NAMES = new WeakMap<object, string>();

/** Records the fully-qualified name a class had in the original. */
export function JavaClass(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function decorate<T extends abstract new (...args: any[]) => object>(ctor: T): T {
    CLASS_NAMES.set(ctor, name);
    return ctor;
  };
}

export function className(value: object): string {
  const ctor: unknown = (value as { constructor?: unknown }).constructor;
  const declared = typeof ctor === 'object' || typeof ctor === 'function' ? CLASS_NAMES.get(ctor as object) : undefined;
  return declared ?? (value.constructor as { name: string }).name;
}

/** `Object.toString()`. */
export function objectToString(value: object): string {
  return className(value) + '@' + identityHashCode(value).toString(16);
}

/**
 * `String.valueOf(Object)`: how Java renders a value spliced into a string.
 * `null` becomes `null`, a `List` becomes `[a, b]`, a `Map` becomes `{k=v}`.
 */
export function stringValueOf(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return '[' + value.map((element) => stringValueOf(element)).join(', ') + ']';
  }
  if (value instanceof Map) {
    const rendered = [...value].map(([key, entry]) => stringValueOf(key) + '=' + stringValueOf(entry));
    return '{' + rendered.join(', ') + '}';
  }
  if (typeof value === 'object') {
    const candidate = value as { toString?: () => string };
    if (candidate.toString !== undefined && candidate.toString !== Object.prototype.toString) {
      return candidate.toString();
    }
    return objectToString(value);
  }
  return String(value);
}
