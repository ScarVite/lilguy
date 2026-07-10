import {
  ApplicationIntegrationType,
  CommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { executeConversion } from "./execute-conversion";

export const data = new SlashCommandBuilder()
  .setName("convert")
  .setDescription("Convert a Spotify or YouTube Music link automatically")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("A Spotify or YouTube Music URL")
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
  await executeConversion(interaction, input);
}
