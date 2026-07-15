import {
  ApplicationIntegrationType,
  CommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { executeConversion } from "./execute-conversion";

export const data = new SlashCommandBuilder()
  .setName("yt-music-to-spotify")
  .setDescription("Convert a YouTube Music link to a Spotify link")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("A YouTube Music song, album, artist, or playlist URL")
      .setRequired(true),
  )
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  )
  .setContexts(
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel,
  );

export async function execute(
  interaction: CommandInteraction,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;
  const input = interaction.options.getString("url", true).trim();
  await executeConversion(interaction, input, "youtubeMusic");
}
