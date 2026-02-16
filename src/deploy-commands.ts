import { REST, Routes, SlashCommandBuilder, InteractionContextType, ApplicationIntegrationType } from "discord.js";
import "dotenv/config";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("spotify-to-yt-music")
    .setDescription("Convert a Spotify link to a YouTube Music link")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The Spotify URL to convert (track, album, or artist)")
        .setRequired(true)
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .toJSON(),
];

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
