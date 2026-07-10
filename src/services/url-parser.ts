export type SpotifyResourceType = "track" | "album" | "artist";
export type YouTubeMusicResourceType = "song" | "album" | "artist" | "playlist";

export interface ParsedSpotifyUrl {
  service: "spotify";
  type: SpotifyResourceType;
  id: string;
  canonicalUrl: string;
}

export interface ParsedYouTubeMusicUrl {
  service: "youtubeMusic";
  type: YouTubeMusicResourceType;
  id: string;
  canonicalUrl: string;
}

export type ParsedMusicUrl = ParsedSpotifyUrl | ParsedYouTubeMusicUrl;

const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function safeUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export function parseSpotifyUrl(input: string): ParsedSpotifyUrl | null {
  const url = safeUrl(input);
  if (!url || url.hostname.toLowerCase() !== "open.spotify.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const resourceIndex = segments[0]?.toLowerCase().startsWith("intl-") ? 1 : 0;
  if (segments.length !== resourceIndex + 2) return null;

  const type = segments[resourceIndex].toLowerCase() as SpotifyResourceType;
  const id = segments[resourceIndex + 1];
  if (
    !["track", "album", "artist"].includes(type) ||
    !id ||
    !SPOTIFY_ID_PATTERN.test(id)
  ) {
    return null;
  }

  return {
    service: "spotify",
    type,
    id,
    canonicalUrl: `https://open.spotify.com/${type}/${id}`,
  };
}

export function parseYouTubeMusicUrl(
  input: string,
): ParsedYouTubeMusicUrl | null {
  const url = safeUrl(input);
  if (!url || url.hostname.toLowerCase() !== "music.youtube.com") return null;

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
    const type: YouTubeMusicResourceType = id?.startsWith("UC")
      ? "artist"
      : "album";
    return createYouTubeResult(type, id);
  }

  return null;
}

export function parseMusicUrl(input: string): ParsedMusicUrl | null {
  return parseSpotifyUrl(input) ?? parseYouTubeMusicUrl(input);
}

export function findMusicUrl(input: string): ParsedMusicUrl | null {
  const directMatch = parseMusicUrl(input);
  if (directMatch) return directMatch;

  const candidates = input.match(/https?:\/\/[^\s<>()]+/gi) ?? [];
  for (const candidate of candidates) {
    const trimmedCandidate = candidate.replace(/[\],.!?;:'"]+$/g, "");
    const parsedUrl = parseMusicUrl(trimmedCandidate);
    if (parsedUrl) return parsedUrl;
  }

  return null;
}

function createYouTubeResult(
  type: YouTubeMusicResourceType,
  id: string | null | undefined,
): ParsedYouTubeMusicUrl | null {
  if (!id || !YOUTUBE_ID_PATTERN.test(id)) return null;

  const canonicalUrl =
    type === "song"
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
