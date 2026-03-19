"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const converter_1 = require("../services/converter");
const logger_1 = require("../utils/logger");
const SPOTIFY_URL_REGEX = /https?:\/\/open\.spotify\.com\/(track|album|artist)\/.+/;
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
    .setName("spotify-to-yt-music")
    .setDescription("Convert a Spotify link to a YouTube Music link")
    .addStringOption((option) => option
    .setName("url")
    .setDescription("The Spotify URL to convert (track, album, or artist)")
    .setRequired(true))
    .setIntegrationTypes(discord_js_1.ApplicationIntegrationType.GuildInstall, discord_js_1.ApplicationIntegrationType.UserInstall)
    .setContexts(discord_js_1.InteractionContextType.Guild, discord_js_1.InteractionContextType.BotDM, discord_js_1.InteractionContextType.PrivateChannel);
async function execute(interaction) {
    const url = interaction.options.getString("url", true).trim();
    if (!SPOTIFY_URL_REGEX.test(url)) {
        await interaction.reply({
            content: "❌ That doesn't look like a valid Spotify URL.\nExpected format: `https://open.spotify.com/track/...`, `https://open.spotify.com/album/...`, or `https://open.spotify.com/artist/...`",
            flags: ["Ephemeral"],
        });
        return;
    }
    await interaction.deferReply();
    try {
        const musicConverter = getConverter();
        const result = await musicConverter.convertSpotifyToYouTubeMusic(url);
        if (!result) {
            await interaction.editReply({
                content: `🔍 No YouTube Music match found for that link.`,
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
        logger_1.logger.error("Spotify to YT Music conversion failed", error, {
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
