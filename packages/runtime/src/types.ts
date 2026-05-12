import type { ResolvedColors } from '@starside-io/verso-core'
import type { ContentBlock, Manifest, Slide, Theme } from '@starside-io/verso-schema'
import type { RawHtml } from './html.js'

export type RenderResult = RawHtml | string

export interface ComponentDef<P = unknown> {
  name: string
  render: (props: P, ctx: RenderContext) => RenderResult
}

export interface LayoutDef {
  name: string
  render: (slide: Slide, ctx: LayoutContext) => RenderResult
}

export interface ThemeDef extends Theme {}

export interface RenderContext {
  pathId: string
  colors: ResolvedColors
  /** Path of the current block being rendered, indexed into slide.content (recursive into containers). */
  currentPath?: number[]
  block: (block: ContentBlock, path?: number[]) => RenderResult
  component: <P>(component: ComponentDef<P>, props: P) => RenderResult
}

// One entry per item the deck outline should expose to layouts. Sections come
// from `SectionMarker`s in `slide_order`; slides come from path-filtered slide
// entries (`omit_from_agenda` ones removed). Layouts (e.g. `agenda`) consume
// this to auto-build a table of contents.
export interface DeckOutlineEntry {
  kind: 'slide' | 'section'
  /** Slide id for slide entries; section id for section entries. */
  id: string
  /** Display label: slide title/header/id for slides; section title for sections. */
  title: string
}

export interface LayoutContext extends RenderContext {
  blocks: ContentBlock[]
  /** Path-filtered outline of every slide and section in the deck, in order. */
  deckOutline: DeckOutlineEntry[]
}

export interface VersoConfig {
  themes?: ThemeDef[]
  layouts?: LayoutDef[]
  components?: ComponentDef<any>[]
}

export interface ResolvedRegistry {
  themes: Map<string, ThemeDef>
  layouts: Map<string, LayoutDef>
  components: Map<string, ComponentDef<any>>
}

export interface MountOptions {
  manifest: Manifest
  slides: Map<string, Slide> | Record<string, Slide>
  registry: ResolvedRegistry
  pathId?: string
  mode?: 'present' | 'speaker'
  debug?: boolean
  initialSlideId?: string
}
