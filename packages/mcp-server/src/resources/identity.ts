/**
 * MCP Resource: op://profiles/{id}/identity
 *
 * Returns IDENTITY.md text (read-only).
 * See: docs/mcp-design.md §6
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerIdentityResource(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.resource(
    'identity',
    new ResourceTemplate('op://profiles/{id}/identity', {
      list: async () => {
        const summaries = await store.list();
        return {
          resources: summaries.map((s) => ({
            uri: `op://profiles/${s.id}/identity`,
            name: `${s.name} - IDENTITY.md`,
            mimeType: 'text/markdown',
          })),
        };
      },
    }),
    { mimeType: 'text/markdown', description: 'IDENTITY.md text' },
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
            text: result.identityMd,
          },
        ],
      };
    },
  );
}
