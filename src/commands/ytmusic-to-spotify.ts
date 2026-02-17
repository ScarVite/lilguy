import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord.js";

const YTM_URL_REGEX =
  /https?:\/\/music\.youtube\.com\/(watch\?v=|playlist\?list=|channel\/).+/;

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

async function convertYTMusicToSpotify(
  ytMusicUrl: string
): Promise<ConvertResponse> {
  const params = new URLSearchParams({
    url: ytMusicUrl,
    to_service: "spotify",
  });

  const response = await fetch(`${YTM2SPOTIFY_API}?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Conversion failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<ConvertResponse>;
}

export const data = new SlashCommandBuilder()
  .setName("yt-music-to-spotify")
  .setDescription("Convert a YouTube Music link to a Spotify link")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription(
        "The YouTube Music URL to convert (song, playlist, or channel)"
      )
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
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const url = interaction.options.getString("url", true).trim();

  if (!YTM_URL_REGEX.test(url)) {
    await interaction.reply({
      content:
        "❌ That doesn't look like a valid YouTube Music URL.\nExpected format: `https://music.youtube.com/watch?v=...`, `https://music.youtube.com/playlist?list=...`, or `https://music.youtube.com/channel/...`",
      flags: ["Ephemeral"],
    });
    return;
  }

  await interaction.deferReply();

  try {
    const data = await convertYTMusicToSpotify(url);

    if (!data.results || data.results.length === 0) {
      await interaction.editReply({
        content: `🔍 No Spotify match found for that link.\nTry searching manually: ${data.manual_search_link}`,
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
