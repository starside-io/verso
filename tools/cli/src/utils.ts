import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import pc from 'picocolors'

export const log = {
  info: (msg: string) => console.log(pc.cyan('ℹ'), msg),
  ok: (msg: string) => console.log(pc.green('✓'), msg),
  warn: (msg: string) => console.log(pc.yellow('⚠'), msg),
  err: (msg: string) => console.error(pc.red('✗'), msg),
}

export const writeFileSafe = (
  path: string,
  contents: string,
  opts?: { overwrite?: boolean },
): boolean => {
  if (existsSync(path) && !opts?.overwrite) {
    log.warn(`Skipped (exists): ${path}`)
    return false
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents)
  return true
}

export const writeJson = (path: string, value: unknown, opts?: { overwrite?: boolean }): boolean =>
  writeFileSafe(path, `${JSON.stringify(value, null, 2)}\n`, opts)

export const readJson = <T = unknown>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf-8')) as T

export const requireProjectRoot = (cwd = process.cwd()): string => {
  const deck = resolve(cwd, 'deck.json')
  if (!existsSync(deck)) {
    log.err(`No deck.json found in ${cwd}. Run "verso init" first.`)
    process.exit(1)
  }
  return resolve(cwd)
}
