import assert from "node:assert/strict";
import test from "node:test";
import { XivApiClient } from "./xivapi";

test("combines orchestrion, category, and roll item metadata", async () => {
  const requestedUrls: URL[] = [];
  const fetcher = async (input: string | URL | Request) => {
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
  const client = new XivApiClient(fetcher as typeof fetch);

  const result = await client.findOrchestrion("Answers");
  const cachedResult = await client.findOrchestrion("answers");

  assert.equal(result?.name, "Answers");
  assert.equal(result?.category, "Raids I");
  assert.equal(result?.rollName, "Answers Orchestrion Roll");
  assert.equal(result?.itemId, 14267);
  assert.equal(result?.tradable, true);
  assert.match(result?.iconUrl ?? "", /format=png/);
  assert.deepEqual(cachedResult, result);
  assert.equal(requestedUrls.length, 3);
  assert.equal(
    requestedUrls[0].searchParams.get("query"),
    'Name~"Answers"',
  );
});

test("returns null when no orchestrion track matches", async () => {
  const client = new XivApiClient(
    (async () => jsonResponse({ results: [] })) as typeof fetch,
  );
  assert.equal(await client.findOrchestrion("not a real track"), null);
});

test("resolves an orchestrion track from an encounter name and BGM", async () => {
  const requestedUrls: URL[] = [];
  const fetcher = async (input: string | URL | Request) => {
    const url = new URL(input.toString());
    requestedUrls.push(url);
    const sheet = url.searchParams.get("sheets");
    const query = url.searchParams.get("query");

    if (sheet === "Orchestrion" && query?.startsWith("Name~")) {
      return jsonResponse({ results: [] });
    }
    if (sheet === "ContentFinderCondition") {
      return jsonResponse({
        results: [
          {
            row_id: 4,
            fields: {
              Name: "The Navel",
              Content: {
                row_id: 4,
                fields: { BGM: { row_id: 77, fields: {} } },
              },
            },
          },
        ],
      });
    }
    if (sheet === "Orchestrion" && query === "BGM=77") {
      return jsonResponse({
        results: [{ row_id: 91, fields: { Name: "Under the Weight" } }],
      });
    }
    if (url.pathname === "/api/sheet/OrchestrionUiparam/91") {
      return jsonResponse({
        row_id: 91,
        fields: {
          OrchestrionCategory: { fields: { Name: "Trials" } },
        },
      });
    }
    return jsonResponse({ results: [] });
  };
  const client = new XivApiClient(fetcher as typeof fetch);

  const result = await client.findOrchestrion("The Navel");

  assert.equal(result?.name, "Under the Weight");
  assert.equal(result?.encounterName, "The Navel");
  assert.equal(result?.category, "Trials");
  assert.equal(
    requestedUrls.find(
      (url) => url.searchParams.get("sheets") === "ContentFinderCondition",
    )?.searchParams.get("fields"),
    "Name,Content.BGM",
  );
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
