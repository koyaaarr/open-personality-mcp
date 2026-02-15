/**
 * MCP Tool: get_or_create_profile (bot skill use case)
 *
 * Lookup by external_id; if not found, create new profile.
 * See: docs/mcp-design.md §5.3
 */

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Language, ProfileData } from '@openpersonality/core';
import { generateSoulMd, generateIdentityMd } from '@openpersonality/core';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerGetOrCreateProfile(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.tool(
    'get_or_create_profile',
    'Get a profile by external_id, or create a new one if it does not exist. Optimized for bot use cases.',
    {
      external_id: z.string().min(1).describe('External system user ID (required)'),
      name: z.string().optional().describe('Profile name for new profiles (defaults to external_id)'),
      language: z.enum(['en', 'ja']).optional().describe('Output language'),
    },
    async (args) => {
      // Try to find existing profile
      const existing = await store.loadByExternalId(args.external_id);
      if (existing) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  profile: existing.profile,
                  soul_md: existing.soulMd,
                  identity_md: existing.identityMd,
                  created: false,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Create new profile
      const now = new Date().toISOString();
      const language: Language = args.language ?? 'en';
      const profileName = args.name ?? args.external_id;

      const profile: ProfileData = {
        id: randomUUID(),
        external_id: args.external_id,
        name: profileName,
        created_at: now,
        updated_at: now,
        version: 1,
        language,
        facets: {},
        demographics: { name: profileName },
      };

      const soulMd = generateSoulMd(profile.facets, profile.demographics, language);
      const identityMd = generateIdentityMd(profile.facets, profile.demographics, language);

      await store.save(profile, soulMd, identityMd);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                profile,
                soul_md: soulMd,
                identity_md: identityMd,
                created: true,
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
