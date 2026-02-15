import { describe, it, expect } from 'vitest';
import {
  validateProfile,
  validateFacetValue,
  validateConfidence,
  createProfileInputSchema,
  updateProfileInputSchema,
} from '../validation.js';

describe('validateFacetValue', () => {
  it('accepts "a" and "b"', () => {
    expect(validateFacetValue('a')).toBe(true);
    expect(validateFacetValue('b')).toBe(true);
  });

  it('rejects other values', () => {
    expect(validateFacetValue('c')).toBe(false);
    expect(validateFacetValue(1)).toBe(false);
    expect(validateFacetValue(null)).toBe(false);
  });
});

describe('validateConfidence', () => {
  it('passes through valid values', () => {
    expect(validateConfidence(0.5)).toBe(0.5);
    expect(validateConfidence(0)).toBe(0);
    expect(validateConfidence(1)).toBe(1);
  });

  it('clamps out-of-range values', () => {
    expect(validateConfidence(-0.5)).toBe(0);
    expect(validateConfidence(1.5)).toBe(1);
  });
});

describe('createProfileInputSchema', () => {
  it('accepts minimal input (name only)', () => {
    const result = createProfileInputSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createProfileInputSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts full input', () => {
    const result = createProfileInputSchema.safeParse({
      name: 'Test',
      external_id: 'discord:123',
      facets: {
        facet_1: { value: 'a', confidence: 0.8 },
      },
      demographics: {
        occupation: 'Engineer',
      },
      soul_md: '# My SOUL',
      language: 'ja',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid facet value', () => {
    const result = createProfileInputSchema.safeParse({
      name: 'Test',
      facets: {
        facet_1: { value: 'c', confidence: 0.8 },
      },
    });
    expect(result.success).toBe(false);
  });

  it('clamps confidence to 0-1 range', () => {
    const result = createProfileInputSchema.safeParse({
      name: 'Test',
      facets: {
        facet_1: { value: 'a', confidence: 1.5 },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.facets!.facet_1.confidence).toBe(1);
    }
  });
});

describe('updateProfileInputSchema', () => {
  it('accepts with profile_id', () => {
    const result = updateProfileInputSchema.safeParse({
      profile_id: 'uuid-123',
      facets: { facet_1: { value: 'b', confidence: 0.6 } },
    });
    expect(result.success).toBe(true);
  });

  it('accepts with external_id', () => {
    const result = updateProfileInputSchema.safeParse({
      external_id: 'discord:456',
      demographics: { occupation: 'Designer' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects without profile_id or external_id', () => {
    const result = updateProfileInputSchema.safeParse({
      facets: { facet_1: { value: 'a', confidence: 0.5 } },
    });
    expect(result.success).toBe(false);
  });
});

describe('validateProfile (full ProfileData)', () => {
  it('validates a complete profile', () => {
    const result = validateProfile({
      id: 'uuid-1',
      name: 'Test User',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      version: 1,
      language: 'en',
      facets: {
        facet_1: {
          value: 'a',
          confidence: 0.8,
          history: [
            { value: 'a', confidence: 0.8, source: 'test', at: '2026-01-01T00:00:00Z' },
          ],
        },
      },
      demographics: { name: 'Test User' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects profile with missing required fields', () => {
    const result = validateProfile({ id: 'uuid-1' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid language', () => {
    const result = validateProfile({
      id: 'uuid-1',
      name: 'Test',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      version: 1,
      language: 'fr',
      facets: {},
      demographics: {},
    });
    expect(result.success).toBe(false);
  });
});
