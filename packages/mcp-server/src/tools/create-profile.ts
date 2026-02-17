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
  FacetWithHistory,
  Demographics,
  Language,
  ProfileData,
} from '@openpersonality/core';
import {
  generateSoulMd,
  generateIdentityMd,
  facetInputSchema,
  demographicsSchema,
  languageSchema,
} from '@openpersonality/core';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerCreateProfile(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.tool(
    'create_profile',
    'Create a new personality profile. Only name is required; facets and demographics are optional.',
    {
      name: z.string().min(1).max(500).describe('Profile name (required)'),
      external_id: z.string().max(500).optional().describe('External system user ID (for bots)'),
      facets: facetInputSchema
        .optional()
        .describe('Facet values with confidence scores (facet_1..facet_12)'),
      demographics: demographicsSchema
        .optional()
        .describe('Demographics: 3 OpenClaw standard (creature, emoji, vibe) + 8 OP extension fields. All optional. name is top-level.'),
      soul_md: z.string().max(1_000_000).optional().describe('Pre-generated SOUL.md (if provided, skips template generation)'),
      identity_md: z.string().max(1_000_000).optional().describe('Pre-generated IDENTITY.md'),
      language: languageSchema.optional().describe('Output language'),
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
