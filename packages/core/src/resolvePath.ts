import { type Manifest, type Slide, slideIdsOf } from '@starside-io/verso-schema'

export interface ResolvePathOptions {
  manifest: Manifest
  slides: ReadonlyMap<string, Slide> | Record<string, Slide>
  pathId: string
}

const slideMatchesPath = (slide: Slide, pathId: string): boolean => {
  if (slide.path_exclude?.includes(pathId)) return false
  if (slide.path_include && slide.path_include.length > 0) {
    return slide.path_include.includes(pathId)
  }
  return true
}

export const resolvePath = ({ manifest, slides, pathId }: ResolvePathOptions): Slide[] => {
  const lookup =
    slides instanceof Map
      ? slides
      : new Map<string, Slide>(Object.entries(slides as Record<string, Slide>))

  const ordered: Slide[] = []
  for (const id of slideIdsOf(manifest.slide_order)) {
    const slide = lookup.get(id)
    if (!slide) continue
    if (slideMatchesPath(slide, pathId)) ordered.push(slide)
  }
  return ordered
}

export const listPaths = (manifest: Manifest): string[] => Object.keys(manifest.paths)
