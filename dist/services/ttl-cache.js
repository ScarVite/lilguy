"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtlCache = void 0;
class TtlCache {
    options;
    entries = new Map();
    inFlight = new Map();
    now;
    constructor(options) {
        this.options = options;
        if (options.ttlMs <= 0 || options.maxEntries <= 0) {
            throw new Error("TTL cache limits must be positive");
        }
        this.now = options.now ?? Date.now;
    }
    get(key) {
        const entry = this.entries.get(key);
        if (!entry)
            return undefined;
        if (entry.expiresAt <= this.now()) {
            this.entries.delete(key);
            return undefined;
        }
        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry.value;
    }
    set(key, value) {
        this.pruneExpired();
        this.entries.delete(key);
        this.entries.set(key, {
            value,
            expiresAt: this.now() + this.options.ttlMs,
        });
        while (this.entries.size > this.options.maxEntries) {
            const oldestKey = this.entries.keys().next().value;
            if (oldestKey === undefined)
                break;
            this.entries.delete(oldestKey);
        }
    }
    async getOrCreate(key, factory) {
        const cached = this.get(key);
        if (cached !== undefined)
            return cached;
        const existingRequest = this.inFlight.get(key);
        if (existingRequest)
            return existingRequest;
        const request = factory()
            .then((value) => {
            this.set(key, value);
            return value;
        })
            .finally(() => {
            this.inFlight.delete(key);
        });
        this.inFlight.set(key, request);
        return request;
    }
    clear() {
        this.entries.clear();
        this.inFlight.clear();
    }
    pruneExpired() {
        const now = this.now();
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= now)
                this.entries.delete(key);
        }
    }
}
exports.TtlCache = TtlCache;
