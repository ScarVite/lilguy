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

test("converts Tidal and Apple Music links using their metadata", async () => {
  const spotifyApi = {
    async clientCredentialsGrant() {
      return {
        body: { access_token: "token", expires_in: 3_600, token_type: "Bearer" },
      };
    },
    setAccessToken() {},
    async search() {
      return {
        body: {
          tracks: {
            items: [
              {
                name: "Answers",
                artists: [{ name: "Susan Calloway" }],
                album: { name: "Before Meteor", images: [] },
                duration_ms: 425_000,
                external_urls: { spotify: "https://open.spotify.com/track/answers" },
              },
            ],
          },
        },
      };
    },
  } as unknown as SpotifyWebApi;
  const converter = new MusicConverter("id", "secret", {
    spotifyApi,
    ytMusic: { async initialize() {} } as unknown as YTMusic,
    fetch: async (input) => {
      const url = input.toString();
      const body = url.includes("auth.tidal.com")
        ? { access_token: "tidal-token", expires_in: 3_600 }
        : url.includes("openapi.tidal.com")
          ? {
              data: {
                type: "tracks",
                id: "74695970",
                attributes: { title: "Answers" },
                relationships: {
                  artists: { data: [{ type: "artists", id: "1" }] },
                },
              },
              included: [
                { type: "artists", id: "1", attributes: { name: "Susan Calloway" } },
              ],
            }
        : {
            results: [
              {
                trackId: 987654321,
                trackName: "Answers",
                artistName: "Susan Calloway",
                collectionName: "Before Meteor",
                trackTimeMillis: 425_000,
              },
            ],
          };
      return new Response(JSON.stringify(body), { status: 200 });
    },
    tidalClientId: "tidal-id",
    tidalClientSecret: "tidal-secret",
  });

  assert.equal(
    (await converter.convertTidalToSpotify("https://tidal.com/track/74695970"))
      ?.title,
    "Answers",
  );
  assert.equal(
    (
      await converter.convertAppleMusicToSpotify(
        "https://music.apple.com/us/album/answers/123456789?i=987654321",
      )
    )?.title,
    "Answers",
  );
});

test("uses only valid Tidal includes for each resource type", async () => {
  const metadataUrls: URL[] = [];
  const spotifyApi = {
    async clientCredentialsGrant() {
      return {
        body: { access_token: "token", expires_in: 3_600, token_type: "Bearer" },
      };
    },
    setAccessToken() {},
    async search() {
      return { body: {} };
    },
  } as unknown as SpotifyWebApi;
  const converter = new MusicConverter("id", "secret", {
    spotifyApi,
    ytMusic: { async initialize() {} } as unknown as YTMusic,
    fetch: async (input) => {
      const url = new URL(input.toString());
      if (url.hostname === "auth.tidal.com") {
        return new Response(
          JSON.stringify({ access_token: "tidal-token", expires_in: 3_600 }),
          { status: 200 },
        );
      }
      metadataUrls.push(url);
      return new Response(
        JSON.stringify({ data: { attributes: { name: "Answers", title: "Answers" } } }),
        { status: 200 },
      );
    },
    tidalClientId: " tidal-id ",
    tidalClientSecret: " tidal-secret ",
    tidalCountryCode: " de ",
  });

  await converter.convertTidalToSpotify("https://tidal.com/track/74695970");
  await converter.convertTidalToSpotify("https://tidal.com/album/123456");
  await converter.convertTidalToSpotify("https://tidal.com/artist/987654");

  assert.deepEqual(
    metadataUrls.map((url) => url.searchParams.get("include")),
    ["artists,albums", "artists", null],
  );
  assert.ok(metadataUrls.every((url) => url.searchParams.get("countryCode") === "DE"));
});

test("refreshes a Tidal token and retries once after a catalog 401", async () => {
  let authenticationCalls = 0;
  let metadataCalls = 0;
  const spotifyApi = {
    async clientCredentialsGrant() {
      return {
        body: { access_token: "token", expires_in: 3_600, token_type: "Bearer" },
      };
    },
    setAccessToken() {},
    async search() {
      return {
        body: {
          tracks: {
            items: [
              {
                name: "Answers",
                artists: [{ name: "Susan Calloway" }],
                album: { name: "Before Meteor", images: [] },
                duration_ms: 425_000,
                external_urls: { spotify: "https://open.spotify.com/track/answers" },
              },
            ],
          },
        },
      };
    },
  } as unknown as SpotifyWebApi;
  const converter = new MusicConverter("id", "secret", {
    spotifyApi,
    ytMusic: { async initialize() {} } as unknown as YTMusic,
    fetch: async (input) => {
      const url = new URL(input.toString());
      if (url.hostname === "auth.tidal.com") {
        authenticationCalls += 1;
        return new Response(
          JSON.stringify({
            access_token: `tidal-token-${authenticationCalls}`,
            expires_in: 3_600,
          }),
          { status: 200 },
        );
      }
      metadataCalls += 1;
      if (metadataCalls === 1) return new Response(null, { status: 401 });
      return new Response(
        JSON.stringify({
          data: {
            attributes: { title: "Answers", artistName: "Susan Calloway" },
          },
        }),
        { status: 200 },
      );
    },
    tidalClientId: "tidal-id",
    tidalClientSecret: "tidal-secret",
  });

  const result = await converter.convertTidalToSpotify(
    "https://tidal.com/track/74695970",
  );

  assert.equal(result?.title, "Answers");
  assert.equal(authenticationCalls, 2);
  assert.equal(metadataCalls, 2);
});
