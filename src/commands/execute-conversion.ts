import {
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  MessageFlags,
} from "discord.js";
import { conversionResponse, NO_MENTIONS } from "./response";
import { getMusicConverter } from "../services/converter-instance";
import { userMessageForError } from "../services/errors";
import { parseMusicUrl, ParsedMusicUrl } from "../services/url-parser";
import { logger } from "../utils/logger";
import { createCandidateSelection } from "../services/candidate-selection";

export type MusicCommandInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction;

export async function executeConversion(
  interaction: MusicCommandInteraction,
  input: string,
  expectedService?: ParsedMusicUrl["service"],
): Promise<void> {
  const parsedUrl = parseMusicUrl(input);

  if (!parsedUrl || (expectedService && parsedUrl.service !== expectedService)) {
    await interaction.reply({
      content: invalidUrlMessage(expectedService),
      flags: MessageFlags.Ephemeral,
      allowedMentions: NO_MENTIONS,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const converter = getMusicConverter();
    const result =
      parsedUrl.service === "spotify"
        ? await converter.convertSpotifyToYouTubeMusic(parsedUrl.canonicalUrl)
        : parsedUrl.service === "youtubeMusic"
          ? await converter.convertYouTubeMusicToSpotify(parsedUrl.canonicalUrl)
          : parsedUrl.service === "tidal"
            ? await converter.convertTidalToSpotify(parsedUrl.canonicalUrl)
            : await converter.convertAppleMusicToSpotify(parsedUrl.canonicalUrl);
    const target =
      parsedUrl.service === "spotify" ? "youtubeMusic" : "spotify";

    if (!result) {
      const serviceName =
        target === "spotify" ? "Spotify" : "YouTube Music";
      await interaction.editReply({
        content: `🔍 No confident ${serviceName} match was found for that link.`,
        allowedMentions: NO_MENTIONS,
      });
      return;
    }

    const selection = createCandidateSelection(
      interaction.user.id,
      target,
      parsedUrl.canonicalUrl,
      result,
    );
    await interaction.editReply(
      conversionResponse(
        result,
        target,
        parsedUrl.canonicalUrl,
        selection,
      ),
    );
  } catch (error) {
    logger.error("Music conversion failed", error, {
      commandName: interaction.commandName,
      sourceService: parsedUrl.service,
      resourceType: parsedUrl.type,
      resourceId: parsedUrl.id,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });
    await interaction.editReply({
      content: `❌ ${userMessageForError(error)}`,
      allowedMentions: NO_MENTIONS,
    });
  }
}

function invalidUrlMessage(
  expectedService: ParsedMusicUrl["service"] | undefined,
): string {
  if (expectedService === "spotify") {
    return "❌ That doesn't look like a Spotify track, album, or artist URL.";
  }
  if (expectedService === "youtubeMusic") {
    return "❌ That doesn't look like a YouTube Music song, album, artist, or playlist URL.";
  }
  return "❌ Add a supported Spotify or YouTube Music link.";
}
