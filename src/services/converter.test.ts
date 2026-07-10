import assert from "node:assert/strict";
import test from "node:test";
import SpotifyWebApi from "spotify-web-api-node";
import YTMusic from "ytmusic-api";
import { MusicConverter } from "./converter";

test("coalesces concurrent initialization into one authentication request", async () => {
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
    setAccessToken() {},
  } as unknown as SpotifyWebApi;

  const ytMusic = {
    async initialize() {
      youtubeInitializationCalls += 1;
    },
  } as unknown as YTMusic;

  const converter = new MusicConverter("id", "secret", {
    spotifyApi,
    ytMusic,
  });

  await Promise.all([
    converter.initialize(),
    converter.initialize(),
    converter.initialize(),
  ]);
  await converter.initialize();

  assert.equal(authenticationCalls, 1);
  assert.equal(youtubeInitializationCalls, 1);
});

test("re-authenticates when a client-credentials token has expired", async () => {
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
    setAccessToken() {},
  } as unknown as SpotifyWebApi;

  const ytMusic = {
    async initialize() {},
  } as unknown as YTMusic;

  const converter = new MusicConverter("id", "secret", {
    spotifyApi,
    ytMusic,
    now: () => now,
  });

  await converter.initialize();
  now += 3_600_000;
  await converter.initialize();

  assert.equal(authenticationCalls, 2);
});

test("refreshes and retries once when Spotify rejects a token", async () => {
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
    setAccessToken() {},
    async search() {
      searchCalls += 1;
      if (searchCalls === 1) throw { statusCode: 401 };
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
  } as unknown as SpotifyWebApi;

  const ytMusic = {
    async initialize() {},
    async getSong() {
      return {
        name: "Answers",
        artist: { name: "Susan Calloway" },
        duration: 425,
      };
    },
  } as unknown as YTMusic;

  const converter = new MusicConverter("id", "secret", {
    spotifyApi,
    ytMusic,
  });

  const result = await converter.convertYouTubeMusicToSpotify(
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  const cachedResult = await converter.convertYouTubeMusicToSpotify(
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
  );

  assert.equal(result?.title, "Answers");
  assert.equal(result?.alternatives?.[0]?.title, "Answers (Live)");
  assert.equal(cachedResult?.url, result?.url);
  assert.equal(authenticationCalls, 2);
  assert.equal(searchCalls, 2);
});
