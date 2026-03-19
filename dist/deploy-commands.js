"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
require("dotenv/config");
const spotify_to_ytmusic_1 = require("./commands/spotify-to-ytmusic");
const ytmusic_to_spotify_1 = require("./commands/ytmusic-to-spotify");
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
if (!token || !clientId) {
    console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env");
    process.exit(1);
}
const commands = [spotify_to_ytmusic_1.data.toJSON(), ytmusic_to_spotify_1.data.toJSON()];
const rest = new discord_js_1.REST({ version: "10" }).setToken(token);
(async () => {
    try {
        console.log("Registering slash commands...");
        await rest.put(discord_js_1.Routes.applicationCommands(clientId), { body: commands });
        console.log("Slash commands registered successfully!");
    }
    catch (error) {
        console.error("Failed to register commands:", error);
    }
})();
