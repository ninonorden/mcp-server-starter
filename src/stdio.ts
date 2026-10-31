#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

/**
 * stdio entry point for Claude Desktop, Cursor, Claude Code, VS Code...
 * Never write to stdout yourself: it is the protocol channel. Log to stderr.
 */
await createMcpServer().connect(new StdioServerTransport());
console.error("mcp-server-starter ready on stdio");
