import { computed, signal } from '@preact/signals'
import {
  Manifest,
  type SectionMarker,
  Slide,
  type SlideOrderEntry,
  type Theme,
  isSectionMarker,
  slideIdsOf,
} from '@starside-io/verso-schema'
import { builtInThemes } from '@starside-io/verso-themes'
import {
  createSlide as apiCreateSlide,
  deleteSlide as apiDeleteSlide,
  reorderSlides as apiReorderSlides,
  saveTheme as apiSaveTheme,
  fetchManifest,
  fetchSlides,
  fetchThemes,
  saveManifest,
  saveSlide,
} from './api'

export const manifest = signal<Manifest | null>(null)
export const slides = signal<Map<string, Slide>>(new Map())
export const projectThemes = signal<Theme[]>([])
export const activeSlideId = signal<string | null>(null)
export const activePathId = signal<string>('full')
// When set, the editor and paths view dim slides not in this path. UI-only,
// not persisted - it's a viewing aid for reviewing one audience's flow.
export const filterPathId = signal<string | null>(null)
// Cmd+K slide search palette open state. Signal-based so any component can
// trigger it (e.g. a button in the SlideList header).
export const slideSearchOpen = signal<boolean>(false)
// Cmd+Shift+F deck-wide find & replace modal.
export const findReplaceOpen = signal<boolean>(false)
// Top-toolbar "Deck properties" modal: title + variables editor.
export const deckPropertiesOpen = signal<boolean>(false)
// Top-toolbar "Watermark" modal: text + position + opacity.
export const watermarkOpen = signal<boolean>(false)
// Inspector "Browse icons" picker. Triggered from the IconBlock form. The
// caller stores a callback that receives the chosen { name, weight } so a
// single picker instance serves any block that wants to pick an icon.
export const iconPickerOpen = signal<boolean>(false)
export const iconPickerSeed = signal<{ name?: string; weight?: string } | null>(null)
export const iconPickerCallback = signal<((next: { name: string; weight: string }) => void) | null>(
  null,
)
export const loadError = signal<string | null>(null)
export const loaded = signal(false)

// All themes the editor can show: built-ins shipped with @starside-io/verso-themes plus
// any project-local theme JSON files. Project themes win on name collision.
export const themes = computed<{ theme: Theme; source: 'builtin' | 'project' }[]>(() => {
  const seen = new Set<string>()
  const out: { theme: Theme; source: 'builtin' | 'project' }[] = []
  for (const t of projectThemes.value) {
    seen.add(t.name)
    out.push({ theme: t, source: 'project' })
  }
  for (const t of builtInThemes) {
    if (!seen.has(t.name)) out.push({ theme: t, source: 'builtin' })
  }
  return out
})

export const orderedSlides = computed(() => {
  const m = manifest.value
  if (!m) return []
  const map = slides.value
  return slideIdsOf(m.slide_order)
    .map((id) => map.get(id))
    .filter((s): s is Slide => !!s)
})

// Slide list grouping: walk slide_order, splitting into runs separated by
// section markers. The first run (before any section) lives under a `null`
// section. Used by SlideList to render section headers between groups.
export interface SlideGroup {
  section: SectionMarker | null
  slides: Slide[]
}
export const slideGroups = computed<SlideGroup[]>(() => {
  const m = manifest.value
  if (!m) return []
  const map = slides.value
  const groups: SlideGroup[] = [{ section: null, slides: [] }]
  for (const entry of m.slide_order) {
    if (isSectionMarker(entry)) {
      groups.push({ section: entry, slides: [] })
      continue
    }
    const slide = map.get(entry)
    if (slide) groups[groups.length - 1]!.slides.push(slide)
  }
  // Drop the implicit leading group if it has no slides AND there are
  // explicit sections - cleaner UI for decks that start with a section.
  if (groups.length > 1 && groups[0]!.slides.length === 0 && groups[0]!.section === null) {
    groups.shift()
  }
  return groups
})

