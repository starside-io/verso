/**
 * Icon resolution registry.
 *
 * The runtime renders components synchronously (every `component.render()`
 * returns a string). Icon SVGs are too numerous to bundle eagerly (~9000
 * across six weights), so we split responsibility:
 *
 * - **Resolver** (sync): returns the SVG markup for `(name, weight)` or null
 *   if not loaded yet. Consumers install a resolver via `setIconResolver`.
 *   In Node we read from disk synchronously. In the browser we read from
 *   the in-memory cache (populated by the async loader, see below).
 * - **Loader** (async): when the resolver returns null and the call site
 *   wants to populate the cache, `requestIconLoad` fires the loader. On
 *   completion it caches the SVG and dispatches a `verso:icon-loaded` event
 *   that any hydrator (typically the viewer) can listen for to swap the
 *   pending placeholder for the real SVG.
 *
 * The runtime ships neither resolver nor loader by default; the viewer
 * installs the browser hydrator and the build package installs the Node
 * sync resolver. Without any installed resolver, the Icon component renders
 * a sized placeholder span that never hydrates (safe noop).
 */

export type IconWeightName = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'

const cacheKey = (name: string, weight: string): string => `${weight}/${name}`

type SyncResolver = (name: string, weight: string) => string | null
type AsyncLoader = (name: string, weight: string) => Promise<string | null>

interface IconRegistryState {
  cache: Map<string, string>
  inflight: Map<string, Promise<string | null>>
  resolver: SyncResolver
  loader: AsyncLoader | null
}

// State lives on globalThis so all module copies (tsup bundles icons.ts into
// both `dist/index.js` and `dist/components/index.js`, and the editor / viewer
// may import via different specifiers) share the SAME cache, resolver, and
// loader. Without this, the viewer's `setIconLoader` would install the loader
// on one instance while the Icon component reads from another, leaving every
// icon stuck as a pending placeholder.
const STATE_SYMBOL = Symbol.for('@starside-io/verso-runtime/icons')
type GlobalWithState = typeof globalThis & {
  [STATE_SYMBOL]?: IconRegistryState
}
const g = globalThis as GlobalWithState
const state: IconRegistryState =
  g[STATE_SYMBOL] ??
  (g[STATE_SYMBOL] = {
    cache: new Map<string, string>(),
    inflight: new Map<string, Promise<string | null>>(),
    resolver: () => null,
    loader: null,
  })

export const setIconResolver = (fn: SyncResolver): void => {
  state.resolver = fn
}

export const setIconLoader = (fn: AsyncLoader): void => {
  state.loader = fn
}

/**
 * Sync lookup. Returns the SVG string if available, else null. Checks the
 * cache first, then falls back to the installed resolver. Caches a positive
 * resolver hit so subsequent calls are O(1).
 */
export const resolveIcon = (name: string, weight: IconWeightName = 'regular'): string | null => {
  const key = cacheKey(name, weight)
  const cached = state.cache.get(key)
  if (cached) return cached
  const fromResolver = state.resolver(name, weight)
  if (fromResolver) {
    state.cache.set(key, fromResolver)
    return fromResolver
  }
  return null
}

/**
 * Kick off an async load if a loader is installed. Returns immediately. On
 * success the SVG lands in the cache and `verso:icon-loaded` is dispatched.
 * No-op if the icon is already cached or in flight, or if no loader.
 */
export const requestIconLoad = (name: string, weight: IconWeightName = 'regular'): void => {
  if (!state.loader) return
  const key = cacheKey(name, weight)
  if (state.cache.has(key) || state.inflight.has(key)) return
  const p = state.loader(name, weight).then((svg) => {
    state.inflight.delete(key)
    if (svg) {
      state.cache.set(key, svg)
      // Fire-and-forget event so hydrators can swap placeholders. Guarded so
      // running in Node without a global event target doesn't throw.
      const target: EventTarget | undefined =
        typeof globalThis !== 'undefined' && typeof globalThis.dispatchEvent === 'function'
          ? (globalThis as unknown as EventTarget)
          : undefined
      target?.dispatchEvent(
        new CustomEvent('verso:icon-loaded', { detail: { name, weight, key, svg } }),
      )
    }
    return svg
  })
  state.inflight.set(key, p)
}

export const getCachedIcon = (name: string, weight: IconWeightName = 'regular'): string | null =>
  state.cache.get(cacheKey(name, weight)) ?? null

export const getIconCacheSnapshot = (): ReadonlyMap<string, string> => state.cache

export const primeIconCache = (entries: Iterable<readonly [string, string]>): void => {
  for (const [key, svg] of entries) state.cache.set(key, svg)
}

/**
 * Wrap a raw Phosphor SVG with size + accessibility attributes. Phosphor
 * SVGs ship with `fill="currentColor"` and `viewBox="0 0 256 256"` already;
 * we only inject `width` / `height` / a11y attrs. If `label` is provided
 * the icon is announced as an image; otherwise it's marked decorative.
 */
export const applyIconAttrs = (svg: string, size: number, label?: string): string => {
  let out = svg
  if (/width="[^"]*"/.test(out)) {
    out = out.replace(/width="[^"]*"/, `width="${size}"`)
  } else {
    out = out.replace('<svg', `<svg width="${size}"`)
  }
  if (/height="[^"]*"/.test(out)) {
    out = out.replace(/height="[^"]*"/, `height="${size}"`)
  } else {
    out = out.replace('<svg', `<svg height="${size}"`)
  }
  if (label) {
    if (!/role="/.test(out)) out = out.replace('<svg', `<svg role="img"`)
    out = out.replace('<svg', `<svg aria-label="${label.replace(/"/g, '&quot;')}"`)
  } else if (!/aria-hidden/.test(out)) {
    out = out.replace('<svg', `<svg aria-hidden="true" focusable="false"`)
  }
  return out
}
