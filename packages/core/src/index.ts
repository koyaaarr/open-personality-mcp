/**
 * @openpersonality/core — Public API
 *
 * Core logic for Open Personality: facets, templates, confidence merge, validation, data.
 */

// Types (all exported)
export type {
  FacetValue,
  FacetResult,
  FacetWithConfidence,
  FacetHistoryEntry,
  FacetWithHistory,
  FacetDefinition,
  FacetCategory,
  Demographics,
  Language,
  ProfileData,
  ProfileSummary,
  FacetChangeResult,
  DriftWarning,
  PresetCharacter,
  ProfileStore,
  StoreConfig,
} from './types.js';

// Facet operations
export {
  getFacets,
  getFacetDescription,
  getFacetLabel,
  getFacetsGroupedByCategory,
  randomFacets,
  getCategoryForFacet,
  getPresets,
  getPreset,
} from './facets.js';

// Template generation
export { generateSoulMd, generateIdentityMd } from './templates.js';

// Confidence merge & drift detection
export { mergeFacets, detectDrift } from './confidence.js';

// Validation
export {
  validateProfile,
  profileSchema,
  createProfileInputSchema,
  updateProfileInputSchema,
  validateFacetValue,
  validateConfidence,
} from './validation.js';
export type { CreateProfileInput, UpdateProfileInput } from './validation.js';
