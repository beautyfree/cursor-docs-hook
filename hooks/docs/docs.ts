#!/usr/bin/env node

/**
 * Unified docs hook: keeps project documentation consistent.
 *
 * - afterFileEdit: records edited file_path per conversation_id in state.
 * - stop: when the agent stops, if any files were edited this run, clears state
 *   and runs Cursor Agent CLI in the background to update docs.
 *
 * See docs/DOCS.md convention and README in this folder.
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type {
  AfterFileEditPayload,
  HookPayload,
  StopPayload,
} from 'cursor-hook'
import {
  getProjectRoot,
  readEditsState,
  readJsonStdin,
  writeEditsState,
} from './utils.js'

/** Prompt sent to Cursor Agent CLI for the documentation pass. */
const DOC_PROMPT =
  'Documentation pass (stop hook): Keep project docs consistent. (1) Update docs/DOCS.md so it describes the project and links to module-level DOCS.md files. (2) In every important folder (functional unit root: e.g. src/main, src/main/agent, src/main/app, src/renderer, scripts), ensure there is an DOCS.md describing what the module does, what is in it, and what can be used. (3) In subfolders that have substantial content (e.g. src/main/agent/core, src/renderer/src), add or update their own DOCS.md. Create or update only what is missing or outdated; leave accurate content as is.'

/** CLI options: --model <id>, --log (only from command, no env). */
function parseCliArgs(): { model: string | undefined; log: boolean } {
  const argv = process.argv.slice(2)
  let model: string | undefined
  let log = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--model' && argv[i + 1]) {
      model = argv[++i]
    } else if (argv[i].startsWith('--model=')) {
      model = argv[i].slice('--model='.length)
    } else if (argv[i] === '--log') {
      log = true
    }
  }
  return { model, log }
}

const cliArgs = parseCliArgs()

/** Type guard: payload is afterFileEdit. */
function isAfterFileEdit(p: HookPayload): p is AfterFileEditPayload {
  return p.hook_event_name === 'afterFileEdit'
}

/** Type guard: payload is stop. */
function isStop(p: HookPayload): p is StopPayload {
  return p.hook_event_name === 'stop'
}

/**
 * Handle afterFileEdit: record file_path per conversation_id in edits state.
 * Same conversation: append file if not already in list.
 * New conversation: replace state with new conversation_id and single file.
 */
function handleAfterFileEdit(input: AfterFileEditPayload): void {
  const { conversation_id, file_path } = input
  if (!conversation_id || !file_path) return

  const current = readEditsState()

  if (current && current.conversation_id === conversation_id) {
    if (!current.files.includes(file_path)) {
      current.files.push(file_path)
      writeEditsState(current)
    }
  } else {
    writeEditsState({ conversation_id, files: [file_path] })
  }
}

/**
 * Resolve path to cursor or cursor-agent binary from PATH.
 * Prefers "cursor", then "cursor-agent". Returns null if neither is found.
 */
function findCursorBin(): string | null {
  const pathEnv = process.env.PATH || ''
  const pathSep = process.platform === 'win32' ? ';' : ':'
  const dirs = pathEnv.split(pathSep)
  for (const dir of dirs) {
    const cursorPath = path.join(dir, 'cursor')
    const agentPath = path.join(dir, 'cursor-agent')
    if (fs.existsSync(cursorPath)) return cursorPath
    if (fs.existsSync(agentPath)) return agentPath
  }
  return null
}

/**
 * Run Cursor Agent CLI in background (non-blocking).
 * Model: from --model (default "auto"). Log: from --log only.
 */
function runDocAgent(): void {
  const cwd = getProjectRoot()
  const model = cliArgs.model ?? 'auto'
  const args: string[] = ['agent', '-p', DOC_PROMPT, '--output-format', 'text']
  if (model && model !== 'auto') {
    args.push('--model', model)
  }

  const bin = findCursorBin()
  if (!bin) return

  const logEnabled = cliArgs.log
  let stdio: ['ignore', number | 'ignore', number | 'ignore'] = [
    'ignore',
    'ignore',
    'ignore',
  ]
  let logFd: number | null = null
  if (logEnabled) {
    const logDir = path.join(cwd, '.cursor', 'hooks', 'docs')
    const logFile = path.join(logDir, 'agent.log')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    logFd = fs.openSync(logFile, 'a')
    stdio = ['ignore', logFd, logFd]
  }

  const proc = spawn(bin, args, {
    cwd,
    detached: true,
    stdio,
    env: { ...process.env },
  })
  proc.unref()
  if (logFd !== null) fs.closeSync(logFd)
}

/**
 * Handle stop hook.
 * Triggers doc agent when the agent stops and state has edits for this conversation.
 * Clears edits state after triggering so we only run once per batch of edits.
 */
function handleStop(input: StopPayload): void {
  const { conversation_id } = input
  if (!conversation_id) {
    console.log(JSON.stringify({}))
    return
  }

  const state = readEditsState()
  if (
    !state ||
    state.conversation_id !== conversation_id ||
    state.files.length === 0
  ) {
    console.log(JSON.stringify({}))
    return
  }

  // Clear edits so we don't trigger again until next edit
  writeEditsState({ conversation_id: state.conversation_id, files: [] })
  runDocAgent()
  console.log(JSON.stringify({}))
}

/**
 * Entry: read JSON payload from stdin, dispatch by hook_event_name, output {} and exit 0.
 */
async function main(): Promise<void> {
  try {
    const data = (await readJsonStdin()) as HookPayload

    if (isAfterFileEdit(data)) {
      handleAfterFileEdit(data)
      process.exit(0)
      return
    }

    if (isStop(data)) {
      handleStop(data)
      process.exit(0)
      return
    }

    // Unknown hook: no-op, output empty object
    console.log(JSON.stringify({}))
    process.exit(0)
  } catch (err) {
    console.error('docs hook error:', err)
    process.exit(1)
  }
}

main()
