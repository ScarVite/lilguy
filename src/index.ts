import {
  Client,
  GatewayIntentBits,
  Events,
  ChatInputCommandInteraction,
} from "discord.js";
import "dotenv/config";

const SPOTIFY_URL_REGEX =
  /https?:\/\/open\.spotify\.com\/(track|album|artist)\/.+/;

const YTM2SPOTIFY_API = "https://ytm2spotify.com/convert";

interface SearchResultItem {
  url: string;
  uri: string;
  art_url: string;
  description1: string;
  description2?: string;
  description3?: string;
  description4?: string;
}

interface ConvertResponse {
  results: SearchResultItem[];
  manual_search_link: string;
}

async function convertSpotifyToYTMusic(
  spotifyUrl: string
): Promise<ConvertResponse> {
  const params = new URLSearchParams({
    url: spotifyUrl,
    to_service: "youtube_music",
  });

  const response = await fetch(`${YTM2SPOTIFY_API}?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Conversion failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<ConvertResponse>;
}

async function handleSpotifyToYtMusic(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const url = interaction.options.getString("url", true).trim();

  if (!SPOTIFY_URL_REGEX.test(url)) {
    await interaction.reply({
      content:
        "❌ That doesn't look like a valid Spotify URL.\nExpected format: `https://open.spotify.com/track/...`, `https://open.spotify.com/album/...`, or `https://open.spotify.com/artist/...`",
      flags: ["Ephemeral"],
    });
    return;
  }

  await interaction.deferReply();

  try {
    const data = await convertSpotifyToYTMusic(url);

    if (!data.results || data.results.length === 0) {
      await interaction.editReply({
        content: `🔍 No YouTube Music match found for that link.\nTry searching manually: ${data.manual_search_link}`,
      });
      return;
    }

    const top = data.results[0];
    const parts = [top.description1, top.description3, top.description4]
      .filter(Boolean)
      .join(" · ");

    await interaction.editReply({
      content: `🎵 **${parts}**\n${top.url}`,
    });
  } catch (error) {
    console.error("Conversion error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    await interaction.editReply({
      content: `❌ Conversion failed: ${message}`,
    });
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "spotify-to-yt-music") {
    await handleSpotifyToYtMusic(interaction);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

client.login(token);
