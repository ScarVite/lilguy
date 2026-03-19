# Discord Spotify ↔ YouTube Music Bot

A Discord slash command bot that converts between Spotify and YouTube Music links (tracks, albums, artists) using local conversion powered by Spotify and YouTube APIs.

## Features

- Convert Spotify tracks, albums, and artists to YouTube Music
- Convert YouTube Music songs, playlists, and channels to Spotify
- Works in Discord servers and DMs
- Self-hosted solution - no dependency on external conversion services

## Setup

### 1. Create a Spotify Application

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in app name and description (e.g., "Discord Music Converter")
4. Copy the **Client ID** and **Client Secret**

### 2. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. Go to **Bot** → click **Reset Token** → copy the token
4. Go to **OAuth2** → copy the **Client ID**
5. Under **Installation**, enable:
   - **Guild Install** with scope `bot` + `applications.commands`
   - **User Install** with scope `applications.commands`

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in the following in `.env`:
- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `SPOTIFY_CLIENT_ID` - Your Spotify application client ID
- `SPOTIFY_CLIENT_SECRET` - Your Spotify application client secret
- `SENTRY_DSN` - (Optional) Your Sentry DSN for error tracking in production
- `NODE_ENV` - Set to `production` for production deployment, `development` for local testing

### 4. Install Dependencies

```bash
npm install
```

### 5. Register Slash Commands

```bash
npm run deploy-commands
```

### 6. Start the Bot

```bash
npm run build
npm start
```

Or for development:

```bash
npm run dev
```

## Usage

In any Discord channel or DM:

**Convert Spotify to YouTube Music:**
```
/spotify-to-yt-music url:https://open.spotify.com/track/...
```

**Convert YouTube Music to Spotify:**
```
/yt-music-to-spotify url:https://music.youtube.com/watch?v=...
```

The bot will reply with the matching link from the target platform.

## How It Works

The bot uses a local conversion service that:
1. **Extracts metadata** from the source URL using the appropriate API (Spotify or YouTube)
2. **Searches** the target platform using the extracted song/artist/album information
3. **Returns** the best matching result

This implementation is fully self-hosted and doesn't rely on external conversion services.

## Error Tracking (Optional)

The bot includes Sentry integration for production error tracking:

1. Create a free account at [sentry.io](https://sentry.io)
2. Create a new Node.js project
3. Copy your DSN and add it to `.env`:
   ```
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
4. Set `NODE_ENV=production` when deploying

**Features:**
- Errors are automatically captured in production with full context
- Breadcrumb trail shows the sequence of operations leading to errors
- No performance impact in development (Sentry disabled)
- Includes user ID and guild ID for debugging
