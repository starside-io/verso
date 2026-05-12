import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
/**
 * Generate marketing-site slide PNGs.
 *
 * Pass 1: render four demo slides at the default theme. Used by the
 * "code vs output" alternating sections on the landing page.
 *
 * Pass 2: render one demo slide (02-stats) across every built-in theme.
 * Used by the themes showcase.
 *
 * Outputs land in `docs/site/images/` as PNG. Each is 1920x1080.
 *
 * Run from this folder: `node render.mjs`
 *
 * Requires the workspace to be built first (`pnpm -r build`).
 */
// Resolved relative to repo root so this script can run without being part
// of the pnpm workspace.
import { buildPng } from '../../../packages/build/dist/index.js'

const here = resolve(new URL('.', import.meta.url).pathname)
const outDir = resolve(here, '../images')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const SLIDES = ['01-two-col', '02-stats', '03-quote', '04-cover']
const THEMES = [
  'verso-slate',
  'verso-warm',
  'verso-mono',
  'verso-neon',
  'verso-mars',
  'verso-forest',
]

const projectRoot = here
const deckPath = join(projectRoot, 'deck.json')

const setTheme = (name) => {
  const m = JSON.parse(readFileSync(deckPath, 'utf-8'))
  m.theme = name
  writeFileSync(deckPath, `${JSON.stringify(m, null, 2)}\n`)
}

const renderOne = async (slideId, label) => {
  const r = await buildPng({
    projectRoot,
    pathId: 'full',
    slideId,
    outDir,
  })
  const dest = join(outDir, `${label}.png`)
  renameSync(r.file, dest)
  console.log(`  -> ${label}.png (${Math.round(r.bytes / 1024)} KB)`)
}

// Default theme used by passes 1 and 3 (the demo slides and the path-branching
// renders). Picked verso-neon because it pops against the site's dark background
// and reinforces the brand magenta accent.
const DEFAULT_THEME = 'verso-neon'

// Pass 1: default theme, every demo slide.
console.log(`Pass 1: ${DEFAULT_THEME} x 4 slides`)
setTheme(DEFAULT_THEME)
for (const id of SLIDES) {
  await renderOne(id, `default-${id}`)
}

// Pass 2: one slide across every theme.
console.log('Pass 2: 02-stats x 6 themes')
for (const theme of THEMES) {
  setTheme(theme)
  await renderOne('02-stats', `theme-${theme}`)
}

// Pass 3: the same path-aware slide rendered for three audiences. Each render
// uses a different pathId, so block-level path_include filters in 05-paths.json
// produce three visibly different decks from the same source file.
console.log(`Pass 3: 05-paths x 3 audience paths (${DEFAULT_THEME})`)
setTheme(DEFAULT_THEME)
const AUDIENCE_PATHS = ['sales', 'engineering', 'exec']
for (const pathId of AUDIENCE_PATHS) {
  // Override pathId for buildPng. The default helper uses 'full'; we want each
  // audience cut, so re-implement the call inline.
  const r = await buildPng({
    projectRoot,
    pathId,
    slideId: '05-paths',
    outDir,
  })
  const dest = join(outDir, `path-${pathId}.png`)
  renameSync(r.file, dest)
  console.log(`  -> path-${pathId}.png (${Math.round(r.bytes / 1024)} KB)`)
}

// Reset deck.json to the marketing default theme so the demo project stays
// clean for future runs.
setTheme(DEFAULT_THEME)
console.log('done')
