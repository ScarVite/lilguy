import {
  Client,
  Collection,
  CommandInteraction,
  GatewayIntentBits,
  Events,
} from "discord.js";
import "dotenv/config";
import { initSentry, logger } from "./utils/logger";
import * as spotifyToYtMusic from "./commands/spotify-to-ytmusic";
import * as ytMusicToSpotify from "./commands/ytmusic-to-spotify";
import * as convert from "./commands/convert";
import * as convertMessage from "./commands/convert-message";
import * as orchestrion from "./commands/orchestrion";
import { missingRuntimeEnvironment } from "./services/converter-instance";
import { NO_MENTIONS } from "./commands/response";
import { handleMatchSelection } from "./commands/match-selection";

initSentry();

interface Command {
  data: { name: string };
  execute: (interaction: CommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();

for (const command of [
  convert,
  convertMessage,
  orchestrion,
  spotifyToYtMusic,
  ytMusicToSpotify,
]) {
  commands.set(command.data.name, command);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    if (await handleMatchSelection(interaction)) return;
  }

  if (
    !interaction.isChatInputCommand() &&
    !interaction.isMessageContextMenuCommand()
  ) {
    return;
  }

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error("Unhandled command error", error, {
      commandName: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });

    const response = {
      content: "❌ Something went wrong while handling that command.",
      allowedMentions: NO_MENTIONS,
    };

    try {
      if (interaction.deferred) {
        await interaction.editReply(response);
      } else if (!interaction.replied) {
        await interaction.reply(response);
      }
    } catch (replyError) {
      logger.error("Failed to send command error response", replyError, {
        commandName: interaction.commandName,
      });
    }
  }
});

const missingEnvironment = missingRuntimeEnvironment();
if (missingEnvironment.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvironment.join(", ")}`,
  );
  process.exit(1);
}

const token = process.env.DISCORD_TOKEN;
client.login(token).catch((error) => {
  logger.error("Discord login failed", error);
  process.exitCode = 1;
});
