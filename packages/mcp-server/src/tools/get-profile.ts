/**
 * MCP Tool: get_profile
 *
 * Retrieve profile by profile_id or external_id.
 * See: docs/mcp-design.md §5.4
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerGetProfile(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.tool(
    'get_profile',
    'Retrieve a personality profile by profile_id or external_id.',
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
              text: JSON.stringify({ error: 'Either profile_id or external_id must be provided.' }),
            },
          ],
          isError: true,
        };
      }

      const result = args.profile_id
        ? await store.load(args.profile_id)
        : await store.loadByExternalId(args.external_id!);

      if (!result) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Profile not found.' }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                profile: result.profile,
                soul_md: result.soulMd,
                identity_md: result.identityMd,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
