/** `org.springframework.util.LinkedMultiValueMap`, as `writeForm` returns. */
export class LinkedMultiValueMap<K, V> {
  private readonly entries = new Map<K, V[]>();

  add(key: K, value: V): void {
    const existing = this.entries.get(key);
    if (existing === undefined) {
      this.entries.set(key, [value]);
    } else {
      existing.push(value);
    }
  }

  get(key: K): V[] | undefined {
    return this.entries.get(key);
  }

  getFirst(key: K): V | undefined {
    return this.entries.get(key)?.[0];
  }

  keys(): K[] {
    return [...this.entries.keys()];
  }

  [Symbol.iterator](): IterableIterator<[K, V[]]> {
    return this.entries[Symbol.iterator]();
  }
}
