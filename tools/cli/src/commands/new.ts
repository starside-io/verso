import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Manifest, Slide } from '@starside-io/verso-schema'
import { isMarkdownSource, parseMarkdownDeck } from '../markdownImport.js'
import { log, readJson, requireProjectRoot, writeFileSafe, writeJson } from '../utils.js'

const cwdFromOpts = (dir?: string): string => (dir ? resolve(process.cwd(), dir) : process.cwd())

export interface NewSlideOptions {
  layout?: string
  paths?: string
  dir?: string
  from?: string
}

const SLIDE_ID_RE = /^[a-z0-9][a-z0-9-]*$/i

const isUrl = (s: string): boolean => /^https?:\/\//i.test(s)

const loadSlideSource = async (
  source: string,
  projectRoot: string,
): Promise<{ data: unknown; origin: string }> => {
  if (isUrl(source)) {
    const res = await fetch(source)
    if (!res.ok) {
      throw new Error(`Failed to fetch ${source}: ${res.status} ${res.statusText}`)
    }
    return { data: await res.json(), origin: source }
  }
  const abs = resolve(projectRoot, source)
  if (!existsSync(abs)) {
    throw new Error(`Source slide not found at ${abs}`)
  }
  return { data: readJson(abs), origin: abs }
}

const loadRawText = async (
  source: string,
  projectRoot: string,
): Promise<{ text: string; origin: string }> => {
  if (isUrl(source)) {
    const res = await fetch(source)
    if (!res.ok) {
      throw new Error(`Failed to fetch ${source}: ${res.status} ${res.statusText}`)
    }
    return { text: await res.text(), origin: source }
  }
  const abs = resolve(projectRoot, source)
  if (!existsSync(abs)) {
    throw new Error(`Source not found at ${abs}`)
  }
  return { text: readFileSync(abs, 'utf-8'), origin: abs }
}

export const runNewSlide = async (id: string | undefined, opts: NewSlideOptions): Promise<void> => {
  const projectRoot = requireProjectRoot(cwdFromOpts(opts.dir))

  if (!opts.from && !id) {
    log.err('Slide id is required when --from is not used.')
    process.exit(1)
  }

  const pathsOverride = opts.paths
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const manifestPath = join(projectRoot, 'deck.json')

  // ---------- Markdown outline import ----------
  // `--from foo.md` (or any `--from` whose contents start with a `# heading`)
  // creates one slide per top-level heading in a single pass and appends them
  // all to slide_order. The positional `id` is treated as a prefix when given,
  // since multiple slides are produced.
  if (opts.from) {
    let raw: { text: string; origin: string } | null = null
    if (/\.(md|markdown|mdx)$/i.test(opts.from)) {
      try {
        raw = await loadRawText(opts.from, projectRoot)
      } catch (err) {
        log.err((err as Error).message)
        process.exit(1)
      }
    } else {
      // Probe text first, fall back to JSON if it's not markdown.
      try {
        const probe = await loadRawText(opts.from, projectRoot)
        if (isMarkdownSource(opts.from, probe.text)) {
          raw = probe
        }
      } catch {
        // fall through to JSON path
      }
    }

    if (raw) {
      const manifestRaw = readJson<unknown>(manifestPath)
      const manifest = Manifest.parse(manifestRaw)
      const taken = new Set<string>(
        manifest.slide_order.flatMap((e) => (typeof e === 'string' ? [e] : [])),
      )
      const idPrefix = id?.trim() || undefined
      if (idPrefix && !SLIDE_ID_RE.test(idPrefix)) {
        log.err(`Slide id prefix must be alphanumeric with hyphens, got "${idPrefix}".`)
        process.exit(1)
      }
      const { slides, warnings } = parseMarkdownDeck(raw.text, {
        layout: opts.layout,
        pathInclude: pathsOverride?.length ? pathsOverride : undefined,
        idPrefix,
        takenIds: taken,
      })
      for (const w of warnings) log.info(w)
      if (slides.length === 0) {
        log.err('No slides parsed from markdown.')
        process.exit(1)
      }

      let createdCount = 0
      for (const draft of slides) {
        const slide = Slide.parse(draft)
        const slidePath = join(projectRoot, 'slides', `${slide.id}.json`)
        const wrote = writeJson(slidePath, slide)
        if (!wrote) {
          log.err(`Stopped after ${createdCount} slide(s).`)
          process.exit(1)
        }
        manifest.slide_order.push(slide.id)
        log.ok(`Created ${slidePath}`)
        createdCount++
      }
      writeJson(manifestPath, manifest, { overwrite: true })
      log.ok(`Imported ${createdCount} slide(s) from ${raw.origin}`)
      return
    }
  }

  // ---------- Single-slide path (JSON --from or stub) ----------
  let slide: Slide
  if (opts.from) {
    let loaded: { data: unknown; origin: string }
    try {
      loaded = await loadSlideSource(opts.from, projectRoot)
    } catch (err) {
      log.err((err as Error).message)
      process.exit(1)
    }

    let parsed: Slide
    try {
      parsed = Slide.parse(loaded.data)
    } catch (err) {
      log.err(`Source is not a valid Verso slide: ${(err as Error).message}`)
      process.exit(1)
    }

    const newId = id ?? parsed.id
    if (!SLIDE_ID_RE.test(newId)) {
      log.err(`Slide id must be alphanumeric with hyphens, got "${newId}".`)
      process.exit(1)
    }
    if (id && id !== parsed.id) {
      log.info(`Renaming slide id "${parsed.id}" → "${newId}"`)
    }

    slide = Slide.parse({
      ...parsed,
      id: newId,
      ...(opts.layout ? { layout: opts.layout } : {}),
      ...(pathsOverride?.length ? { path_include: pathsOverride } : {}),
    })
    log.info(`Imported from ${loaded.origin}`)
  } else {
    if (!SLIDE_ID_RE.test(id!)) {
      log.err(`Slide id must be alphanumeric with hyphens, got "${id}".`)
      process.exit(1)
    }
    slide = Slide.parse({
      id: id!,
      title: id!.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      layout: opts.layout ?? 'title-only',
      path_include: pathsOverride?.length ? pathsOverride : undefined,
      content: [{ type: 'text', text: 'Edit this slide.' }],
    })
  }

  const slidePath = join(projectRoot, 'slides', `${slide.id}.json`)
  const wrote = writeJson(slidePath, slide)
  if (!wrote) process.exit(1)
  log.ok(`Created ${slidePath}`)

  const manifestRaw = readJson<unknown>(manifestPath)
  const manifest = Manifest.parse(manifestRaw)
  if (!manifest.slide_order.includes(slide.id)) {
    manifest.slide_order.push(slide.id)
    writeJson(manifestPath, manifest, { overwrite: true })
    log.ok(`Appended "${slide.id}" to slide_order in deck.json`)
  }
}

