import { builtInLayouts } from '@starside-io/verso-layouts'
import { type VersoConfig, buildRegistry, mount } from '@starside-io/verso-runtime'
import { builtInComponents } from '@starside-io/verso-runtime/components'
import { Manifest, Slide, Theme } from '@starside-io/verso-schema'
import { builtInThemes } from '@starside-io/verso-themes'
import userConfig from '@starside-io/verso-user-config'

import '@starside-io/verso-layouts/styles.css'
import '@starside-io/verso-user-styles'

import { installBrowserIconHydration } from './icons-browser.js'

// Wires Phosphor icon lazy loading + DOM hydration. Must run before any
// mount call so the Icon component's `requestIconLoad` calls have a loader.
installBrowserIconHydration()

const params = new URLSearchParams(window.location.search)
const pathParam = params.get('path')
const modeParam = params.get('mode') === 'speaker' ? 'speaker' : 'present'
const debugParam = params.get('debug')
const debug =
  debugParam === '1' || debugParam === 'true' || debugParam === '' || params.get('mode') === 'debug'
// When embedded in the editor (iframe sets ?edit=1), disable the laser
// pointer so click-drag stays available for selecting blocks instead of
// painting a red trail across the slide.
const editMode = params.get('edit') === '1'

const fail = (message: string): never => {
  const root = document.getElementById('verso-root')
  if (root) {
    root.innerHTML = `<pre style="padding:2rem;color:#cf222e;white-space:pre-wrap">${message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</pre>`
  }
  throw new Error(message)
}

const root = document.getElementById('verso-root') ?? fail('No #verso-root element')

const fetchJson = async <T>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`)
  return (await r.json()) as T
}

const bootstrap = async () => {
  const [manifestRaw, slidesRaw, projectThemesRaw] = await Promise.all([
    fetchJson<unknown>('/__verso/manifest'),
    fetchJson<Record<string, unknown>>('/__verso/slides'),
    fetchJson<unknown[]>('/__verso/themes'),
  ])

  const manifest = Manifest.parse(manifestRaw)

  const slides = new Map<string, Slide>()
  for (const [id, raw] of Object.entries(slidesRaw)) {
    const slide = Slide.parse(raw)
    if (slide.id !== id) {
      console.warn(
        `Slide file id "${slide.id}" does not match filename "${id}"; using ${slide.id}.`,
      )
    }
    slides.set(slide.id, slide)
  }

  const projectThemes = projectThemesRaw.map((t) => Theme.parse(t))

  const userCfg: VersoConfig = userConfig ?? {}
  const registry = buildRegistry({
    builtIn: {
      themes: builtInThemes,
      layouts: builtInLayouts,
      components: builtInComponents,
    },
    user: {
      ...userCfg,
      themes: [...(userCfg.themes ?? []), ...projectThemes],
    },
  })

  const pathIds = Object.keys(manifest.paths)
  if (pathParam == null && pathIds.length > 1) {
    mount(root as HTMLElement, {
      manifest,
      slides,
      registry,
      mode: modeParam,
      debug,
      disableLaser: editMode,
    })
    return
  }

  const pathId = pathParam ?? pathIds[0] ?? 'full'
  const initialSlideId = params.get('slide') ?? undefined
  mount(root as HTMLElement, {
    manifest,
    slides,
    registry,
    pathId,
    mode: modeParam,
    debug,
    initialSlideId,
    disableLaser: editMode,
  })

  // Edit mode: enable two-way block selection between this iframe and the
  // editor parent window. Activated via ?edit=1 (set by the editor's iframe).
  if (params.get('edit') === '1') {
    enableEditBridge()
  }
}

const enableEditBridge = () => {
  const editorTarget = (): Window | null =>
    window.parent && window.parent !== window ? window.parent : null

  const parsePath = (raw: string): number[] =>
    raw === '' ? [] : raw.split('.').map((n) => Number.parseInt(n, 10))

  // Click → tell the parent which block was selected.
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const block = target.closest<HTMLElement>('[data-block-path]')
      if (!block) return
      const raw = block.getAttribute('data-block-path') ?? ''
      editorTarget()?.postMessage({ type: 'verso-edit/select', path: parsePath(raw) }, '*')
      e.stopPropagation()
    },
    true,
  )

  // Hover → tell the parent which block is under the pointer. Mirrors the
  // hover-in-tree behavior so the inspector tree highlights too. Only sends
  // when the closest [data-block-path] changes, to avoid message spam.
  let lastHoverRaw: string | null = null
  const sendHover = (raw: string | null) => {
    if (raw === lastHoverRaw) return
    lastHoverRaw = raw
    editorTarget()?.postMessage(
      { type: 'verso-edit/hover', path: raw === null ? null : parsePath(raw) },
      '*',
    )
  }
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement | null
    const block = target?.closest<HTMLElement>('[data-block-path]') ?? null
    sendHover(block ? (block.getAttribute('data-block-path') ?? '') : null)
  })
  document.addEventListener('mouseleave', () => sendHover(null), true)
  window.addEventListener('blur', () => sendHover(null))

  // Highlight from the parent.
  let highlightPath: string | null = null
  const applyHighlight = () => {
    for (const el of document.querySelectorAll('.verso-block.is-edit-highlight')) {
      el.classList.remove('is-edit-highlight')
    }
    if (!highlightPath) return
    const sel = `[data-block-path="${highlightPath}"]`
    for (const el of document.querySelectorAll(sel)) {
      el.classList.add('is-edit-highlight')
    }
  }
  window.addEventListener('message', (e) => {
    const data = e.data as { type?: string; path?: number[] | null } | null
    if (!data || data.type !== 'verso-edit/highlight') return
    highlightPath = Array.isArray(data.path) && data.path.length ? data.path.join('.') : null
    applyHighlight()
  })
  // Re-apply highlight after every render (slide change, HMR reload).
  const obs = new MutationObserver(() => applyHighlight())
  obs.observe(document.body, { childList: true, subtree: true })
}

bootstrap().catch((err) => fail(`Verso failed to load:\n${(err as Error).stack ?? err}`))
