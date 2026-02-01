import * as fs from 'fs'
import * as path from 'path'
import type { EditsState } from './types.js'

/**
 * Project root: where .cursor/hooks/docs and state live.
 * Uses CURSOR_PROJECT_DIR when set, otherwise process.cwd().
 */
export function getProjectRoot(): string {
  const root = process.env.CURSOR_PROJECT_DIR || process.cwd()
  return path.resolve(root)
}

/**
 * Directory for docs hook state (.cursor/hooks/docs/state).
 * Creates it if missing. Used for edits.json.
 */
export function getStateDir(): string {
  const root = getProjectRoot()
  const stateDir = path.join(root, '.cursor', 'hooks', 'docs', 'state')
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true })
  }
  return stateDir
}

/** Full path to edits.json (conversation_id + list of edited files). */
export function getEditsStatePath(): string {
  return path.join(getStateDir(), 'edits.json')
}

/**
 * Read edits state from edits.json.
 * Returns null if file is missing, invalid JSON, or missing required fields (conversation_id, files array).
 */
export function readEditsState(): EditsState | null {
  const statePath = getEditsStatePath()
  if (!fs.existsSync(statePath)) return null
  try {
    const content = fs.readFileSync(statePath, 'utf-8')
    const data = JSON.parse(content) as unknown
    if (
      data &&
      typeof data === 'object' &&
      'conversation_id' in data &&
      'files' in data &&
      Array.isArray((data as EditsState).files)
    ) {
      return data as EditsState
    }
    return null
  } catch {
    return null
  }
}

/** Write edits state to edits.json (pretty-printed). */
export function writeEditsState(state: EditsState): void {
  const statePath = getEditsStatePath()
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

/**
 * Read and parse a single JSON object from stdin.
 * Used to receive the hook payload from Cursor.
 */
export async function readJsonStdin<T>(): Promise<T> {
  const text = await new Response(process.stdin).text()
  return JSON.parse(text) as T
}
