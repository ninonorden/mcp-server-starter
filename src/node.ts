import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

/** Node entry point: Streamable HTTP on PORT (Docker, Fly.io, Railway, Render, any VM). */
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "127.0.0.1";
const app = createApp({ allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",").filter(Boolean) });

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.error(`MCP server listening on http://${info.address}:${info.port}/mcp`);
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
