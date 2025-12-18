// Type declarations for @alloc packages to prevent TypeScript from looking for implicit type library
declare module '@alloc/quick-lru' {
  export default class QuickLRU<K, V> {
    constructor(options?: {
      maxSize?: number;
      onEviction?: (key: K, value: V) => void;
    });
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size: number;
  }
}
