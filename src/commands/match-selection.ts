import { MessageFlags, StringSelectMenuInteraction } from "discord.js";
import { conversionResponse, NO_MENTIONS } from "./response";
import {
  getCandidateSelection,
  MATCH_SELECTION_CUSTOM_ID_PREFIX,
} from "../services/candidate-selection";
import { logger } from "../utils/logger";

export async function handleMatchSelection(
  interaction: StringSelectMenuInteraction,
): Promise<boolean> {
  if (!interaction.customId.startsWith(MATCH_SELECTION_CUSTOM_ID_PREFIX)) {
    return false;
  }

  const token = interaction.customId.slice(
    MATCH_SELECTION_CUSTOM_ID_PREFIX.length,
  );
  const selection = getCandidateSelection(token);

  if (!selection) {
    await interaction.reply({
      content: "That match picker has expired. Run the conversion again.",
      flags: MessageFlags.Ephemeral,
      allowedMentions: NO_MENTIONS,
    });
    return true;
  }

  if (selection.userId !== interaction.user.id) {
    await interaction.reply({
      content: "Only the person who requested this conversion can change it.",
      flags: MessageFlags.Ephemeral,
      allowedMentions: NO_MENTIONS,
    });
    return true;
  }

  const selectedIndex = Number(interaction.values[0]);
  const candidate = selection.candidates[selectedIndex];
  if (!candidate) {
    await interaction.reply({
      content: "That match is no longer available.",
      flags: MessageFlags.Ephemeral,
      allowedMentions: NO_MENTIONS,
    });
    return true;
  }

  try {
    await interaction.update(
      conversionResponse(
        candidate,
        selection.target,
        selection.sourceUrl,
        selection,
        selectedIndex,
      ),
    );
  } catch (error) {
    logger.error("Failed to update selected music match", error, {
      userId: interaction.user.id,
      selectedIndex,
    });
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "The selected match could not be displayed.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: NO_MENTIONS,
      });
    }
  }

  return true;
}
