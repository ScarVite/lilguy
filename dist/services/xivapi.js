"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XivApiClient = exports.XivApiError = void 0;
const ttl_cache_1 = require("./ttl-cache");
const XIVAPI_BASE_URL = "https://v2.xivapi.com/";
class XivApiError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = "XivApiError";
    }
}
exports.XivApiError = XivApiError;
class XivApiClient {
    fetcher;
    baseUrl;
    cache = new ttl_cache_1.TtlCache({
        ttlMs: 24 * 60 * 60 * 1_000,
        maxEntries: 250,
    });
    constructor(fetcher = fetch, baseUrl = XIVAPI_BASE_URL) {
        this.fetcher = fetcher;
        this.baseUrl = baseUrl;
    }
    async findOrchestrion(query) {
        const normalizedQuery = query.trim();
        if (!normalizedQuery)
            return null;
        return this.cache.getOrCreate(normalizedQuery.toLocaleLowerCase(), async () => {
            const search = await this.request("api/search", {
                sheets: "Orchestrion",
                fields: "Name",
                query: `Name~"${escapeXivQuery(normalizedQuery)}"`,
                limit: "5",
            });
            const firstResult = search.results.find((result) => typeof result.fields.Name === "string" && result.fields.Name);
            if (!firstResult)
                return null;
            const name = firstResult.fields.Name;
            const [uiResult, itemResult] = await Promise.allSettled([
                this.request(`api/sheet/OrchestrionUiparam/${firstResult.row_id}`, { fields: "OrchestrionCategory.Name" }),
                this.request("api/search", {
                    sheets: "Item",
                    fields: "Name,Description,Icon,IsUntradable",
                    query: `Name="${escapeXivQuery(`${name} Orchestrion Roll`)}"`,
                    limit: "1",
                }),
            ]);
            const uiFields = uiResult.status === "fulfilled" ? uiResult.value.fields : undefined;
            const item = itemResult.status === "fulfilled"
                ? itemResult.value.results[0]
                : undefined;
            const itemFields = item?.fields;
            const icon = itemFields?.Icon;
            return {
                rowId: firstResult.row_id,
                name,
                category: relationshipName(uiFields?.OrchestrionCategory),
                itemId: item?.row_id,
                rollName: typeof itemFields?.Name === "string" ? itemFields.Name : undefined,
                rollDescription: typeof itemFields?.Description === "string"
                    ? itemFields.Description
                    : undefined,
                iconUrl: icon ? this.assetUrl(icon.path_hr1 ?? icon.path) : undefined,
                tradable: typeof itemFields?.IsUntradable === "boolean"
                    ? !itemFields.IsUntradable
                    : undefined,
            };
        });
    }
    async request(path, parameters) {
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
            return (await response.json());
        }
        catch (error) {
            throw new XivApiError("XIVAPI is temporarily unavailable.", {
                cause: error,
            });
        }
    }
    assetUrl(path) {
        if (!path)
            return undefined;
        const url = new URL("api/asset", this.baseUrl);
        url.searchParams.set("path", path);
        url.searchParams.set("format", "png");
        return url.toString();
    }
}
exports.XivApiClient = XivApiClient;
function escapeXivQuery(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function relationshipName(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const fields = value.fields;
    return typeof fields?.Name === "string" ? fields.Name : undefined;
}
