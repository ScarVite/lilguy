"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const execute_conversion_1 = require("./execute-conversion");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("convert")
    .setDescription("Convert a Spotify or YouTube Music link automatically")
    .addStringOption((option) => option
    .setName("url")
    .setDescription("A Spotify or YouTube Music URL")
    .setRequired(true))
    .setIntegrationTypes(discord_js_1.ApplicationIntegrationType.GuildInstall, discord_js_1.ApplicationIntegrationType.UserInstall)
    .setContexts(discord_js_1.InteractionContextType.Guild, discord_js_1.InteractionContextType.BotDM, discord_js_1.InteractionContextType.PrivateChannel);
async function execute(interaction) {
    if (!interaction.isChatInputCommand())
        return;
    const input = interaction.options.getString("url", true).trim();
    await (0, execute_conversion_1.executeConversion)(interaction, input);
}