export const activeSlide = computed(() => {
  const id = activeSlideId.value
  if (!id) return null
  return slides.value.get(id) ?? null
})

export const activeThemeName = computed(() => manifest.value?.theme ?? null)

// Paths view: when true, the timeline draws lines and dots using the active
// theme's role colors (primary/secondary/accent/...) instead of each path's
// own custom color. Lets the user preview how things look against the brand
// palette without permanently rewriting path colors.
export const useThemeColorsForPaths = signal(false)

// Resolved theme palette as a positional array. Used by PathsView when the
// toggle above is on. Roles fall back gracefully (accent → secondary, surface
// → classic, muted → secondary) so the array is always populated.
export const themeColorPalette = computed<string[]>(() => {
  const m = manifest.value
  if (!m) return []
  const ref = m.theme
  let theme: Theme | undefined
  if (typeof ref === 'string') {
    theme = themes.value.find((t) => t.theme.name === ref)?.theme
  } else {
    theme = ref
  }
  if (!theme) return []
  const c = theme.colors
  return [
    c.primary,
    c.secondary,
    c.accent ?? c.secondary,
    c.classic,
    c.surface ?? c.classic,
    c.muted ?? c.secondary,
  ]
})

export const status = signal<{ kind: 'idle' | 'saving' | 'ok' | 'error'; message?: string }>({
  kind: 'idle',
})

// Right-pane tab state.
export const rightTab = signal<'inspector' | 'transitions' | 'themes'>('inspector')

// Top-level view mode: normal editor or paths overview.
export const viewMode = signal<'editor' | 'paths'>('editor')

// Editor chrome theme. Persisted to localStorage so the choice survives
// reloads. Dark is the default - the light variant is brand-tinted, not
// pure white. The attribute on <html> is the source of truth for CSS;
// applying it imperatively avoids relying on render-time signal subscriptions.
export type EditorThemeMode = 'dark' | 'light'
const THEME_KEY = 'verso.editor.theme'
const readStoredTheme = (): EditorThemeMode => {
  if (typeof localStorage === 'undefined') return 'dark'
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' ? 'light' : 'dark'
}
const applyThemeAttr = (mode: EditorThemeMode): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode)
  }
}
export const editorTheme = signal<EditorThemeMode>(readStoredTheme())
applyThemeAttr(editorTheme.peek())
export const setEditorTheme = (next: EditorThemeMode): void => {
  editorTheme.value = next
  applyThemeAttr(next)
  if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, next)
}
export const toggleEditorTheme = (): void =>
  setEditorTheme(editorTheme.value === 'dark' ? 'light' : 'dark')

// True while a PDF build is in flight - the toolbar disables the button so the
// user can't kick off a parallel build.
export const pdfBuilding = signal(false)

// HTML export confirm dialog. Toolbar sets this to true; the App renders the
// dialog at the root so it isn't trapped inside the toolbar's containing
// block (the toolbar uses backdrop-filter, which scopes position: fixed).
export const htmlExportOpen = signal(false)
export const htmlExportRunner = signal<((inlineImages: boolean) => void) | null>(null)

// Editing target. Path is an array of indices into `slide.content` (recursive
// for cards/panels). Empty array = root slide; e.g. [2, 0] = first child of
// the third top-level block.
export const activeBlockPath = signal<number[] | null>(null)
// Transient hover highlight, separate from the persistent selection.
export const hoveredBlockPath = signal<number[] | null>(null)

