/**
 * Shared type definitions for Open Personality.
 *
 * All types used across core and mcp-server packages are defined here.
 * Based on: docs/prd.md §3, docs/mcp-design.md §5-8
 */

// ---------------------------------------------------------------------------
// Facet primitives
// ---------------------------------------------------------------------------

/** Binary facet value: "a" = option A, "b" = option B */
export type FacetValue = 'a' | 'b';

/** Simple facet result without confidence (used in presets, legacy compat) */
export type FacetResult = Record<string, FacetValue>;

/** Facet value with confidence score */
export interface FacetWithConfidence {
  value: FacetValue;
  /** 0.0 = unknown, 0.01-0.49 = tentative, 0.5-0.99 = estimated, 1.0 = user-confirmed */
  confidence: number;
}

/** Single history entry for a facet change */
export interface FacetHistoryEntry {
  value: FacetValue;
  confidence: number;
  source: string;
  at: string; // ISO-8601
}

/** Facet with full history */
export interface FacetWithHistory {
  value: FacetValue;
  confidence: number;
  history: FacetHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Facet definition (from facets.json)
// ---------------------------------------------------------------------------

/** Facet definition as stored in data/facets.json */
export interface FacetDefinition {
  facet_index: string;
  category: FacetCategory;
  category_ja: string;
  name_en: string;
  name_ja: string;
  label_a_en: string;
  label_a_ja: string;
  label_b_en: string;
  label_b_ja: string;
}

/** The four facet categories */
export type FacetCategory = 'communication' | 'values' | 'thinking' | 'personality';

// ---------------------------------------------------------------------------
// Demographics (12 fields for Phase 1 MVP)
// ---------------------------------------------------------------------------

/** Demographics for character creation. All fields optional. */
export interface Demographics {
  // Identity (4)
  name?: string;
  creature?: string;
  emoji?: string;
  vibe?: string;
  // Speaking style (4)
  first_person?: string;
  catchphrase?: string;
  speaking_tone?: string;
  greeting?: string;
  // Basic demographics (4)
  gender?: string;
  age?: string;
  occupation?: string;
  backstory?: string;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** Supported output languages */
export type Language = 'en' | 'ja';

/** Full profile data as stored in profile.json */
export interface ProfileData {
  id: string;
  external_id?: string;
  name: string;
  created_at: string; // ISO-8601
  updated_at: string; // ISO-8601
  version: number;
  language: Language;
  facets: Record<string, FacetWithHistory>;
  demographics: Demographics;
}

/** Summary for list_profiles output */
export interface ProfileSummary {
  id: string;
  external_id?: string;
  name: string;
  created_at: string;
  updated_at: string;
  facet_summary: string;
  completeness: number; // 0.0-1.0
}

// ---------------------------------------------------------------------------
// Confidence merge & drift
// ---------------------------------------------------------------------------

/** Result of merging a single facet update */
export interface FacetChangeResult {
  facet: string;
  previous: { value: FacetValue; confidence: number };
  current: { value: FacetValue; confidence: number };
  reason: string;
}

/** Drift warning from update_profile */
export interface DriftWarning {
  facet: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Preset characters (from presets.json)
// ---------------------------------------------------------------------------

/** Preset character definition */
export interface PresetCharacter {
  id: string;
  name_en: string;
  name_ja: string;
  emoji: string;
  description_en: string;
  description_ja: string;
  facets: FacetResult;
  demographics: Demographics;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

/** Abstract storage interface. Implemented by fs-store (mcp-server). */
export interface ProfileStore {
  save(profile: ProfileData, soulMd: string, identityMd: string): Promise<void>;
  load(profileId: string): Promise<{ profile: ProfileData; soulMd: string; identityMd: string } | null>;
  loadByExternalId(externalId: string): Promise<{ profile: ProfileData; soulMd: string; identityMd: string } | null>;
  list(): Promise<ProfileSummary[]>;
  delete(profileId: string): Promise<boolean>;
  getConfig(): Promise<StoreConfig>;
  saveConfig(config: StoreConfig): Promise<void>;
}

/** Global config stored at ~/.openpersonality/config.json */
export interface StoreConfig {
  default_profile?: string;
  language: Language;
  version: string;
}
