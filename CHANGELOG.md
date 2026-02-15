# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-15

### Added
- 12-facet personality profiling system based on 33 academic frameworks (Seakr Index)
- `@openpersonality/core`: facets, templates, confidence merge, validation, data
- `@openpersonality/mcp-server`: stdio MCP server
- 6 MCP tools: `create_profile`, `update_profile`, `get_profile`, `get_or_create_profile`, `list_profiles`, `delete_profile`
- 3 MCP resources: `op://profiles/{id}`, `op://profiles/{id}/soul`, `op://profiles/{id}/identity`
- 2 MCP prompts: `onboarding`, `personalized_advice`
- Progressive Profile with Bayesian confidence merge and drift detection
- SOUL.md and IDENTITY.md template generation (OpenClaw compatible)
- Local filesystem storage (`~/.openpersonality/`)
- English and Japanese bilingual support
- 5 preset characters (Coach, Analyst, Empath, Creator, Sage)
