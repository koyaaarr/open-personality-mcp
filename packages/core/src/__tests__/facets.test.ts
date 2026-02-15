import { describe, it, expect } from 'vitest';
import {
  getFacets,
  getFacetDescription,
  getFacetLabel,
  getFacetsGroupedByCategory,
  randomFacets,
  getCategoryForFacet,
  getPresets,
  getPreset,
} from '../facets.js';

describe('getFacets', () => {
  it('returns all 12 facet definitions', () => {
    const facets = getFacets();
    expect(facets).toHaveLength(12);
    expect(facets[0].facet_index).toBe('facet_1');
    expect(facets[11].facet_index).toBe('facet_12');
  });

  it('each facet has required fields', () => {
    for (const facet of getFacets()) {
      expect(facet.facet_index).toMatch(/^facet_\d+$/);
      expect(facet.category).toBeTruthy();
      expect(facet.name_en).toBeTruthy();
      expect(facet.name_ja).toBeTruthy();
      expect(facet.label_a_en).toBeTruthy();
      expect(facet.label_b_en).toBeTruthy();
    }
  });
});

describe('getFacetDescription', () => {
  it('returns English description for facet_1 value "a"', () => {
    const desc = getFacetDescription('facet_1', 'a', 'en');
    expect(desc).toContain('assert');
  });

  it('returns Japanese description for facet_1 value "b"', () => {
    const desc = getFacetDescription('facet_1', 'b', 'ja');
    expect(desc).toContain('調和');
  });

  it('returns empty string for unknown facet', () => {
    expect(getFacetDescription('facet_99', 'a')).toBe('');
  });

  it('defaults to English locale', () => {
    const desc = getFacetDescription('facet_2', 'a');
    expect(desc).toBeTruthy();
    expect(desc).toContain('straightforward');
  });
});

describe('getFacetLabel', () => {
  it('returns short label in English', () => {
    expect(getFacetLabel('facet_1', 'a', 'en')).toBe('Assertive');
    expect(getFacetLabel('facet_1', 'b', 'en')).toBe('Harmonious');
  });

  it('returns short label in Japanese', () => {
    expect(getFacetLabel('facet_1', 'a', 'ja')).toBe('主張的');
    expect(getFacetLabel('facet_1', 'b', 'ja')).toBe('調和的');
  });

  it('returns empty string for unknown facet', () => {
    expect(getFacetLabel('facet_99', 'a')).toBe('');
  });
});

describe('getFacetsGroupedByCategory', () => {
  it('groups into 4 categories', () => {
    const groups = getFacetsGroupedByCategory();
    expect(groups).toHaveLength(4);
  });

  it('includes all 12 facets across groups', () => {
    const groups = getFacetsGroupedByCategory();
    const total = groups.reduce((sum, g) => sum + g.facets.length, 0);
    expect(total).toBe(12);
  });

  it('has correct category names', () => {
    const groups = getFacetsGroupedByCategory();
    const categories = groups.map((g) => g.category);
    expect(categories).toContain('communication');
    expect(categories).toContain('values');
    expect(categories).toContain('thinking');
    expect(categories).toContain('personality');
  });

  it('communication has 3 facets (1-3)', () => {
    const groups = getFacetsGroupedByCategory();
    const comm = groups.find((g) => g.category === 'communication');
    expect(comm!.facets).toHaveLength(3);
    expect(comm!.facets.map((f) => f.facet_index)).toEqual([
      'facet_1',
      'facet_2',
      'facet_3',
    ]);
  });
});

describe('randomFacets', () => {
  it('returns 12 facet values', () => {
    const result = randomFacets();
    expect(Object.keys(result)).toHaveLength(12);
  });

  it('all values are "a" or "b"', () => {
    const result = randomFacets();
    for (const value of Object.values(result)) {
      expect(['a', 'b']).toContain(value);
    }
  });

  it('keys match facet indices', () => {
    const result = randomFacets();
    for (let i = 1; i <= 12; i++) {
      expect(result).toHaveProperty(`facet_${i}`);
    }
  });
});

describe('getCategoryForFacet', () => {
  it('returns correct category', () => {
    expect(getCategoryForFacet('facet_1')).toBe('communication');
    expect(getCategoryForFacet('facet_4')).toBe('values');
    expect(getCategoryForFacet('facet_6')).toBe('thinking');
    expect(getCategoryForFacet('facet_8')).toBe('personality');
  });

  it('returns undefined for unknown facet', () => {
    expect(getCategoryForFacet('facet_99')).toBeUndefined();
  });
});

describe('getPresets', () => {
  it('returns 5 preset characters', () => {
    expect(getPresets()).toHaveLength(5);
  });

  it('each preset has complete facets', () => {
    for (const preset of getPresets()) {
      expect(Object.keys(preset.facets)).toHaveLength(12);
    }
  });
});

describe('getPreset', () => {
  it('finds preset by id', () => {
    const coach = getPreset('the_coach');
    expect(coach).toBeDefined();
    expect(coach!.name_en).toBe('The Coach');
  });

  it('returns undefined for unknown id', () => {
    expect(getPreset('unknown')).toBeUndefined();
  });
});
