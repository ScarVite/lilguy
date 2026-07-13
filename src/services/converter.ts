import SpotifyWebApi from "spotify-web-api-node";
import YTMusic from "ytmusic-api";
import { logger } from "../utils/logger";
import { ConversionError } from "./errors";
import { MatchMetadata, RankedMatch, rankMatches } from "./matching";
import {
  ParsedAppleMusicUrl,
  ParsedSpotifyUrl,
  ParsedTidalUrl,
  ParsedYouTubeMusicUrl,
  parseAppleMusicUrl,
  parseSpotifyUrl,
  parseTidalUrl,
  parseYouTubeMusicUrl,
} from "./url-parser";
import { TtlCache } from "./ttl-cache";

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const SEARCH_RESULT_LIMIT = 10;
const CONVERSION_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;
const CONVERSION_CACHE_MAX_ENTRIES = 500;

export interface SearchParams {
  name?: string;
  album?: string;
  artist?: string;
  durationMs?: number;
  searchTypeHint: "song" | "album" | "artist";
  searchQuery?: string;
}

export interface ConversionCandidate {
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  type: "song" | "album" | "artist";
  confidence: number;
}

export interface ConversionResult extends ConversionCandidate {
  alternatives?: ConversionCandidate[];
}

export interface MusicConverterDependencies {
  spotifyApi?: SpotifyWebApi;
  ytMusic?: YTMusic;
  now?: () => number;
  timeoutMs?: number;
  cache?: TtlCache<string, ConversionResult | null>;
  fetch?: typeof fetch;
  tidalClientId?: string;
  tidalClientSecret?: string;
  tidalCountryCode?: string;
}

export class MusicConverter {
  private readonly spotifyApi: SpotifyWebApi;
  private readonly ytMusic: YTMusic;
  private spotifyTokenExpiresAt = 0;
  private spotifyAuthentication: Promise<void> | null = null;
  private ytMusicInitialization: Promise<void> | null = null;
  private ytMusicInitialized = false;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private readonly conversionCache: TtlCache<
    string,
    ConversionResult | null
  >;
  private readonly fetch: typeof fetch;
  private readonly tidalClientId?: string;
  private readonly tidalClientSecret?: string;
  private readonly tidalCountryCode: string;
  private tidalAccessToken = "";
  private tidalTokenExpiresAt = 0;
  private tidalAuthentication: Promise<void> | null = null;

