"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const matching_1 = require("./matching");
(0, node_test_1.default)("normalizes punctuation, accents, and ampersands", () => {
    strict_1.default.equal((0, matching_1.normalizeMusicText)("Beyoncé & JAY-Z"), "beyonce and jay z");
    strict_1.default.equal((0, matching_1.normalizeMusicText)("メーンテーマ"), "メーンテーマ");
});
(0, node_test_1.default)("prefers the matching studio version over a live version", () => {
    const candidates = [
        { title: "Answers (Live)", artist: "Susan Calloway", durationMs: 430_000 },
        { title: "Answers", artist: "Susan Calloway", durationMs: 425_000 },
    ];
    const result = (0, matching_1.selectBestMatch)({ title: "Answers", artist: "Susan Calloway", durationMs: 425_500 }, candidates, (candidate) => candidate);
    strict_1.default.equal(result?.candidate.title, "Answers");
    strict_1.default.ok((result?.score ?? 0) > 0.9);
});
(0, node_test_1.default)("rejects unrelated candidates below the confidence threshold", () => {
    const result = (0, matching_1.selectBestMatch)({ title: "To the Edge", artist: "Masayoshi Soken" }, [{ title: "Sunrise", artist: "Norah Jones" }], (candidate) => candidate);
    strict_1.default.equal(result, null);
});
(0, node_test_1.default)("does not mistake substrings for live-version markers", () => {
    const result = (0, matching_1.selectBestMatch)({ title: "Oliver", artist: "Example Artist" }, [{ title: "Oliver", artist: "Example Artist" }], (candidate) => candidate);
    strict_1.default.equal(result?.score, 1);
});
(0, node_test_1.default)("rejects an exact title credited to an unrelated artist", () => {
    const result = (0, matching_1.selectBestMatch)({ title: "Home", artist: "Amanda Achen" }, [{ title: "Home", artist: "Edward Sharpe" }], (candidate) => candidate);
    strict_1.default.equal(result, null);
});
