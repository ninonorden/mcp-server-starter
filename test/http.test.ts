import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { BASE } from "./helpers.js";

const app = createApp({ allowedOrigins: ["https://app.example.com"] });
const req = (path: string, init: RequestInit = {}) => app.fetch(new Request(BASE + path, init));
const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } };
const post = (headers: Record<string, string> = {}) =>
  req("/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers }, body: JSON.stringify(init) });

describe("HTTP edge cases that break real clients", () => {
  it("GET and DELETE /mcp answer 405 JSON, not HTML", async () => {
    for (const method of ["GET", "DELETE"]) {
      const r = await req("/mcp", { method, headers: { accept: "text/event-stream" } });
      expect(r.status).toBe(405);
      expect(r.headers.get("content-type")).toContain("application/json");
    }
  });

  it(".well-known OAuth paths answer JSON 404 (public server)", async () => {
    const r = await req("/.well-known/oauth-protected-resource");
    expect(r.status).toBe(404);
    expect(r.headers.get("content-type")).toContain("application/json");
  });

  it("rejects foreign browser origins, allows configured and localhost ones", async () => {
    expect((await post({ origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ origin: "https://app.example.com" })).status).toBe(200);
    expect((await post({ origin: "http://localhost:6274" })).status).toBe(200);
  });

  it("rejects oversized bodies", async () => {
    expect((await post({ "content-length": "5000000" })).status).toBe(413);
  });

  it("health endpoint", async () => {
    expect(await (await req("/health")).json()).toEqual({ ok: true });
  });
});
