# MCP Server Starter (TypeScript)

[![CI](https://github.com/ninonorden/mcp-server-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/ninonorden/mcp-server-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.32-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![Cloudflare Workers](https://img.shields.io/badge/runs%20on-Cloudflare%20Workers%20%7C%20Node-orange)

A small, **production-minded** starting point for a [Model Context Protocol](https://modelcontextprotocol.io) server that Claude, Cursor, VS Code, ChatGPT and agent frameworks can connect to.

- **Stateless Streamable HTTP** (`POST /mcp`): any replica or Worker isolate can answer any request, so scaling and deploys never drop sessions.
- **stdio** for local clients (Claude Desktop, Cursor, Claude Code).
- **One codebase, two runtimes**: Node (`src/node.ts`) and Cloudflare Workers (`src/worker.ts`).
- **The boring edge cases handled**: GET/DELETE `/mcp` → `405` JSON (no reconnect loops), unknown and `.well-known` paths → JSON `404` (never your HTML page), Origin check, body size limit.
- **One example tool** (`time_in_zone`) with input/output schemas, annotations and error handling.
- **`preflight`**: a checker you run against any deployed MCP URL before you share it.
- **11 tests** with a real MCP client (in-process, real HTTP server, and stdio).

## Quick start

```bash
git clone https://github.com/ninonorden/mcp-server-starter.git
cd mcp-server-starter
npm install
npm run dev            # http://127.0.0.1:3000/mcp
npm test
```

Try it with the MCP Inspector: `npm run inspector`, then connect to `http://127.0.0.1:3000/mcp` (transport: Streamable HTTP).

## Preflight: will real clients work with my server?

```bash
npm run preflight -- https://your-server.example.com/mcp
```

```
HTTP methods
  ✓ GET -> 405
  ✓ DELETE -> 405
Discovery paths
  ✓ /.well-known/oauth-protected-resource/mcp -> 404
  ✓ /.well-known/oauth-protected-resource -> 404
  ✓ /.well-known/oauth-authorization-server -> 404
Auth challenge
  ! unauthenticated tools/call -> 200 (server is public; make sure that is intended)
MCP session
  ✓ initialize -> mcp-server-starter@1.0.0 in 27 ms
  ✓ tools/list -> 1 tools in 15 ms

PASSED: 0 failure(s), 1 warning(s)
```

It catches the failures that most often break clients in production: HTML catch-all routes answering `GET /mcp` or `.well-known` paths, `401` without `WWW-Authenticate`, broken `initialize`, tools without descriptions/annotations, invalid tool names and slow responses. It works against **any** MCP server, not only this one. Pass `--key <apiKey>` or `--token <bearer>` for protected servers.

## Connect a client

**Claude Code**
```bash
claude mcp add --transport http my-server https://your-server.example.com/mcp
```

**Cursor** (`.cursor/mcp.json`) / **Claude Desktop** (stdio, after `npm run build`)
```json
{
  "mcpServers": {
    "my-server-remote": { "url": "https://your-server.example.com/mcp" },
    "my-server-local": { "command": "node", "args": ["/absolute/path/to/mcp-server-starter/dist/stdio.js"] }
  }
}
```

## Deploy

**Cloudflare Workers**
```bash
npx wrangler login
npm run cf:deploy      # https://mcp-server-starter.<you>.workers.dev/mcp
npm run preflight -- https://mcp-server-starter.<you>.workers.dev/mcp
```

**Node anywhere** (Fly.io, Railway, Render, a VM): `npm run build && HOST=0.0.0.0 PORT=8080 npm start`.

Set `ALLOWED_ORIGINS=https://your-web-app.com` if a browser app calls the server directly (localhost is always allowed).

## Add a tool

Open `src/server.ts` and add another `server.registerTool(...)`. Tips that make models use your tool well:
- Write the description for the model: what it does and **when** to use it.
- Add `annotations` (`readOnlyHint`, `destructiveHint`) so clients can ask for confirmation.
- Return `isError: true` with a helpful message instead of throwing.

## Project layout

```
src/server.ts   MCP server + tools (created per request)
src/app.ts      Hono app: /mcp, 405/404 handling, Origin + size checks
src/node.ts     Node entry (Streamable HTTP)
src/worker.ts   Cloudflare Workers entry
src/stdio.ts    stdio entry
scripts/preflight.ts
test/           in-process, HTTP edge cases, end-to-end (real server + stdio)
```

## Need auth, multi-tenancy and billing? → Pro

This starter is intentionally small: it has **no authentication**, so anything you deploy is public. When your server goes to real users, the **[MCP Server Starter Kit Pro](https://ninonorden.github.io/ninoventures/mcp-server-starter-kit.html)** ($39 one-time) adds:

| | Free starter | Pro |
| --- | :---: | :---: |
| Stateless Streamable HTTP + stdio, TypeScript | ✓ | ✓ |
| `preflight` checker | ✓ | ✓ (+ auth checks, key hashing) |
| **Python** version (official SDK v2) | | ✓ |
| **API keys** (hashed, scoped) | | ✓ |
| **OAuth 2.1 resource server** (protected-resource metadata, JWKS, audience checks), works with ChatGPT/Claude connectors | | ✓ |
| Per-caller server binding / tenant isolation | | ✓ |
| Rate limiting, SSRF-safe fetch, timeouts | | ✓ |
| Metering hook + Apify pay-per-event Actor (charge per tool call) | | ✓ |
| Deploy configs: Workers, Vercel, Fly, Docker, Apify | Workers | ✓ |
| 7 guides (architecture, auth, clients, deploy, monetize, checklist, publish) + `AGENTS.md` | | ✓ |
| 48 tests | 11 | 48 |

**[Get MCP Server Starter Kit Pro: $39 →](https://buy.polar.sh/polar_cl_MdemhJ72jGx4ILhnmA3Sq1VDyMRO215Dd7Uke3FQVIe)** · 14-day money-back guarantee · unlimited projects

## License

MIT © Nino Ventures
