"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MATCH_SELECTION_CUSTOM_ID_PREFIX = void 0;
exports.createCandidateSelection = createCandidateSelection;
exports.getCandidateSelection = getCandidateSelection;
const node_crypto_1 = require("node:crypto");
const ttl_cache_1 = require("./ttl-cache");
exports.MATCH_SELECTION_CUSTOM_ID_PREFIX = "music-match:";
const selections = new ttl_cache_1.TtlCache({
    ttlMs: 15 * 60 * 1_000,
    maxEntries: 500,
});
function createCandidateSelection(userId, target, sourceUrl, result) {
    if (!result.alternatives?.length)
        return undefined;
    const { alternatives, ...primary } = result;
    const selection = {
        token: (0, node_crypto_1.randomUUID)(),
        userId,
        target,
        sourceUrl,
        candidates: [primary, ...alternatives],
    };
    selections.set(selection.token, selection);
    return selection;
}
function getCandidateSelection(token) {
    return selections.get(token);
}
