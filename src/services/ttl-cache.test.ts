import assert from "node:assert/strict";
import test from "node:test";
import { TtlCache } from "./ttl-cache";

test("expires cached values after the configured TTL", () => {
  let now = 1_000;
  const cache = new TtlCache<string, string>({
    ttlMs: 100,
    maxEntries: 10,
    now: () => now,
  });

  cache.set("track", "result");
  assert.equal(cache.get("track"), "result");

  now += 100;
  assert.equal(cache.get("track"), undefined);
});

test("evicts the least recently used value at capacity", () => {
  const cache = new TtlCache<string, string>({ ttlMs: 1_000, maxEntries: 2 });

  cache.set("first", "one");
  cache.set("second", "two");
  assert.equal(cache.get("first"), "one");
  cache.set("third", "three");

  assert.equal(cache.get("second"), undefined);
  assert.equal(cache.get("first"), "one");
  assert.equal(cache.get("third"), "three");
});

test("coalesces concurrent cache misses and does not cache failures", async () => {
  const cache = new TtlCache<string, string>({ ttlMs: 1_000, maxEntries: 10 });
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

  assert.deepEqual(values, ["value", "value"]);
  assert.equal(calls, 1);

  await assert.rejects(
    cache.getOrCreate("failure", async () => {
      throw new Error("failed");
    }),
  );
  assert.equal(
    await cache.getOrCreate("failure", async () => "recovered"),
    "recovered",
  );
});
