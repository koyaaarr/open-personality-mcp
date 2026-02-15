/**
 * MCP Tool: create_profile
 *
 * Create a new profile with minimal input (name only required).
 * See: docs/mcp-design.md §5.1
 */

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ProfileStore,
  FacetWithHistory,
  Demographics,
  Language,
  ProfileData,
} from '@openpersonality/core';
import { generateSoulMd, generateIdentityMd } from '@openpersonality/core';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerCreateProfile(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.tool(
    'create_profile',
    'Create a new personality profile. Only name is required; facets and demographics are optional.',
    {
      name: z.string().min(1).describe('Profile name (required)'),
      external_id: z.string().optional().describe('External system user ID (for bots)'),
      facets: z
        .record(
          z.string(),
          z.object({
            value: z.enum(['a', 'b']),
            confidence: z.number().min(0).max(1),
          }),
        )
        .optional()
        .describe('Facet values with confidence scores'),
      demographics: z
        .object({
          name: z.string().optional(),
          creature: z.string().optional(),
          emoji: z.string().optional(),
          vibe: z.string().optional(),
          first_person: z.string().optional(),
          catchphrase: z.string().optional(),
          speaking_tone: z.string().optional(),
          greeting: z.string().optional(),
          gender: z.string().optional(),
          age: z.string().optional(),
          occupation: z.string().optional(),
          backstory: z.string().optional(),
        })
        .optional()
        .describe('Demographics fields'),
      soul_md: z.string().optional().describe('Pre-generated SOUL.md (if provided, skips template generation)'),
      identity_md: z.string().optional().describe('Pre-generated IDENTITY.md'),
      language: z.enum(['en', 'ja']).optional().describe('Output language'),
    },
    async (args) => {
      // Check for duplicate external_id
      if (args.external_id) {
        const existing = await store.loadByExternalId(args.external_id);
        if (existing) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `A profile with external_id "${args.external_id}" already exists. Use update_profile instead.`,
                }),
              },
            ],
            isError: true,
          };
        }
      }

      const now = new Date().toISOString();
      const language: Language = args.language ?? 'en';
      const profileId = randomUUID();

      // Build facets with history
      const facets: Record<string, FacetWithHistory> = {};
      if (args.facets) {
        for (const [key, val] of Object.entries(args.facets)) {
          const conf = Math.max(0, Math.min(1, val.confidence));
          facets[key] = {
            value: val.value,
            confidence: conf,
            history: [
              {
                value: val.value,
                confidence: conf,
                source: 'initial_creation',
                at: now,
              },
            ],
          };
        }
      }

      const demographics: Demographics = {
        name: args.name,
        ...args.demographics,
      };

      const profile: ProfileData = {
        id: profileId,
        external_id: args.external_id,
        name: args.name,
        created_at: now,
        updated_at: now,
        version: 1,
        language,
        facets,
        demographics,
      };

      // Generate or use provided SOUL.md / IDENTITY.md
      const generationMode = args.soul_md ? 'provided' : 'template';
      const soulMd = args.soul_md ?? generateSoulMd(facets, demographics, language);
      const identityMd = args.identity_md ?? generateIdentityMd(facets, demographics, language);

      await store.save(profile, soulMd, identityMd);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                profile_id: profileId,
                external_id: args.external_id,
                facets,
                soul_md: soulMd,
                identity_md: identityMd,
                storage_path: store.getProfilePath(profileId),
                generation_mode: generationMode,
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
