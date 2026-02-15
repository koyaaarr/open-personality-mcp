/**
 * File-system implementation of ProfileStore interface.
 *
 * Storage layout:
 *   ~/.openpersonality/
 *   ├── config.json
 *   └── profiles/{profile-id}/
 *       ├── profile.json
 *       ├── SOUL.md
 *       └── IDENTITY.md
 *
 * See: docs/mcp-design.md §8 (Local storage design)
 */

import { readFile, writeFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';
import type {
  ProfileStore,
  ProfileData,
  ProfileSummary,
  StoreConfig,
} from '@openpersonality/core';
import { getFacetLabel, VersionConflictError } from '@openpersonality/core';

const storeConfigSchema = z.object({
  default_profile: z.string().optional(),
  language: z.enum(['en', 'ja']),
  version: z.string(),
}).strict();

const DEFAULT_BASE_PATH = join(homedir(), '.openpersonality');

const DEFAULT_CONFIG: StoreConfig = {
  language: 'en',
  version: '1.0.0',
};

export class FsProfileStore implements ProfileStore {
  private basePath: string;
  private profilesDir: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? DEFAULT_BASE_PATH;
    this.profilesDir = join(this.basePath, 'profiles');
  }

  private profileDir(profileId: string): string {
    if (profileId.includes('..') || profileId.includes('/') || profileId.includes('\\')) {
      throw new Error(`Invalid profile ID: ${profileId}`);
    }
    return join(this.profilesDir, profileId);
  }

  private async ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  }

  async save(
    profile: ProfileData,
    soulMd: string,
    identityMd: string,
    expectedVersion?: number,
  ): Promise<void> {
    const dir = this.profileDir(profile.id);
    await this.ensureDir(dir);

    // Optimistic lock: verify on-disk version matches expectation
    if (expectedVersion !== undefined) {
      try {
        const raw = await readFile(join(dir, 'profile.json'), 'utf-8');
        const existing = JSON.parse(raw) as ProfileData;
        if (existing.version !== expectedVersion) {
          throw new VersionConflictError(profile.id, expectedVersion, existing.version);
        }
      } catch (err) {
        if (err instanceof VersionConflictError) throw err;
        // File doesn't exist yet — no conflict possible
      }
    }

    await Promise.all([
      writeFile(join(dir, 'profile.json'), JSON.stringify(profile, null, 2)),
      writeFile(join(dir, 'SOUL.md'), soulMd),
      writeFile(join(dir, 'IDENTITY.md'), identityMd),
    ]);
  }

  async load(
    profileId: string,
  ): Promise<{ profile: ProfileData; soulMd: string; identityMd: string } | null> {
    const dir = this.profileDir(profileId);
    try {
      const [profileJson, soulMd, identityMd] = await Promise.all([
        readFile(join(dir, 'profile.json'), 'utf-8'),
        readFile(join(dir, 'SOUL.md'), 'utf-8'),
        readFile(join(dir, 'IDENTITY.md'), 'utf-8'),
      ]);
      return {
        profile: JSON.parse(profileJson) as ProfileData,
        soulMd,
        identityMd,
      };
    } catch {
      return null;
    }
  }

  async loadByExternalId(
    externalId: string,
  ): Promise<{ profile: ProfileData; soulMd: string; identityMd: string } | null> {
    const summaries = await this.listIds();
    for (const id of summaries) {
      const result = await this.load(id);
      if (result && result.profile.external_id === externalId) {
        return result;
      }
    }
    return null;
  }

  async list(): Promise<ProfileSummary[]> {
    const ids = await this.listIds();
    const summaries: ProfileSummary[] = [];

    for (const id of ids) {
      const result = await this.load(id);
      if (!result) continue;

      const { profile } = result;
      const facetEntries = Object.entries(profile.facets);
      const knownCount = facetEntries.filter(
        ([, f]) => f.confidence > 0,
      ).length;
      const completeness = knownCount / 12;

      const facetSummary = facetEntries
        .filter(([, f]) => f.confidence >= 0.5)
        .map(([key, f]) => getFacetLabel(key, f.value, profile.language))
        .filter(Boolean)
        .join(', ');

      summaries.push({
        id: profile.id,
        external_id: profile.external_id,
        name: profile.name,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        facet_summary: facetSummary || '(no facets yet)',
        completeness: Math.round(completeness * 100) / 100,
      });
    }

    return summaries;
  }

  async delete(profileId: string): Promise<boolean> {
    const dir = this.profileDir(profileId);
    try {
      await stat(dir);
      await rm(dir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  async getConfig(): Promise<StoreConfig> {
    try {
      const data = await readFile(
        join(this.basePath, 'config.json'),
        'utf-8',
      );
      const parsed = storeConfigSchema.safeParse(JSON.parse(data));
      if (parsed.success) {
        return parsed.data;
      }
      return { ...DEFAULT_CONFIG };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  async saveConfig(config: StoreConfig): Promise<void> {
    await this.ensureDir(this.basePath);
    await writeFile(
      join(this.basePath, 'config.json'),
      JSON.stringify(config, null, 2),
    );
  }

  /** Get the storage path for a profile. */
  getProfilePath(profileId: string): string {
    return this.profileDir(profileId);
  }

  private async listIds(): Promise<string[]> {
    try {
      const entries = await readdir(this.profilesDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }
}
