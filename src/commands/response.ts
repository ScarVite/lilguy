import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  InteractionEditReplyOptions,
  StringSelectMenuBuilder,
} from "discord.js";
import { ConversionCandidate } from "../services/converter";
import {
  CandidateSelection,
  MATCH_SELECTION_CUSTOM_ID_PREFIX,
  TargetMusicService,
} from "../services/candidate-selection";

const COLORS = {
  spotify: 0x1db954,
  youtubeMusic: 0xff0033,
} as const;

export const NO_MENTIONS = { parse: [] as [] };

export function conversionResponse(
  result: ConversionCandidate,
  target: TargetMusicService,
  sourceUrl?: string,
  selection?: CandidateSelection,
  selectedIndex = 0,
): InteractionEditReplyOptions {
  const serviceName = target === "spotify" ? "Spotify" : "YouTube Music";
  const embed = new EmbedBuilder()
    .setColor(COLORS[target])
    .setTitle(truncate(result.title, 256))
    .setURL(result.url)
    .setFooter({
      text: `${Math.round(result.confidence * 100)}% match confidence`,
    });

  if (result.description) {
    embed.setDescription(truncate(result.description, 4_096));
  }
  if (result.thumbnail) {
    embed.setThumbnail(result.thumbnail);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(`Open in ${serviceName}`)
      .setURL(result.url),
  );
  if (sourceUrl) {
    row.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Open source")
        .setURL(sourceUrl),
    );
  }

  const matchRow = selection
    ? new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(
            `${MATCH_SELECTION_CUSTOM_ID_PREFIX}${selection.token}`,
          )
          .setPlaceholder("Choose another match")
          .addOptions(
            selection.candidates.map((candidate, index) => ({
              label: truncate(candidate.title || "Untitled", 100),
              description: truncate(
                `${Math.round(candidate.confidence * 100)}% · ${candidate.description || candidate.type}`,
                100,
              ),
              value: String(index),
              default: index === selectedIndex,
            })),
          ),
      )
    : undefined;

  return {
    embeds: [embed],
    components: matchRow ? [row, matchRow] : [row],
    allowedMentions: NO_MENTIONS,
  };
}

function truncate(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, maximumLength - 1)}…`;
}
