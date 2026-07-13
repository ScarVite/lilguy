import assert from "node:assert/strict";
import test from "node:test";
import {
  findMusicUrl,
  parseMusicUrl,
  parseAppleMusicUrl,
  parseSpotifyUrl,
  parseTidalUrl,
  parseYouTubeMusicUrl,
} from "./url-parser";

test("parses canonical and localized Spotify URLs", () => {
  const id = "4uLU6hMCjMI75M1A2tKUQC";

  assert.deepEqual(
    parseSpotifyUrl(`https://open.spotify.com/track/${id}?si=x`),
    {
      service: "spotify",
      type: "track",
      id,
      canonicalUrl: `https://open.spotify.com/track/${id}`,
    },
  );

  assert.equal(
    parseSpotifyUrl(`https://open.spotify.com/intl-de/album/${id}`)?.type,
    "album",
  );
});

test("rejects lookalike Spotify hosts and malformed IDs", () => {
  assert.equal(
    parseSpotifyUrl(
      "https://open.spotify.com.evil.example/track/4uLU6hMCjMI75M1A2tKUQC",
    ),
    null,
  );
  assert.equal(
    parseSpotifyUrl("https://open.spotify.com/track/not-an-id"),
    null,
  );
  assert.equal(
    parseSpotifyUrl(
      "https://open.spotify.com/not-a-route/track/4uLU6hMCjMI75M1A2tKUQC",
    ),
    null,
  );
});

test("parses YouTube Music songs, albums, artists, and playlists", () => {
  assert.equal(
    parseYouTubeMusicUrl(
      "https://music.youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
    )?.type,
    "song",
  );
  assert.equal(
    parseYouTubeMusicUrl("https://music.youtube.com/browse/MPREb_example")
      ?.type,
    "album",
  );
  assert.equal(
    parseYouTubeMusicUrl("https://music.youtube.com/browse/UC_example")?.type,
    "artist",
  );
  assert.equal(
    parseYouTubeMusicUrl("https://music.youtube.com/playlist?list=PL_example")
      ?.type,
    "playlist",
  );
});

test("parses Tidal and Apple Music links", () => {
  assert.deepEqual(parseTidalUrl("https://tidal.com/track/74695970/u"), {
    service: "tidal",
    type: "song",
    id: "74695970",
    canonicalUrl: "https://tidal.com/browse/track/74695970",
  });
  assert.equal(
    parseTidalUrl("https://tidal.com/browse/album/123456")?.type,
    "album",
  );
  assert.deepEqual(
    parseAppleMusicUrl(
      "https://music.apple.com/us/album/example/123456789?i=987654321&foo=bar",
    ),
    {
      service: "appleMusic",
      type: "song",
      id: "987654321",
      storefront: "us",
      canonicalUrl:
        "https://music.apple.com/us/album/example/123456789?i=987654321",
    },
  );
});

test("auto-detects services and finds links inside message text", () => {
  const spotifyId = "4uLU6hMCjMI75M1A2tKUQC";
  assert.equal(
    parseMusicUrl(`https://open.spotify.com/track/${spotifyId}`)?.service,
    "spotify",
  );
  assert.equal(
    parseMusicUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")?.service,
    "youtubeMusic",
  );
  assert.equal(
    parseMusicUrl("https://tidal.com/browse/track/74695970")?.service,
    "tidal",
  );
  assert.equal(
    findMusicUrl(
      `Try this one: <https://open.spotify.com/track/${spotifyId}>.`,
    )?.id,
    spotifyId,
  );
  assert.equal(findMusicUrl("There is no music link here."), null);
});
