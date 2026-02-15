/**
 * MCP Resource: op://profiles/{id}
 *
 * Returns profile structured JSON (read-only).
 * See: docs/mcp-design.md §6
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerProfileResource(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.resource(
    'profile',
    new ResourceTemplate('op://profiles/{id}', {
      list: async () => {
        const summaries = await store.list();
        return {
          resources: summaries.map((s) => ({
            uri: `op://profiles/${s.id}`,
            name: s.name,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    { mimeType: 'application/json', description: 'Profile structured JSON' },
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
            mimeType: 'application/json',
            text: JSON.stringify(result.profile, null, 2),
          },
        ],
      };
    },
  );
}
