export interface SearchParams {
    name?: string;
    album?: string;
    artist?: string;
    searchTypeHint?: 'song' | 'album' | 'artist';
}
export interface ConversionResult {
    url: string;
    title: string;
    description?: string;
    thumbnail?: string;
    type: 'song' | 'album' | 'artist';
}
export declare class MusicConverter {
    private spotifyApi;
    private ytMusic;
    private initialized;
    constructor(spotifyClientId: string, spotifyClientSecret: string);
    initialize(): Promise<void>;
    convertSpotifyToYouTubeMusic(spotifyUrl: string): Promise<ConversionResult | null>;
    convertYouTubeMusicToSpotify(ytMusicUrl: string): Promise<ConversionResult | null>;
    private extractSpotifyMetadata;
    private extractYouTubeMusicMetadata;
    private searchSpotify;
    private searchYouTubeMusic;
}
