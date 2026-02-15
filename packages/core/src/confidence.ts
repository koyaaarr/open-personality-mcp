/**
 * Confidence merge algorithm and drift detection.
 *
 * Pure logic (no I/O). Core of the Progressive Profile system.
 *
 * See: docs/mcp-design.md §5.2 (update_profile), docs/prd.md §4.1 F-02
 */

import type {
  DriftWarning,
  FacetChangeResult,
  FacetHistoryEntry,
  FacetValue,
  FacetWithConfidence,
  FacetWithHistory,
} from './types.js';

/**
 * Merge incoming facet updates into existing facets.
 *
 * Algorithm:
 * 1. User-confirmed (confidence = 1.0) always wins
 * 2. Same value: boost confidence → new_conf = 1 - (1 - old_conf) * (1 - new_conf)
 * 3. Different value: adopt higher confidence
 * 4. Record change in history
 */
export function mergeFacets(
  existing: Record<string, FacetWithHistory>,
  incoming: Record<string, FacetWithConfidence>,
  source: string = 'text_analysis',
): {
  merged: Record<string, FacetWithHistory>;
  changes: FacetChangeResult[];
  driftWarnings: DriftWarning[];
} {
  const now = new Date().toISOString();
  const merged = { ...existing };
  const changes: FacetChangeResult[] = [];

  for (const [facetIndex, incomingFacet] of Object.entries(incoming)) {
    const newConf = Math.max(0, Math.min(1, incomingFacet.confidence));
    const existingFacet = merged[facetIndex];

    if (!existingFacet) {
      // New facet — just add it
      const historyEntry: FacetHistoryEntry = {
        value: incomingFacet.value,
        confidence: newConf,
        source,
        at: now,
      };
      merged[facetIndex] = {
        value: incomingFacet.value,
        confidence: newConf,
        history: [historyEntry],
      };
      changes.push({
        facet: facetIndex,
        previous: { value: incomingFacet.value, confidence: 0 },
        current: { value: incomingFacet.value, confidence: newConf },
        reason: 'new_facet',
      });
      continue;
    }

    const oldValue = existingFacet.value;
    const oldConf = existingFacet.confidence;
    let resultValue: FacetValue;
    let resultConf: number;
    let reason: string;

    if (newConf === 1.0) {
      // User-confirmed always wins
      resultValue = incomingFacet.value;
      resultConf = 1.0;
      reason = 'user_confirmed';
    } else if (oldConf === 1.0) {
      // Existing user-confirmed value is kept
      resultValue = oldValue;
      resultConf = 1.0;
      reason = 'existing_user_confirmed';
    } else if (incomingFacet.value === oldValue) {
      // Same value: boost confidence
      resultValue = oldValue;
      resultConf = 1 - (1 - oldConf) * (1 - newConf);
      reason = 'confidence_boost';
    } else {
      // Different value: adopt higher confidence
      if (newConf > oldConf) {
        resultValue = incomingFacet.value;
        resultConf = newConf;
        reason = 'higher_confidence_override';
      } else {
        resultValue = oldValue;
        resultConf = oldConf;
        reason = 'existing_retained';
      }
    }

    // Only record a change if something actually changed
    if (resultValue !== oldValue || resultConf !== oldConf) {
      const historyEntry: FacetHistoryEntry = {
        value: resultValue,
        confidence: resultConf,
        source,
        at: now,
      };
      merged[facetIndex] = {
        value: resultValue,
        confidence: resultConf,
        history: [...existingFacet.history, historyEntry],
      };
      changes.push({
        facet: facetIndex,
        previous: { value: oldValue, confidence: oldConf },
        current: { value: resultValue, confidence: resultConf },
        reason,
      });
    }
  }

  const driftWarnings = detectDrift(changes);

  return { merged, changes, driftWarnings };
}

/**
 * Detect drift warnings from a set of facet changes.
 *
 * Rules:
 * - Facet flipped (a→b or b→a) and confidence diff < 0.2 → warning
 * - 3+ facets changed in a single update → recommend full review
 */
export function detectDrift(changes: FacetChangeResult[]): DriftWarning[] {
  const warnings: DriftWarning[] = [];

  for (const change of changes) {
    if (
      change.previous.value !== change.current.value &&
      change.previous.confidence > 0 &&
      Math.abs(change.current.confidence - change.previous.confidence) < 0.2
    ) {
      warnings.push({
        facet: change.facet,
        message: `Facet ${change.facet} flipped from "${change.previous.value}" to "${change.current.value}" with similar confidence (${change.previous.confidence.toFixed(2)} → ${change.current.confidence.toFixed(2)}). Consider verifying with the user.`,
      });
    }
  }

  const flippedCount = changes.filter(
    (c) => c.previous.value !== c.current.value && c.previous.confidence > 0,
  ).length;

  if (flippedCount >= 3) {
    warnings.push({
      facet: '_global',
      message: `${flippedCount} facets changed in a single update. A full profile review is recommended.`,
    });
  }

  return warnings;
}
