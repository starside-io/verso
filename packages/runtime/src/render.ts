import {
  colorsToCssVars,
  flattenContent,
  resolveBlockColors,
  resolveDeckColors,
  resolvePath,
  resolveSlideColors,
  resolveThemeRef,
} from '@starside-io/verso-core'
import type { ContentBlock, Manifest, Slide, Theme } from '@starside-io/verso-schema'
import { isSectionMarker } from '@starside-io/verso-schema'
import { type RawHtml, html, raw, renderToString } from './html.js'
import type {
  ComponentDef,
  DeckOutlineEntry,
  LayoutContext,
  MountOptions,
  RenderContext,
  RenderResult,
  ResolvedRegistry,
} from './types.js'

const cssVarString = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')

const slidesAsMap = (slides: MountOptions['slides']): Map<string, Slide> =>
  slides instanceof Map ? slides : new Map(Object.entries(slides))

export interface RenderDeckOptions {
  manifest: Manifest
  slides: Map<string, Slide> | Record<string, Slide>
  registry: ResolvedRegistry
  pathId: string
}

export interface RenderedDeck {
  pathId: string
  theme: Theme
  slides: Array<{ slide: Slide; html: string }>
}

const resolveTheme = (manifest: Manifest, registry: ResolvedRegistry): Theme =>
  resolveThemeRef({ manifest, registry: registry.themes })

const renderBlockWithColors = (
  block: ContentBlock,
  registry: ResolvedRegistry,
  baseCtx: Omit<RenderContext, 'colors' | 'currentPath'>,
  blockColors: ReturnType<typeof resolveBlockColors>,
  path: number[] = [],
): RenderResult => {
  const component = registry.components.get(block.type) as ComponentDef<unknown> | undefined
  if (!component) {
    return html`<div class="verso-unknown-block" data-type="${block.type}"></div>`
  }
  const ctx: RenderContext = { ...baseCtx, colors: blockColors, currentPath: path }
  const inner = component.render(block, ctx)
  const styleAttr = cssVarString(colorsToCssVars(blockColors))
  const pathAttr = path.length ? path.join('.') : ''
  return html`<div class="verso-block" data-block="${block.type}" data-block-path="${pathAttr}" style="${styleAttr}">${inner}</div>`
}

/**
 * Build the {{var}} resolution map for this deck render. Combines built-in
 * keys (`date`, `time`, `deckTitle`, `pathId`) with whatever the project
 * declared in `manifest.variables`. Project-declared keys win on collision so
 * authors can override the built-ins for testing.
 */
const buildVariableMap = (manifest: Manifest, pathId: string): Record<string, string> => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const builtins: Record<string, string> = {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    deckTitle: manifest.title,
    pathId,
  }
  const userVars = manifest.variables ?? {}
  return { ...builtins, ...userVars }
}

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][\w-]*)\s*\}\}/g

const interpolate = (html: string, vars: Record<string, string>): string =>
  html.replace(VARIABLE_PATTERN, (m, key) => (key in vars ? vars[key]! : m))

