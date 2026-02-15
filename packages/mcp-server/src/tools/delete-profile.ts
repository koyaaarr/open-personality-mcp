/**
 * MCP Tool: delete_profile
 *
 * Delete a profile by profile_id or external_id.
 * See: docs/mcp-design.md §5.6
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerDeleteProfile(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.tool(
    'delete_profile',
    'Delete a personality profile by profile_id or external_id.',
    {
      profile_id: z.string().optional().describe('Profile UUID'),
      external_id: z.string().optional().describe('External system user ID'),
    },
    async (args) => {
      if (!args.profile_id && !args.external_id) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Either profile_id or external_id must be provided.',
              }),
            },
          ],
          isError: true,
        };
      }

      let deleted = false;

      if (args.profile_id) {
        deleted = await store.delete(args.profile_id);
      } else if (args.external_id) {
        const result = await store.loadByExternalId(args.external_id);
        if (result) {
          deleted = await store.delete(result.profile.id);
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ deleted }),
          },
        ],
      };
    },
  );
}
