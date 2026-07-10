import { InteractionEditReplyOptions } from "discord.js";
import { ConversionCandidate } from "../services/converter";
import { CandidateSelection, TargetMusicService } from "../services/candidate-selection";
export declare const NO_MENTIONS: {
    parse: [];
};
export declare function conversionResponse(result: ConversionCandidate, target: TargetMusicService, sourceUrl?: string, selection?: CandidateSelection, selectedIndex?: number): InteractionEditReplyOptions;
