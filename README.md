# Open Personality

Create personality profiles and output them as OpenClaw-compatible SOUL.md / IDENTITY.md.

12-facet profiling based on 33 academic personality frameworks (Seakr Index).

## Packages

| Package | Description |
|---|---|
| [`@openpersonality/core`](./packages/core) | Core logic: facets, templates, confidence merge, validation, data |
| [`@openpersonality/mcp-server`](./packages/mcp-server) | MCP Server (stdio): wraps core as 6 tools + 3 resources + 2 prompts |

## Quick Start

### MCP Server (Claude Desktop / Cursor / etc.)

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "open-personality": {
      "command": "npx",
      "args": ["-y", "@openpersonality/mcp-server"]
    }
  }
}
```

No API key required. Fully local.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check
pnpm typecheck

# Clean
pnpm clean
```

## Architecture

```
AI Agent (Claude Desktop / Cursor / Gemini CLI / ...)
  |
  +-- MCP Server (stdio)
  |     +-- 6 Tools + 3 Resources + 2 Prompts
  |
  +-- Detects facet signals during conversation (autonomous)
  |
  +-- Calls update_profile
        |
        +-- @openpersonality/core
              +-- validation    (input validation)
              +-- confidence    (confidence merge & drift detection)
              +-- templates     (SOUL.md / IDENTITY.md generation)
              +-- store         (ProfileStore interface)
                    +-- ~/.openpersonality/profiles/{id}/
```

## License

MIT
