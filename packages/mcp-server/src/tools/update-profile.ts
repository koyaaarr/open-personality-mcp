/**
 * MCP Tool: update_profile (Progressive Profile core)
 *
 * Partial update of facets/demographics with confidence merge and drift detection.
 * See: docs/mcp-design.md §5.2
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  mergeFacets,
  generateSoulMd,
  generateIdentityMd,
  VersionConflictError,
  facetInputSchema,
  demographicsSchema,
} from '@openpersonality/core';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerUpdateProfile(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.tool(
    'update_profile',
    'Update an existing profile with new facets/demographics. Performs confidence merge and drift detection.',
    {
      profile_id: z.string().max(500).optional().describe('Profile UUID'),
      external_id: z.string().max(500).optional().describe('External system user ID'),
      facets: facetInputSchema
        .optional()
        .describe('Facet values to merge (facet_1..facet_12)'),
      demographics: demographicsSchema
        .partial()
        .optional()
        .describe('Demographics fields to update'),
      soul_md: z.string().max(1_000_000).optional().describe('Pre-generated SOUL.md'),
      identity_md: z.string().max(1_000_000).optional().describe('Pre-generated IDENTITY.md'),
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

      const { profile } = result;
      const loadedVersion = profile.version;
      const now = new Date().toISOString();

      // Merge facets
      let changes: ReturnType<typeof mergeFacets>['changes'] = [];
      let driftWarnings: ReturnType<typeof mergeFacets>['driftWarnings'] = [];

      if (args.facets) {
        const mergeResult = mergeFacets(profile.facets, args.facets);
        profile.facets = mergeResult.merged;
        changes = mergeResult.changes;
        driftWarnings = mergeResult.driftWarnings;
      }

      // Update demographics (only specified fields)
      if (args.demographics) {
        Object.assign(profile.demographics, args.demographics);
      }

      profile.updated_at = now;
      profile.version += 1;

      // Generate or use provided SOUL.md / IDENTITY.md
      const soulMd =
        args.soul_md ??
        generateSoulMd(profile.facets, profile.demographics, profile.language);
      const identityMd =
        args.identity_md ??
        generateIdentityMd(profile.facets, profile.demographics, profile.language);

      try {
        await store.save(profile, soulMd, identityMd, loadedVersion);
      } catch (err) {
        if (err instanceof VersionConflictError) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: err.message,
                  code: 'VERSION_CONFLICT',
                }),
              },
            ],
            isError: true,
          };
        }
        throw err;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                profile_id: profile.id,
                changes,
                drift_warnings: driftWarnings.map((w) => w.message),
                soul_md: soulMd,
                identity_md: identityMd,
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
