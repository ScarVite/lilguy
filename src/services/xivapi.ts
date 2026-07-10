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
      const search = await this.request<XivApiSearchResponse>("api/search", {
        sheets: "Orchestrion",
        fields: "Name",
        query: `Name~"${escapeXivQuery(normalizedQuery)}"`,
        limit: "5",
      });
      const firstResult = search.results.find(
        (result) => typeof result.fields.Name === "string" && result.fields.Name,
      );
      if (!firstResult) return null;

      const name = firstResult.fields.Name as string;
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
    });
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
