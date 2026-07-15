import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  CommandInteraction,
  ContextMenuCommandBuilder,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { executeConversion } from "./execute-conversion";
import { NO_MENTIONS } from "./response";
import { findMusicUrl } from "../services/url-parser";

export const data = new ContextMenuCommandBuilder()
  .setName("Convert music link")
  .setType(ApplicationCommandType.Message)
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
  if (!interaction.isMessageContextMenuCommand()) return;

  const message = interaction.targetMessage;
  const searchableText = [
    message.content,
    ...message.embeds.flatMap((embed) => [
      embed.url,
      embed.description,
      ...embed.fields.flatMap((field) => [field.name, field.value]),
    ]),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const parsedUrl = findMusicUrl(searchableText);

  if (!parsedUrl) {
    await interaction.reply({
      content: "❌ That message doesn't contain a supported music link.",
      flags: MessageFlags.Ephemeral,
      allowedMentions: NO_MENTIONS,
    });
    return;
  }

  await executeConversion(interaction, parsedUrl.canonicalUrl);
}
