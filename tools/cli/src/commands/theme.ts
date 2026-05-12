import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, isAbsolute, join, resolve } from 'node:path'
import { Theme } from '@starside-io/verso-schema'
import { builtInThemes } from '@starside-io/verso-themes'
import { log, readJson, requireProjectRoot, writeJson } from '../utils.js'

const builtInByName = new Map(builtInThemes.map((t) => [t.name, t]))

export interface ThemeOptions {
  dir?: string
}

const cwdFromOpts = (dir?: string): string => (dir ? resolve(process.cwd(), dir) : process.cwd())

export const runThemeAdd = async (target: string, opts: ThemeOptions = {}): Promise<void> => {
  const projectRoot = requireProjectRoot(cwdFromOpts(opts.dir))
  const themesDir = join(projectRoot, 'themes')

  if (builtInByName.has(target)) {
    const theme = builtInByName.get(target)!
    const dest = join(themesDir, `${theme.name}.json`)
    const wrote = writeJson(dest, theme)
    if (wrote) log.ok(`Copied built-in theme "${target}" to ${dest}`)
    return
  }

  const candidate = isAbsolute(target) ? target : resolve(projectRoot, target)
  if (existsSync(candidate)) {
    const raw = readJson<unknown>(candidate)
    const theme = Theme.parse(raw)
    const dest = join(themesDir, `${theme.name}.json`)
    const wrote = writeJson(dest, theme)
    if (wrote) log.ok(`Imported theme "${theme.name}" from ${candidate}`)
    return
  }

  log.err(
    `Could not resolve "${target}". Tried: built-in name, file path. (npm package install is not implemented in this scaffold.)`,
  )
  process.exit(1)
}

export const runThemeList = async (opts: ThemeOptions = {}): Promise<void> => {
  const projectRoot = requireProjectRoot(cwdFromOpts(opts.dir))
  const themesDir = join(projectRoot, 'themes')

  console.log('Built-in themes:')
  for (const t of builtInThemes) {
    console.log(`  - ${t.name}  primary=${t.colors.primary}`)
  }

  console.log('\nProject themes:')
  if (!existsSync(themesDir)) {
    console.log('  (none)')
    return
  }
  const files = readdirSync(themesDir).filter((f) => f.endsWith('.json'))
  if (files.length === 0) {
    console.log('  (none)')
    return
  }
  for (const f of files) {
    try {
      const theme = Theme.parse(JSON.parse(readFileSync(join(themesDir, f), 'utf-8')))
      console.log(`  - ${theme.name}  primary=${theme.colors.primary}  (${basename(f)})`)
    } catch (err) {
      console.log(`  - ${f}  (invalid: ${(err as Error).message})`)
    }
  }
}