const layoutTemplate = (name: string): string =>
  `import { defineLayout, html } from '@starside-io/verso-runtime'

export const ${toIdent(name)} = defineLayout({
  name: '${name}',
  render: (slide, ctx) => html\`
    <div class="layout-${name}">
      \${slide.title ? html\`<h1 class="verso-title">\${slide.title}</h1>\` : ''}
      <div class="verso-content">\${ctx.blocks.map((b) => ctx.block(b))}</div>
    </div>
  \`,
})
`

const toIdent = (s: string): string =>
  s.replace(/[-_](.)/g, (_, c: string) => c.toUpperCase()).replace(/^(.)/, (m) => m.toLowerCase())

const ensureConfig = (projectRoot: string, layoutName: string): void => {
  const configPath = join(projectRoot, 'verso.config.ts')
  if (!existsSync(configPath)) {
    const ident = toIdent(layoutName)
    const content = `import { defineConfig } from '@starside-io/verso-runtime'
import { ${ident} } from './layouts/${layoutName}.js'

export default defineConfig({
  layouts: [${ident}],
})
`
    writeFileSafe(configPath, content)
    log.ok(`Created ${configPath}`)
    return
  }

  const current = readFileSync(configPath, 'utf-8')
  const ident = toIdent(layoutName)
  if (current.includes(`./layouts/${layoutName}`)) {
    log.info(`verso.config.ts already references "${layoutName}".`)
    return
  }
  const importLine = `import { ${ident} } from './layouts/${layoutName}.js'\n`
  const updated = importLine + current
  const withReg = updated.includes('layouts:')
    ? updated.replace(/layouts:\s*\[([^\]]*)\]/, (_m, inner: string) => {
        const items = inner.trim() ? `${inner.trim()}, ${ident}` : ident
        return `layouts: [${items}]`
      })
    : updated.replace(/defineConfig\(\{/, `defineConfig({\n  layouts: [${ident}],`)
  writeFileSync(configPath, withReg)
  log.ok(`Registered "${layoutName}" in verso.config.ts`)
}

export interface NewLayoutOptions {
  dir?: string
}

export const runNewLayout = async (name: string, opts: NewLayoutOptions = {}): Promise<void> => {
  const projectRoot = requireProjectRoot(cwdFromOpts(opts.dir))
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    log.err(`Layout name must be lowercase alphanumeric with hyphens, got "${name}".`)
    process.exit(1)
  }

  const layoutPath = join(projectRoot, 'layouts', `${name}.ts`)
  const wrote = writeFileSafe(layoutPath, layoutTemplate(name))
  if (!wrote) process.exit(1)
  log.ok(`Created ${layoutPath}`)

  ensureConfig(projectRoot, name)
}
