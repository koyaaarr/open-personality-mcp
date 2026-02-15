/**
 * SOUL.md / IDENTITY.md template generation.
 *
 * Generates structured markdown from facets + demographics using code logic (no LLM call).
 *
 * Confidence display rules:
 *   confidence = 0.0 → "?" (excluded from section generation)
 *   confidence < 0.5 → "~Value" (tentative)
 *   confidence >= 0.5 → "Value"
 *   confidence = 1.0 → "Value ✓" (user-confirmed)
 *
 * See: docs/llm-prompt-spec.md §2, docs/mcp-design.md §4
 */

import type {
  Demographics,
  FacetWithHistory,
  Language,
} from './types.js';

import {
  getFacetDescription,
  getFacetLabel,
  getFacets,
  getFacetsGroupedByCategory,
} from './facets.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFacetDisplay(
  facetIndex: string,
  facet: FacetWithHistory,
  locale: Language,
): string {
  const label = getFacetLabel(facetIndex, facet.value, locale);
  if (facet.confidence === 0) return '?';
  if (facet.confidence === 1.0) return `${label} ✓`;
  if (facet.confidence < 0.5) return `~${label}`;
  return label;
}

function isKnown(facet: FacetWithHistory | undefined): facet is FacetWithHistory {
  return facet != null && facet.confidence > 0;
}

// ---------------------------------------------------------------------------
// SOUL.md generation
// ---------------------------------------------------------------------------

