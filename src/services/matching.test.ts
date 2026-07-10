import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMusicText, selectBestMatch } from "./matching";

test("normalizes punctuation, accents, and ampersands", () => {
  assert.equal(normalizeMusicText("Beyoncé & JAY-Z"), "beyonce and jay z");
  assert.equal(normalizeMusicText("メーンテーマ"), "メーンテーマ");
});

test("prefers the matching studio version over a live version", () => {
  const candidates = [
    { title: "Answers (Live)", artist: "Susan Calloway", durationMs: 430_000 },
    { title: "Answers", artist: "Susan Calloway", durationMs: 425_000 },
  ];

  const result = selectBestMatch(
    { title: "Answers", artist: "Susan Calloway", durationMs: 425_500 },
    candidates,
    (candidate) => candidate,
  );

  assert.equal(result?.candidate.title, "Answers");
  assert.ok((result?.score ?? 0) > 0.9);
});

test("rejects unrelated candidates below the confidence threshold", () => {
  const result = selectBestMatch(
    { title: "To the Edge", artist: "Masayoshi Soken" },
    [{ title: "Sunrise", artist: "Norah Jones" }],
    (candidate) => candidate,
  );

  assert.equal(result, null);
});

test("does not mistake substrings for live-version markers", () => {
  const result = selectBestMatch(
    { title: "Oliver", artist: "Example Artist" },
    [{ title: "Oliver", artist: "Example Artist" }],
    (candidate) => candidate,
  );

  assert.equal(result?.score, 1);
});

test("rejects an exact title credited to an unrelated artist", () => {
  const result = selectBestMatch(
    { title: "Home", artist: "Amanda Achen" },
    [{ title: "Home", artist: "Edward Sharpe" }],
    (candidate) => candidate,
  );

  assert.equal(result, null);
});
