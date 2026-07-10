import type { ConversionCandidate, ConversionResult } from "./converter";
export type TargetMusicService = "spotify" | "youtubeMusic";
export interface CandidateSelection {
    token: string;
    userId: string;
    target: TargetMusicService;
    sourceUrl: string;
    candidates: ConversionCandidate[];
}
export declare const MATCH_SELECTION_CUSTOM_ID_PREFIX = "music-match:";
export declare function createCandidateSelection(userId: string, target: TargetMusicService, sourceUrl: string, result: ConversionResult): CandidateSelection | undefined;
export declare function getCandidateSelection(token: string): CandidateSelection | undefined;
