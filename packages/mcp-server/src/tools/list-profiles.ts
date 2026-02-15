/**
 * MCP Tool: list_profiles
 *
 * List all locally stored profiles with summary info.
 * See: docs/mcp-design.md §5.5
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerListProfiles(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.tool(
    'list_profiles',
    'List all locally stored personality profiles with summary information.',
    {},
    async () => {
      const profiles = await store.list();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ profiles }, null, 2),
          },
        ],
      };
    },
  );
}