export const renderDeck = ({
  manifest,
  slides,
  registry,
  pathId,
}: RenderDeckOptions): RenderedDeck => {
  const theme = resolveTheme(manifest, registry)
  const slideMap = slidesAsMap(slides)
  const ordered = resolvePath({ manifest, slides: slideMap, pathId })
  const variables = buildVariableMap(manifest, pathId)

  // Path-filtered outline. Walks the manifest's slide_order so section markers
  // keep their position relative to the slides around them. Slides are only
  // included if they survived the path filter AND don't opt out via
  // `omit_from_agenda`. Layouts read this through `LayoutContext.deckOutline`.
  const orderedIds = new Set(ordered.map((s) => s.id))
  const deckOutline: DeckOutlineEntry[] = []
  for (const entry of manifest.slide_order) {
    if (isSectionMarker(entry)) {
      deckOutline.push({ kind: 'section', id: entry.id, title: entry.title })
      continue
    }
    if (!orderedIds.has(entry)) continue
    const s = slideMap.get(entry)
    if (!s || s.omit_from_agenda) continue
    deckOutline.push({
      kind: 'slide',
      id: s.id,
      title: s.title ?? s.header ?? s.id,
    })
  }

  const rendered = ordered.map((slide) => {
    const layout = registry.layouts.get(slide.layout) ?? registry.layouts.get('title-only')
    if (!layout) {
      throw new Error(`Layout "${slide.layout}" not found and no fallback "title-only" registered.`)
    }

    const slideColors = resolveSlideColors(theme, manifest, slide)
    const blocks = flattenContent(slide, pathId)

    const baseRenderCtx: Omit<RenderContext, 'colors' | 'currentPath'> = {
      pathId,
      block: (b: ContentBlock, path?: number[]) =>
        renderBlockWithColors(
          b,
          registry,
          baseRenderCtx,
          resolveBlockColors(theme, manifest, slide, b),
          path,
        ),
      component: <P>(c: ComponentDef<P>, props: P) =>
        c.render(props, { ...baseRenderCtx, colors: slideColors } as RenderContext),
    }

    const layoutCtx: LayoutContext = {
      ...baseRenderCtx,
      colors: slideColors,
      blocks,
      deckOutline,
    }

    const inner = layout.render(slide, layoutCtx)
    const styleAttr = cssVarString(colorsToCssVars(slideColors))
    // Optional deck-wide watermark. Rendered inside every slide section so it
    // shows up in PDF, HTML export, present mode, speaker mode (anywhere
    // renderDeck output lands).
    const wm = manifest.watermark
    const watermark = wm
      ? html`<div
          class="verso-watermark"
          data-position="${wm.position ?? 'bottom-right'}"
          style="--wm-opacity:${wm.opacity ?? 0.18}"
        >${wm.text}</div>`
      : ''
    const sectionHtml = html`<section
      class="verso-slide"
      data-slide-id="${slide.id}"
      data-layout="${slide.layout}"
      style="${styleAttr}"
    >${inner}${watermark}</section>`

    return { slide, html: interpolate(renderToString(sectionHtml), variables) }
  })

  return { pathId, theme, slides: rendered }
}

const slideShellHtml = (slide: Slide, body: string, position: number, total: number): string => {
  // Per-slide transition. The renderer rewrites `innerHTML` on every navigate,
  // so adding `verso-transition-<name>` to the wrapper makes the new element
  // animate in via a CSS keyframe each time. "none" (the default) skips the
  // animation by leaving the modifier class off entirely.
  const transition = slide.transition?.trim()
  const transitionClass =
    transition && transition !== 'none' ? ` verso-transition-${transition}` : ''
  const inner = html`
    <div class="verso-slide-wrapper${transitionClass}" data-position="${position}" data-transition="${transition ?? 'none'}">
      ${raw(body)}
      <div class="verso-progress" aria-hidden="true">${position + 1} / ${total}</div>
    </div>
  `
  return renderToString(inner)
}

export interface MountResult {
  destroy: () => void
  navigate: (delta: number) => void
  goto: (index: number) => void
  current: () => number
}

