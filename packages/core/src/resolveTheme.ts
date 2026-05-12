import type { Manifest, Theme, ThemeRef } from '@starside-io/verso-schema'

export interface ResolveThemeOptions {
  manifest: Manifest
  registry?: ReadonlyMap<string, Theme> | Record<string, Theme>
}

const lookup = (source: ResolveThemeOptions['registry'], name: string): Theme | undefined => {
  if (!source) return undefined
  if (source instanceof Map) return source.get(name)
  return (source as Record<string, Theme>)[name]
}

export const resolveThemeRef = ({ manifest, registry }: ResolveThemeOptions): Theme => {
  const ref: ThemeRef = manifest.theme
  if (typeof ref !== 'string') return ref

  const found = lookup(registry, ref)
  if (found) return found

  const available = registry
    ? registry instanceof Map
      ? [...registry.keys()].join(', ')
      : Object.keys(registry as Record<string, Theme>).join(', ')
    : '(no registry)'
  throw new Error(`Theme "${ref}" not found. Registered themes: ${available || '(none)'}`)
}
