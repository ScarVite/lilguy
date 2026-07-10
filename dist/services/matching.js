"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMusicText = normalizeMusicText;
exports.similarity = similarity;
exports.scoreMatch = scoreMatch;
exports.rankMatches = rankMatches;
exports.selectBestMatch = selectBestMatch;
const VERSION_MARKERS = [
    "acoustic",
    "edit",
    "instrumental",
    "karaoke",
    "live",
    "mono",
    "remaster",
    "remastered",
    "remix",
];
function normalizeMusicText(value) {
    return (value ?? "")
        .normalize("NFKD")
        .replace(/(?<=[A-Za-z])\p{Mark}+/gu, "")
        .normalize("NFC")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replace(/\s+/g, " ");
}
function similarity(left, right) {
    const normalizedLeft = normalizeMusicText(left);
    const normalizedRight = normalizeMusicText(right);
    if (!normalizedLeft || !normalizedRight)
        return 0;
    if (normalizedLeft === normalizedRight)
        return 1;
    const leftTokens = new Set(normalizedLeft.split(" "));
    const rightTokens = new Set(normalizedRight.split(" "));
    const intersection = [...leftTokens].filter((token) => rightTokens.has(token));
    const union = new Set([...leftTokens, ...rightTokens]);
    return union.size === 0 ? 0 : intersection.length / union.size;
}
function scoreMatch(source, candidate) {
    const titleScore = similarity(source.title, candidate.title);
    const artistScore = similarity(source.artist, candidate.artist);
    let weightedScore = titleScore * 0.6;
    let totalWeight = 0.6;
    if (source.artist && candidate.artist) {
        weightedScore += artistScore * 0.25;
        totalWeight += 0.25;
    }
    if (source.album && candidate.album) {
        weightedScore += similarity(source.album, candidate.album) * 0.08;
        totalWeight += 0.08;
    }
    if (source.durationMs && candidate.durationMs) {
        const difference = Math.abs(source.durationMs - candidate.durationMs);
        const durationScore = Math.max(0, 1 - difference / 30_000);
        weightedScore += durationScore * 0.07;
        totalWeight += 0.07;
    }
    const sourceTitle = normalizeMusicText(source.title);
    const candidateTitle = normalizeMusicText(candidate.title);
    const sourceTitleTokens = new Set(sourceTitle.split(" "));
    const candidateTitleTokens = new Set(candidateTitle.split(" "));
    const versionMismatch = VERSION_MARKERS.some((marker) => sourceTitleTokens.has(marker) !== candidateTitleTokens.has(marker));
    const artistMismatch = Boolean(source.artist && candidate.artist) && artistScore < 0.2;
    const score = weightedScore / totalWeight -
        (versionMismatch ? 0.15 : 0) -
        (artistMismatch ? 0.15 : 0);
    return Math.max(0, Math.min(1, score));
}
function rankMatches(source, candidates, metadata) {
    return candidates
        .map((candidate) => ({
        candidate,
        score: scoreMatch(source, metadata(candidate)),
    }))
        .sort((left, right) => right.score - left.score);
}
function selectBestMatch(source, candidates, metadata, minimumScore = 0.6) {
    const best = rankMatches(source, candidates, metadata)[0];
    return best && best.score >= minimumScore ? best : null;
}
