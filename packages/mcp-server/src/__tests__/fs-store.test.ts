import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FsProfileStore } from '../lib/fs-store.js';
import type { ProfileData } from '@openpersonality/core';

let store: FsProfileStore;
let tempDir: string;

function makeProfile(overrides?: Partial<ProfileData>): ProfileData {
  return {
    id: 'test-uuid-1',
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
    ...overrides,
  };
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'op-test-'));
  store = new FsProfileStore(tempDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true });
});

describe('FsProfileStore', () => {
  describe('save & load', () => {
    it('saves and loads a profile', async () => {
      const profile = makeProfile();
      await store.save(profile, '# SOUL', '# IDENTITY');

      const result = await store.load('test-uuid-1');
      expect(result).not.toBeNull();
      expect(result!.profile.id).toBe('test-uuid-1');
      expect(result!.profile.name).toBe('Test User');
      expect(result!.soulMd).toBe('# SOUL');
      expect(result!.identityMd).toBe('# IDENTITY');
    });

    it('returns null for nonexistent profile', async () => {
      const result = await store.load('nonexistent');
      expect(result).toBeNull();
    });

    it('preserves facets with history', async () => {
      const profile = makeProfile();
      await store.save(profile, '', '');

      const result = await store.load('test-uuid-1');
      expect(result!.profile.facets.facet_1.value).toBe('a');
      expect(result!.profile.facets.facet_1.confidence).toBe(0.8);
      expect(result!.profile.facets.facet_1.history).toHaveLength(1);
    });
  });

  describe('loadByExternalId', () => {
    it('finds profile by external_id', async () => {
      const profile = makeProfile({ external_id: 'discord:123' });
      await store.save(profile, '# SOUL', '# ID');

      const result = await store.loadByExternalId('discord:123');
      expect(result).not.toBeNull();
      expect(result!.profile.external_id).toBe('discord:123');
    });

    it('returns null for unknown external_id', async () => {
      const result = await store.loadByExternalId('unknown:456');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('returns empty array when no profiles', async () => {
      const result = await store.list();
      expect(result).toEqual([]);
    });

    it('lists all saved profiles', async () => {
      await store.save(makeProfile({ id: 'p1', name: 'Alice' }), '', '');
      await store.save(makeProfile({ id: 'p2', name: 'Bob' }), '', '');

      const result = await store.list();
      expect(result).toHaveLength(2);
      const names = result.map((p) => p.name).sort();
      expect(names).toEqual(['Alice', 'Bob']);
    });

    it('calculates completeness correctly', async () => {
      const profile = makeProfile({
        id: 'p1',
        facets: {
          facet_1: {
            value: 'a',
            confidence: 0.8,
            history: [],
          },
          facet_2: {
            value: 'b',
            confidence: 0.6,
            history: [],
          },
          facet_3: {
            value: 'a',
            confidence: 0, // unknown — should not count
            history: [],
          },
        },
      });
      await store.save(profile, '', '');

      const result = await store.list();
      // 2 known out of 12 = 0.17
      expect(result[0].completeness).toBeCloseTo(0.17, 1);
    });
  });

  describe('delete', () => {
    it('deletes an existing profile', async () => {
      await store.save(makeProfile(), '', '');
      const deleted = await store.delete('test-uuid-1');
      expect(deleted).toBe(true);

      const result = await store.load('test-uuid-1');
      expect(result).toBeNull();
    });

    it('returns false for nonexistent profile', async () => {
      const deleted = await store.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('config', () => {
    it('returns default config when none saved', async () => {
      const config = await store.getConfig();
      expect(config.language).toBe('en');
      expect(config.version).toBe('1.0.0');
    });

    it('saves and loads config', async () => {
      await store.saveConfig({
        language: 'ja',
        version: '1.0.0',
        default_profile: 'uuid-1',
      });

      const config = await store.getConfig();
      expect(config.language).toBe('ja');
      expect(config.default_profile).toBe('uuid-1');
    });
  });
});
