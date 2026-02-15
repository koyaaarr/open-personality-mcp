/**
 * Facet data access and utility functions.
 *
 * Reads data/*.json and provides typed access to facet definitions,
 * descriptions, labels, and presets.
 *
 * See: docs/prd.md §3.5, docs/mcp-design.md §3
 */

import type {
  FacetCategory,
  FacetDefinition,
  FacetResult,
  FacetValue,
  Language,
  PresetCharacter,
} from './types.js';

import facetsData from './data/facets.json';
import descriptionsData from './data/facet_descriptions.json';
import presetsData from './data/presets.json';

const facets = facetsData as FacetDefinition[];
const descriptions = descriptionsData as Record<
  string,
  Record<string, Record<string, string>>
>;
const presets = presetsData as unknown as PresetCharacter[];

/** Return all 12 facet definitions. */
export function getFacets(): FacetDefinition[] {
  return facets;
}

/** Get natural language description for a facet value. */
export function getFacetDescription(
  facetIndex: string,
  value: FacetValue,
  locale: Language = 'en',
): string {
  return descriptions[facetIndex]?.[value]?.[locale] ?? '';
}

/** Get short label for a facet value (e.g. "Assertive", "主張的"). */
export function getFacetLabel(
  facetIndex: string,
  value: FacetValue,
  locale: Language = 'en',
): string {
  const facet = facets.find((f) => f.facet_index === facetIndex);
  if (!facet) return '';
  const key = `label_${value}_${locale}` as keyof FacetDefinition;
  return (facet[key] as string) ?? '';
}

/** Group facets by their 4 categories. */
export function getFacetsGroupedByCategory(): Array<{
  category: FacetCategory;
  category_ja: string;
  facets: FacetDefinition[];
}> {
  const groups = new Map<
    FacetCategory,
    { category_ja: string; facets: FacetDefinition[] }
  >();

  for (const facet of facets) {
    const existing = groups.get(facet.category);
    if (existing) {
      existing.facets.push(facet);
    } else {
      groups.set(facet.category, {
        category_ja: facet.category_ja,
        facets: [facet],
      });
    }
  }

  return Array.from(groups.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));
}

/** Generate random binary facet values for all 12 facets. */
export function randomFacets(): FacetResult {
  const result: FacetResult = {};
  for (const facet of facets) {
    result[facet.facet_index] = Math.random() < 0.5 ? 'a' : 'b';
  }
  return result;
}

/** Get category for a facet index. Returns undefined if not found. */
export function getCategoryForFacet(
  facetIndex: string,
): FacetCategory | undefined {
  const facet = facets.find((f) => f.facet_index === facetIndex);
  return facet?.category;
}

/** Return all preset characters. */
export function getPresets(): PresetCharacter[] {
  return presets;
}

/** Get a preset character by ID. Returns undefined if not found. */
export function getPreset(id: string): PresetCharacter | undefined {
  return presets.find((p) => p.id === id);
}