export const mount = (target: HTMLElement, options: MountOptions): MountResult => {
  const { manifest, slides, registry, pathId, mode = 'present', debug = false } = options

  let themeForChrome: Theme | undefined
  try {
    themeForChrome = resolveThemeRef({ manifest, registry: registry.themes })
  } catch {
    themeForChrome = undefined
  }
  const chromeVars = themeForChrome
    ? cssVarString(colorsToCssVars(resolveDeckColors(themeForChrome, manifest)))
    : ''

  if (!pathId) {
    renderPathPicker(target, manifest, chromeVars)
    return {
      destroy: () => {
        target.innerHTML = ''
      },
      navigate: () => {},
      goto: () => {},
      current: () => 0,
    }
  }

  const deck = renderDeck({ manifest, slides, registry, pathId })

  if (deck.slides.length === 0) {
    target.innerHTML = `<div class="verso-empty"><p>No slides for path "${pathId}".</p></div>`
    return {
      destroy: () => {
        target.innerHTML = ''
      },
      navigate: () => {},
      goto: () => {},
      current: () => 0,
    }
  }

  const themeVars = cssVarString(colorsToCssVars(resolveDeckColors(deck.theme, manifest)))
  const total = deck.slides.length
  let index = 0
  if (options.initialSlideId) {
    const idx = deck.slides.findIndex((s) => s.slide.id === options.initialSlideId)
    if (idx >= 0) index = idx
  }

  // Speaker timer. We start the clock when the speaker view first mounts and
  // update the visible text every second via interval (no re-render of the
  // slide content). The Reset button zeroes the start time without reloading.
  let timerStart = Date.now()
  const formatElapsed = (ms: number): string => {
    const total = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  }

  const renderFrame = () => {
    if (mode === 'speaker') {
      const cur = deck.slides[index]!
      const next = deck.slides[index + 1]
      const notes = cur.slide.notes ?? ''
      target.innerHTML = `
        <div class="verso-root verso-speaker" style="${themeVars}">
          <div class="verso-speaker-main">${slideShellHtml(cur.slide, cur.html, index, total)}</div>
          <aside class="verso-speaker-side">
            <section class="verso-notes">
              <h2>Notes</h2>
              <p>${escapeText(notes) || '<em>No notes.</em>'}</p>
            </section>
            <section class="verso-next">
              <h2>Next</h2>
              <p class="verso-next-title">${
                next
                  ? escapeText(next.slide.title ?? next.slide.header ?? next.slide.id)
                  : '<em>End of deck.</em>'
              }</p>
            </section>
          </aside>
          <div class="verso-speaker-timer" data-verso-timer title="Click to reset">
            <span class="verso-speaker-timer-text">${formatElapsed(Date.now() - timerStart)}</span>
          </div>
        </div>
      `
    } else {
      const cur = deck.slides[index]!
      const debugHtml = debug ? renderDebugOverlay(cur.slide) : ''
      target.innerHTML = `
        <div class="verso-root${debug ? ' verso-debug' : ''}" style="${themeVars}">
          ${slideShellHtml(cur.slide, cur.html, index, total)}
          ${debugHtml}
        </div>
      `
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      navigate(1)
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      navigate(-1)
      e.preventDefault()
    } else if (e.key === 'Home') {
      goto(0)
    } else if (e.key === 'End') {
      goto(total - 1)
    }
  }

  const navigate = (delta: number) => {
    const next = Math.max(0, Math.min(total - 1, index + delta))
    if (next !== index) {
      index = next
      renderFrame()
    }
  }

  const goto = (i: number) => {
    const next = Math.max(0, Math.min(total - 1, i))
    if (next !== index) {
      index = next
      renderFrame()
    }
  }

  renderFrame()
  globalThis.addEventListener?.('keydown', onKey)

  // Laser-pointer overlay. Active in both present and speaker modes. The
  // speaker holds the left mouse button and drags; a red trail follows the
  // cursor and fades over ~900ms. No new DOM unless the user starts dragging,
  // so the cost is zero for non-drawing audiences. Disabled in edit mode.
  const laserCleanup = (() => {
    if (mode !== 'present' && mode !== 'speaker') return () => {}
    if (options.disableLaser) return () => {}
    if (typeof document === 'undefined') return () => {}
    const canvas = document.createElement('canvas')
    canvas.className = 'verso-laser'
    Object.assign(canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '9999',
    })
    // Mount on body so it survives target.innerHTML rewrites on navigate.
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx)
      return () => {
        canvas.remove()
      }

    const resize = () => {
      const dpr = globalThis.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    globalThis.addEventListener?.('resize', resize)

    interface Point {
      x: number
      y: number
      t: number
    }
    const points: Point[] = []
    const TRAIL_MS = 900
    let drawing = false
    let raf = 0

    const render = () => {
      const now = performance.now()
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      // Drop expired points.
      while (points.length > 0 && now - points[0]!.t > TRAIL_MS) points.shift()
      if (points.length > 1) {
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1]!
          const b = points[i]!
          const age = now - b.t
          const alpha = Math.max(0, 1 - age / TRAIL_MS)
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`
          ctx.lineWidth = 4 + alpha * 4
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        // Bright head dot on the most recent point.
        const head = points[points.length - 1]!
        const headAlpha = Math.max(0, 1 - (now - head.t) / TRAIL_MS)
        ctx.fillStyle = `rgba(239, 68, 68, ${headAlpha})`
        ctx.beginPath()
        ctx.arc(head.x, head.y, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      if (points.length > 0 || drawing) {
        raf = requestAnimationFrame(render)
      } else {
        raf = 0
      }
    }

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      drawing = true
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() })
      if (!raf) raf = requestAnimationFrame(render)
    }
    const onMove = (e: MouseEvent) => {
      if (!drawing) return
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    }
    const onUp = () => {
      drawing = false
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onUp)

    return () => {
      drawing = false
      if (raf) cancelAnimationFrame(raf)
      globalThis.removeEventListener?.('resize', resize)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onUp)
      canvas.remove()
    }
  })()

  // Speaker timer interval: tick the visible text once per second. Re-queries
  // the element each tick because navigate rewrites innerHTML.
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let timerClickHandler: ((e: Event) => void) | null = null
  if (mode === 'speaker') {
    timerInterval = setInterval(() => {
      const el = target.querySelector('.verso-speaker-timer-text')
      if (el) el.textContent = formatElapsed(Date.now() - timerStart)
    }, 1000)
    timerClickHandler = (e: Event) => {
      const root = (e.target as HTMLElement | null)?.closest('[data-verso-timer]')
      if (!root) return
      timerStart = Date.now()
      const el = target.querySelector('.verso-speaker-timer-text')
      if (el) el.textContent = formatElapsed(0)
    }
    target.addEventListener('click', timerClickHandler)
  }

  return {
    destroy: () => {
      globalThis.removeEventListener?.('keydown', onKey)
      if (timerInterval) clearInterval(timerInterval)
      if (timerClickHandler) target.removeEventListener('click', timerClickHandler)
      laserCleanup()
      target.innerHTML = ''
    },
    navigate,
    goto,
    current: () => index,
  }
}

const escapeText = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const renderDebugOverlay = (slide: Slide): string => {
  const include = slide.path_include?.join(', ') ?? '*'
  const exclude = slide.path_exclude?.join(', ') ?? '—'
  const notes = slide.notes ? escapeText(slide.notes) : '<em>none</em>'
  return `
    <aside class="verso-debug-panel" aria-label="Slide debug info">
      <header>debug</header>
      <dl>
        <dt>id</dt><dd>${escapeText(slide.id)}</dd>
        <dt>layout</dt><dd>${escapeText(slide.layout)}</dd>
        <dt>paths in</dt><dd>${escapeText(include)}</dd>
        <dt>paths out</dt><dd>${escapeText(exclude)}</dd>
      </dl>
      <section><h4>notes</h4><p>${notes}</p></section>
    </aside>
  `
}

const renderPathPicker = (target: HTMLElement, manifest: Manifest, themeVars = ''): void => {
  // Preserve existing query params (mode, slide, debug, ...) so picking a
  // path doesn't drop the speaker view or any other state.
  const buildPathHref = (id: string): string => {
    if (typeof window === 'undefined') return `?path=${encodeURIComponent(id)}`
    const params = new URLSearchParams(window.location.search)
    params.set('path', id)
    return `?${params.toString()}`
  }
  const entries = Object.entries(manifest.paths)
  const items = entries.length
    ? entries
        .map(([id, def]) => {
          const accent = def.color ? `style="--path-accent:${escapeText(def.color)}"` : ''
          return `<li><a href="${escapeText(buildPathHref(id))}" data-path="${escapeText(id)}" ${accent}>${escapeText(def.label)}</a></li>`
        })
        .join('')
    : '<li><em>No paths defined in manifest.</em></li>'
  target.innerHTML = `
    <div class="verso-root verso-path-picker" style="${themeVars}">
      <h1>${escapeText(manifest.title)}</h1>
      <p>Pick a path:</p>
      <ul class="verso-paths">${items}</ul>
    </div>
  `
}
