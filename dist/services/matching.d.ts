export interface MatchMetadata {
    title: string;
    artist?: string;
    album?: string;
    durationMs?: number;
}
export interface RankedMatch<T> {
    candidate: T;
    score: number;
}
export declare function normalizeMusicText(value: string | undefined): string;
export declare function similarity(left: string | undefined, right: string | undefined): number;
export declare function scoreMatch(source: MatchMetadata, candidate: MatchMetadata): number;
export declare function rankMatches<T>(source: MatchMetadata, candidates: readonly T[], metadata: (candidate: T) => MatchMetadata): RankedMatch<T>[];
export declare function selectBestMatch<T>(source: MatchMetadata, candidates: readonly T[], metadata: (candidate: T) => MatchMetadata, minimumScore?: number): RankedMatch<T> | null;
