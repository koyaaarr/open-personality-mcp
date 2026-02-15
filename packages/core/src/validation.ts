/**
 * Profile data validation using Zod schemas.
 *
 * See: docs/llm-prompt-spec.md §3 (Error handling), docs/mcp-design.md §5
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const facetValueSchema = z.enum(['a', 'b']);

const confidenceSchema = z.number().transform((v) => Math.max(0, Math.min(1, v)));

const languageSchema = z.enum(['en', 'ja']);

// ---------------------------------------------------------------------------
// Facet schemas
// ---------------------------------------------------------------------------

const facetWithConfidenceSchema = z.object({
  value: facetValueSchema,
  confidence: confidenceSchema,
});

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
// ---------------------------------------------------------------------------

const demographicsSchema = z.object({
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
});

// ---------------------------------------------------------------------------
// ProfileData
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  id: z.string().min(1),
  external_id: z.string().optional(),
  name: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number().int().min(1),
  language: languageSchema,
  facets: z.record(z.string(), facetWithHistorySchema),
  demographics: demographicsSchema,
});

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

export const createProfileInputSchema = z.object({
  name: z.string().min(1, 'Profile name is required'),
  external_id: z.string().optional(),
  facets: z.record(z.string(), facetWithConfidenceSchema).optional(),
  demographics: demographicsSchema.optional(),
  soul_md: z.string().optional(),
  identity_md: z.string().optional(),
  language: languageSchema.optional(),
});

export const updateProfileInputSchema = z
  .object({
    profile_id: z.string().optional(),
    external_id: z.string().optional(),
    facets: z.record(z.string(), facetWithConfidenceSchema).optional(),
    demographics: demographicsSchema.partial().optional(),
    soul_md: z.string().optional(),
    identity_md: z.string().optional(),
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
