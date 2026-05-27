import { icons as PHOSPHOR_CATALOG } from '@phosphor-icons/core'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'

/**
 * Visual icon picker modal. Drives the `IconBlock` form.
 *
 * The Phosphor catalog ships ~1500 names. We can't bundle every SVG eagerly
 * (≈9MB raw), so we lazy-load:
 *   - `import.meta.glob` makes each `@phosphor-icons/core/assets/<weight>/*.svg`
 *     its own Vite chunk that downloads only when requested.
 *   - An IntersectionObserver sees which grid cells are visible and only
 *     hydrates those. Scrolling past loads more on demand.
 *
 * Filename quirk worth knowing: Phosphor names regular weight as `<name>.svg`
 * and every other weight as `<name>-<weight>.svg`. The key normalizer below
 * strips that suffix so callers ask by logical "weight/name".
 */

type Weight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
const WEIGHTS: Weight[] = ['regular', 'bold', 'fill', 'duotone', 'light', 'thin']

// Lazy SVG chunk loaders, keyed by "weight/name".
const svgLoaders = import.meta.glob<string>('/node_modules/@phosphor-icons/core/assets/**/*.svg', {
  query: '?raw',
  import: 'default',
})
const loaderByKey = new Map<string, () => Promise<string>>()
for (const [path, fn] of Object.entries(svgLoaders)) {
  const m = path.match(/@phosphor-icons\/core\/assets\/([^/]+)\/([^/]+)\.svg$/)
  if (!m) continue
  const weight = m[1]!
  let name = m[2]!
  if (weight !== 'regular' && name.endsWith(`-${weight}`)) {
    name = name.slice(0, -(weight.length + 1))
  }
  loaderByKey.set(`${weight}/${name}`, fn)
}

// In-picker SVG cache so re-opening, re-searching, or scrolling doesn't
// re-download icons we've already shown.
const svgCache = new Map<string, string>()

interface Props {
  open: boolean
  initialName?: string
  initialWeight?: Weight
  onPick: (next: { name: string; weight: Weight }) => void
  onClose: () => void
}

interface CatalogEntry {
  name: string
  pascal_name: string
  tags: readonly string[]
}

const FALLBACK_PLACEHOLDER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>'

