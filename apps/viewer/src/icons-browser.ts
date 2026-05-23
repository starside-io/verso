/**
 * Browser-side Phosphor icon hydration.
 *
 * Wires the runtime's async icon loader to Vite-managed lazy SVG chunks.
 * Each `assets/<weight>/<name>.svg` becomes its own asset URL that Vite emits
 * on demand, so we ship zero icon bytes until a slide actually references
 * one. After load, the SVG lands in the runtime's cache and we replace any
 * `.verso-icon-pending` placeholders that mention it.
 *
 * Called once from `main.ts` before `mount()`.
 */

import { applyIconAttrs, setIconLoader } from '@starside-io/verso-runtime'

// Vite glob: discovers every Phosphor SVG and gives us a record of
// { path: () => Promise<string> } lazy loaders. `query: '?raw'` makes the
// chunk a string; `import: 'default'` unwraps the default export.
const svgLoaders = import.meta.glob<string>(
  '/node_modules/@phosphor-icons/core/assets/**/*.svg',
  { query: '?raw', import: 'default' },
)

// Build a keyed lookup: "regular/check" -> loader fn. Phosphor's filenames
// are `<name>.svg` for regular weight and `<name>-<weight>.svg` for every
// other weight (`acorn.svg`, `acorn-bold.svg`, `acorn-fill.svg`, ...). We
// normalize back to "weight/name" so callers can ask by logical name only.
const loaderByKey = new Map<string, () => Promise<string>>()
for (const [path, loader] of Object.entries(svgLoaders)) {
  const m = path.match(/@phosphor-icons\/core\/assets\/([^/]+)\/([^/]+)\.svg$/)
  if (!m) continue
  const weight = m[1]!
  let name = m[2]!
  if (weight !== 'regular' && name.endsWith(`-${weight}`)) {
    name = name.slice(0, -(weight.length + 1))
  }
  loaderByKey.set(`${weight}/${name}`, loader)
}

const swapPendingPlaceholders = (name: string, weight: string, svg: string): void => {
  const selector = `.verso-icon-pending[data-icon="${CSS.escape(name)}"][data-weight="${CSS.escape(weight)}"]`
  const targets = document.querySelectorAll<HTMLElement>(selector)
  targets.forEach((el) => {
    const size = Number.parseInt(el.dataset.size ?? '32', 10)
    const label = el.getAttribute('aria-label') ?? undefined
    // Preserve all classes the renderer put on this span EXCEPT the "pending"
    // marker. This keeps bullet-icon, custom user classes, and anything else
    // intact across hydration. Without this swap, the bullet-icon class would
    // be lost and per-item icons would lose their layout treatment.
    el.classList.remove('verso-icon-pending')
    // Drop the placeholder dimensions so the SVG drives its own size.
    el.style.width = ''
    el.style.height = ''
    el.style.display = ''
    el.innerHTML = applyIconAttrs(svg, size, label)
  })
}

let hydratorInstalled = false

export const installBrowserIconHydration = (): void => {
  if (hydratorInstalled) return
  hydratorInstalled = true

  setIconLoader(async (name, weight) => {
    const fn = loaderByKey.get(`${weight}/${name}`)
    if (!fn) return null
    try {
      return await fn()
    } catch {
      return null
    }
  })

  // Listen for cache fills (fired by `requestIconLoad` after the loader
  // resolves) and swap any matching pending placeholders. Multiple slides
  // can reference the same icon; one fetch hydrates all of them.
  globalThis.addEventListener('verso:icon-loaded', ((e: Event) => {
    const detail = (e as CustomEvent<{ name: string; weight: string; svg: string }>).detail
    if (!detail) return
    swapPendingPlaceholders(detail.name, detail.weight, detail.svg)
  }) as EventListener)
}
