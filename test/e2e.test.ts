import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serve, type ServerType } from "@hono/node-server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createApp } from "../src/app.js";

const run = promisify(execFile);
let server: ServerType;
let url: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = serve({ fetch: createApp().fetch, port: 0, hostname: "127.0.0.1" }, () => resolve());
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("end to end", () => {
  it("preflight passes against a real running server", async () => {
    const { stdout } = await run("npx", ["tsx", "scripts/preflight.ts", url], { timeout: 60_000 });
    expect(stdout).toContain("PASSED: 0 failure(s)");
  }, 60_000);

  it("stdio transport works", async () => {
    const client = new Client({ name: "stdio-test", version: "1.0.0" });
    await client.connect(new StdioClientTransport({ command: "npx", args: ["tsx", "src/stdio.ts"], stderr: "ignore" }));
    expect((await client.listTools()).tools[0].name).toBe("time_in_zone");
    await client.close();
  }, 60_000);
});
