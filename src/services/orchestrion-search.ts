import { randomUUID } from "node:crypto";
import { TtlCache } from "./ttl-cache";

export type OrchestrionSearchService = "spotify" | "youtubeMusic";

export interface OrchestrionSearch {
  token: string;
  name: string;
  query: string;
}

export const ORCHESTRION_SEARCH_CUSTOM_ID_PREFIX = "orchestrion-search:";

const searches = new TtlCache<string, OrchestrionSearch>({
  ttlMs: 15 * 60 * 1_000,
  maxEntries: 500,
});

export function createOrchestrionSearch(name: string): OrchestrionSearch {
  const search: OrchestrionSearch = {
    token: randomUUID(),
    name,
    query: `${name} FINAL FANTASY XIV`,
  };
  searches.set(search.token, search);
  return search;
}

export function getOrchestrionSearch(
  token: string,
): OrchestrionSearch | undefined {
  return searches.get(token);
}
