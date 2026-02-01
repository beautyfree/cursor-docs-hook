# Cursor Docs Hook

Keeps project documentation consistent by running a Cursor Agent doc pass after edits. Records edited files per conversation and, when the agent stops, invokes the Cursor Agent CLI in the background to update `docs/INDEX.md` and module-level `INDEX.md` files if there were edits.

## Features

- Records which files were edited in the current conversation (`afterFileEdit`)
- Runs a documentation pass only when something was actually changed
- Triggers on stop whenever there were edits in this run
- Runs the doc agent in the background so the hook returns immediately
- Configurable model and logging via `--model` and `--log` in the hook command
- No extra runtime dependencies (Node.js only)

## Quick Installation

Install using the [cursor-hook](https://github.com/beautyfree/cursor-hook) CLI:

```bash
npx cursor-hook install beautyfree/cursor-docs-hook
```

### Dependencies

The hook uses Node.js and TypeScript; everything is installed and compiled during setup:

- Dependencies are installed with `npm install`
- TypeScript is compiled with `npm run build`
- The compiled script runs via `node dist/docs.js`
- The CLI runs install and build silently

## Requirements

- **Cursor** with [Cursor CLI](https://cursor.com/docs/cli/using) on PATH (`cursor` or `cursor-agent`)
- **Node.js** >= 18.0.0 and npm (for installing and compiling the hook)

## How It Works

1. **After each file edit** (`afterFileEdit`):
   - The script records `conversation_id` and `file_path` in `.cursor/hooks/docs/state/edits.json`
   - Same conversation: appends the file to the list if not already present
   - New conversation: replaces state with the new conversation and file

2. **On stop** (`stop`):
   - If the state has at least one edited file for this conversation:
     - Clears the edits state (so we only run once per batch of edits)
     - Starts **Cursor Agent CLI** in the background with a doc-pass prompt
   - Otherwise does nothing
   - Agent output is appended to `.cursor/hooks/docs/agent.log` when `--log` is passed in the command

## INDEX.md Convention

The doc-pass agent is instructed to:

- **docs/INDEX.md** — Project overview and links to module-level INDEX.md files
- **Functional roots** (e.g. `src/main`, `src/main/agent`, `src/renderer`, `scripts`) — An `INDEX.md` describing the module and what can be used
- **Subfolders with substantial content** — Their own `INDEX.md` where useful

Only missing or outdated content is created or updated; accurate content is left as is.

## Configuration

Pass options in the hook command:

- **Model:** `--model <id>` (e.g. `.../docs.js --model claude-sonnet-4.5`). Default: `auto`.
- **Logging:** `--log` — when set, agent stdout/stderr go to `.cursor/hooks/docs/agent.log`.

Example in `cursor-hook.config.json`:

```json
"stop": [
  {
    "command": "node $HOME/.cursor/hooks/docs/dist/docs.js --model claude-sonnet-4.5 --log"
  }
]
```

## File Structure

After installation (project install via cursor-hook), files are under the hook directory:

**Project installation:**

```
.cursor/
├── hooks.json (or cursor-hook.config.json)
└── hooks/
    └── docs/
        ├── docs.ts           # Main TypeScript script
        ├── utils.ts          # Utilities (state, stdin)
        ├── types.ts          # Type definitions
        ├── dist/             # Compiled JS (created during install)
        │   ├── docs.js
        │   ├── utils.js
        │   └── types.js
        ├── package.json
        ├── tsconfig.json
        ├── node_modules/
        └── state/            # Created at runtime in project root, see below

# Runtime state (in project root where Cursor runs):
<project-root>/
└── .cursor/
    └── hooks/
        └── docs/
            ├── state/
            │   └── edits.json   # conversation_id + list of edited files
            └── agent.log        # Cursor Agent CLI output
```

**Global installation:**

```
~/.cursor/
├── hooks.json
└── hooks/
    └── docs/
        ├── docs.ts
        ├── utils.ts
        ├── types.ts
        ├── dist/
        ├── package.json
        ├── tsconfig.json
        └── node_modules/
```

State and logs are still written under the **project root** (e.g. `CURSOR_PROJECT_DIR` or cwd): `<project-root>/.cursor/hooks/docs/`.

## Manual Setup

1. Clone or download this repository and copy the `hooks/docs` directory to `~/.cursor/hooks/docs` (global) or ensure it is present as `hooks/docs` in the project and referenced by cursor-hook.
2. Install and build: `cd ~/.cursor/hooks/docs && npm install && npm run build` (or `cd hooks/docs && npm install && npm run build` for project).
3. Configure hooks in `~/.cursor/hooks.json` or project `cursor-hook.config.json`:

   ```json
   {
     "version": 1,
     "hooks": {
       "afterFileEdit": [
         {
           "command": "node $HOME/.cursor/hooks/docs/dist/docs.js"
         }
       ],
       "stop": [
         {
           "command": "node $HOME/.cursor/hooks/docs/dist/docs.js"
         }
       ]
     }
   }
   ```

## Testing

```bash
# Test afterFileEdit (record an edit)
echo '{
  "conversation_id": "test-123",
  "hook_event_name": "afterFileEdit",
  "file_path": "/path/to/project/src/main/App.tsx"
}' | node ~/.cursor/hooks/docs/dist/docs.js

# Check state (run from project root; state is under .cursor/hooks/docs/state/)
cat .cursor/hooks/docs/state/edits.json

# Test stop with no trigger (no edits in state)
echo '{
  "conversation_id": "other-conv",
  "hook_event_name": "stop",
  "loop_count": 0
}' | node ~/.cursor/hooks/docs/dist/docs.js

# Test stop with trigger (state has edits for same conversation_id)
echo '{
  "conversation_id": "test-123",
  "hook_event_name": "stop",
  "loop_count": 0
}' | node ~/.cursor/hooks/docs/dist/docs.js
# Then check .cursor/hooks/docs/agent.log (when --log was passed)
```

## Updating

```bash
npx cursor-hook install beautyfree/cursor-docs-hook
```

## Uninstallation

**Project installation:**

- Remove the hook directory: `rm -rf .cursor/hooks/docs` (or wherever cursor-hook installed it).
- Remove the `afterFileEdit` and `stop` entries for this hook from `cursor-hook.config.json` or `.cursor/hooks.json`.

**Global installation:**

- Remove the hook directory: `rm -rf ~/.cursor/hooks/docs`.
- Edit `~/.cursor/hooks.json` and remove the `afterFileEdit` and `stop` entries for this hook.

Optional: remove runtime state and logs: `rm -rf .cursor/hooks/docs` in the project root.

## License

MIT

## Contributing

Pull requests are welcome. For larger changes, please open an issue first.

## Links

- [Cursor Hooks](https://cursor.com/docs/agent/hooks)
- [Cursor CLI](https://cursor.com/docs/cli/using)
- [cursor-hook](https://github.com/beautyfree/cursor-hook) — Develop and install hooks from Git repositories
