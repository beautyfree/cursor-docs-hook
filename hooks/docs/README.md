# Cursor Docs Hook (scripts)

This folder contains the TypeScript hook implementation. See the [main README](../../README.md) for installation, usage, and configuration.

| Hook | Purpose |
|------|---------|
| **afterFileEdit** | Records `conversation_id` and `file_path` in `.cursor/hooks/docs/state/edits.json`. |
| **stop** | When agent stops and there are edits in state, runs Cursor Agent CLI in background for doc pass. Log: `.cursor/hooks/docs/agent.log` (when `--log` in command). |

Build: `npm install && npm run build` (output in `dist/`).
