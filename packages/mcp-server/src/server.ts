/**
 * McpServer definition: registers all tools, resources, and prompts.
 *
 * See: docs/mcp-design.md §3 (Repository structure)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FsProfileStore } from './lib/fs-store.js';

// Tools
import { registerCreateProfile } from './tools/create-profile.js';
import { registerGetProfile } from './tools/get-profile.js';
import { registerUpdateProfile } from './tools/update-profile.js';
import { registerGetOrCreateProfile } from './tools/get-or-create-profile.js';
import { registerListProfiles } from './tools/list-profiles.js';
import { registerDeleteProfile } from './tools/delete-profile.js';

// Resources
import { registerProfileResource } from './resources/profile.js';
import { registerSoulResource } from './resources/soul.js';
import { registerIdentityResource } from './resources/identity.js';

// Prompts
import { registerOnboardingPrompt } from './prompts/onboarding.js';
import { registerPersonalizedAdvicePrompt } from './prompts/personalized-advice.js';

export function createServer(store?: FsProfileStore): McpServer {
  const profileStore = store ?? new FsProfileStore();

  const server = new McpServer(
    {
      name: 'open-personality',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  // Register 6 tools
  registerCreateProfile(server, profileStore);
  registerGetProfile(server, profileStore);
  registerUpdateProfile(server, profileStore);
  registerGetOrCreateProfile(server, profileStore);
  registerListProfiles(server, profileStore);
  registerDeleteProfile(server, profileStore);

  // Register 3 resources
  registerProfileResource(server, profileStore);
  registerSoulResource(server, profileStore);
  registerIdentityResource(server, profileStore);

  // Register 2 prompts
  registerOnboardingPrompt(server);
  registerPersonalizedAdvicePrompt(server, profileStore);

  return server;
}
