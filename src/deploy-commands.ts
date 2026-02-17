import { REST, Routes } from "discord.js";
import "dotenv/config";
import { data as spotifyToYtMusic } from "./commands/spotify-to-ytmusic";
import { data as ytMusicToSpotify } from "./commands/ytmusic-to-spotify";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

const commands = [spotifyToYtMusic.toJSON(), ytMusicToSpotify.toJSON()];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Slash commands registered successfully!");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
})();