  constructor(
    spotifyClientId: string,
    spotifyClientSecret: string,
    dependencies: MusicConverterDependencies = {},
  ) {
    this.spotifyApi =
      dependencies.spotifyApi ??
      new SpotifyWebApi({
        clientId: spotifyClientId,
        clientSecret: spotifyClientSecret,
      });
    this.ytMusic = dependencies.ytMusic ?? new YTMusic();
    this.now = dependencies.now ?? Date.now;
    this.timeoutMs = dependencies.timeoutMs ?? UPSTREAM_TIMEOUT_MS;
    this.conversionCache =
      dependencies.cache ??
      new TtlCache({
        ttlMs: CONVERSION_CACHE_TTL_MS,
        maxEntries: CONVERSION_CACHE_MAX_ENTRIES,
        now: this.now,
      });
    this.fetch = dependencies.fetch ?? fetch;
    this.tidalClientId = dependencies.tidalClientId;
    this.tidalClientSecret = dependencies.tidalClientSecret;
    this.tidalCountryCode = dependencies.tidalCountryCode ?? "US";
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.ensureSpotifyToken(),
      this.ensureYouTubeMusicInitialized(),
    ]);
  }

  async searchTrack(
    service: "spotify" | "youtubeMusic",
    name: string,
    searchQuery = name,
  ): Promise<ConversionResult | null> {
    const params: SearchParams = {
      name,
      searchQuery,
      searchTypeHint: "song",
    };

    if (service === "spotify") {
      await this.ensureSpotifyToken();
      return this.searchSpotify(params);
    }

    await this.ensureYouTubeMusicInitialized();
    return this.searchYouTubeMusic(params);
  }

  async convertSpotifyToYouTubeMusic(
    spotifyUrl: string,
  ): Promise<ConversionResult | null> {
    const parsedUrl = parseSpotifyUrl(spotifyUrl);
    if (!parsedUrl) {
      throw new ConversionError(
        "INVALID_URL",
        "That does not look like a supported Spotify track, album, or artist link.",
      );
    }

    logger.debug("Starting Spotify → YouTube Music conversion", {
      type: parsedUrl.type,
      id: parsedUrl.id,
    });

    return this.conversionCache.getOrCreate(
      `spotify:${parsedUrl.canonicalUrl}`,
      async () => {
        await this.initialize();
        const searchParams = await this.extractSpotifyMetadata(parsedUrl);
        logger.debug("Extracted Spotify search metadata", searchParams);
        return this.searchYouTubeMusic(searchParams);
      },
    );
  }

  async convertYouTubeMusicToSpotify(
    ytMusicUrl: string,
  ): Promise<ConversionResult | null> {
    const parsedUrl = parseYouTubeMusicUrl(ytMusicUrl);
    if (!parsedUrl) {
      throw new ConversionError(
        "INVALID_URL",
        "That does not look like a supported YouTube Music song, album, artist, or playlist link.",
      );
    }

    if (parsedUrl.type === "playlist") {
      throw new ConversionError(
        "UNSUPPORTED_RESOURCE",
        "Playlist creation needs a connected Spotify account and is not available yet. Song, album, and artist links work now.",
      );
    }

    logger.debug("Starting YouTube Music → Spotify conversion", {
      type: parsedUrl.type,
      id: parsedUrl.id,
    });

    return this.conversionCache.getOrCreate(
      `youtubeMusic:${parsedUrl.canonicalUrl}`,
      async () => {
        await this.initialize();
        const searchParams = await this.extractYouTubeMusicMetadata(parsedUrl);
        logger.debug("Extracted YouTube Music search metadata", searchParams);
        return this.searchSpotify(searchParams);
      },
    );
  }

  async convertTidalToSpotify(
    tidalUrl: string,
  ): Promise<ConversionResult | null> {
    const parsedUrl = parseTidalUrl(tidalUrl);
    if (!parsedUrl) {
      throw new ConversionError(
        "INVALID_URL",
        "That does not look like a supported Tidal track, album, or artist link.",
      );
    }

    return this.conversionCache.getOrCreate(
      `tidal:${parsedUrl.canonicalUrl}`,
      async () => this.searchSpotify(await this.extractTidalMetadata(parsedUrl)),
    );
  }

  async convertAppleMusicToSpotify(
    appleMusicUrl: string,
  ): Promise<ConversionResult | null> {
    const parsedUrl = parseAppleMusicUrl(appleMusicUrl);
    if (!parsedUrl) {
      throw new ConversionError(
        "INVALID_URL",
        "That does not look like a supported Apple Music song, album, or artist link.",
      );
    }

    return this.conversionCache.getOrCreate(
      `appleMusic:${parsedUrl.canonicalUrl}`,
      async () =>
        this.searchSpotify(await this.extractAppleMusicMetadata(parsedUrl)),
    );
  }

  private async ensureSpotifyToken(): Promise<void> {
    if (this.now() < this.spotifyTokenExpiresAt - TOKEN_REFRESH_BUFFER_MS)
      return;

    if (!this.spotifyAuthentication) {
      this.spotifyAuthentication = this.authenticateSpotify().finally(() => {
        this.spotifyAuthentication = null;
      });
    }

    await this.spotifyAuthentication;
  }

  private async authenticateSpotify(): Promise<void> {
    try {
      const credentials = await this.withTimeout(
        () => this.spotifyApi.clientCredentialsGrant(),
        "Spotify authentication",
      );

      this.spotifyApi.setAccessToken(credentials.body.access_token);
      this.spotifyTokenExpiresAt =
        this.now() + credentials.body.expires_in * 1_000;
      logger.debug("Spotify access token acquired", {
        expiresInSeconds: credentials.body.expires_in,
      });
    } catch (error) {
      if (error instanceof ConversionError) throw error;
      throw new ConversionError(
        "UPSTREAM_FAILURE",
        "Spotify is temporarily unavailable. Please try again shortly.",
        { cause: error },
      );
    }
  }

  private async ensureYouTubeMusicInitialized(): Promise<void> {
    if (this.ytMusicInitialized) return;

    if (!this.ytMusicInitialization) {
      this.ytMusicInitialization = this.withTimeout(
        () => this.ytMusic.initialize().then(() => undefined),
        "YouTube Music initialization",
      )
        .then(() => {
          this.ytMusicInitialized = true;
        })
        .catch((error: unknown) => {
          if (error instanceof ConversionError) throw error;
          throw new ConversionError(
            "UPSTREAM_FAILURE",
            "YouTube Music is temporarily unavailable. Please try again shortly.",
            { cause: error },
          );
        })
        .finally(() => {
          this.ytMusicInitialization = null;
        });
    }

    await this.ytMusicInitialization;
  }

  private async spotifyRequest<T>(
    operation: () => Promise<T>,
    label: string,
  ): Promise<T> {
    await this.ensureSpotifyToken();

    try {
      return await this.withTimeout(operation, label);
    } catch (error) {
      if (isSpotifyUnauthorized(error)) {
        this.spotifyTokenExpiresAt = 0;
        await this.ensureSpotifyToken();
        try {
          return await this.withTimeout(operation, label);
        } catch (retryError) {
          if (retryError instanceof ConversionError) throw retryError;
          throw new ConversionError(
            "UPSTREAM_FAILURE",
            "Spotify is temporarily unavailable. Please try again shortly.",
            { cause: retryError },
          );
        }
      }

      if (error instanceof ConversionError) throw error;
      throw new ConversionError(
        "UPSTREAM_FAILURE",
        "Spotify is temporarily unavailable. Please try again shortly.",
        { cause: error },
      );
    }
  }

  private async youtubeMusicRequest<T>(
    operation: () => Promise<T>,
    label: string,
  ): Promise<T> {
    try {
      return await this.withTimeout(operation, label);
    } catch (error) {
      if (error instanceof ConversionError) throw error;
      throw new ConversionError(
        "UPSTREAM_FAILURE",
        "YouTube Music is temporarily unavailable. Please try again shortly.",
        { cause: error },
      );
    }
  }

  private async withTimeout<T>(
    operation: () => Promise<T>,
    label: string,
  ): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            reject(
              new ConversionError(
                "UPSTREAM_TIMEOUT",
                `${label} took too long. Please try again shortly.`,
              ),
            );
          }, this.timeoutMs);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async extractSpotifyMetadata(
    parsedUrl: ParsedSpotifyUrl,
  ): Promise<SearchParams> {
    if (parsedUrl.type === "track") {
      const track = await this.spotifyRequest(
        () => this.spotifyApi.getTrack(parsedUrl.id),
        "Fetching the Spotify track",
      );
      return {
        name: track.body.name,
        artist: joinArtists(track.body.artists),
        album: track.body.album.name,
        durationMs: track.body.duration_ms,
        searchTypeHint: "song",
      };
    }

    if (parsedUrl.type === "album") {
      const album = await this.spotifyRequest(
        () => this.spotifyApi.getAlbum(parsedUrl.id),
        "Fetching the Spotify album",
      );
      return {
        album: album.body.name,
        artist: joinArtists(album.body.artists),
        searchTypeHint: "album",
      };
    }

    const artist = await this.spotifyRequest(
      () => this.spotifyApi.getArtist(parsedUrl.id),
      "Fetching the Spotify artist",
    );
    return {
      artist: artist.body.name,
      searchTypeHint: "artist",
    };
  }

  private async extractYouTubeMusicMetadata(
    parsedUrl: ParsedYouTubeMusicUrl,
  ): Promise<SearchParams> {
    if (parsedUrl.type === "song") {
      const song = await this.youtubeMusicRequest(
        () => this.ytMusic.getSong(parsedUrl.id),
        "Fetching the YouTube Music song",
      );
      return {
        name: song.name,
        artist: song.artist?.name,
        durationMs: song.duration ? song.duration * 1_000 : undefined,
        searchTypeHint: "song",
      };
    }

    if (parsedUrl.type === "album") {
      const album = await this.youtubeMusicRequest(
        () => this.ytMusic.getAlbum(parsedUrl.id),
        "Fetching the YouTube Music album",
      );
      return {
        album: album.name,
        artist: album.artist?.name,
        searchTypeHint: "album",
      };
    }

    const artist = await this.youtubeMusicRequest(
      () => this.ytMusic.getArtist(parsedUrl.id),
      "Fetching the YouTube Music artist",
    );
    return {
      artist: artist.name,
      searchTypeHint: "artist",
    };
  }

  private async extractTidalMetadata(
    parsedUrl: ParsedTidalUrl,
  ): Promise<SearchParams> {
    const endpoint = new URL(
      `https://openapi.tidal.com/v2/${parsedUrl.type === "song" ? "tracks" : `${parsedUrl.type}s`}/${parsedUrl.id}`,
    );
    endpoint.searchParams.set("countryCode", this.tidalCountryCode);
    endpoint.searchParams.set("include", "artists,albums");
    const metadata = await this.tidalJson(endpoint, "Fetching Tidal metadata");
    const data = recordProperty(metadata, "data") ?? metadata;
    const attributes = recordProperty(data, "attributes") ?? data;
    const title =
      stringProperty(attributes, parsedUrl.type === "song" ? "title" : "name") ??
      stringProperty(attributes, "title");
    const artist = tidalArtistName(data, metadata);
    if (!title) {
      throw new ConversionError(
        "UPSTREAM_FAILURE",
        "Tidal could not provide metadata for that link. Please try another link.",
      );
    }

    if (parsedUrl.type === "artist") {
      return { artist: title, searchTypeHint: "artist" };
    }
    if (parsedUrl.type === "album") {
      return { album: title, artist, searchTypeHint: "album" };
    }
    return { name: title, artist, searchTypeHint: "song" };
  }

  private async extractAppleMusicMetadata(
    parsedUrl: ParsedAppleMusicUrl,
  ): Promise<SearchParams> {
    const endpoint = new URL("https://itunes.apple.com/lookup");
    endpoint.searchParams.set("id", parsedUrl.id);
    endpoint.searchParams.set("country", parsedUrl.storefront.toUpperCase());
    const response = await this.externalJson(endpoint, "Fetching Apple Music metadata");
    const results = arrayProperty(response, "results");
    const metadata =
      results.find((result) => stringProperty(result, "trackId") === parsedUrl.id) ??
      results[0];
    if (!metadata) throw externalMetadataError("Apple Music");

    const artist = stringProperty(metadata, "artistName");
    if (parsedUrl.type === "artist") {
      if (!artist) throw externalMetadataError("Apple Music");
      return { artist, searchTypeHint: "artist" };
    }
    if (parsedUrl.type === "album") {
      const album = stringProperty(metadata, "collectionName");
      if (!album) throw externalMetadataError("Apple Music");
      return { album, artist, searchTypeHint: "album" };
    }

    const name = stringProperty(metadata, "trackName");
    if (!name) throw externalMetadataError("Apple Music");
    return {
      name,
      artist,
      album: stringProperty(metadata, "collectionName"),
      durationMs: numberProperty(metadata, "trackTimeMillis"),
      searchTypeHint: "song",
    };
  }

  private async ensureTidalToken(): Promise<void> {
    if (this.now() < this.tidalTokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) return;
    if (!this.tidalClientId || !this.tidalClientSecret) {
      throw new ConversionError(
        "CONFIGURATION",
        "The bot's Tidal integration is not configured. Please contact the bot owner.",
      );
    }

    if (!this.tidalAuthentication) {
      this.tidalAuthentication = this.authenticateTidal().finally(() => {
        this.tidalAuthentication = null;
      });
    }
    await this.tidalAuthentication;
  }

  private async authenticateTidal(): Promise<void> {
    const credentials = Buffer.from(
      `${this.tidalClientId}:${this.tidalClientSecret}`,
    ).toString("base64");
    try {
      const response = await this.withTimeout(
        () =>
          this.fetch("https://auth.tidal.com/v1/oauth2/token", {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          }),
        "Tidal authentication",
      );
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new ConversionError(
            "CONFIGURATION",
            "Tidal rejected the bot credentials. Check TIDAL_CLIENT_ID and TIDAL_CLIENT_SECRET.",
          );
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const accessToken = stringProperty(payload, "access_token");
      const expiresIn = numberProperty(payload, "expires_in");
      if (!accessToken || !expiresIn) throw new Error("Invalid token response");
      this.tidalAccessToken = accessToken;
      this.tidalTokenExpiresAt = this.now() + expiresIn * 1_000;
    } catch (error) {
      if (error instanceof ConversionError) throw error;
      throw new ConversionError(
        "UPSTREAM_FAILURE",
        "Tidal is temporarily unavailable. Please try again shortly.",
        { cause: error },
      );
    }
  }

  private async tidalJson(url: URL, label: string): Promise<unknown> {
    await this.ensureTidalToken();
    try {
      const response = await this.withTimeout(
        () =>
          this.fetch(url, {
            headers: {
              Accept: "application/vnd.tidal.v1+json",
              Authorization: `Bearer ${this.tidalAccessToken}`,
            },
          }),
        label,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (error instanceof ConversionError) throw error;
      throw new ConversionError(
        "UPSTREAM_FAILURE",
        "Tidal is temporarily unavailable. Please try again shortly.",
        { cause: error },
      );
    }
  }

  private async externalJson(url: URL, label: string): Promise<unknown> {
    try {
      const response = await this.withTimeout(
        () => this.fetch(url, { headers: { Accept: "application/json" } }),
        label,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (error instanceof ConversionError) throw error;
      throw new ConversionError(
        "UPSTREAM_FAILURE",
        "The music service is temporarily unavailable. Please try again shortly.",
        { cause: error },
      );
    }
  }

  private async searchSpotify(
    params: SearchParams,
  ): Promise<ConversionResult | null> {
    const source = sourceMetadata(params);
    const searchType =
      params.searchTypeHint === "song" ? "track" : params.searchTypeHint;
    const query = params.searchQuery ?? spotifySearchQuery(params);

    logger.debug("Spotify search started", { query, type: searchType });
    const results = await this.spotifyRequest(
      () =>
        this.spotifyApi.search(query, [searchType], {
          limit: SEARCH_RESULT_LIMIT,
        }),
      "Searching Spotify",
    );

    if (searchType === "track") {
      const ranked = rankMatches(
        source,
        results.body.tracks?.items ?? [],
        (track) => ({
          title: track.name,
          artist: joinArtists(track.artists),
          album: track.album.name,
          durationMs: track.duration_ms,
        }),
      );
      return conversionFromRanked(ranked, (track, confidence) => ({
        url: track.external_urls.spotify,
        title: track.name,
        description: [joinArtists(track.artists), track.album.name]
          .filter(Boolean)
          .join(" · "),
        thumbnail: largestThumbnail(track.album.images),
        type: "song",
        confidence,
      }));
    }

    if (searchType === "album") {
      const ranked = rankMatches(
        source,
        results.body.albums?.items ?? [],
        (album) => ({
          title: album.name,
          artist: joinArtists(album.artists),
        }),
      );
      return conversionFromRanked(ranked, (album, confidence) => ({
        url: album.external_urls.spotify,
        title: album.name,
        description: [
          joinArtists(album.artists),
          album.release_date?.substring(0, 4),
        ]
          .filter(Boolean)
          .join(" · "),
        thumbnail: largestThumbnail(album.images),
        type: "album",
        confidence,
      }));
    }

    const ranked = rankMatches(
      source,
      results.body.artists?.items ?? [],
      (artist) => ({ title: artist.name }),
    );
    return conversionFromRanked(ranked, (artist, confidence) => ({
      url: artist.external_urls.spotify,
      title: artist.name,
      description:
        artist.followers?.total === undefined
          ? undefined
          : `${artist.followers.total.toLocaleString()} followers`,
      thumbnail: largestThumbnail(artist.images),
      type: "artist",
      confidence,
    }));
  }

  private async searchYouTubeMusic(
    params: SearchParams,
  ): Promise<ConversionResult | null> {
    const source = sourceMetadata(params);
    const query =
      params.searchQuery ??
      [params.name ?? params.album, params.artist].filter(Boolean).join(" ");

    logger.debug("YouTube Music search started", {
      query,
      type: params.searchTypeHint,
    });

    if (params.searchTypeHint === "song") {
      const results = await this.youtubeMusicRequest(
        () => this.ytMusic.searchSongs(query),
        "Searching YouTube Music",
      );
      const ranked = rankMatches(source, results, (song) => ({
        title: song.name,
        artist: song.artist?.name,
        album: song.album?.name,
        durationMs: song.duration ? song.duration * 1_000 : undefined,
      }));
      return conversionFromRanked(ranked, (song, confidence) => ({
        url: `https://music.youtube.com/watch?v=${song.videoId}`,
        title: song.name,
        description: [song.artist?.name, song.album?.name]
          .filter(Boolean)
          .join(" · "),
        thumbnail: largestThumbnail(song.thumbnails),
        type: "song",
        confidence,
      }));
    }

    if (params.searchTypeHint === "album") {
      const results = await this.youtubeMusicRequest(
        () => this.ytMusic.searchAlbums(query),
        "Searching YouTube Music",
      );
      const ranked = rankMatches(source, results, (album) => ({
        title: album.name,
        artist: album.artist?.name,
      }));
      return conversionFromRanked(ranked, (album, confidence) => ({
        url: `https://music.youtube.com/browse/${album.albumId}`,
        title: album.name,
        description: [album.artist?.name, album.year]
          .filter(Boolean)
          .join(" · "),
        thumbnail: largestThumbnail(album.thumbnails),
        type: "album",
        confidence,
      }));
    }

    const results = await this.youtubeMusicRequest(
      () => this.ytMusic.searchArtists(query),
      "Searching YouTube Music",
    );
    const ranked = rankMatches(source, results, (artist) => ({
      title: artist.name,
    }));
    return conversionFromRanked(ranked, (artist, confidence) => ({
      url: `https://music.youtube.com/channel/${artist.artistId}`,
      title: artist.name,
      thumbnail: largestThumbnail(artist.thumbnails),
      type: "artist",
      confidence,
    }));
  }
}

function externalMetadataError(service: string): ConversionError {
  return new ConversionError(
    "UPSTREAM_FAILURE",
    `${service} could not provide metadata for that link. Please try another link.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function recordProperty(
  value: unknown,
  key: string,
): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const property = value[key];
  return isRecord(property) ? property : undefined;
}

function stringProperty(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const property = value[key];
  if (typeof property === "string") return property;
  if (typeof property === "number") return String(property);
  return undefined;
}

function numberProperty(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const property = value[key];
  return typeof property === "number" ? property : undefined;
}

function arrayProperty(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) return [];
  const property = value[key];
  return Array.isArray(property) ? property : [];
}

function tidalArtistName(data: unknown, response: unknown): string | undefined {
  const relationships = recordProperty(data, "relationships");
  const artistRelationship = recordProperty(relationships, "artists");
  const artists = arrayProperty(artistRelationship, "data");
  const artistId = stringProperty(artists[0], "id");
  const included = arrayProperty(response, "included");
  const artist = included.find(
    (item) =>
      stringProperty(item, "type") === "artists" &&
      stringProperty(item, "id") === artistId,
  );
  return (
    stringProperty(recordProperty(artist, "attributes"), "name") ??
    stringProperty(recordProperty(data, "attributes"), "artistName")
  );
}

function conversionFromRanked<T>(
  ranked: RankedMatch<T>[],
  convert: (candidate: T, confidence: number) => ConversionCandidate,
): ConversionResult | null {
  const best = ranked[0];
  if (!best || best.score < 0.6) return null;

  const matches = ranked
    .filter((match) => match.score >= 0.45)
    .slice(0, 5)
    .map((match) => convert(match.candidate, match.score));
  const [result, ...alternatives] = matches;

  return {
    ...result,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

function sourceMetadata(params: SearchParams): MatchMetadata {
  return {
    title: params.name ?? params.album ?? params.artist ?? "",
    artist: params.searchTypeHint === "artist" ? undefined : params.artist,
    album: params.album,
    durationMs: params.durationMs,
  };
}

function spotifySearchQuery(params: SearchParams): string {
  if (params.searchTypeHint === "song") {
    return `track:"${spotifySearchTerm(params.name)}" artist:"${spotifySearchTerm(params.artist)}"`;
  }
  if (params.searchTypeHint === "album") {
    return `album:"${spotifySearchTerm(params.album)}" artist:"${spotifySearchTerm(params.artist)}"`;
  }
  return spotifySearchTerm(params.artist);
}

function spotifySearchTerm(value: string | undefined): string {
  return (value ?? "").replace(/["\\]/g, " ").trim();
}

function joinArtists(artists: readonly { name: string }[]): string {
  return artists
    .map((artist) => artist.name)
    .filter(Boolean)
    .join(", ");
}

function largestThumbnail(
  images: readonly {
    url: string;
    width?: number | null;
    height?: number | null;
  }[],
): string | undefined {
  return [...images].sort(
    (left, right) =>
      (right.width ?? 0) * (right.height ?? 0) -
      (left.width ?? 0) * (left.height ?? 0),
  )[0]?.url;
}

function isSpotifyUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    statusCode?: number;
    body?: { error?: { status?: number } };
  };
  return candidate.statusCode === 401 || candidate.body?.error?.status === 401;
}
