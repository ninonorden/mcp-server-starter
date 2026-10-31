import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "../src/app.js";

export const BASE = "http://localhost:3000";
export type App = ReturnType<typeof createApp>;

/** A real MCP client wired straight into app.fetch: no ports, real protocol. */
export async function connect(app: App) {
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), {
    fetch: async (url, init) => app.fetch(new Request(url, init)),
  });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
  return client;
}
