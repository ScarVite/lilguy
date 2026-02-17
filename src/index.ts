import {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  ChatInputCommandInteraction,
} from "discord.js";
import "dotenv/config";
import * as spotifyToYtMusic from "./commands/spotify-to-ytmusic";
import * as ytMusicToSpotify from "./commands/ytmusic-to-spotify";

interface Command {
  data: { name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();

for (const command of [spotifyToYtMusic, ytMusicToSpotify]) {
  commands.set(command.data.name, command);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  await command.execute(interaction);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

client.login(token);
