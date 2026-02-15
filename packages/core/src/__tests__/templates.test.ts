import { describe, it, expect } from 'vitest';
import { generateSoulMd, generateIdentityMd } from '../templates.js';
import type { FacetWithHistory, Demographics } from '../types.js';

function makeFacet(value: 'a' | 'b', confidence: number): FacetWithHistory {
  return {
    value,
    confidence,
    history: [{ value, confidence, source: 'test', at: '2026-01-01T00:00:00Z' }],
  };
}

const sampleFacets: Record<string, FacetWithHistory> = {
  facet_1: makeFacet('a', 0.8),
  facet_2: makeFacet('a', 0.6),
  facet_3: makeFacet('b', 0.3),
  facet_6: makeFacet('b', 1.0),
  facet_8: makeFacet('b', 0.5),
};

const sampleDemographics: Demographics = {
  name: 'Taro',
  creature: 'Software Engineer',
  emoji: '💻',
  vibe: 'calm & logical',
  first_person: '僕',
  catchphrase: 'なるほど',
  speaking_tone: '落ち着いて論理的',
  occupation: 'エンジニア',
};

describe('generateSoulMd', () => {
  it('includes all required sections', () => {
    const md = generateSoulMd(sampleFacets, sampleDemographics, 'en');
    expect(md).toContain("# Taro's SOUL");
    expect(md).toContain('## Core Truths');
    expect(md).toContain('## Boundaries');
    expect(md).toContain('## Vibe');
    expect(md).toContain('## Continuity');
    expect(md).toContain('## Facet Profile');
  });

  it('facet table shows correct confidence markers', () => {
    const md = generateSoulMd(sampleFacets, sampleDemographics, 'en');
    // facet_1: confidence 0.8 → "Assertive" (no prefix/suffix)
    expect(md).toMatch(/\| 1 \|.*\| Assertive \|/);
    // facet_3: confidence 0.3 → "~Follower" (tentative)
    expect(md).toMatch(/\| 3 \|.*\| ~Follower \|/);
    // facet_6: confidence 1.0 → "Logical ✓" (user-confirmed)
    expect(md).toMatch(/\| 6 \|.*\| Logical ✓ \|/);
    // facet_4: not in sampleFacets → "?"
    expect(md).toMatch(/\| 4 \|.*\| \? \|/);
  });

  it('works with empty facets', () => {
    const md = generateSoulMd({}, { name: 'Empty' }, 'en');
    expect(md).toContain("# Empty's SOUL");
    expect(md).toContain('Not enough information yet');
    // All facets should show "?"
    const questionMarks = md.match(/\| \? \|/g);
    expect(questionMarks).toHaveLength(12);
  });

  it('generates Japanese output', () => {
    const md = generateSoulMd(sampleFacets, sampleDemographics, 'ja');
    expect(md).toContain('ファセット');
    expect(md).toContain('このプロファイルは12のバイナリファセット');
  });

  it('includes Vibe section with demographics', () => {
    const md = generateSoulMd(sampleFacets, sampleDemographics, 'en');
    expect(md).toContain('## Vibe');
    expect(md).toContain('落ち着いて論理的'); // speaking_tone
    expect(md).toContain('First person:');
    expect(md).toContain('Catchphrase:');
  });

  it('omits Vibe section when no demographics', () => {
    const md = generateSoulMd(sampleFacets, { name: 'NoVibe' }, 'en');
    expect(md).not.toContain('## Vibe');
  });
});

describe('generateIdentityMd', () => {
  it('includes all required sections', () => {
    const md = generateIdentityMd(sampleFacets, sampleDemographics, 'en');
    expect(md).toContain('# Taro');
    expect(md).toContain('**Name**: Taro');
    expect(md).toContain('**Creature**: Software Engineer');
    expect(md).toContain('## Speaking Style');
    expect(md).toContain('## Background');
    expect(md).toContain('## Personality');
    expect(md).toContain('## Facet Vector');
  });

  it('omits empty demographics sections', () => {
    const md = generateIdentityMd(sampleFacets, { name: 'Minimal' }, 'en');
    expect(md).not.toContain('## Speaking Style');
    expect(md).not.toContain('## Background');
  });

  it('personality section lists known facet descriptions', () => {
    const md = generateIdentityMd(sampleFacets, sampleDemographics, 'en');
    // facet_1 (a, conf 0.8) should be included in personality
    expect(md).toContain('assert');
    // facet_6 (b, conf 1.0) should be included
    expect(md).toContain('analysis');
  });

  it('facet vector table shows same markers as SOUL.md', () => {
    const md = generateIdentityMd(sampleFacets, sampleDemographics, 'en');
    expect(md).toMatch(/\| 6 \|.*\| Logical ✓ \|/);
    expect(md).toMatch(/\| 4 \|.*\| \? \|/);
  });
});
