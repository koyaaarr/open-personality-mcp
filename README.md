# Open Personality

Create personality profiles and output them as OpenClaw-compatible SOUL.md / IDENTITY.md.

12-facet profiling based on 33 academic personality frameworks.

**No API key required. Fully local. MIT License.**

## Architecture — Who Does What?

```
AI Agent (Claude, Cursor, Gemini, etc.)   MCP Server (@openpersonality)
┌──────────────────────────────────┐     ┌─────────────────────────────┐
│ - Analyzes conversation          │     │ - Stores profiles            │
│ - Estimates facet values (a/b)   │ ──→ │ - Merges confidence scores   │
│ - Determines confidence (0-1)    │     │ - Detects drift              │
│                                  │ ←── │ - Generates SOUL.md          │
└──────────────────────────────────┘     └─────────────────────────────┘
```

> The MCP server does **NOT** call any external APIs or LLMs.
> Facet estimation is the responsibility of the connected AI agent.

## Features

- **12-Facet Personality Profiling** — Scientific personality structure based on 33 academic frameworks
- **Progressive Profile** — Profiles grow autonomously through conversation (agents detect signals and update automatically)
- **OpenClaw Compatible** — Generates SOUL.md / IDENTITY.md in OpenClaw format
- **MCP Server** — Works with all major AI agent platforms via stdio transport
- **Confidence Merge** — Bayesian-style confidence tracking with drift detection
- **Bilingual** — English and Japanese support

## Packages

| Package | Description |
|---|---|
| [`@openpersonality/core`](./packages/core) | Core logic: facets, templates, confidence merge, validation, data |
| [`@openpersonality/mcp-server`](./packages/mcp-server) | MCP Server (stdio): 6 tools + 3 resources + 2 prompts |

## Installation

### Claude Desktop

Edit `claude_desktop_config.json`:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "openpersonality": {
      "command": "npx",
      "args": ["-y", "@openpersonality/mcp-server"]
    }
  }
}
```

Restart Claude Desktop after editing.

### Claude Code (CLI)

```bash
claude mcp add openpersonality -- npx -y @openpersonality/mcp-server
```

Or add to `.mcp.json` in your project root for team sharing:

```json
{
  "mcpServers": {
    "openpersonality": {
      "command": "npx",
      "args": ["-y", "@openpersonality/mcp-server"]
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json` (global) or `<project>/.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "openpersonality": {
      "command": "npx",
      "args": ["-y", "@openpersonality/mcp-server"]
    }
  }
}
```

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "openpersonality": {
      "command": "npx",
      "args": ["-y", "@openpersonality/mcp-server"]
    }
  }
}
```

### VS Code (GitHub Copilot)

Create `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "openpersonality": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@openpersonality/mcp-server"]
    }
  }
}
```

> Note: VS Code uses `"servers"` (not `"mcpServers"`) and requires a `"type"` field.

### Gemini CLI

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "openpersonality": {
      "command": "npx",
      "args": ["-y", "@openpersonality/mcp-server"]
    }
  }
}
```

Or use the CLI:

```bash
gemini mcp add openpersonality -- npx -y @openpersonality/mcp-server
```

### OpenAI Agents SDK (Python)

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio


async def main():
    async with MCPServerStdio(
        name="Open Personality",
        params={
            "command": "npx",
            "args": ["-y", "@openpersonality/mcp-server"],
        },
    ) as server:
        agent = Agent(
            name="Personality Assistant",
            instructions="You help users create and manage personality profiles.",
            mcp_servers=[server],
        )
        result = await Runner.run(agent, "Create a personality profile for me.")
        print(result.final_output)


asyncio.run(main())
```

## Quick Start — Progressive Profiling

### Step 1: Seed (first interaction)

```
create_profile(name: "Alice", external_id: "discord:123", language: "ja")
```

> `language` is set at creation and persists for all template generation (SOUL.md / IDENTITY.md).

### Step 2: Grow (after a few conversations)

```
update_profile(external_id: "discord:123", facets: {
  "facet_8": { "value": "b", "confidence": 0.3 },   // Introvert signal
  "facet_6": { "value": "b", "confidence": 0.4 }    // Logical signal
})
```

### Step 3: Refine (user self-report or strong signal)

```
update_profile(external_id: "discord:123", facets: {
  "facet_12": { "value": "a", "confidence": 1.0 }   // User confirmed: Planned
})
```

