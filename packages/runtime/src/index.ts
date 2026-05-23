export { defineConfig, defineLayout, defineTheme, defineComponent } from './define.js'
export { buildRegistry, type BuildRegistryInput } from './registry.js'
export {
  mount,
  renderDeck,
  type MountResult,
  type RenderDeckOptions,
  type RenderedDeck,
} from './render.js'
export { html, raw, escapeHtml, isRaw, renderToString, type RawHtml } from './html.js'
export {
  setIconResolver,
  setIconLoader,
  resolveIcon,
  requestIconLoad,
  getCachedIcon,
  getIconCacheSnapshot,
  primeIconCache,
  applyIconAttrs,
  type IconWeightName,
} from './icons.js'
export type {
  ComponentDef,
  LayoutDef,
  LayoutContext,
  RenderContext,
  RenderResult,
  ThemeDef,
  VersoConfig,
  ResolvedRegistry,
  MountOptions,
} from './types.js'
