"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const converter_1 = require("./converter");
(0, node_test_1.default)("coalesces concurrent initialization into one authentication request", async () => {
    let authenticationCalls = 0;
    let youtubeInitializationCalls = 0;
    const spotifyApi = {
        async clientCredentialsGrant() {
            authenticationCalls += 1;
            await Promise.resolve();
            return {
                body: {
                    access_token: "token",
                    expires_in: 3_600,
                    token_type: "Bearer",
                },
            };
        },
        setAccessToken() { },
    };
    const ytMusic = {
        async initialize() {
            youtubeInitializationCalls += 1;
        },
    };
    const converter = new converter_1.MusicConverter("id", "secret", {
        spotifyApi,
        ytMusic,
    });
    await Promise.all([
        converter.initialize(),
        converter.initialize(),
        converter.initialize(),
    ]);
    await converter.initialize();
    strict_1.default.equal(authenticationCalls, 1);
    strict_1.default.equal(youtubeInitializationCalls, 1);
});
(0, node_test_1.default)("re-authenticates when a client-credentials token has expired", async () => {
    let authenticationCalls = 0;
    let now = 1_000_000;
    const spotifyApi = {
        async clientCredentialsGrant() {
            authenticationCalls += 1;
            return {
                body: {
                    access_token: `token-${authenticationCalls}`,
                    expires_in: 3_600,
                    token_type: "Bearer",
                },
            };
        },
        setAccessToken() { },
    };
    const ytMusic = {
        async initialize() { },
    };
    const converter = new converter_1.MusicConverter("id", "secret", {
        spotifyApi,
        ytMusic,
        now: () => now,
    });
    await converter.initialize();
    now += 3_600_000;
    await converter.initialize();
    strict_1.default.equal(authenticationCalls, 2);
});
(0, node_test_1.default)("refreshes and retries once when Spotify rejects a token", async () => {
    let authenticationCalls = 0;
    let searchCalls = 0;
    const spotifyApi = {
        async clientCredentialsGrant() {
            authenticationCalls += 1;
            return {
                body: {
                    access_token: `token-${authenticationCalls}`,
                    expires_in: 3_600,
                    token_type: "Bearer",
                },
            };
        },
        setAccessToken() { },
        async search() {
            searchCalls += 1;
            if (searchCalls === 1)
                throw { statusCode: 401 };
            return {
                body: {
                    tracks: {
                        items: [
                            {
                                name: "Answers",
                                artists: [{ name: "Susan Calloway" }],
                                album: { name: "Before Meteor", images: [] },
                                duration_ms: 425_000,
                                external_urls: {
                                    spotify: "https://open.spotify.com/track/example",
                                },
                            },
                            {
                                name: "Answers (Live)",
                                artists: [{ name: "Susan Calloway" }],
                                album: { name: "FINAL FANTASY XIV Fan Festival", images: [] },
                                duration_ms: 430_000,
                                external_urls: {
                                    spotify: "https://open.spotify.com/track/live-example",
                                },
                            },
                        ],
                    },
                },
            };
        },
    };
    const ytMusic = {
        async initialize() { },
        async getSong() {
            return {
                name: "Answers",
                artist: { name: "Susan Calloway" },
                duration: 425,
            };
        },
    };
    const converter = new converter_1.MusicConverter("id", "secret", {
        spotifyApi,
        ytMusic,
    });
    const result = await converter.convertYouTubeMusicToSpotify("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
    const cachedResult = await converter.convertYouTubeMusicToSpotify("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
    strict_1.default.equal(result?.title, "Answers");
    strict_1.default.equal(result?.alternatives?.[0]?.title, "Answers (Live)");
    strict_1.default.equal(cachedResult?.url, result?.url);
    strict_1.default.equal(authenticationCalls, 2);
    strict_1.default.equal(searchCalls, 2);
});
