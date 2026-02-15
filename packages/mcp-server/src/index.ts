/**
 * Entry point: stdio transport for MCP Server.
 *
 * See: docs/mcp-design.md §2 (Install & startup)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Failed to start Open Personality MCP server:', error);
  process.exit(1);
});
