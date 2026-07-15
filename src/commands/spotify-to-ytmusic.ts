import {
  ApplicationIntegrationType,
  CommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { executeConversion } from "./execute-conversion";

export const data = new SlashCommandBuilder()
  .setName("spotify-to-yt-music")
  .setDescription("Convert a Spotify link to a YouTube Music link")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("A Spotify track, album, or artist URL")
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
  await executeConversion(interaction, input, "spotify");
}