// Per-slide undo/redo. We keep snapshots of the previous Slide objects (parsed
// schema instances are effectively immutable, so reference reuse is safe). We
// only track slide-level changes - manifest/theme/slide-list ops are rare and
// deliberate, so excluding them keeps Cmd+Z behavior predictable.
const HISTORY_CAP = 50
type SlideHistory = { past: Slide[]; future: Slide[] }
const histories = new Map<string, SlideHistory>()
const historyTick = signal(0)
const getHistory = (id: string): SlideHistory => {
  let h = histories.get(id)
  if (!h) {
    h = { past: [], future: [] }
    histories.set(id, h)
  }
  return h
}
export const canUndo = computed<boolean>(() => {
  historyTick.value
  const id = activeSlideId.value
  return !!(id && (histories.get(id)?.past.length ?? 0) > 0)
})
export const canRedo = computed<boolean>(() => {
  historyTick.value
  const id = activeSlideId.value
  return !!(id && (histories.get(id)?.future.length ?? 0) > 0)
})

export const flashOk = (msg: string, ttlMs = 1500): void => {
  status.value = { kind: 'ok', message: msg }
  setTimeout(() => {
    if (status.value.kind === 'ok' && status.value.message === msg) {
      status.value = { kind: 'idle' }
    }
  }, ttlMs)
}

const flashError = (msg: string) => {
  status.value = { kind: 'error', message: msg }
}

export const updatePath = async (
  id: string,
  patch: { label?: string; color?: string },
): Promise<void> => {
  const m = manifest.value
  if (!m || !m.paths[id]) return
  status.value = { kind: 'saving' }
  const current = m.paths[id]!
  const merged = {
    label: patch.label ?? current.label,
    ...(patch.color !== undefined
      ? { color: patch.color }
      : current.color
        ? { color: current.color }
        : {}),
  }
  const next = Manifest.parse({ ...m, paths: { ...m.paths, [id]: merged } })
  manifest.value = next
  try {
    await saveManifest(next)
    flashOk(`Updated path "${id}"`)
  } catch (err) {
    manifest.value = m
    flashError(`Failed to update path: ${(err as Error).message}`)
  }
}

export const removePath = async (id: string): Promise<void> => {
  const m = manifest.value
  if (!m || !m.paths[id]) return
  status.value = { kind: 'saving' }
  const { [id]: _removed, ...rest } = m.paths
  const next = Manifest.parse({ ...m, paths: rest })
  manifest.value = next
  try {
    await saveManifest(next)
    flashOk(`Removed path "${id}"`)
  } catch (err) {
    manifest.value = m
    flashError(`Failed to remove path: ${(err as Error).message}`)
  }
}

export const addPath = async (id: string, label: string, color?: string): Promise<void> => {
  const m = manifest.value
  if (!m) return
  if (m.paths[id]) {
    flashError(`Path "${id}" already exists`)
    return
  }
  status.value = { kind: 'saving' }
  const def = color ? { label, color } : { label }
  const next = Manifest.parse({ ...m, paths: { ...m.paths, [id]: def } })
  manifest.value = next
  try {
    await saveManifest(next)
    flashOk(`Added path "${id}"`)
  } catch (err) {
    manifest.value = m
    flashError(`Failed to add path: ${(err as Error).message}`)
  }
}

export const setActiveTheme = async (themeName: string): Promise<void> => {
  const m = manifest.value
  if (!m || m.theme === themeName) return
  status.value = { kind: 'saving' }
  const next = Manifest.parse({ ...m, theme: themeName })
  manifest.value = next // optimistic
  try {
    await saveManifest(next)
    flashOk(`Theme set to ${themeName}`)
  } catch (err) {
    manifest.value = m // rollback
    flashError(`Failed to set theme: ${(err as Error).message}`)
  }
}

export const updateActiveSlide = async (patch: (s: Slide) => Slide): Promise<void> => {
  const slide = activeSlide.value
  if (!slide) return
  await persistActiveSlide(patch(slide))
}

/** Patch the deck manifest (title, variables, etc) and persist. Optimistic. */
export const updateManifest = async (patch: (m: Manifest) => Manifest): Promise<void> => {
  const m = manifest.value
  if (!m) return
  const prev = m
  const next = Manifest.parse(patch(m))
  status.value = { kind: 'saving' }
  manifest.value = next
  try {
    await saveManifest(next)
    flashOk('Updated deck')
  } catch (err) {
    manifest.value = prev
    flashError(`Failed to update deck: ${(err as Error).message}`)
    throw err
  }
}

