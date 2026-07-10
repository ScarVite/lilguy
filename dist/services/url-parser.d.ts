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
export declare function parseSpotifyUrl(input: string): ParsedSpotifyUrl | null;
export declare function parseYouTubeMusicUrl(input: string): ParsedYouTubeMusicUrl | null;
export declare function parseMusicUrl(input: string): ParsedMusicUrl | null;
export declare function findMusicUrl(input: string): ParsedMusicUrl | null;
