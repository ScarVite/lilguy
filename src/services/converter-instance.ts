import { MusicConverter } from "./converter";
import { ConversionError } from "./errors";

let converter: MusicConverter | null = null;

export function getMusicConverter(): MusicConverter {
  if (converter) return converter;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ConversionError(
      "CONFIGURATION",
      "The bot's Spotify integration is not configured. Please contact the bot owner.",
    );
  }

  converter = new MusicConverter(clientId, clientSecret);
  return converter;
}

export function missingRuntimeEnvironment(): string[] {
  return ["DISCORD_TOKEN", "SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"].filter(
    (name) => !process.env[name],
  );
}
