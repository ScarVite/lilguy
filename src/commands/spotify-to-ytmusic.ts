import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord.js";
import { MusicConverter } from "../services/converter";
import { logger } from "../utils/logger";

const SPOTIFY_URL_REGEX =
  /https?:\/\/open\.spotify\.com\/(track|album|artist)\/.+/;

let converter: MusicConverter | null = null;

function getConverter(): MusicConverter {
  if (!converter) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing Spotify API credentials in .env file");
    }

    converter = new MusicConverter(clientId, clientSecret);
  }
  return converter;
}

export const data = new SlashCommandBuilder()
  .setName("spotify-to-yt-music")
  .setDescription("Convert a Spotify link to a YouTube Music link")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("The Spotify URL to convert (track, album, or artist)")
      .setRequired(true)
  )
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall
  )
  .setContexts(
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const url = interaction.options.getString("url", true).trim();

  if (!SPOTIFY_URL_REGEX.test(url)) {
    await interaction.reply({
      content:
        "❌ That doesn't look like a valid Spotify URL.\nExpected format: `https://open.spotify.com/track/...`, `https://open.spotify.com/album/...`, or `https://open.spotify.com/artist/...`",
      flags: ["Ephemeral"],
    });
    return;
  }

  await interaction.deferReply();

  try {
    const musicConverter = getConverter();
    const result = await musicConverter.convertSpotifyToYouTubeMusic(url);

    if (!result) {
      await interaction.editReply({
        content: `🔍 No YouTube Music match found for that link.`,
      });
      return;
    }

    const parts = [result.title, result.description]
      .filter(Boolean)
      .join(" · ");

    await interaction.editReply({
      content: `🎵 **${parts}**\n${result.url}`,
    });
  } catch (error) {
    logger.error("Spotify to YT Music conversion failed", error as Error, {
      url,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    await interaction.editReply({
      content: `❌ Conversion failed: ${message}`,
    });
  }
}
