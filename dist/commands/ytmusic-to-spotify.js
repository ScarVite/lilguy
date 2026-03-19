"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const converter_1 = require("../services/converter");
const logger_1 = require("../utils/logger");
const YTM_URL_REGEX = /https?:\/\/music\.youtube\.com\/(watch\?v=|playlist\?list=|channel\/).+/;
let converter = null;
function getConverter() {
    if (!converter) {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error("Missing Spotify API credentials in .env file");
        }
        converter = new converter_1.MusicConverter(clientId, clientSecret);
    }
    return converter;
}
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("yt-music-to-spotify")
    .setDescription("Convert a YouTube Music link to a Spotify link")
    .addStringOption((option) => option
    .setName("url")
    .setDescription("The YouTube Music URL to convert (song, playlist, or channel)")
    .setRequired(true))
    .setIntegrationTypes(discord_js_1.ApplicationIntegrationType.GuildInstall, discord_js_1.ApplicationIntegrationType.UserInstall)
    .setContexts(discord_js_1.InteractionContextType.Guild, discord_js_1.InteractionContextType.BotDM, discord_js_1.InteractionContextType.PrivateChannel);
async function execute(interaction) {
    const url = interaction.options.getString("url", true).trim();
    if (!YTM_URL_REGEX.test(url)) {
        await interaction.reply({
            content: "❌ That doesn't look like a valid YouTube Music URL.\nExpected format: `https://music.youtube.com/watch?v=...`, `https://music.youtube.com/playlist?list=...`, or `https://music.youtube.com/channel/...`",
            flags: ["Ephemeral"],
        });
        return;
    }
    await interaction.deferReply();
    try {
        const musicConverter = getConverter();
        const result = await musicConverter.convertYouTubeMusicToSpotify(url);
        if (!result) {
            await interaction.editReply({
                content: `🔍 No Spotify match found for that link.`,
            });
            return;
        }
        const parts = [result.title, result.description]
            .filter(Boolean)
            .join(" · ");
        await interaction.editReply({
            content: `🎵 **${parts}**\n${result.url}`,
        });
    }
    catch (error) {
        logger_1.logger.error("YT Music to Spotify conversion failed", error, {
            url,
            userId: interaction.user.id,
            guildId: interaction.guildId,
        });
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        await interaction.editReply({
            content: `❌ Conversion failed: ${message}`,
        });
    }
}
