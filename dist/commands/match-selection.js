"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMatchSelection = handleMatchSelection;
const discord_js_1 = require("discord.js");
const response_1 = require("./response");
const candidate_selection_1 = require("../services/candidate-selection");
const logger_1 = require("../utils/logger");
async function handleMatchSelection(interaction) {
    if (!interaction.customId.startsWith(candidate_selection_1.MATCH_SELECTION_CUSTOM_ID_PREFIX)) {
        return false;
    }
    const token = interaction.customId.slice(candidate_selection_1.MATCH_SELECTION_CUSTOM_ID_PREFIX.length);
    const selection = (0, candidate_selection_1.getCandidateSelection)(token);
    if (!selection) {
        await interaction.reply({
            content: "That match picker has expired. Run the conversion again.",
            flags: discord_js_1.MessageFlags.Ephemeral,
            allowedMentions: response_1.NO_MENTIONS,
        });
        return true;
    }
    if (selection.userId !== interaction.user.id) {
        await interaction.reply({
            content: "Only the person who requested this conversion can change it.",
            flags: discord_js_1.MessageFlags.Ephemeral,
            allowedMentions: response_1.NO_MENTIONS,
        });
        return true;
    }
    const selectedIndex = Number(interaction.values[0]);
    const candidate = selection.candidates[selectedIndex];
    if (!candidate) {
        await interaction.reply({
            content: "That match is no longer available.",
            flags: discord_js_1.MessageFlags.Ephemeral,
            allowedMentions: response_1.NO_MENTIONS,
        });
        return true;
    }
    try {
        await interaction.update((0, response_1.conversionResponse)(candidate, selection.target, selection.sourceUrl, selection, selectedIndex));
    }
    catch (error) {
        logger_1.logger.error("Failed to update selected music match", error, {
            userId: interaction.user.id,
            selectedIndex,
        });
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "The selected match could not be displayed.",
                flags: discord_js_1.MessageFlags.Ephemeral,
                allowedMentions: response_1.NO_MENTIONS,
            });
        }
    }
    return true;
}
