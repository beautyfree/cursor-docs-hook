# Project documentation

**cursor-docs-hook** — A Cursor hook that keeps project documentation consistent by running a doc pass when you stop after making edits. It records edited files per conversation and, on the first stop, invokes the Cursor Agent CLI in the background to update `docs/DOCS.md` and module-level `DOCS.md` files.

## Stack

- **Runtime:** Node.js ≥ 18
- **Language:** TypeScript (compiled to JS in `hooks/docs/dist/`)
- **Hook contract:** [cursor-hook](https://github.com/beautyfree/cursor-hook) — events `afterFileEdit`, `stop`; stdin JSON, optional stdout JSON
- **Config:** `cursor-hook.config.json` at project root (install command, files, hook commands). Rules file: `rules/docs.mdc`.

## Entry points

- **Hook script:** `hooks/docs/dist/docs.js` — run by Cursor on `afterFileEdit` and `stop`. Source: `hooks/docs/docs.ts`.
- **Config:** `cursor-hook.config.json` — lists `hooks/docs` and `rules/docs.mdc`, and defines `afterFileEdit` / `stop` commands.

## DOCS.md convention (for consumer projects)

The doc-pass agent (triggered by this hook) is instructed to:

1. **docs/DOCS.md** — Project overview and links to module-level DOCS.md files.
2. **Functional roots** (e.g. `src/main`, `src/main/agent`, `src/renderer`, `scripts`) — An `DOCS.md` in each describing the module and what can be used.
3. **Subfolders with substantial content** — Their own `DOCS.md` where useful.

Only missing or outdated content is created or updated; accurate content is left as is.

## Module-level docs

| Module | Purpose |
|--------|--------|
| [hooks/](../hooks/DOCS.md) | Cursor hook implementations (e.g. docs hook). |
| [hooks/docs/](../hooks/docs/DOCS.md) | Docs hook: records edits, runs Cursor Agent on first stop. |
| [rules/](../rules/DOCS.md) | Cursor rules (e.g. docs.mdc) applied in the workspace. |

## Where to look

- **How the hook works:** README.md (root), [hooks/docs/DOCS.md](../hooks/docs/DOCS.md).
- **Hook source:** `hooks/docs/docs.ts`, `hooks/docs/utils.ts`, `hooks/docs/types.ts`.
- **Convention and rules:** [rules/docs.mdc](../rules/docs.mdc), this file.
