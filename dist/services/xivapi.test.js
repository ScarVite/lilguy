"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const xivapi_1 = require("./xivapi");
(0, node_test_1.default)("combines orchestrion, category, and roll item metadata", async () => {
    const requestedUrls = [];
    const fetcher = async (input) => {
        const url = new URL(input.toString());
        requestedUrls.push(url);
        if (url.pathname === "/api/search" && url.searchParams.get("sheets") === "Orchestrion") {
            return jsonResponse({
                results: [{ row_id: 45, fields: { Name: "Answers" } }],
            });
        }
        if (url.pathname === "/api/sheet/OrchestrionUiparam/45") {
            return jsonResponse({
                row_id: 45,
                fields: {
                    OrchestrionCategory: { fields: { Name: "Raids I" } },
                },
            });
        }
        return jsonResponse({
            results: [
                {
                    row_id: 14267,
                    fields: {
                        Name: "Answers Orchestrion Roll",
                        Description: "Music roll for Answers.",
                        Icon: { path_hr1: "ui/icon/025000/025945_hr1.tex" },
                        IsUntradable: false,
                    },
                },
            ],
        });
    };
    const client = new xivapi_1.XivApiClient(fetcher);
    const result = await client.findOrchestrion("Answers");
    const cachedResult = await client.findOrchestrion("answers");
    strict_1.default.equal(result?.name, "Answers");
    strict_1.default.equal(result?.category, "Raids I");
    strict_1.default.equal(result?.rollName, "Answers Orchestrion Roll");
    strict_1.default.equal(result?.itemId, 14267);
    strict_1.default.equal(result?.tradable, true);
    strict_1.default.match(result?.iconUrl ?? "", /format=png/);
    strict_1.default.deepEqual(cachedResult, result);
    strict_1.default.equal(requestedUrls.length, 3);
    strict_1.default.equal(requestedUrls[0].searchParams.get("query"), 'Name~"Answers"');
});
(0, node_test_1.default)("returns null when no orchestrion track matches", async () => {
    const client = new xivapi_1.XivApiClient((async () => jsonResponse({ results: [] })));
    strict_1.default.equal(await client.findOrchestrion("not a real track"), null);
});
function jsonResponse(value) {
    return new Response(JSON.stringify(value), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}