// Optimistic write + persist. Internal: does NOT touch undo history.
const writeSlide = async (next: Slide): Promise<void> => {
  status.value = { kind: 'saving' }
  const prev = slides.value.get(next.id)
  const map = new Map(slides.value)
  map.set(next.id, next)
  slides.value = map
  try {
    await saveSlide(next)
    flashOk(`Saved ${next.id}`)
  } catch (err) {
    if (prev) {
      const rb = new Map(slides.value)
      rb.set(prev.id, prev)
      slides.value = rb
    }
    flashError(`Save failed: ${(err as Error).message}`)
    throw err
  }
}

export const persistActiveSlide = async (next: Slide): Promise<void> => {
  const prev = slides.value.get(next.id)
  if (prev && prev !== next) {
    const h = getHistory(next.id)
    h.past.push(prev)
    if (h.past.length > HISTORY_CAP) h.past.shift()
    h.future.length = 0
    historyTick.value++
  }
  await writeSlide(next)
}

export const undo = async (): Promise<void> => {
  const id = activeSlideId.value
  if (!id) return
  const h = histories.get(id)
  if (!h || h.past.length === 0) return
  const current = slides.value.get(id)
  if (!current) return
  const prev = h.past.pop() as Slide
  h.future.push(current)
  historyTick.value++
  await writeSlide(prev)
}

export const redo = async (): Promise<void> => {
  const id = activeSlideId.value
  if (!id) return
  const h = histories.get(id)
  if (!h || h.future.length === 0) return
  const current = slides.value.get(id)
  if (!current) return
  const next = h.future.pop() as Slide
  h.past.push(current)
  historyTick.value++
  await writeSlide(next)
}

