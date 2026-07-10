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
export declare class XivApiError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
export declare class XivApiClient {
    private readonly fetcher;
    private readonly baseUrl;
    private readonly cache;
    constructor(fetcher?: typeof fetch, baseUrl?: string);
    findOrchestrion(query: string): Promise<OrchestrionLookupResult | null>;
    private request;
    private assetUrl;
}
