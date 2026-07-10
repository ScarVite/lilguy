"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const response_1 = require("./response");
const xivapi_1 = require("../services/xivapi");
const logger_1 = require("../utils/logger");
const xivApi = new xivapi_1.XivApiClient();
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("orchestrion")
    .setDescription("Find a Final Fantasy XIV orchestrion track")
    .addStringOption((option) => option
    .setName("query")
    .setDescription("Track or orchestrion roll name")
    .setRequired(true))
    .setIntegrationTypes(discord_js_1.ApplicationIntegrationType.GuildInstall, discord_js_1.ApplicationIntegrationType.UserInstall)
    .setContexts(discord_js_1.InteractionContextType.Guild, discord_js_1.InteractionContextType.BotDM, discord_js_1.InteractionContextType.PrivateChannel);
async function execute(interaction) {
    if (!interaction.isChatInputCommand())
        return;
    const query = interaction.options.getString("query", true).trim();
    await interaction.deferReply();
    try {
        const result = await xivApi.findOrchestrion(query);
        if (!result) {
            await interaction.editReply({
                content: `🔍 No orchestrion track found for **${escapeMarkdown(query)}**.`,
                allowedMentions: response_1.NO_MENTIONS,
            });
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle(result.name)
            .setDescription(result.rollDescription ??
            "Final Fantasy XIV orchestrion track information.")
            .addFields(...(result.category
            ? [{ name: "Category", value: result.category, inline: true }]
            : []), ...(result.rollName
            ? [{ name: "Roll", value: result.rollName, inline: true }]
            : []), ...(result.tradable !== undefined
            ? [
                {
                    name: "Marketable",
                    value: result.tradable ? "Yes" : "No",
                    inline: true,
                },
            ]
            : []))
            .setFooter({ text: `XIVAPI orchestrion row ${result.rowId}` });
        if (result.iconUrl)
            embed.setThumbnail(result.iconUrl);
        const musicQuery = `${result.name} FINAL FANTASY XIV`;
        const buttons = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setStyle(discord_js_1.ButtonStyle.Link)
            .setLabel("Search Spotify")
            .setURL(`https://open.spotify.com/search/${encodeURIComponent(musicQuery)}`), new discord_js_1.ButtonBuilder()
            .setStyle(discord_js_1.ButtonStyle.Link)
            .setLabel("Search YouTube Music")
            .setURL(`https://music.youtube.com/search?q=${encodeURIComponent(musicQuery)}`));
        if (result.itemId && result.tradable) {
            buttons.addComponents(new discord_js_1.ButtonBuilder()
                .setStyle(discord_js_1.ButtonStyle.Link)
                .setLabel("View on Universalis")
                .setURL(`https://universalis.app/market/${result.itemId}`));
        }
        await interaction.editReply({
            embeds: [embed],
            components: [buttons],
            allowedMentions: response_1.NO_MENTIONS,
        });
    }
    catch (error) {
        logger_1.logger.error("Orchestrion lookup failed", error, {
            query,
            userId: interaction.user.id,
            guildId: interaction.guildId,
        });
        await interaction.editReply({
            content: error instanceof xivapi_1.XivApiError
                ? "❌ XIVAPI is temporarily unavailable. Please try again shortly."
                : "❌ The orchestrion lookup failed. Please try again shortly.",
            allowedMentions: response_1.NO_MENTIONS,
        });
    }
}
function escapeMarkdown(value) {
    return value.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}