// Generate a fresh slide id derived from the source. Tries `${src}-copy`,
// then `${src}-copy-2`, etc. until one is free.
const uniqueSlideId = (src: string, taken: Set<string>): string => {
  const base = `${src}-copy`
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

export const duplicateSlide = async (srcId: string): Promise<void> => {
  const m = manifest.value
  const src = slides.value.get(srcId)
  if (!m || !src) return
  const taken = new Set(slides.value.keys())
  const newId = uniqueSlideId(srcId, taken)
  status.value = { kind: 'saving' }
  try {
    // Create the slide on disk so the file exists, then overwrite with the
    // source's content under the new id.
    await apiCreateSlide(newId, src.layout)
    const dup = Slide.parse({ ...src, id: newId })
    await saveSlide(dup)
    const map = new Map(slides.value)
    map.set(newId, dup)
    slides.value = map
    // Insert right after the source in slide_order.
    const order = [...m.slide_order]
    const srcIdx = order.findIndex((e) => typeof e === 'string' && e === srcId)
    const at = srcIdx >= 0 ? srcIdx + 1 : order.length
    order.splice(at, 0, newId)
    manifest.value = Manifest.parse({ ...m, slide_order: order })
    await apiReorderSlides(order)
    activeSlideId.value = newId
    flashOk(`Duplicated to ${newId}`)
  } catch (err) {
    flashError(`Duplicate failed: ${(err as Error).message}`)
  }
}

export const addSlide = async (id: string, layout?: string): Promise<void> => {
  status.value = { kind: 'saving' }
  try {
    const { slide } = await apiCreateSlide(id, layout)
    const map = new Map(slides.value)
    map.set(slide.id, slide)
    slides.value = map
    if (manifest.value && !slideIdsOf(manifest.value.slide_order).includes(slide.id)) {
      manifest.value = Manifest.parse({
        ...manifest.value,
        slide_order: [...manifest.value.slide_order, slide.id],
      })
    }
    activeSlideId.value = slide.id
    flashOk(`Created ${slide.id}`)
  } catch (err) {
    flashError(`Add slide failed: ${(err as Error).message}`)
  }
}

// Reorders accept the full mixed shape now (slide ids + section markers) so
// dragging slides between sections, moving a section block, or any other
// rearrangement use the same path.
export const setSlideOrder = async (newOrder: SlideOrderEntry[]): Promise<void> => {
  const m = manifest.value
  if (!m) return
  status.value = { kind: 'saving' }
  const prev = m
  manifest.value = Manifest.parse({ ...m, slide_order: newOrder })
  try {
    await apiReorderSlides(newOrder)
    flashOk('Reordered')
  } catch (err) {
    manifest.value = prev
    flashError(`Reorder failed: ${(err as Error).message}`)
  }
}
export const reorderSlides = setSlideOrder

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section'

const uniqueSectionId = (base: string, order: SlideOrderEntry[]): string => {
  const taken = new Set(order.filter(isSectionMarker).map((s) => s.id))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

export const addSection = async (title: string, beforeIndex?: number): Promise<void> => {
  const m = manifest.value
  if (!m) return
  const id = uniqueSectionId(slugify(title), m.slide_order)
  const marker: SectionMarker = { type: 'section', id, title }
  const next = [...m.slide_order]
  const at = beforeIndex == null ? next.length : Math.max(0, Math.min(next.length, beforeIndex))
  next.splice(at, 0, marker)
  await setSlideOrder(next)
}

export const renameSection = async (sectionId: string, title: string): Promise<void> => {
  const m = manifest.value
  if (!m) return
  const next = m.slide_order.map((entry) =>
    isSectionMarker(entry) && entry.id === sectionId ? { ...entry, title } : entry,
  )
  await setSlideOrder(next)
}

export const removeSection = async (sectionId: string): Promise<void> => {
  const m = manifest.value
  if (!m) return
  const next = m.slide_order.filter((entry) => !(isSectionMarker(entry) && entry.id === sectionId))
  await setSlideOrder(next)
}

export const persistTheme = async (theme: Theme): Promise<void> => {
  status.value = { kind: 'saving' }
  const prevList = projectThemes.value
  // Optimistic: replace or insert in projectThemes
  const next = prevList.filter((t) => t.name !== theme.name).concat(theme)
  projectThemes.value = next
  try {
    await apiSaveTheme(theme)
    flashOk(`Saved theme ${theme.name}`)
  } catch (err) {
    projectThemes.value = prevList
    flashError(`Theme save failed: ${(err as Error).message}`)
  }
}

export const removeSlide = async (id: string): Promise<void> => {
  status.value = { kind: 'saving' }
  try {
    await apiDeleteSlide(id)
    const map = new Map(slides.value)
    map.delete(id)
    slides.value = map
    if (manifest.value) {
      manifest.value = Manifest.parse({
        ...manifest.value,
        slide_order: manifest.value.slide_order.filter((e) => typeof e !== 'string' || e !== id),
      })
    }
    if (activeSlideId.value === id) {
      const remaining = manifest.value ? slideIdsOf(manifest.value.slide_order) : []
      activeSlideId.value = remaining[0] ?? null
    }
    flashOk(`Deleted ${id}`)
  } catch (err) {
    flashError(`Delete failed: ${(err as Error).message}`)
  }
}

export const bootstrap = async (): Promise<void> => {
  try {
    const [m, s, t] = await Promise.all([fetchManifest(), fetchSlides(), fetchThemes()])
    manifest.value = m
    slides.value = s
    projectThemes.value = t

    // Pick a sensible default path: first manifest path, fall back to "full".
    const pathIds = Object.keys(m.paths)
    activePathId.value = pathIds[0] ?? 'full'

    // Pick the first slide in slide_order as the active slide.
    const first = slideIdsOf(m.slide_order).find((id) => s.has(id))
    activeSlideId.value = first ?? null

    loaded.value = true
  } catch (err) {
    loadError.value = (err as Error).message
    loaded.value = true
  }
}
