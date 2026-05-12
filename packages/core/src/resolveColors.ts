import type {
  ContentBlock,
  Manifest,
  Slide,
  StyleOverrides,
  Theme,
} from '@starside-io/verso-schema'

export interface ResolvedColors {
  primary: string
  secondary: string
  classic: string
  accent?: string
  surface?: string
  muted?: string
  background?: string
  foreground?: string
}

const merge = (base: ResolvedColors, layer: StyleOverrides | undefined): ResolvedColors => {
  if (!layer) return base
  return {
    primary: layer.primary ?? base.primary,
    secondary: layer.secondary ?? base.secondary,
    classic: layer.classic ?? base.classic,
    accent: layer.accent ?? base.accent,
    surface: layer.surface ?? base.surface,
    muted: layer.muted ?? base.muted,
    background: layer.background ?? base.background,
    foreground: layer.foreground ?? base.foreground,
  }
}

export const themeToColors = (theme: Theme): ResolvedColors => ({
  primary: theme.colors.primary,
  secondary: theme.colors.secondary,
  classic: theme.colors.classic,
  accent: theme.colors.accent,
  surface: theme.colors.surface,
  muted: theme.colors.muted,
  background: theme.colors.background,
  foreground: theme.colors.foreground,
})

export const resolveDeckColors = (theme: Theme, manifest: Manifest): ResolvedColors =>
  merge(themeToColors(theme), manifest.style_overrides)

export const resolveSlideColors = (
  theme: Theme,
  manifest: Manifest,
  slide: Slide,
): ResolvedColors => merge(resolveDeckColors(theme, manifest), slide.style_overrides)

export const resolveBlockColors = (
  theme: Theme,
  manifest: Manifest,
  slide: Slide,
  block: ContentBlock,
): ResolvedColors =>
  merge(
    resolveSlideColors(theme, manifest, slide),
    block.style_overrides as StyleOverrides | undefined,
  )

export const colorsToCssVars = (c: ResolvedColors): Record<string, string> => {
  const vars: Record<string, string> = {
    '--color-primary': c.primary,
    '--color-secondary': c.secondary,
    '--color-classic': c.classic,
    '--color-accent': c.accent ?? c.secondary,
    '--color-surface': c.surface ?? `color-mix(in srgb, ${c.primary} 6%, transparent)`,
    '--color-muted': c.muted ?? `color-mix(in srgb, ${c.secondary} 50%, transparent)`,
  }
  if (c.background) vars['--color-background'] = c.background
  if (c.foreground) vars['--color-foreground'] = c.foreground
  return vars
}
