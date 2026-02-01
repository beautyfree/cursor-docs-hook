/**
 * Shape of the edits state file used by the docs hook.
 * Path: .cursor/hooks/docs/state/edits.json
 *
 * Tracks which files were edited in the current conversation so the stop hook
 * can run the doc agent only when something actually changed.
 */

export interface EditsState {
  /** Current conversation ID (matches hook payload). */
  conversation_id: string
  /** Absolute paths of files edited in this conversation. */
  files: string[]
}
