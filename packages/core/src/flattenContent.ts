import type { ContentBlock, Slide } from '@starside-io/verso-schema'

const blockMatchesPath = (block: ContentBlock, pathId: string): boolean => {
  if (block.path_exclude?.includes(pathId)) return false
  if (block.path_include && block.path_include.length > 0) {
    return block.path_include.includes(pathId)
  }
  return true
}

export const flattenContent = (slide: Slide, pathId: string): ContentBlock[] =>
  slide.content.filter((b) => blockMatchesPath(b, pathId))
