import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrchestrionSearch,
  getOrchestrionSearch,
} from "./orchestrion-search";

test("stores an FFXIV-qualified orchestrion search", () => {
  const search = createOrchestrionSearch("Answers");

  assert.equal(search.name, "Answers");
  assert.equal(search.query, "Answers FINAL FANTASY XIV");
  assert.deepEqual(getOrchestrionSearch(search.token), search);
});
