"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const ttl_cache_1 = require("./ttl-cache");
(0, node_test_1.default)("expires cached values after the configured TTL", () => {
    let now = 1_000;
    const cache = new ttl_cache_1.TtlCache({
        ttlMs: 100,
        maxEntries: 10,
        now: () => now,
    });
    cache.set("track", "result");
    strict_1.default.equal(cache.get("track"), "result");
    now += 100;
    strict_1.default.equal(cache.get("track"), undefined);
});
(0, node_test_1.default)("evicts the least recently used value at capacity", () => {
    const cache = new ttl_cache_1.TtlCache({ ttlMs: 1_000, maxEntries: 2 });
    cache.set("first", "one");
    cache.set("second", "two");
    strict_1.default.equal(cache.get("first"), "one");
    cache.set("third", "three");
    strict_1.default.equal(cache.get("second"), undefined);
    strict_1.default.equal(cache.get("first"), "one");
    strict_1.default.equal(cache.get("third"), "three");
});
(0, node_test_1.default)("coalesces concurrent cache misses and does not cache failures", async () => {
    const cache = new ttl_cache_1.TtlCache({ ttlMs: 1_000, maxEntries: 10 });
    let calls = 0;
    const factory = async () => {
        calls += 1;
        await Promise.resolve();
        return "value";
    };
    const values = await Promise.all([
        cache.getOrCreate("same", factory),
        cache.getOrCreate("same", factory),
    ]);
    strict_1.default.deepEqual(values, ["value", "value"]);
    strict_1.default.equal(calls, 1);
    await strict_1.default.rejects(cache.getOrCreate("failure", async () => {
        throw new Error("failed");
    }));
    strict_1.default.equal(await cache.getOrCreate("failure", async () => "recovered"), "recovered");
});