/** Generate SOUL.md from structured profile data. */
export function generateSoulMd(
  facets: Record<string, FacetWithHistory>,
  demographics: Demographics,
  locale: Language = 'en',
): string {
  const sections: string[] = [];
  const name = demographics.name ?? 'Unknown';

  sections.push(`# ${name}'s SOUL`);
  sections.push('');

  // 1. Core Truths
  sections.push('## Core Truths');
  sections.push('');
  const coreTruths = generateCoreTruths(facets, locale);
  if (coreTruths.length > 0) {
    for (const truth of coreTruths) {
      sections.push(`- ${truth}`);
    }
  } else {
    sections.push(
      locale === 'ja'
        ? '_まだ十分な情報がありません。会話を続けると徐々に明らかになります。_'
        : '_Not enough information yet. Keep chatting to reveal more._',
    );
  }
  sections.push('');

  // 2. Boundaries
  sections.push('## Boundaries');
  sections.push('');
  const boundaries = generateBoundaries(facets, locale);
  if (boundaries.length > 0) {
    for (const boundary of boundaries) {
      sections.push(`- ${boundary}`);
    }
  } else {
    sections.push(
      locale === 'ja'
        ? '_境界はまだ特定されていません。_'
        : '_Boundaries not yet identified._',
    );
  }
  sections.push('');

  // 3. Vibe
  const vibeSection = generateVibe(demographics, locale);
  if (vibeSection) {
    sections.push('## Vibe');
    sections.push('');
    sections.push(vibeSection);
    sections.push('');
  }

  // 4. Continuity
  sections.push('## Continuity');
  sections.push('');
  sections.push(
    locale === 'ja'
      ? 'このプロファイルは12のバイナリファセット（Seakr Index）から生成された出発点です。会話を重ねるごとに精度が向上します。'
      : 'This profile is a starting point generated from 12 binary facets (Seakr Index). Accuracy improves with continued conversation.',
  );
  sections.push('');

  // 5. Facet Profile (Seakr Index)
  sections.push('## Facet Profile (Seakr Index)');
  sections.push('');
  sections.push(generateFacetTable(facets, locale));

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// IDENTITY.md generation
// ---------------------------------------------------------------------------

/** Generate IDENTITY.md from structured profile data. */
export function generateIdentityMd(
  facets: Record<string, FacetWithHistory>,
  demographics: Demographics,
  locale: Language = 'en',
): string {
  const sections: string[] = [];
  const name = demographics.name ?? 'Unknown';

  sections.push(`# ${name}`);
  sections.push('');

  // 1. Header fields
  const headerFields: string[] = [];
  if (demographics.name) headerFields.push(`**Name**: ${demographics.name}`);
  if (demographics.creature) headerFields.push(`**Creature**: ${demographics.creature}`);
  if (demographics.emoji) headerFields.push(`**Emoji**: ${demographics.emoji}`);
  if (demographics.vibe) headerFields.push(`**Vibe**: ${demographics.vibe}`);
  if (headerFields.length > 0) {
    sections.push(headerFields.join('  \n'));
    sections.push('');
  }

  // 2. Speaking Style
  const speakingParts: string[] = [];
  if (demographics.first_person) speakingParts.push(`**First Person**: ${demographics.first_person}`);
  if (demographics.catchphrase) speakingParts.push(`**Catchphrase**: ${demographics.catchphrase}`);
  if (demographics.speaking_tone) speakingParts.push(`**Tone**: ${demographics.speaking_tone}`);
  if (demographics.greeting) speakingParts.push(`**Greeting**: ${demographics.greeting}`);
  if (speakingParts.length > 0) {
    sections.push('## Speaking Style');
    sections.push('');
    sections.push(speakingParts.join('  \n'));
    sections.push('');
  }

  // 3. Background
  const bgParts: string[] = [];
  if (demographics.gender) bgParts.push(`**Gender**: ${demographics.gender}`);
  if (demographics.age) bgParts.push(`**Age**: ${demographics.age}`);
  if (demographics.occupation) bgParts.push(`**Occupation**: ${demographics.occupation}`);
  if (demographics.backstory) bgParts.push(`**Backstory**: ${demographics.backstory}`);
  if (bgParts.length > 0) {
    sections.push('## Background');
    sections.push('');
    sections.push(bgParts.join('  \n'));
    sections.push('');
  }

  // 4. Personality
  const personalityLines = generatePersonalitySection(facets, locale);
  if (personalityLines.length > 0) {
    sections.push('## Personality');
    sections.push('');
    for (const line of personalityLines) {
      sections.push(`- ${line}`);
    }
    sections.push('');
  }

  // 5. Facet Vector
  sections.push('## Facet Vector');
  sections.push('');
  sections.push(generateFacetTable(facets, locale));

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

function generateCoreTruths(
  facets: Record<string, FacetWithHistory>,
  locale: Language,
): string[] {
  const truths: string[] = [];
  const groups = getFacetsGroupedByCategory();

  for (const group of groups) {
    const knownFacets = group.facets.filter((fd) => isKnown(facets[fd.facet_index]));
    if (knownFacets.length === 0) continue;

    const descriptions = knownFacets.map((fd) => {
      const f = facets[fd.facet_index];
      return getFacetDescription(fd.facet_index, f.value, locale);
    });

    truths.push(descriptions.join(' '));
  }

  return truths;
}

function generateBoundaries(
  facets: Record<string, FacetWithHistory>,
  locale: Language,
): string[] {
  const boundaries: string[] = [];
  // Communication facets: 1-3, Thinking facets: 6-7, 12
  const boundaryFacetIndices = ['facet_1', 'facet_2', 'facet_3', 'facet_6', 'facet_7', 'facet_12'];

  for (const idx of boundaryFacetIndices) {
    const facet = facets[idx];
    if (!isKnown(facet)) continue;

    const desc = getFacetDescription(idx, facet.value, locale);
    if (desc) boundaries.push(desc);
  }

  return boundaries;
}

function generateVibe(demographics: Demographics, locale: Language): string | null {
  const parts: string[] = [];
  if (demographics.speaking_tone) parts.push(demographics.speaking_tone);
  if (demographics.first_person) {
    parts.push(
      locale === 'ja'
        ? `一人称: ${demographics.first_person}`
        : `First person: ${demographics.first_person}`,
    );
  }
  if (demographics.catchphrase) {
    parts.push(
      locale === 'ja'
        ? `口癖: 「${demographics.catchphrase}」`
        : `Catchphrase: "${demographics.catchphrase}"`,
    );
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

function generatePersonalitySection(
  facets: Record<string, FacetWithHistory>,
  locale: Language,
): string[] {
  const lines: string[] = [];
  const allFacets = getFacets();

  for (const fd of allFacets) {
    const facet = facets[fd.facet_index];
    if (!isKnown(facet)) continue;
    const desc = getFacetDescription(fd.facet_index, facet.value, locale);
    if (desc) lines.push(desc);
  }

  return lines;
}

function generateFacetTable(
  facets: Record<string, FacetWithHistory>,
  locale: Language,
): string {
  const allFacets = getFacets();
  const headerLabel = locale === 'ja' ? 'ファセット' : 'Facet';
  const aLabel = 'A';
  const bLabel = 'B';
  const resultLabel = locale === 'ja' ? '結果' : 'Result';

  const lines: string[] = [];
  lines.push(`| # | ${headerLabel} | ${aLabel} | ${bLabel} | ${resultLabel} |`);
  lines.push('|---|---|---|---|---|');

  for (const fd of allFacets) {
    const num = fd.facet_index.replace('facet_', '');
    const name = locale === 'ja' ? fd.name_ja : fd.name_en;
    const labelA = locale === 'ja' ? fd.label_a_ja : fd.label_a_en;
    const labelB = locale === 'ja' ? fd.label_b_ja : fd.label_b_en;
    const facet = facets[fd.facet_index];
    const display = facet ? formatFacetDisplay(fd.facet_index, facet, locale) : '?';
    lines.push(`| ${num} | ${name} | ${labelA} | ${labelB} | ${display} |`);
  }

  return lines.join('\n');
}
