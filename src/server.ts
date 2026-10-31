import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const SERVER_NAME = "mcp-server-starter";
export const SERVER_VERSION = "1.0.0";

/**
 * Builds a fresh MCP server. Over HTTP we create one per request (stateless):
 * any replica / isolate can answer any request, so deploys and scaling never drop sessions.
 * Add your own tools below.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: "Example MCP server. Use time_in_zone to get the current date and time in any IANA time zone." },
  );

  server.registerTool(
    "time_in_zone",
    {
      title: "Current time in a time zone",
      description:
        "Returns the current date and time in the given IANA time zone (e.g. Europe/Amsterdam, America/New_York). Use it whenever the user asks what time it is somewhere.",
      inputSchema: { timeZone: z.string().min(1).max(64).describe("IANA time zone name, e.g. Asia/Tokyo") },
      outputSchema: { timeZone: z.string(), iso: z.string(), local: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
    },
    async ({ timeZone }) => {
      let local: string;
      try {
        local = new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "full", timeStyle: "long" }).format(new Date());
      } catch {
        return { isError: true, content: [{ type: "text", text: `Unknown time zone "${timeZone}". Use an IANA name such as Europe/Amsterdam.` }] };
      }
      const result = { timeZone, iso: new Date().toISOString(), local };
      return { content: [{ type: "text", text: `${local} (${timeZone})` }], structuredContent: result };
    },
  );

  return server;
}
