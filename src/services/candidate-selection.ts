import { randomUUID } from "node:crypto";
import type { ConversionCandidate, ConversionResult } from "./converter";
import { TtlCache } from "./ttl-cache";

export type TargetMusicService = "spotify" | "youtubeMusic";

export interface CandidateSelection {
  token: string;
  userId: string;
  target: TargetMusicService;
  sourceUrl: string;
  candidates: ConversionCandidate[];
}

export const MATCH_SELECTION_CUSTOM_ID_PREFIX = "music-match:";

const selections = new TtlCache<string, CandidateSelection>({
  ttlMs: 15 * 60 * 1_000,
  maxEntries: 500,
});

export function createCandidateSelection(
  userId: string,
  target: TargetMusicService,
  sourceUrl: string,
  result: ConversionResult,
): CandidateSelection | undefined {
  if (!result.alternatives?.length) return undefined;

  const { alternatives, ...primary } = result;
  const selection: CandidateSelection = {
    token: randomUUID(),
    userId,
    target,
    sourceUrl,
    candidates: [primary, ...alternatives],
  };
  selections.set(selection.token, selection);
  return selection;
}

export function getCandidateSelection(
  token: string,
): CandidateSelection | undefined {
  return selections.get(token);
}
