"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const execute_conversion_1 = require("./execute-conversion");
const response_1 = require("./response");
const url_parser_1 = require("../services/url-parser");
exports.data = new discord_js_1.ContextMenuCommandBuilder()
    .setName("Convert music link")
    .setType(discord_js_1.ApplicationCommandType.Message)
    .setIntegrationTypes(discord_js_1.ApplicationIntegrationType.GuildInstall, discord_js_1.ApplicationIntegrationType.UserInstall)
    .setContexts(discord_js_1.InteractionContextType.Guild, discord_js_1.InteractionContextType.BotDM, discord_js_1.InteractionContextType.PrivateChannel);
async function execute(interaction) {
    if (!interaction.isMessageContextMenuCommand())
        return;
    const message = interaction.targetMessage;
    const searchableText = [
        message.content,
        ...message.embeds.flatMap((embed) => [
            embed.url,
            embed.description,
            ...embed.fields.flatMap((field) => [field.name, field.value]),
        ]),
    ]
        .filter((value) => Boolean(value))
        .join("\n");
    const parsedUrl = (0, url_parser_1.findMusicUrl)(searchableText);
    if (!parsedUrl) {
        await interaction.reply({
            content: "❌ That message doesn't contain a supported music link.",
            flags: discord_js_1.MessageFlags.Ephemeral,
            allowedMentions: response_1.NO_MENTIONS,
        });
        return;
    }
    await (0, execute_conversion_1.executeConversion)(interaction, parsedUrl.canonicalUrl);
}
