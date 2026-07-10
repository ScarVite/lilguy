"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const url_parser_1 = require("./url-parser");
(0, node_test_1.default)("parses canonical and localized Spotify URLs", () => {
    const id = "4uLU6hMCjMI75M1A2tKUQC";
    strict_1.default.deepEqual((0, url_parser_1.parseSpotifyUrl)(`https://open.spotify.com/track/${id}?si=x`), {
        service: "spotify",
        type: "track",
        id,
        canonicalUrl: `https://open.spotify.com/track/${id}`,
    });
    strict_1.default.equal((0, url_parser_1.parseSpotifyUrl)(`https://open.spotify.com/intl-de/album/${id}`)?.type, "album");
});
(0, node_test_1.default)("rejects lookalike Spotify hosts and malformed IDs", () => {
    strict_1.default.equal((0, url_parser_1.parseSpotifyUrl)("https://open.spotify.com.evil.example/track/4uLU6hMCjMI75M1A2tKUQC"), null);
    strict_1.default.equal((0, url_parser_1.parseSpotifyUrl)("https://open.spotify.com/track/not-an-id"), null);
    strict_1.default.equal((0, url_parser_1.parseSpotifyUrl)("https://open.spotify.com/not-a-route/track/4uLU6hMCjMI75M1A2tKUQC"), null);
});
(0, node_test_1.default)("parses YouTube Music songs, albums, artists, and playlists", () => {
    strict_1.default.equal((0, url_parser_1.parseYouTubeMusicUrl)("https://music.youtube.com/watch?feature=share&v=dQw4w9WgXcQ")?.type, "song");
    strict_1.default.equal((0, url_parser_1.parseYouTubeMusicUrl)("https://music.youtube.com/browse/MPREb_example")
        ?.type, "album");
    strict_1.default.equal((0, url_parser_1.parseYouTubeMusicUrl)("https://music.youtube.com/browse/UC_example")?.type, "artist");
    strict_1.default.equal((0, url_parser_1.parseYouTubeMusicUrl)("https://music.youtube.com/playlist?list=PL_example")
        ?.type, "playlist");
});
(0, node_test_1.default)("auto-detects services and finds links inside message text", () => {
    const spotifyId = "4uLU6hMCjMI75M1A2tKUQC";
    strict_1.default.equal((0, url_parser_1.parseMusicUrl)(`https://open.spotify.com/track/${spotifyId}`)?.service, "spotify");
    strict_1.default.equal((0, url_parser_1.parseMusicUrl)("https://music.youtube.com/watch?v=dQw4w9WgXcQ")?.service, "youtubeMusic");
    strict_1.default.equal((0, url_parser_1.findMusicUrl)(`Try this one: <https://open.spotify.com/track/${spotifyId}>.`)?.id, spotifyId);
    strict_1.default.equal((0, url_parser_1.findMusicUrl)("There is no music link here."), null);
});
