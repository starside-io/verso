import type { ContentBlock, Slide } from '@starside-io/verso-schema'

const isContainer = (b: ContentBlock): boolean => b.type === 'card' || b.type === 'panel'

export const getBlockAt = (slide: Slide, path: number[]): ContentBlock | null => {
  let blocks: ContentBlock[] = slide.content
  let block: ContentBlock | undefined
  for (const idx of path) {
    block = blocks[idx]
    if (!block) return null
    if (isContainer(block) && Array.isArray((block as { content?: unknown }).content)) {
      blocks = (block as { content: ContentBlock[] }).content
    } else {
      blocks = []
    }
  }
  return block ?? null
}

export const replaceBlockAt = (slide: Slide, path: number[], next: ContentBlock): Slide => {
  if (path.length === 0) return slide

  const replaceIn = (blocks: ContentBlock[], depth: number): ContentBlock[] => {
    const idx = path[depth]!
    return blocks.map((b, i) => {
      if (i !== idx) return b
      if (depth === path.length - 1) return next
      if (isContainer(b)) {
        const inner = (b as { content: ContentBlock[] }).content
        return { ...b, content: replaceIn(inner, depth + 1) } as ContentBlock
      }
      return b
    })
  }

  return { ...slide, content: replaceIn(slide.content, 0) }
}

export const removeBlockAt = (slide: Slide, path: number[]): Slide => {
  if (path.length === 0) return slide
  const removeIn = (blocks: ContentBlock[], depth: number): ContentBlock[] => {
    const idx = path[depth]!
    if (depth === path.length - 1) return blocks.filter((_b, i) => i !== idx)
    return blocks.map((b, i) => {
      if (i !== idx) return b
      if (isContainer(b)) {
        const inner = (b as { content: ContentBlock[] }).content
        return { ...b, content: removeIn(inner, depth + 1) } as ContentBlock
      }
      return b
    })
  }
  return { ...slide, content: removeIn(slide.content, 0) }
}

export const moveBlockAt = (slide: Slide, path: number[], delta: -1 | 1): Slide => {
  if (path.length === 0) return slide
  const move = (blocks: ContentBlock[], depth: number): ContentBlock[] => {
    const idx = path[depth]!
    if (depth === path.length - 1) {
      const target = idx + delta
      if (target < 0 || target >= blocks.length) return blocks
      const next = blocks.slice()
      const [item] = next.splice(idx, 1)
      next.splice(target, 0, item!)
      return next
    }
    return blocks.map((b, i) => {
      if (i !== idx) return b
      if (isContainer(b)) {
        const inner = (b as { content: ContentBlock[] }).content
        return { ...b, content: move(inner, depth + 1) } as ContentBlock
      }
      return b
    })
  }
  return { ...slide, content: move(slide.content, 0) }
}

export const flattenBlocks = (
  slide: Slide,
): { block: ContentBlock; path: number[]; depth: number }[] => {
  const out: { block: ContentBlock; path: number[]; depth: number }[] = []
  const walk = (blocks: ContentBlock[], parent: number[]) => {
    blocks.forEach((b, i) => {
      const path = [...parent, i]
      out.push({ block: b, path, depth: parent.length })
      if (isContainer(b) && Array.isArray((b as { content?: unknown }).content)) {
        walk((b as { content: ContentBlock[] }).content, path)
      }
    })
  }
  walk(slide.content, [])
  return out
}
