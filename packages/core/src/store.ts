/**
 * ProfileStore interface definition (abstract).
 *
 * The concrete implementation (fs-store.ts) lives in mcp-server package.
 * Core only defines the interface so it can be used for type-checking.
 *
 * Re-exports ProfileStore and StoreConfig from types.ts.
 *
 * See: docs/mcp-design.md §8 (Local storage design)
 */

export type { ProfileStore, StoreConfig } from './types.js';
