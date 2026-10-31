/* MIT License. Part of mcp-server-starter by Nino Ventures. */
/**
 * Preflight: run this against a deployed server BEFORE you share the URL.
 *
 *   npm run preflight -- https://mcp.example.com/mcp [--key sk_...] [--token <jwt>]
 *
 * It checks the failure modes that most often break real MCP clients:
 * HTML catch-alls on GET/DELETE and .well-known paths, missing WWW-Authenticate,
 * broken initialize, tools without descriptions/schemas, slow responses.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const args = process.argv.slice(2);

const url = args.find((a) => /^https?:\/\//.test(a));
if (!url) {
  console.error("usage: npm run preflight -- <https://host/mcp> [--key <apiKey>] [--token <bearer>]");
  process.exit(2);
}
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const secret = flag("--key") ?? flag("--token");
const authHeaders: Record<string, string> = secret ? { authorization: `Bearer ${secret}` } : {};

let failures = 0;
let warnings = 0;
const ok = (m: string) => console.log(`  \u2713 ${m}`);
const fail = (m: string) => (failures++, console.log(`  \u2717 ${m}`));
const warn = (m: string) => (warnings++, console.log(`  ! ${m}`));

const target = new URL(url);
const origin = target.origin;
const isJson = (r: Response) => (r.headers.get("content-type") ?? "").includes("json");

console.log(`\nPreflight for ${url}\n`);

console.log("HTTP methods");
for (const method of ["GET", "DELETE"]) {
  const r = await fetch(url, { method, headers: { accept: "text/event-stream", ...authHeaders } });
  const ct = r.headers.get("content-type") ?? "";
  if (r.status === 405) ok(`${method} -> 405`);
  else if (method === "GET" && ct.includes("text/event-stream")) ok(`GET -> SSE stream (stateful server)`);
  else if (ct.includes("text/html")) fail(`${method} -> ${r.status} HTML. A catch-all route is answering; clients will reconnect in a loop.`);
  else warn(`${method} -> ${r.status} ${ct}`);
  await r.body?.cancel();
}

console.log("Discovery paths");
for (const p of [
  "/.well-known/oauth-protected-resource" + (target.pathname === "/" ? "" : target.pathname),
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-authorization-server",
]) {
  const r = await fetch(origin + p);
  if (r.status === 200 && isJson(r)) ok(`${p} -> 200 JSON`);
  else if (r.status >= 400 && r.status < 500 && !(r.headers.get("content-type") ?? "").includes("html")) ok(`${p} -> ${r.status}`);
  else if (r.status === 200) fail(`${p} -> 200 non-JSON. Clients will try to parse it as OAuth metadata and crash.`);
  else warn(`${p} -> ${r.status}`);
  await r.body?.cancel();
}

console.log("Auth challenge");
{
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "__preflight__", arguments: {} } }),
  });
  if (r.status === 401) {
    const h = r.headers.get("www-authenticate");
    h ? ok(`unauthenticated tools/call -> 401, WWW-Authenticate: ${h.slice(0, 80)}`) : fail("401 without WWW-Authenticate header");
  } else warn(`unauthenticated tools/call -> ${r.status} (server is public; make sure that is intended)`);
  await r.body?.cancel();
}

console.log("MCP session");
try {
  const t0 = Date.now();
  const client = new Client({ name: "preflight", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(target, { requestInit: { headers: authHeaders } }));
  const info = client.getServerVersion();
  ok(`initialize -> ${info?.name}@${info?.version} in ${Date.now() - t0} ms`);
  const t1 = Date.now();
  const { tools } = await client.listTools();
  ok(`tools/list -> ${tools.length} tools in ${Date.now() - t1} ms`);
  for (const t of tools) {
    if (!t.description || t.description.length < 20) warn(`tool ${t.name}: description is short; models pick tools by description`);
    if (!t.annotations) warn(`tool ${t.name}: no annotations (readOnlyHint/destructiveHint help clients ask for confirmation)`);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(t.name)) fail(`tool ${t.name}: name must match ^[a-zA-Z0-9_-]{1,64}$ for most clients`);
  }
  const caps = client.getServerCapabilities();
  if (caps?.prompts) ok(`prompts/list -> ${(await client.listPrompts()).prompts.length} prompts`);
  if (caps?.resources) ok(`resources/list -> ${(await client.listResources()).resources.length} resources`);
  await client.close();
} catch (err) {
  fail(`MCP handshake failed: ${err instanceof Error ? err.message : err}`);
}

console.log(`\n${failures ? "FAILED" : "PASSED"}: ${failures} failure(s), ${warnings} warning(s)\n`);
process.exit(failures ? 1 : 0);