export const IconPicker = ({ open, initialName, initialWeight, onPick, onClose }: Props) => {
  const [query, setQuery] = useState('')
  const [weight, setWeight] = useState<Weight>(initialWeight ?? 'regular')
  const [hovered, setHovered] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  // Re-render trigger when cache fills.
  const [, force] = useState(0)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setWeight(initialWeight ?? 'regular')
    setHovered(initialName ?? null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open, initialWeight, initialName])

  // Filter the catalog by free-text query. Matches name OR any tag.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = PHOSPHOR_CATALOG as readonly CatalogEntry[]
    if (!q) return list
    return list.filter((entry) => {
      if (entry.name.includes(q)) return true
      return entry.tags.some((t) => t.toLowerCase().includes(q))
    })
  }, [query])

  // Cap initial render. Scrolling reveals more (handled via IntersectionObserver
  // on the sentinel at the bottom). Starting at 240 = ~6 rows of 5 cols.
  const [visibleCount, setVisibleCount] = useState(240)
  // Reset pagination when the search query or weight changes so the user
  // doesn't end up scrolled into yesterday's results. The biome rule wants
  // every referenced var in deps; query + weight are both read implicitly
  // by the act of "user typed/clicked", but listing them keeps the linter
  // happy and matches React-style hook discipline.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps drive the reset behavior intentionally
  useEffect(() => {
    setVisibleCount(240)
  }, [query, weight])

  // Scroll-driven pagination. Listening to native scroll is more portable
  // than IntersectionObserver (some embedded preview environments don't fire
  // IO callbacks at all). When the user gets within ~600px of the bottom,
  // reveal another page.
  useEffect(() => {
    if (!open) return
    const grid = gridRef.current
    if (!grid) return
    const onScroll = () => {
      if (grid.scrollHeight - grid.scrollTop - grid.clientHeight < 600) {
        setVisibleCount((c) => Math.min(filtered.length, c + 240))
      }
    }
    grid.addEventListener('scroll', onScroll, { passive: true })
    return () => grid.removeEventListener('scroll', onScroll)
  }, [open, filtered.length])

  // Eager hydration of whatever's currently visible. Each render checks the
  // current page of cells, kicks off loads for any not yet cached, and
  // re-renders once they arrive. Loads are deduped via the cache so re-runs
  // on every render are cheap.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const slice = filtered.slice(0, visibleCount)
    const toLoad = slice.filter((e) => !svgCache.has(`${weight}/${e.name}`))
    if (toLoad.length === 0) return
    Promise.all(
      toLoad.map(async (entry) => {
        const key = `${weight}/${entry.name}`
        const fn = loaderByKey.get(key)
        if (!fn) {
          svgCache.set(key, FALLBACK_PLACEHOLDER)
          return
        }
        try {
          const svg = await fn()
          svgCache.set(key, svg)
        } catch {
          svgCache.set(key, FALLBACK_PLACEHOLDER)
        }
      }),
    ).then(() => {
      if (!cancelled) force((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [open, filtered, visibleCount, weight])

  if (!open) return null

  const onSelect = (name: string) => {
    onPick({ name, weight })
    onClose()
  }

  const visible = filtered.slice(0, visibleCount)

  return (
    <div
      class="export-dialog-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        class="icon-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="icon-picker-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header class="icon-picker-header">
          <h2 id="icon-picker-title">Pick an icon</h2>
          <span class="icon-picker-count">
            {filtered.length.toLocaleString()} of {PHOSPHOR_CATALOG.length.toLocaleString()}
          </span>
        </header>

        <div class="icon-picker-controls">
          <input
            ref={inputRef}
            class="icon-picker-search"
            type="search"
            placeholder="Search… e.g. lightning, mail, arrow"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
          <div class="icon-picker-weights">
            {WEIGHTS.map((w) => (
              <button
                type="button"
                key={w}
                class={`icon-picker-weight${weight === w ? ' is-active' : ''}`}
                onClick={() => setWeight(w)}
                aria-pressed={weight === w}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div class="icon-picker-grid" ref={gridRef}>
          {visible.map((entry) => {
            const key = `${weight}/${entry.name}`
            const svg = svgCache.get(key)
            const isCurrent = entry.name === initialName
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: cells fall back to focusable button on focus
              <div
                key={entry.name}
                class={`icon-picker-cell${svg ? '' : ' icon-picker-cell-loading'}${isCurrent ? ' is-current' : ''}`}
                data-icon-key={key}
                data-pending={svg ? undefined : ''}
                title={`${entry.name}${entry.tags.length ? ` · ${entry.tags.join(', ')}` : ''}`}
                onMouseEnter={() => setHovered(entry.name)}
                onMouseLeave={() => setHovered((h) => (h === entry.name ? null : h))}
                onClick={() => onSelect(entry.name)}
              >
                <div
                  class="icon-picker-cell-svg"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted Phosphor SVGs only
                  dangerouslySetInnerHTML={{ __html: svg ?? '' }}
                />
                <span class="icon-picker-cell-name">{entry.name}</span>
              </div>
            )
          })}
          {visible.length < filtered.length && (
            <div class="icon-picker-sentinel" aria-hidden="true" />
          )}
          {filtered.length === 0 && (
            <div class="icon-picker-empty">
              No icons match "{query}". Try a different search term.
            </div>
          )}
        </div>

        <footer class="icon-picker-footer">
          <span class="icon-picker-current">
            {hovered ? (
              <>
                <code>{hovered}</code> · {weight}
              </>
            ) : (
              'Hover or click an icon to select it.'
            )}
          </span>
          <button type="button" class="export-dialog-cancel" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  )
}
