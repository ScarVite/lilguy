# Discord Spotify → YouTube Music Bot

A Discord slash command bot that converts Spotify links (tracks, albums, artists) to YouTube Music links using the [ytm2spotify.com](https://ytm2spotify.com) API.

## Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. Go to **Bot** → click **Reset Token** → copy the token
4. Go to **OAuth2** → copy the **Client ID**
5. Under **Installation**, enable:
   - **Guild Install** with scope `bot` + `applications.commands`
   - **User Install** with scope `applications.commands`

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` in `.env`.

### 3. Install Dependencies

```bash
npm install
```

### 4. Register Slash Commands

```bash
npm run deploy-commands
```

### 5. Start the Bot

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

```
/spotify-to-yt-music url:https://open.spotify.com/track/...
```

The bot will reply with the matching YouTube Music link.

## How It Works

The bot uses the public [ytm2spotify.com](https://ytm2spotify.com) conversion API to look up the Spotify track/album/artist and find the best match on YouTube Music.
