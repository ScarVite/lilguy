"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_MENTIONS = void 0;
exports.conversionResponse = conversionResponse;
const discord_js_1 = require("discord.js");
const candidate_selection_1 = require("../services/candidate-selection");
const COLORS = {
    spotify: 0x1db954,
    youtubeMusic: 0xff0033,
};
exports.NO_MENTIONS = { parse: [] };
function conversionResponse(result, target, sourceUrl, selection, selectedIndex = 0) {
    const serviceName = target === "spotify" ? "Spotify" : "YouTube Music";
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(COLORS[target])
        .setTitle(truncate(result.title, 256))
        .setURL(result.url)
        .setFooter({
        text: `${Math.round(result.confidence * 100)}% match confidence`,
    });
    if (result.description) {
        embed.setDescription(truncate(result.description, 4_096));
    }
    if (result.thumbnail) {
        embed.setThumbnail(result.thumbnail);
    }
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setStyle(discord_js_1.ButtonStyle.Link)
        .setLabel(`Open in ${serviceName}`)
        .setURL(result.url));
    if (sourceUrl) {
        row.addComponents(new discord_js_1.ButtonBuilder()
            .setStyle(discord_js_1.ButtonStyle.Link)
            .setLabel("Open source")
            .setURL(sourceUrl));
    }
    const matchRow = selection
        ? new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`${candidate_selection_1.MATCH_SELECTION_CUSTOM_ID_PREFIX}${selection.token}`)
            .setPlaceholder("Choose another match")
            .addOptions(selection.candidates.map((candidate, index) => ({
            label: truncate(candidate.title || "Untitled", 100),
            description: truncate(`${Math.round(candidate.confidence * 100)}% · ${candidate.description || candidate.type}`, 100),
            value: String(index),
            default: index === selectedIndex,
        }))))
        : undefined;
    return {
        embeds: [embed],
        components: matchRow ? [row, matchRow] : [row],
        allowedMentions: exports.NO_MENTIONS,
    };
}
function truncate(value, maximumLength) {
    if (value.length <= maximumLength)
        return value;
    return `${value.slice(0, maximumLength - 1)}…`;
}
