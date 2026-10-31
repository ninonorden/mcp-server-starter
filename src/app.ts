import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const rpcError = (status: number, code: number, message: string, headers: Record<string, string> = {}) =>
  json(status, { jsonrpc: "2.0", error: { code, message }, id: null }, headers);

export interface AppOptions {
  /** Extra browser origins allowed to call /mcp (localhost is always allowed). */
  allowedOrigins?: string[];
  /** Max request body in bytes. */
  maxBodyBytes?: number;
}

/**
 * One Hono app that runs on Node (src/node.ts) and Cloudflare Workers (src/worker.ts).
 * Stateless Streamable HTTP: POST /mcp only. GET/DELETE answer 405 JSON so clients
 * don't reconnect in a loop, and unknown paths answer JSON 404 (never your HTML page).
 */
export function createApp(opts: AppOptions = {}) {
  const allowed = new Set(opts.allowedOrigins ?? []);
  const maxBody = opts.maxBodyBytes ?? 1_000_000;
  const app = new Hono();

  app.use("/mcp", cors({ origin: (o) => o, allowMethods: ["POST", "GET", "DELETE", "OPTIONS"], allowHeaders: ["content-type", "authorization", "mcp-protocol-version", "mcp-session-id", "last-event-id"], exposeHeaders: ["mcp-session-id"] }));

  app.get("/", (c) => c.json({ name: SERVER_NAME, version: SERVER_VERSION, mcp: "/mcp" }));
  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/mcp", async (c) => {
    const origin = c.req.header("origin");
    if (origin && !allowed.has(origin) && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
      return rpcError(403, -32000, "Origin not allowed");
    }
    const len = Number(c.req.header("content-length") ?? 0);
    if (len > maxBody) return rpcError(413, -32000, "Request too large");

    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
      return await transport.handleRequest(c.req.raw);
    } catch {
      return rpcError(500, -32603, "Internal error");
    } finally {
      // JSON responses are complete once handleRequest resolves.
      void server.close();
    }
  });

  const notAllowed = () => rpcError(405, -32000, "Method not allowed: this server is stateless, use POST", { allow: "POST" });
  app.get("/mcp", notAllowed);
  app.delete("/mcp", notAllowed);

  app.notFound(() => json(404, { error: "not_found" }));
  app.onError(() => json(500, { error: "internal_error" }));
  return app;
}
