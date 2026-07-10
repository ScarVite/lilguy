import assert from "node:assert/strict";
import test from "node:test";
import {
  createCandidateSelection,
  getCandidateSelection,
} from "./candidate-selection";

test("stores alternative matches for the requesting user", () => {
  const selection = createCandidateSelection(
    "user-1",
    "spotify",
    "https://music.youtube.com/watch?v=source",
    {
      url: "https://open.spotify.com/track/primary",
      title: "Primary",
      type: "song",
      confidence: 0.95,
      alternatives: [
        {
          url: "https://open.spotify.com/track/alternative",
          title: "Alternative",
          type: "song",
          confidence: 0.8,
        },
      ],
    },
  );

  assert.ok(selection);
  assert.equal(selection.candidates.length, 2);
  assert.equal(getCandidateSelection(selection.token)?.userId, "user-1");
  assert.equal(selection.candidates[0].title, "Primary");
});

test("does not allocate selection state without alternatives", () => {
  assert.equal(
    createCandidateSelection("user-1", "spotify", "https://example.com", {
      url: "https://open.spotify.com/track/primary",
      title: "Primary",
      type: "song",
      confidence: 0.95,
    }),
    undefined,
  );
});
