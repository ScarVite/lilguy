"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeConversion = executeConversion;
const discord_js_1 = require("discord.js");
const response_1 = require("./response");
const converter_instance_1 = require("../services/converter-instance");
const errors_1 = require("../services/errors");
const url_parser_1 = require("../services/url-parser");
const logger_1 = require("../utils/logger");
const candidate_selection_1 = require("../services/candidate-selection");
async function executeConversion(interaction, input, expectedService) {
    const parsedUrl = (0, url_parser_1.parseMusicUrl)(input);
    if (!parsedUrl || (expectedService && parsedUrl.service !== expectedService)) {
        await interaction.reply({
            content: invalidUrlMessage(expectedService),
            flags: discord_js_1.MessageFlags.Ephemeral,
            allowedMentions: response_1.NO_MENTIONS,
        });
        return;
    }
    await interaction.deferReply();
    try {
        const converter = (0, converter_instance_1.getMusicConverter)();
        const result = parsedUrl.service === "spotify"
            ? await converter.convertSpotifyToYouTubeMusic(parsedUrl.canonicalUrl)
            : await converter.convertYouTubeMusicToSpotify(parsedUrl.canonicalUrl);
        const target = parsedUrl.service === "spotify" ? "youtubeMusic" : "spotify";
        if (!result) {
            const serviceName = target === "spotify" ? "Spotify" : "YouTube Music";
            await interaction.editReply({
                content: `🔍 No confident ${serviceName} match was found for that link.`,
                allowedMentions: response_1.NO_MENTIONS,
            });
            return;
        }
        const selection = (0, candidate_selection_1.createCandidateSelection)(interaction.user.id, target, parsedUrl.canonicalUrl, result);
        await interaction.editReply((0, response_1.conversionResponse)(result, target, parsedUrl.canonicalUrl, selection));
    }
    catch (error) {
        logger_1.logger.error("Music conversion failed", error, {
            commandName: interaction.commandName,
            sourceService: parsedUrl.service,
            resourceType: parsedUrl.type,
            resourceId: parsedUrl.id,
            userId: interaction.user.id,
            guildId: interaction.guildId,
        });
        await interaction.editReply({
            content: `❌ ${(0, errors_1.userMessageForError)(error)}`,
            allowedMentions: response_1.NO_MENTIONS,
        });
    }
}
function invalidUrlMessage(expectedService) {
    if (expectedService === "spotify") {
        return "❌ That doesn't look like a Spotify track, album, or artist URL.";
    }
    if (expectedService === "youtubeMusic") {
        return "❌ That doesn't look like a YouTube Music song, album, artist, or playlist URL.";
    }
    return "❌ Add a supported Spotify or YouTube Music link.";
}
