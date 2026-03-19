"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicConverter = void 0;
const spotify_web_api_node_1 = __importDefault(require("spotify-web-api-node"));
const ytmusic_api_1 = __importDefault(require("ytmusic-api"));
const logger_1 = require("../utils/logger");
class MusicConverter {
    spotifyApi;
    ytMusic;
    initialized = false;
    constructor(spotifyClientId, spotifyClientSecret) {
        this.spotifyApi = new spotify_web_api_node_1.default({
            clientId: spotifyClientId,
            clientSecret: spotifyClientSecret,
        });
        this.ytMusic = new ytmusic_api_1.default();
    }
    async initialize() {
        if (this.initialized)
            return;
        const credentials = await this.spotifyApi.clientCredentialsGrant();
        this.spotifyApi.setAccessToken(credentials.body.access_token);
        await this.ytMusic.initialize();
        this.initialized = true;
    }
    async convertSpotifyToYouTubeMusic(spotifyUrl) {
        logger_1.logger.debug('Starting Spotify → YouTube Music conversion', { url: spotifyUrl });
        await this.initialize();
        const searchParams = await this.extractSpotifyMetadata(spotifyUrl);
        if (!searchParams) {
            logger_1.logger.error('Failed to extract Spotify metadata', new Error('Invalid Spotify URL'), { url: spotifyUrl });
            throw new Error('Invalid Spotify URL or unable to extract metadata');
        }
        logger_1.logger.debug('Extracted search params', searchParams);
        return await this.searchYouTubeMusic(searchParams);
    }
    async convertYouTubeMusicToSpotify(ytMusicUrl) {
        logger_1.logger.debug('Starting YouTube Music → Spotify conversion', { url: ytMusicUrl });
        await this.initialize();
        const searchParams = await this.extractYouTubeMusicMetadata(ytMusicUrl);
        if (!searchParams) {
            logger_1.logger.error('Failed to extract YouTube Music metadata', new Error('Invalid YouTube Music URL'), { url: ytMusicUrl });
            throw new Error('Invalid YouTube Music URL or unable to extract metadata');
        }
        logger_1.logger.debug('Extracted search params', searchParams);
        return await this.searchSpotify(searchParams);
    }
    async extractSpotifyMetadata(url) {
        const trackMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
        const albumMatch = url.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
        const artistMatch = url.match(/spotify\.com\/artist\/([a-zA-Z0-9]+)/);
        try {
            if (trackMatch) {
                const trackId = trackMatch[1];
                const track = await this.spotifyApi.getTrack(trackId);
                return {
                    name: track.body.name,
                    artist: track.body.artists[0]?.name,
                    album: track.body.album.name,
                    searchTypeHint: 'song',
                };
            }
            else if (albumMatch) {
                const albumId = albumMatch[1];
                const album = await this.spotifyApi.getAlbum(albumId);
                return {
                    album: album.body.name,
                    artist: album.body.artists[0]?.name,
                    searchTypeHint: 'album',
                };
            }
            else if (artistMatch) {
                const artistId = artistMatch[1];
                const artist = await this.spotifyApi.getArtist(artistId);
                return {
                    artist: artist.body.name,
                    searchTypeHint: 'artist',
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching Spotify metadata', error, { url });
            return null;
        }
        return null;
    }
    async extractYouTubeMusicMetadata(url) {
        const videoMatch = url.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
        const playlistMatch = url.match(/music\.youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/);
        const channelMatch = url.match(/music\.youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
        try {
            if (videoMatch) {
                const videoId = videoMatch[1];
                const song = await this.ytMusic.getSong(videoId);
                return {
                    name: song.name || '',
                    artist: song.artist?.name || '',
                    searchTypeHint: 'song',
                };
            }
            else if (playlistMatch) {
                const playlistId = playlistMatch[1];
                const album = await this.ytMusic.getAlbum(playlistId);
                return {
                    album: album.name || '',
                    artist: album.artist?.name || '',
                    searchTypeHint: 'album',
                };
            }
            else if (channelMatch) {
                const channelId = channelMatch[1];
                const artist = await this.ytMusic.getArtist(channelId);
                return {
                    artist: artist.name || '',
                    searchTypeHint: 'artist',
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching YouTube Music metadata', error, { url });
            return null;
        }
        return null;
    }
    async searchSpotify(params) {
        logger_1.logger.debug('Spotify search started', params);
        try {
            let searchQuery = '';
            let searchType = 'track';
            if (params.searchTypeHint === 'song') {
                searchQuery = `track:${params.name || ''} artist:${params.artist || ''}`;
                searchType = 'track';
            }
            else if (params.searchTypeHint === 'album') {
                searchQuery = `album:${params.album || ''} artist:${params.artist || ''}`;
                searchType = 'album';
            }
            else if (params.searchTypeHint === 'artist') {
                searchQuery = params.artist || '';
                searchType = 'artist';
            }
            logger_1.logger.debug('Spotify search query', { query: searchQuery, type: searchType });
            const results = await this.spotifyApi.search(searchQuery, [searchType], { limit: 1 });
            if (searchType === 'track' && results.body.tracks?.items.length) {
                const track = results.body.tracks.items[0];
                const result = {
                    url: track.external_urls.spotify,
                    title: track.name,
                    description: `${track.artists[0]?.name} - ${track.album.name}`,
                    thumbnail: track.album.images[0]?.url,
                    type: 'song',
                };
                logger_1.logger.debug('Spotify track found', result);
                return result;
            }
            else if (searchType === 'album' && results.body.albums?.items.length) {
                const album = results.body.albums.items[0];
                const result = {
                    url: album.external_urls.spotify,
                    title: album.name,
                    description: `${album.artists[0]?.name} (${album.release_date?.substring(0, 4)})`,
                    thumbnail: album.images[0]?.url,
                    type: 'album',
                };
                logger_1.logger.debug('Spotify album found', result);
                return result;
            }
            else if (searchType === 'artist' && results.body.artists?.items.length) {
                const artist = results.body.artists.items[0];
                const result = {
                    url: artist.external_urls.spotify,
                    title: artist.name,
                    description: `${artist.followers?.total?.toLocaleString()} followers`,
                    thumbnail: artist.images[0]?.url,
                    type: 'artist',
                };
                logger_1.logger.debug('Spotify artist found', result);
                return result;
            }
            logger_1.logger.warn('Spotify search: no results', { query: searchQuery });
            return null;
        }
        catch (error) {
            logger_1.logger.error('Spotify search failed', error, { params });
            return null;
        }
    }
    async searchYouTubeMusic(params) {
        try {
            let searchQuery = '';
            if (params.searchTypeHint === 'song') {
                searchQuery = `${params.name} ${params.artist}`;
            }
            else if (params.searchTypeHint === 'album') {
                searchQuery = `${params.album} ${params.artist}`;
            }
            else if (params.searchTypeHint === 'artist') {
                searchQuery = `${params.artist}`;
            }
            logger_1.logger.debug('YouTube Music search started', { query: searchQuery, type: params.searchTypeHint });
            if (params.searchTypeHint === 'song') {
                const results = await this.ytMusic.searchSongs(searchQuery);
                logger_1.logger.debug('YouTube songs found', { count: results.length });
                if (results.length === 0) {
                    logger_1.logger.warn('YouTube search: no songs found', { query: searchQuery });
                    return null;
                }
                const firstResult = results[0];
                logger_1.logger.debug('YouTube song selected', { videoId: firstResult.videoId, name: firstResult.name });
                return {
                    url: `https://music.youtube.com/watch?v=${firstResult.videoId}`,
                    title: firstResult.name || '',
                    description: firstResult.artist?.name || '',
                    thumbnail: firstResult.thumbnails?.[0]?.url || '',
                    type: 'song',
                };
            }
            else if (params.searchTypeHint === 'album') {
                const results = await this.ytMusic.searchAlbums(searchQuery);
                logger_1.logger.debug('YouTube albums found', { count: results.length });
                if (results.length === 0) {
                    logger_1.logger.warn('YouTube search: no albums found', { query: searchQuery });
                    return null;
                }
                const firstResult = results[0];
                logger_1.logger.debug('YouTube album selected', { albumId: firstResult.albumId, name: firstResult.name });
                return {
                    url: `https://music.youtube.com/browse/${firstResult.albumId}`,
                    title: firstResult.name || '',
                    description: `${firstResult.year || ''} - ${firstResult.artist?.name || ''}`.trim(),
                    thumbnail: firstResult.thumbnails?.[0]?.url || '',
                    type: 'album',
                };
            }
            else if (params.searchTypeHint === 'artist') {
                const results = await this.ytMusic.searchArtists(searchQuery);
                logger_1.logger.debug('YouTube artists found', { count: results.length });
                if (results.length === 0) {
                    logger_1.logger.warn('YouTube search: no artists found', { query: searchQuery });
                    return null;
                }
                const firstResult = results[0];
                logger_1.logger.debug('YouTube artist selected', { artistId: firstResult.artistId, name: firstResult.name });
                return {
                    url: `https://music.youtube.com/channel/${firstResult.artistId}`,
                    title: firstResult.name || '',
                    description: '',
                    thumbnail: firstResult.thumbnails?.[0]?.url || '',
                    type: 'artist',
                };
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('YouTube Music search failed', error, { params });
            return null;
        }
    }
}
exports.MusicConverter = MusicConverter;
