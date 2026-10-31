import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { connect } from "./helpers.js";

describe("MCP over Streamable HTTP", () => {
  it("initializes and lists tools with descriptions and annotations", async () => {
    const client = await connect(createApp());
    expect(client.getServerVersion()?.name).toBe("mcp-server-starter");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(["time_in_zone"]);
    expect(tools[0].description!.length).toBeGreaterThan(20);
    expect(tools[0].annotations?.readOnlyHint).toBe(true);
    await client.close();
  });

  it("calls time_in_zone and returns structured content", async () => {
    const client = await connect(createApp());
    const res = await client.callTool({ name: "time_in_zone", arguments: { timeZone: "Europe/Amsterdam" } });
    expect(res.isError).toBeFalsy();
    expect((res.structuredContent as { timeZone: string }).timeZone).toBe("Europe/Amsterdam");
    await client.close();
  });

  it("returns a tool error (not a crash) for an unknown time zone", async () => {
    const client = await connect(createApp());
    const res = await client.callTool({ name: "time_in_zone", arguments: { timeZone: "Mars/Olympus" } });
    expect(res.isError).toBe(true);
    await client.close();
  });

  it("is stateless: two independent clients work against the same app", async () => {
    const app = createApp();
    const [a, b] = await Promise.all([connect(app), connect(app)]);
    expect((await a.listTools()).tools.length).toBe(1);
    expect((await b.listTools()).tools.length).toBe(1);
    await Promise.all([a.close(), b.close()]);
  });
});
