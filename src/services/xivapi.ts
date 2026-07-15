import { TtlCache } from "./ttl-cache";

const XIVAPI_BASE_URL = "https://v2.xivapi.com/";

interface XivApiSearchResponse {
  results: Array<{
    row_id: number;
    fields: Record<string, unknown>;
  }>;
}

interface XivApiRowResponse {
  row_id: number;
  fields: Record<string, unknown>;
}

interface XivApiIcon {
  path?: string;
  path_hr1?: string;
}

export interface OrchestrionLookupResult {
  rowId: number;
  name: string;
  category?: string;
  itemId?: number;
  rollName?: string;
  rollDescription?: string;
  iconUrl?: string;
  tradable?: boolean;
  encounterName?: string;
}

export class XivApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "XivApiError";
  }
}

export class XivApiClient {
  private readonly cache = new TtlCache<string, OrchestrionLookupResult | null>({
    ttlMs: 24 * 60 * 60 * 1_000,
    maxEntries: 250,
  });

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly baseUrl = XIVAPI_BASE_URL,
  ) {}

  async findOrchestrion(query: string): Promise<OrchestrionLookupResult | null> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return null;

    return this.cache.getOrCreate(normalizedQuery.toLocaleLowerCase(), async () => {
      const directMatch = await this.findOrchestrionByName(normalizedQuery);
      if (directMatch) return this.enrichOrchestrion(directMatch);

      const encounterMatch = await this.findEncounterMusic(normalizedQuery);
      if (!encounterMatch) return null;

      const result = await this.enrichOrchestrion(encounterMatch.orchestrion);
      return result
        ? { ...result, encounterName: encounterMatch.encounterName }
        : null;
    });
  }

  private async findOrchestrionByName(
    query: string,
  ): Promise<XivApiSearchResponse["results"][number] | undefined> {
    const search = await this.request<XivApiSearchResponse>("api/search", {
      sheets: "Orchestrion",
      fields: "Name",
      query: `Name~"${escapeXivQuery(query)}"`,
      limit: "5",
    });
    return search.results.find(
      (result) => typeof result.fields.Name === "string" && result.fields.Name,
    );
  }

  private async findEncounterMusic(query: string): Promise<{
    encounterName: string;
    orchestrion: XivApiSearchResponse["results"][number];
  } | null> {
    const encounters = await this.request<XivApiSearchResponse>("api/search", {
      sheets: "ContentFinderCondition",
      fields: "Name,Content.BGM",
      query: `Name~"${escapeXivQuery(query)}"`,
      limit: "5",
    });

    for (const encounter of encounters.results) {
      const encounterName = stringField(encounter.fields.Name);
      const bgmRowId = nestedRelationshipRowId(
        encounter.fields,
        "Content",
        "BGM",
      );
      if (!encounterName || !bgmRowId) continue;

      const orchestrion = await this.request<XivApiSearchResponse>("api/search", {
        sheets: "Orchestrion",
        fields: "Name",
        query: `BGM=${bgmRowId}`,
        limit: "5",
      });
      const match = orchestrion.results.find(
        (result) => typeof result.fields.Name === "string" && result.fields.Name,
      );
      if (match) return { encounterName, orchestrion: match };
    }

    return null;
  }

  private async enrichOrchestrion(
    firstResult: XivApiSearchResponse["results"][number],
  ): Promise<OrchestrionLookupResult | null> {
    const name = stringField(firstResult.fields.Name);
    if (!name) return null;

    const [uiResult, itemResult] = await Promise.allSettled([
      this.request<XivApiRowResponse>(
        `api/sheet/OrchestrionUiparam/${firstResult.row_id}`,
        { fields: "OrchestrionCategory.Name" },
      ),
      this.request<XivApiSearchResponse>("api/search", {
        sheets: "Item",
        fields: "Name,Description,Icon,IsUntradable",
        query: `Name="${escapeXivQuery(`${name} Orchestrion Roll`)}"`,
        limit: "1",
      }),
    ]);

    const uiFields =
      uiResult.status === "fulfilled" ? uiResult.value.fields : undefined;
    const item =
      itemResult.status === "fulfilled"
        ? itemResult.value.results[0]
        : undefined;
    const itemFields = item?.fields;
    const icon = itemFields?.Icon as XivApiIcon | undefined;

    return {
      rowId: firstResult.row_id,
      name,
      category: relationshipName(uiFields?.OrchestrionCategory),
      itemId: item?.row_id,
      rollName:
        typeof itemFields?.Name === "string" ? itemFields.Name : undefined,
      rollDescription:
        typeof itemFields?.Description === "string"
          ? itemFields.Description
          : undefined,
      iconUrl: icon ? this.assetUrl(icon.path_hr1 ?? icon.path) : undefined,
      tradable:
        typeof itemFields?.IsUntradable === "boolean"
          ? !itemFields.IsUntradable
          : undefined,
    };
  }

  private async request<T>(
    path: string,
    parameters: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [name, value] of Object.entries(parameters)) {
      url.searchParams.set(name, value);
    }

    try {
      const response = await this.fetcher(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`XIVAPI returned HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      throw new XivApiError("XIVAPI is temporarily unavailable.", {
        cause: error,
      });
    }
  }

  private assetUrl(path: string | undefined): string | undefined {
    if (!path) return undefined;
    const url = new URL("api/asset", this.baseUrl);
    url.searchParams.set("path", path);
    url.searchParams.set("format", "png");
    return url.toString();
  }
}

function escapeXivQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function relationshipName(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fields = (value as { fields?: Record<string, unknown> }).fields;
  return typeof fields?.Name === "string" ? fields.Name : undefined;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function nestedRelationshipRowId(
  fields: Record<string, unknown>,
  relationship: string,
  nestedRelationship: string,
): number | undefined {
  const outer = relationshipValue(fields[relationship]);
  const nested = relationshipValue(outer?.fields?.[nestedRelationship]);
  return nested?.rowId;
}

function relationshipValue(value: unknown):
  | { rowId?: number; fields?: Record<string, unknown> }
  | undefined {
  if (typeof value === "number") return { rowId: value };
  if (!value || typeof value !== "object") return undefined;
  const relationship = value as { row_id?: unknown; fields?: unknown };
  return {
    rowId:
      typeof relationship.row_id === "number" ? relationship.row_id : undefined,
    fields:
      relationship.fields && typeof relationship.fields === "object"
        ? (relationship.fields as Record<string, unknown>)
        : undefined,
  };
}