**Notes:**
- `soul_md` / `identity_md` are auto-generated from facets + demographics if omitted (recommended for most use cases). Provide them only for custom templates.
- Confidence accumulates via Bayesian merge. Repeated low-confidence signals build to high confidence over time.

## 12 Facets

| Key | Category | A (value: `"a"`) | B (value: `"b"`) |
|---|---|---|---|
| `facet_1` | Communication | Assertive | Harmonious |
| `facet_2` | Communication | Direct | Indirect |
| `facet_3` | Communication | Leader | Follower |
| `facet_4` | Values | Work-Focused | Life-Balance |
| `facet_5` | Values | Risk-Taking | Risk-Avoidance |
| `facet_6` | Thinking | Empathetic | Logical |
| `facet_7` | Thinking | Abstract | Concrete |
| `facet_8` | Personality | Extravert | Introvert |
| `facet_9` | Personality | Emotional | Calm |
| `facet_10` | Values | Open | Traditional |
| `facet_11` | Values | Team | Solo |
| `facet_12` | Thinking | Planned | Flexible |

**Confidence levels:**

| Range | Meaning | Display |
|---|---|---|
| `0.0` | Unknown | — |
| `0.01–0.49` | Tentative | `~Value` |
| `0.50–0.99` | Estimated | `Value` |
| `1.0` | User-confirmed | `Value ✓` |

## Demographics (Optional)

Demographics give your profile a character identity. All fields are optional.

**OpenClaw Standard** — mapped to IDENTITY.md Header fields:

| Field | Purpose | Example |
|---|---|---|
| `creature` | Character type | `"Fox"`, `"Software Engineer"` |
| `emoji` | Avatar shorthand | `"🦊"` |
| `vibe` | Overall impression | `"calm & logical"` |

> `name` is passed as a top-level parameter, not inside demographics.
> `avatar` (OpenClaw standard) is planned for Phase 2.

**OP Extension** — Open Personality's extended fields for richer character creation:

| Field | Purpose | Example |
|---|---|---|
| `first_person` | Pronoun (important for Japanese) | `"僕"`, `"I"` |
| `catchphrase` | Signature phrase | `"なるほど"` |
| `speaking_tone` | Communication style | `"落ち着いて論理的"` |
| `greeting` | Opening line | `"Hey there!"` |
| `gender` | Affects pronouns/tone | `"male"`, `"non-binary"` |
| `age` | Background context | `"30s"` |
| `occupation` | Expertise/role | `"Software Engineer"` |
| `backstory` | Character background (1-2 sentences) | `"Former teacher turned freelancer"` |

## Usage as an OpenClaw Skill

Open Personality works as an OpenClaw Skill for autonomous personality profiling. The agent detects personality signals during conversation and updates the profile automatically.

### Setup

1. Install the MCP server (see Installation above)
2. Create a `SKILL.md` in your OpenClaw agent's skill directory:

```markdown
---
user-invocable: true
disable-model-invocation: false
---

# Open Personality Skill

You have access to the Open Personality MCP tools for managing personality profiles.

## Session Start

At the beginning of each session, load the user's profile:
- Call `get_or_create_profile` with the user's external_id
- Include the returned SOUL.md in your conversation context

## Autonomous Profile Updates

During conversation, watch for personality signals:
- Communication style (assertive vs harmonious, direct vs indirect)
- Values (work-focused vs life-balance, risk-taking vs risk-avoidance)
- Thinking patterns (empathetic vs logical, abstract vs concrete)
- Personality traits (extravert vs introvert, emotional vs calm)

When you detect a signal:
1. Call `update_profile` with the facet value and low confidence (0.2-0.3)
2. The confidence merge algorithm handles accumulation over time
3. If a drift warning is returned, confirm with the user at a natural point

## Explicit Requests

- "Create my profile" → Call `create_profile` with inferred facets
- "Show my personality" → Call `get_profile` and display the SOUL.md
- "Update my profile" → Call `update_profile` with user-specified values (confidence: 1.0)
```

3. Add a `references/facet-guide.md` with the 12 facets for the agent to reference:

