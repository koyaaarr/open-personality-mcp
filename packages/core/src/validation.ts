/**
 * Profile data validation using Zod schemas.
 *
 * See: docs/llm-prompt-spec.md §3 (Error handling), docs/mcp-design.md §5
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const facetValueSchema = z.enum(['a', 'b']);

export const confidenceSchema = z.number().transform((v) => Math.max(0, Math.min(1, v)));

export const languageSchema = z.enum(['en', 'ja']);

// ---------------------------------------------------------------------------
// Facet schemas
// ---------------------------------------------------------------------------

export const facetKeySchema = z.string().regex(
  /^facet_(1[0-2]|[1-9])$/,
  'Facet key must be facet_1 through facet_12',
);

export const facetWithConfidenceSchema = z.object({
  value: facetValueSchema,
  confidence: confidenceSchema,
});

/** Record of facet_1..facet_12 → FacetWithConfidence, for use in tool input schemas. */
export const facetInputSchema = z.record(facetKeySchema, facetWithConfidenceSchema);

const facetHistoryEntrySchema = z.object({
  value: facetValueSchema,
  confidence: confidenceSchema,
  source: z.string(),
  at: z.string(),
});

const facetWithHistorySchema = z.object({
  value: facetValueSchema,
  confidence: confidenceSchema,
  history: z.array(facetHistoryEntrySchema),
});

// ---------------------------------------------------------------------------
// Demographics
// OpenClaw standard: name, creature, emoji, vibe
// OP extension:      first_person .. backstory
// ---------------------------------------------------------------------------

const MAX_SHORT_TEXT = 500;
const MAX_BACKSTORY = 5000;

export const demographicsSchema = z.object({
  // OpenClaw Standard
  name: z.string().max(MAX_SHORT_TEXT).optional(),
  creature: z.string().max(MAX_SHORT_TEXT).optional(),
  emoji: z.string().max(50).optional(),
  vibe: z.string().max(MAX_SHORT_TEXT).optional(),
  // OP Extension: Speaking Style
  first_person: z.string().max(MAX_SHORT_TEXT).optional(),
  catchphrase: z.string().max(MAX_SHORT_TEXT).optional(),
  speaking_tone: z.string().max(MAX_SHORT_TEXT).optional(),
  greeting: z.string().max(MAX_SHORT_TEXT).optional(),
  // OP Extension: Background
  gender: z.string().max(MAX_SHORT_TEXT).optional(),
  age: z.string().max(MAX_SHORT_TEXT).optional(),
  occupation: z.string().max(MAX_SHORT_TEXT).optional(),
  backstory: z.string().max(MAX_BACKSTORY).optional(),
});

// ---------------------------------------------------------------------------
// ProfileData
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  id: z.string().min(1),
  external_id: z.string().max(MAX_SHORT_TEXT).optional(),
  name: z.string().min(1).max(MAX_SHORT_TEXT),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number().int().min(1),
  language: languageSchema,
  facets: z.record(facetKeySchema, facetWithHistorySchema),
  demographics: demographicsSchema,
});

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

const MAX_MARKDOWN = 1_000_000;

export const createProfileInputSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(MAX_SHORT_TEXT),
  external_id: z.string().max(MAX_SHORT_TEXT).optional(),
  facets: facetInputSchema.optional(),
  demographics: demographicsSchema.optional(),
  soul_md: z.string().max(MAX_MARKDOWN).optional(),
  identity_md: z.string().max(MAX_MARKDOWN).optional(),
  language: languageSchema.optional(),
});

export const updateProfileInputSchema = z
  .object({
    profile_id: z.string().max(MAX_SHORT_TEXT).optional(),
    external_id: z.string().max(MAX_SHORT_TEXT).optional(),
    facets: facetInputSchema.optional(),
    demographics: demographicsSchema.partial().optional(),
    soul_md: z.string().max(MAX_MARKDOWN).optional(),
    identity_md: z.string().max(MAX_MARKDOWN).optional(),
  })
  .refine((data) => data.profile_id || data.external_id, {
    message: 'Either profile_id or external_id must be provided',
  });

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Validate and parse full ProfileData. */
export function validateProfile(data: unknown): z.SafeParseReturnType<unknown, z.infer<typeof profileSchema>> {
  return profileSchema.safeParse(data);
}

/** Check if a value is a valid facet value ("a" | "b"). */
export function validateFacetValue(value: unknown): value is 'a' | 'b' {
  return value === 'a' || value === 'b';
}

/** Clamp confidence to 0.0-1.0 range. */
export function validateConfidence(confidence: number): number {
  return Math.max(0, Math.min(1, confidence));
}

// Re-export types for convenience
export type CreateProfileInput = z.infer<typeof createProfileInputSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
