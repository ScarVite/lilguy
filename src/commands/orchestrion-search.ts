import { ButtonInteraction, MessageFlags } from "discord.js";
import { conversionResponse, NO_MENTIONS } from "./response";
import { getMusicConverter } from "../services/converter-instance";
import { userMessageForError } from "../services/errors";
import {
  getOrchestrionSearch,
  ORCHESTRION_SEARCH_CUSTOM_ID_PREFIX,
  OrchestrionSearchService,
} from "../services/orchestrion-search";
import { logger } from "../utils/logger";

export async function handleOrchestrionSearch(
  interaction: ButtonInteraction,
): Promise<boolean> {
  if (!interaction.customId.startsWith(ORCHESTRION_SEARCH_CUSTOM_ID_PREFIX)) {
    return false;
  }

  const [service, token] = interaction.customId
    .slice(ORCHESTRION_SEARCH_CUSTOM_ID_PREFIX.length)
    .split(":");
  if ((service !== "spotify" && service !== "youtubeMusic") || !token) {
    return false;
  }

  const search = getOrchestrionSearch(token);
  if (!search) {
    await interaction.reply({
      content: "That music search has expired. Run the orchestrion command again.",
      flags: MessageFlags.Ephemeral,
      allowedMentions: NO_MENTIONS,
    });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const result = await getMusicConverter().searchTrack(
      service as OrchestrionSearchService,
      search.name,
      search.query,
    );
    if (!result) {
      const serviceName = service === "spotify" ? "Spotify" : "YouTube Music";
      await interaction.editReply({
        content: `🔍 No confident ${serviceName} match was found for **${search.name}**.`,
        allowedMentions: NO_MENTIONS,
      });
      return true;
    }

    await interaction.editReply(conversionResponse(result, service));
  } catch (error) {
    logger.error("Orchestrion music search failed", error, {
      service,
      track: search.name,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });
    await interaction.editReply({
      content: `❌ ${userMessageForError(error)}`,
      allowedMentions: NO_MENTIONS,
    });
  }
  return true;
}