```markdown
# Facet Guide

| # | Facet | A | B |
|---|---|---|---|
| 1 | Communication | Assertive | Harmonious |
| 2 | Expression | Direct | Indirect |
| 3 | Role | Leader | Follower |
| 4 | Work-Life | Work-Focused | Life-Balance |
| 5 | Risk | Risk-Taking | Risk-Avoidance |
| 6 | Judgment | Empathetic | Logical |
| 7 | Thinking | Abstract | Concrete |
| 8 | Energy | Extravert | Introvert |
| 9 | Emotion | Emotional | Calm |
| 10 | Openness | Open | Traditional |
| 11 | Collaboration | Team | Solo |
| 12 | Planning | Planned | Flexible |
```

### How Progressive Profile Works

```
Session 1: User says "I prefer working alone"
  → Agent detects Solo signal → update_profile(facet_11: "b", confidence: 0.3)

Session 3: User says "I like to plan everything in advance"
  → Agent detects Planned signal → update_profile(facet_12: "a", confidence: 0.25)

Session 5: User mentions preferring solo work again
  → Confidence merge: 0.3 + 0.25 → 0.475 (approaching confirmed)

Over time: Profile grows without user ever explicitly asking for it.
```

## MCP Tools

| Tool | Description |
|---|---|
| `create_profile` | Create a new profile (only `name` is required) |
| `update_profile` | Update facets/demographics with confidence merge and drift detection |
| `get_or_create_profile` | Get by `external_id`, or create if not found (for bots) |
| `get_profile` | Get profile data + SOUL.md + IDENTITY.md |
| `list_profiles` | List all local profiles with completeness info |
| `delete_profile` | Delete a profile |

> **Note on `soul_md` / `identity_md`:** These are auto-generated from facets + demographics if omitted (recommended for most use cases). Provide them only when you want to use a custom template generated by the AI agent itself.

## MCP Resources

| URI | Description |
|---|---|
| `op://profiles/{id}` | Profile structured JSON |
| `op://profiles/{id}/soul` | SOUL.md text |
| `op://profiles/{id}/identity` | IDENTITY.md text |

## MCP Prompts

| Prompt | Description |
|---|---|
| `onboarding` | Guides the AI through creating a user's first profile |
| `personalized_advice` | Generates advice tailored to the user's personality |

## Output Example

### SOUL.md

```markdown
# Soul

## Core Truths
- Lead with conviction, deliver with care
- Plan first, explore within structure
- Think with data, connect with people

## Boundaries
- Words are chosen carefully, even in disagreement
- Decisions require data — intuition alone is not enough
- Risks are calculated, never reckless

## Vibe
Warm and polite tone. Uses "watashi" as first person. Firm opinions
delivered in soft packaging. Analytical mind with genuine enjoyment
of human connection.

## Facet Profile
| Facet | Value |
|---|---|
| Assertive ↔ Harmonious | Assertive |
| Direct ↔ Indirect | ~Indirect |
| Leader ↔ Follower | Leader |
| Work-Focused ↔ Life-Balance | Life-Balance |
| ... | ... |
```

## Data Storage

All data is stored locally:

```
~/.openpersonality/
├── config.json
└── profiles/{id}/
    ├── profile.json    # Structured data (source of truth)
    ├── SOUL.md         # Generated personality document
    └── IDENTITY.md     # Generated identity document
```

No data is sent to external servers. Directory permissions are set to `0700` (owner-only).

## Platform Compatibility

| Platform | Transport | Autonomous Updates |
|---|---|---|
| Claude Desktop / Claude Code | MCP (stdio) | Autonomous tool calling |
| Cursor / Windsurf / Cline | MCP (stdio) | Agent Mode |
| VS Code / GitHub Copilot | MCP (stdio) | Agent Mode |
| Gemini CLI | MCP (stdio) | Auto tool calling |
| OpenAI Agents SDK | MCP (stdio) | Agent loop |
| OpenClaw | MCP + Skill | Skill auto-invocation |
| ChatGPT | MCP (Streamable HTTP) | *Planned* |

## Development

```bash
pnpm install    # Install dependencies
pnpm build      # Build all packages
pnpm typecheck  # Type check
pnpm test       # Run tests
pnpm clean      # Clean build artifacts
```

## Privacy

- All profile data stays on your machine (`~/.openpersonality/`)
- The MCP server makes **zero** external API calls
- No API key required — facet estimation is done by your AI agent's own LLM
- Demographics may contain personal information — profiles are stored with owner-only permissions

## License

MIT
