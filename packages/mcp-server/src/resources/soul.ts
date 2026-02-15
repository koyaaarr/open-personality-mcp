/**
 * MCP Resource: op://profiles/{id}/soul
 *
 * Returns SOUL.md text (read-only).
 * See: docs/mcp-design.md §6
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerSoulResource(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.resource(
    'soul',
    new ResourceTemplate('op://profiles/{id}/soul', {
      list: async () => {
        const summaries = await store.list();
        return {
          resources: summaries.map((s) => ({
            uri: `op://profiles/${s.id}/soul`,
            name: `${s.name} - SOUL.md`,
            mimeType: 'text/markdown',
          })),
        };
      },
    }),
    { mimeType: 'text/markdown', description: 'SOUL.md text' },
    async (uri, params) => {
      const id = params.id as string;
      const result = await store.load(id);
      if (!result) {
        return { contents: [] };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: result.soulMd,
          },
        ],
      };
    },
  );
}
