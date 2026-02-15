import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FsProfileStore } from '../lib/fs-store.js';
import {
  generateSoulMd,
  generateIdentityMd,
  mergeFacets,
} from '@openpersonality/core';
import type {
  ProfileData,
  FacetWithHistory,
  Demographics,
  Language,
} from '@openpersonality/core';
import { randomUUID } from 'node:crypto';

let store: FsProfileStore;
let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'op-e2e-'));
  store = new FsProfileStore(tempDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true });
});

describe('E2E: create → get → update → drift detection → list → delete', () => {
  it('full profile lifecycle', async () => {
    // --- 1. CREATE ---
    const now = new Date().toISOString();
    const language: Language = 'en';
    const profileId = randomUUID();

    const initialFacets: Record<string, FacetWithHistory> = {
      facet_1: {
        value: 'a',
        confidence: 0.6,
        history: [
          { value: 'a', confidence: 0.6, source: 'initial', at: now },
        ],
      },
      facet_6: {
        value: 'b',
        confidence: 0.5,
        history: [
          { value: 'b', confidence: 0.5, source: 'initial', at: now },
        ],
      },
    };

    const demographics: Demographics = {
      name: 'Alice',
      occupation: 'Designer',
    };

    const profile: ProfileData = {
      id: profileId,
      name: 'Alice',
      created_at: now,
      updated_at: now,
      version: 1,
      language,
      facets: initialFacets,
      demographics,
    };

    const soulMd = generateSoulMd(initialFacets, demographics, language);
    const identityMd = generateIdentityMd(initialFacets, demographics, language);

    await store.save(profile, soulMd, identityMd);

    // --- 2. GET ---
    const loaded = await store.load(profileId);
    expect(loaded).not.toBeNull();
    expect(loaded!.profile.name).toBe('Alice');
    expect(loaded!.profile.facets.facet_1.value).toBe('a');
    expect(loaded!.soulMd).toContain('Alice');

    // --- 3. UPDATE with same value (confidence boost) ---
    const update1 = mergeFacets(loaded!.profile.facets, {
      facet_1: { value: 'a', confidence: 0.5 },
    });

    expect(update1.changes).toHaveLength(1);
    expect(update1.changes[0].reason).toBe('confidence_boost');
    // 1 - (1 - 0.6) * (1 - 0.5) = 0.8
    expect(update1.merged.facet_1.confidence).toBeCloseTo(0.8);
    expect(update1.driftWarnings).toHaveLength(0);

    profile.facets = update1.merged;
    profile.version = 2;
    profile.updated_at = new Date().toISOString();

    const newSoul = generateSoulMd(profile.facets, demographics, language);
    await store.save(profile, newSoul, identityMd);

    // --- 4. UPDATE with different value (drift warning) ---
    const update2 = mergeFacets(profile.facets, {
      facet_6: { value: 'a', confidence: 0.55 },
    });

    // facet_6 flipped from "b" (0.5) to "a" (0.55) — diff < 0.2 → drift warning
    expect(update2.merged.facet_6.value).toBe('a');
    expect(update2.driftWarnings.length).toBeGreaterThan(0);
    expect(update2.driftWarnings[0].message).toContain('flipped');

    profile.facets = update2.merged;
    profile.version = 3;
    await store.save(
      profile,
      generateSoulMd(profile.facets, demographics, language),
      generateIdentityMd(profile.facets, demographics, language),
    );

    // --- 5. UPDATE with user confirmation (1.0 always wins) ---
    const update3 = mergeFacets(profile.facets, {
      facet_6: { value: 'b', confidence: 1.0 },
    });

    expect(update3.merged.facet_6.value).toBe('b');
    expect(update3.merged.facet_6.confidence).toBe(1.0);
    expect(update3.changes[0].reason).toBe('user_confirmed');

    // --- 6. LIST ---
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Alice');
    expect(list[0].completeness).toBeGreaterThan(0);

    // --- 7. DELETE ---
    const deleted = await store.delete(profileId);
    expect(deleted).toBe(true);

    const afterDelete = await store.list();
    expect(afterDelete).toHaveLength(0);
  });

  it('get_or_create flow with external_id', async () => {
    const externalId = 'slack:user-42';

    // First call: not found → create
    let result = await store.loadByExternalId(externalId);
    expect(result).toBeNull();

    const profile: ProfileData = {
      id: randomUUID(),
      external_id: externalId,
      name: 'SlackUser',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      language: 'en',
      facets: {},
      demographics: { name: 'SlackUser' },
    };

    await store.save(profile, '# Soul', '# Identity');

    // Second call: found → return existing
    result = await store.loadByExternalId(externalId);
    expect(result).not.toBeNull();
    expect(result!.profile.external_id).toBe(externalId);
    expect(result!.profile.name).toBe('SlackUser');
  });

  it('template generation preserves confidence markers through save/load', async () => {
    const facets: Record<string, FacetWithHistory> = {
      facet_1: { value: 'a', confidence: 1.0, history: [] }, // ✓
      facet_2: { value: 'b', confidence: 0.3, history: [] }, // ~
      facet_3: { value: 'a', confidence: 0.7, history: [] }, // plain
      // facet_4+ not set → ?
    };

    const demographics: Demographics = { name: 'Marker Test' };
    const soulMd = generateSoulMd(facets, demographics, 'en');

    expect(soulMd).toContain('Assertive ✓');
    expect(soulMd).toContain('~Indirect');
    expect(soulMd).toMatch(/\| 3 \|.*\| Leader \|/);
    expect(soulMd).toMatch(/\| 4 \|.*\| \? \|/);

    // Save and reload
    const profile: ProfileData = {
      id: 'marker-test',
      name: 'Marker Test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      language: 'en',
      facets,
      demographics,
    };

    await store.save(profile, soulMd, '# ID');
    const loaded = await store.load('marker-test');

    expect(loaded!.soulMd).toBe(soulMd);
    expect(loaded!.soulMd).toContain('Assertive ✓');
  });
});
