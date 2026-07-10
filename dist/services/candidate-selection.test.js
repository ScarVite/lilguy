"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const candidate_selection_1 = require("./candidate-selection");
(0, node_test_1.default)("stores alternative matches for the requesting user", () => {
    const selection = (0, candidate_selection_1.createCandidateSelection)("user-1", "spotify", "https://music.youtube.com/watch?v=source", {
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
    });
    strict_1.default.ok(selection);
    strict_1.default.equal(selection.candidates.length, 2);
    strict_1.default.equal((0, candidate_selection_1.getCandidateSelection)(selection.token)?.userId, "user-1");
    strict_1.default.equal(selection.candidates[0].title, "Primary");
});
(0, node_test_1.default)("does not allocate selection state without alternatives", () => {
    strict_1.default.equal((0, candidate_selection_1.createCandidateSelection)("user-1", "spotify", "https://example.com", {
        url: "https://open.spotify.com/track/primary",
        title: "Primary",
        type: "song",
        confidence: 0.95,
    }), undefined);
});
