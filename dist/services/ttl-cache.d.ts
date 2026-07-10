export interface TtlCacheOptions {
    ttlMs: number;
    maxEntries: number;
    now?: () => number;
}
export declare class TtlCache<K, V> {
    private readonly options;
    private readonly entries;
    private readonly inFlight;
    private readonly now;
    constructor(options: TtlCacheOptions);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    getOrCreate(key: K, factory: () => Promise<V>): Promise<V>;
    clear(): void;
    private pruneExpired;
}
