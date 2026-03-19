import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord.js";
import { MusicConverter } from "../services/converter";
import { logger } from "../utils/logger";

const YTM_URL_REGEX =
  /https?:\/\/music\.youtube\.com\/(watch\?v=|playlist\?list=|channel\/).+/;

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
  .setName("yt-music-to-spotify")
  .setDescription("Convert a YouTube Music link to a Spotify link")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription(
        "The YouTube Music URL to convert (song, playlist, or channel)"
      )
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

  if (!YTM_URL_REGEX.test(url)) {
    await interaction.reply({
      content:
        "❌ That doesn't look like a valid YouTube Music URL.\nExpected format: `https://music.youtube.com/watch?v=...`, `https://music.youtube.com/playlist?list=...`, or `https://music.youtube.com/channel/...`",
      flags: ["Ephemeral"],
    });
    return;
  }

  await interaction.deferReply();

  try {
    const musicConverter = getConverter();
    const result = await musicConverter.convertYouTubeMusicToSpotify(url);

    if (!result) {
      await interaction.editReply({
        content: `🔍 No Spotify match found for that link.`,
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
    logger.error("YT Music to Spotify conversion failed", error as Error, {
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
