import {
  ActionRowBuilder,
  ApplicationIntegrationType,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { NO_MENTIONS } from "./response";
import { XivApiClient, XivApiError } from "../services/xivapi";
import { logger } from "../utils/logger";

const xivApi = new XivApiClient();

export const data = new SlashCommandBuilder()
  .setName("orchestrion")
  .setDescription("Find a Final Fantasy XIV orchestrion track")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("Track or orchestrion roll name")
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

  const query = interaction.options.getString("query", true).trim();
  await interaction.deferReply();

  try {
    const result = await xivApi.findOrchestrion(query);
    if (!result) {
      await interaction.editReply({
        content: `🔍 No orchestrion track found for **${escapeMarkdown(query)}**.`,
        allowedMentions: NO_MENTIONS,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xd4af37)
      .setTitle(result.name)
      .setDescription(
        result.rollDescription ??
          "Final Fantasy XIV orchestrion track information.",
      )
      .addFields(
        ...(result.category
          ? [{ name: "Category", value: result.category, inline: true }]
          : []),
        ...(result.rollName
          ? [{ name: "Roll", value: result.rollName, inline: true }]
          : []),
        ...(result.tradable !== undefined
          ? [
              {
                name: "Marketable",
                value: result.tradable ? "Yes" : "No",
                inline: true,
              },
            ]
          : []),
      )
      .setFooter({ text: `XIVAPI orchestrion row ${result.rowId}` });

    if (result.iconUrl) embed.setThumbnail(result.iconUrl);

    const musicQuery = `${result.name} FINAL FANTASY XIV`;
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Search Spotify")
        .setURL(
          `https://open.spotify.com/search/${encodeURIComponent(musicQuery)}`,
        ),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Search YouTube Music")
        .setURL(
          `https://music.youtube.com/search?q=${encodeURIComponent(musicQuery)}`,
        ),
    );

    if (result.itemId && result.tradable) {
      buttons.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("View on Universalis")
          .setURL(`https://universalis.app/market/${result.itemId}`),
      );
    }

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
      allowedMentions: NO_MENTIONS,
    });
  } catch (error) {
    logger.error("Orchestrion lookup failed", error, {
      query,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });
    await interaction.editReply({
      content:
        error instanceof XivApiError
          ? "❌ XIVAPI is temporarily unavailable. Please try again shortly."
          : "❌ The orchestrion lookup failed. Please try again shortly.",
      allowedMentions: NO_MENTIONS,
    });
  }
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}
