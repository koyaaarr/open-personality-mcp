import { describe, it, expect } from 'vitest';
import { mergeFacets, detectDrift } from '../confidence.js';
import type { FacetWithHistory, FacetWithConfidence, FacetChangeResult } from '../types.js';

function makeHistory(value: 'a' | 'b', confidence: number): FacetWithHistory {
  return {
    value,
    confidence,
    history: [{ value, confidence, source: 'test', at: '2026-01-01T00:00:00Z' }],
  };
}

describe('mergeFacets', () => {
  it('adds new facets that dont exist', () => {
    const existing: Record<string, FacetWithHistory> = {};
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'a', confidence: 0.7 },
    };

    const { merged, changes } = mergeFacets(existing, incoming);
    expect(merged.facet_1.value).toBe('a');
    expect(merged.facet_1.confidence).toBe(0.7);
    expect(changes).toHaveLength(1);
    expect(changes[0].reason).toBe('new_facet');
  });

  it('boosts confidence for same value', () => {
    const existing = { facet_1: makeHistory('a', 0.6) };
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'a', confidence: 0.5 },
    };

    const { merged } = mergeFacets(existing, incoming);
    // 1 - (1 - 0.6) * (1 - 0.5) = 1 - 0.4 * 0.5 = 0.8
    expect(merged.facet_1.confidence).toBeCloseTo(0.8);
    expect(merged.facet_1.value).toBe('a');
  });

  it('adopts higher confidence when values differ', () => {
    const existing = { facet_1: makeHistory('a', 0.4) };
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'b', confidence: 0.7 },
    };

    const { merged, changes } = mergeFacets(existing, incoming);
    expect(merged.facet_1.value).toBe('b');
    expect(merged.facet_1.confidence).toBe(0.7);
    expect(changes[0].reason).toBe('higher_confidence_override');
  });

  it('retains existing when existing has higher confidence', () => {
    const existing = { facet_1: makeHistory('a', 0.8) };
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'b', confidence: 0.3 },
    };

    const { merged } = mergeFacets(existing, incoming);
    expect(merged.facet_1.value).toBe('a');
    expect(merged.facet_1.confidence).toBe(0.8);
  });

  it('user-confirmed (1.0) always wins', () => {
    const existing = { facet_1: makeHistory('a', 0.9) };
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'b', confidence: 1.0 },
    };

    const { merged, changes } = mergeFacets(existing, incoming);
    expect(merged.facet_1.value).toBe('b');
    expect(merged.facet_1.confidence).toBe(1.0);
    expect(changes[0].reason).toBe('user_confirmed');
  });

  it('preserves existing user-confirmed value', () => {
    const existing = { facet_1: makeHistory('a', 1.0) };
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'b', confidence: 0.8 },
    };

    const { merged } = mergeFacets(existing, incoming);
    expect(merged.facet_1.value).toBe('a');
    expect(merged.facet_1.confidence).toBe(1.0);
  });

  it('appends to history on changes', () => {
    const existing = { facet_1: makeHistory('a', 0.5) };
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'a', confidence: 0.5 },
    };

    const { merged } = mergeFacets(existing, incoming);
    expect(merged.facet_1.history).toHaveLength(2);
  });

  it('does not create change record when nothing changes', () => {
    const existing = { facet_1: makeHistory('a', 0.8) };
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'b', confidence: 0.3 },
    };

    const { changes } = mergeFacets(existing, incoming);
    // existing retained (0.8 > 0.3), no actual change
    expect(changes).toHaveLength(0);
  });

  it('clamps out-of-range confidence', () => {
    const existing: Record<string, FacetWithHistory> = {};
    const incoming: Record<string, FacetWithConfidence> = {
      facet_1: { value: 'a', confidence: 1.5 },
    };

    const { merged } = mergeFacets(existing, incoming);
    expect(merged.facet_1.confidence).toBe(1.0);
  });
});

describe('detectDrift', () => {
  it('warns on flip with similar confidence', () => {
    const changes: FacetChangeResult[] = [
      {
        facet: 'facet_1',
        previous: { value: 'a', confidence: 0.6 },
        current: { value: 'b', confidence: 0.65 },
        reason: 'higher_confidence_override',
      },
    ];

    const warnings = detectDrift(changes);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].facet).toBe('facet_1');
    expect(warnings[0].message).toContain('flipped');
  });

  it('does not warn on flip with large confidence difference', () => {
    const changes: FacetChangeResult[] = [
      {
        facet: 'facet_1',
        previous: { value: 'a', confidence: 0.3 },
        current: { value: 'b', confidence: 0.8 },
        reason: 'higher_confidence_override',
      },
    ];

    const warnings = detectDrift(changes);
    expect(warnings).toHaveLength(0);
  });

  it('warns when 3+ facets flip', () => {
    const changes: FacetChangeResult[] = [
      {
        facet: 'facet_1',
        previous: { value: 'a', confidence: 0.3 },
        current: { value: 'b', confidence: 0.8 },
        reason: 'higher_confidence_override',
      },
      {
        facet: 'facet_2',
        previous: { value: 'a', confidence: 0.3 },
        current: { value: 'b', confidence: 0.8 },
        reason: 'higher_confidence_override',
      },
      {
        facet: 'facet_3',
        previous: { value: 'a', confidence: 0.3 },
        current: { value: 'b', confidence: 0.8 },
        reason: 'higher_confidence_override',
      },
    ];

    const warnings = detectDrift(changes);
    expect(warnings.some((w) => w.facet === '_global')).toBe(true);
    expect(warnings.find((w) => w.facet === '_global')!.message).toContain(
      '3 facets changed',
    );
  });

  it('does not warn on confidence boost (same value)', () => {
    const changes: FacetChangeResult[] = [
      {
        facet: 'facet_1',
        previous: { value: 'a', confidence: 0.5 },
        current: { value: 'a', confidence: 0.75 },
        reason: 'confidence_boost',
      },
    ];

    const warnings = detectDrift(changes);
    expect(warnings).toHaveLength(0);
  });
});
