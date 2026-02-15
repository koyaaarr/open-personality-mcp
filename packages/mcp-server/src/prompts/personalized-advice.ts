/**
 * MCP Prompt: personalized_advice
 *
 * Embeds SOUL.md into a prompt for personalized advice generation.
 * See: docs/llm-prompt-spec.md §1.2
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FsProfileStore } from '../lib/fs-store.js';

export function registerPersonalizedAdvicePrompt(
  server: McpServer,
  store: FsProfileStore,
): void {
  server.prompt(
    'personalized_advice',
    'Generate advice considering the user\'s personality profile',
    {
      profile_id: z.string().describe('Profile UUID'),
      topic: z.string().describe('Topic to get advice on'),
    },
    async (args) => {
      const result = await store.load(args.profile_id);
      if (!result) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Error: Profile "${args.profile_id}" not found.`,
              },
            },
          ],
        };
      }

      const prompt = `You are advising someone with the following personality profile. Tailor your advice to their specific traits, communication style, and values.

## Personality Profile

${result.soulMd}

## Topic

${args.topic}

## Instructions
- Reference specific facets when relevant (e.g., "Given your Risk-Avoidance tendency...")
- Match the communication style described in the Vibe section
- Be practical and specific, not generic
- If the topic relates to their boundaries, respect them`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    },
  );
}
