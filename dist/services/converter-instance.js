"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMusicConverter = getMusicConverter;
exports.missingRuntimeEnvironment = missingRuntimeEnvironment;
const converter_1 = require("./converter");
const errors_1 = require("./errors");
let converter = null;
function getMusicConverter() {
    if (converter)
        return converter;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new errors_1.ConversionError("CONFIGURATION", "The bot's Spotify integration is not configured. Please contact the bot owner.");
    }
    converter = new converter_1.MusicConverter(clientId, clientSecret);
    return converter;
}
function missingRuntimeEnvironment() {
    return ["DISCORD_TOKEN", "SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"].filter((name) => !process.env[name]);
}
