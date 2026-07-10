"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSpotifyUrl = parseSpotifyUrl;
exports.parseYouTubeMusicUrl = parseYouTubeMusicUrl;
exports.parseMusicUrl = parseMusicUrl;
exports.findMusicUrl = findMusicUrl;
const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
function safeUrl(input) {
    try {
        const url = new URL(input.trim());
        return url.protocol === "https:" || url.protocol === "http:" ? url : null;
    }
    catch {
        return null;
    }
}
function parseSpotifyUrl(input) {
    const url = safeUrl(input);
    if (!url || url.hostname.toLowerCase() !== "open.spotify.com")
        return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const resourceIndex = segments[0]?.toLowerCase().startsWith("intl-") ? 1 : 0;
    if (segments.length !== resourceIndex + 2)
        return null;
    const type = segments[resourceIndex].toLowerCase();
    const id = segments[resourceIndex + 1];
    if (!["track", "album", "artist"].includes(type) ||
        !id ||
        !SPOTIFY_ID_PATTERN.test(id)) {
        return null;
    }
    return {
        service: "spotify",
        type,
        id,
        canonicalUrl: `https://open.spotify.com/${type}/${id}`,
    };
}
function parseYouTubeMusicUrl(input) {
    const url = safeUrl(input);
    if (!url || url.hostname.toLowerCase() !== "music.youtube.com")
        return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const route = segments[0]?.toLowerCase();
    if (route === "watch") {
        return createYouTubeResult("song", url.searchParams.get("v"));
    }
    if (route === "playlist") {
        return createYouTubeResult("playlist", url.searchParams.get("list"));
    }
    if (route === "channel") {
        return createYouTubeResult("artist", segments[1]);
    }
    if (route === "browse") {
        const id = segments[1];
        const type = id?.startsWith("UC")
            ? "artist"
            : "album";
        return createYouTubeResult(type, id);
    }
    return null;
}
function parseMusicUrl(input) {
    return parseSpotifyUrl(input) ?? parseYouTubeMusicUrl(input);
}
function findMusicUrl(input) {
    const directMatch = parseMusicUrl(input);
    if (directMatch)
        return directMatch;
    const candidates = input.match(/https?:\/\/[^\s<>()]+/gi) ?? [];
    for (const candidate of candidates) {
        const trimmedCandidate = candidate.replace(/[\],.!?;:'"]+$/g, "");
        const parsedUrl = parseMusicUrl(trimmedCandidate);
        if (parsedUrl)
            return parsedUrl;
    }
    return null;
}
function createYouTubeResult(type, id) {
    if (!id || !YOUTUBE_ID_PATTERN.test(id))
        return null;
    const canonicalUrl = type === "song"
        ? `https://music.youtube.com/watch?v=${id}`
        : type === "playlist"
            ? `https://music.youtube.com/playlist?list=${id}`
            : type === "artist"
                ? `https://music.youtube.com/channel/${id}`
                : `https://music.youtube.com/browse/${id}`;
    return {
        service: "youtubeMusic",
        type,
        id,
        canonicalUrl,
    };
}
