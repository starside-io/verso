import type { ContentBlock, Slide } from '@starside-io/verso-schema'

// Where in the deck a match was found. The Inspector consumes blockPath to
// navigate to the right element; the field/itemIndex tell us which string to
// rewrite when the user accepts a replacement.
export interface MatchLocation {
  slideId: string
  blockPath: number[] | null // null = slide-level field (title/header/notes/annotation)
  field: SearchableField
  itemIndex?: number // only set when field === 'bullets'
}

export type SearchableField =
  | 'title'
  | 'header'
  | 'notes'
  | 'annotation'
  | 'text' // heading, text, quote, callout, badge
  | 'attribution' // quote
  | 'caption' // image
  | 'alt' // image
  | 'source' // code
  | 'bullets' // bullets.items[itemIndex]

export interface Match {
  loc: MatchLocation
  /** Full value of the field where the match was found. For preview rendering. */
  value: string
  /** Match start offset within `value`. */
  start: number
  /** Match end offset within `value` (exclusive). */
  end: number
}

const SLIDE_TEXT_FIELDS: Array<keyof Slide & SearchableField> = [
  'title',
  'header',
  'notes',
  'annotation',
]

const blockTextFields = (
  b: ContentBlock,
): Array<{ field: SearchableField; value: string; itemIndex?: number }> => {
  switch (b.type) {
    case 'heading':
    case 'text':
    case 'callout':
    case 'badge':
      return [{ field: 'text', value: b.text }]
    case 'quote':
      return [
        { field: 'text', value: b.text },
        ...(b.attribution ? [{ field: 'attribution' as const, value: b.attribution }] : []),
      ]
    case 'image':
      return [
        ...(b.alt ? [{ field: 'alt' as const, value: b.alt }] : []),
        ...(b.caption ? [{ field: 'caption' as const, value: b.caption }] : []),
      ]
    case 'code':
      return [{ field: 'source', value: b.source }]
    case 'bullets':
      return b.items.map((item, i) => ({ field: 'bullets' as const, value: item, itemIndex: i }))
    default:
      return []
  }
}

const walk = (
  blocks: ContentBlock[],
  parentPath: number[],
  visit: (b: ContentBlock, path: number[]) => void,
) => {
  blocks.forEach((b, i) => {
    const path = [...parentPath, i]
    visit(b, path)
    if (
      (b.type === 'card' || b.type === 'panel') &&
      Array.isArray((b as { content?: ContentBlock[] }).content)
    ) {
      walk((b as { content: ContentBlock[] }).content, path, visit)
    }
  })
}

const buildRegex = (
  query: string,
  opts: { regex: boolean; caseSensitive: boolean },
): RegExp | null => {
  if (!query) return null
  const flags = opts.caseSensitive ? 'g' : 'gi'
  try {
    return new RegExp(opts.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
  } catch {
    return null
  }
}

const collectMatchesIn = (re: RegExp, value: string, base: Omit<MatchLocation, never>): Match[] => {
  const out: Match[] = []
  // Reset lastIndex so reusing the regex across fields is safe.
  re.lastIndex = 0
  let m = re.exec(value)
  while (m !== null) {
    out.push({ loc: { ...base }, value, start: m.index, end: m.index + m[0].length })
    if (m[0].length === 0) re.lastIndex += 1 // avoid infinite loop on zero-width
    m = re.exec(value)
  }
  return out
}

export const findInDeck = (
  slides: Map<string, Slide>,
  order: string[],
  query: string,
  opts: { regex: boolean; caseSensitive: boolean },
): Match[] => {
  const re = buildRegex(query, opts)
  if (!re) return []
  const out: Match[] = []
  for (const id of order) {
    const slide = slides.get(id)
    if (!slide) continue
    // Slide-level scalar fields.
    for (const field of SLIDE_TEXT_FIELDS) {
      const v = slide[field]
      if (typeof v === 'string' && v.length > 0) {
        out.push(...collectMatchesIn(re, v, { slideId: id, blockPath: null, field }))
      }
    }
    // Recursive walk through content blocks.
    walk(slide.content, [], (block, path) => {
      for (const f of blockTextFields(block)) {
        out.push(
          ...collectMatchesIn(re, f.value, {
            slideId: id,
            blockPath: path,
            field: f.field,
            itemIndex: f.itemIndex,
          }),
        )
      }
    })
  }
  return out
}

const replaceField = (loc: MatchLocation, newValue: string, slide: Slide): Slide => {
  if (loc.blockPath === null) {
    return { ...slide, [loc.field]: newValue }
  }
  const newSlide: Slide = { ...slide, content: [...slide.content] }
  let parentArr = newSlide.content
  for (let i = 0; i < loc.blockPath.length - 1; i++) {
    const idx = loc.blockPath[i]!
    const next = parentArr[idx] as ContentBlock & { content?: ContentBlock[] }
    if (!next || !Array.isArray(next.content)) return slide
    const cloned = { ...next, content: [...(next.content ?? [])] }
    parentArr[idx] = cloned as ContentBlock
    parentArr = cloned.content!
  }
  const leafIdx = loc.blockPath[loc.blockPath.length - 1]!
  const leaf = parentArr[leafIdx] as ContentBlock | undefined
  if (!leaf) return slide
  let updated: ContentBlock = leaf
  if (loc.field === 'bullets' && leaf.type === 'bullets' && typeof loc.itemIndex === 'number') {
    const items = [...leaf.items]
    items[loc.itemIndex] = newValue
    updated = { ...leaf, items }
  } else {
    updated = { ...(leaf as Record<string, unknown>), [loc.field]: newValue } as ContentBlock
  }
  parentArr[leafIdx] = updated
  return newSlide
}

const fieldValue = (slide: Slide, loc: MatchLocation): string | null => {
  if (loc.blockPath === null) {
    const v = slide[loc.field as keyof Slide]
    return typeof v === 'string' ? v : null
  }
  let cur: ContentBlock | undefined
  let arr: ContentBlock[] = slide.content
  for (let i = 0; i < loc.blockPath.length; i++) {
    cur = arr[loc.blockPath[i]!]
    if (!cur) return null
    if (i < loc.blockPath.length - 1) {
      const inner = (cur as { content?: ContentBlock[] }).content
      if (!Array.isArray(inner)) return null
      arr = inner
    }
  }
  if (!cur) return null
  if (loc.field === 'bullets' && cur.type === 'bullets' && typeof loc.itemIndex === 'number') {
    return cur.items[loc.itemIndex] ?? null
  }
  const v = (cur as Record<string, unknown>)[loc.field]
  return typeof v === 'string' ? v : null
}

/** Apply a single replacement at `match` and return the updated slide. */
export const applyReplacement = (
  slide: Slide,
  match: Match,
  query: string,
  replacement: string,
  opts: { regex: boolean; caseSensitive: boolean },
): Slide => {
  const re = buildRegex(query, opts)
  if (!re) return slide
  const cur = fieldValue(slide, match.loc)
  if (typeof cur !== 'string') return slide
  // Re-find the FIRST match at-or-after `match.start` in the current value.
  // The field may have shifted since the original scan, so we recompute.
  re.lastIndex = 0
  let m = re.exec(cur)
  while (m !== null) {
    if (m.index >= match.start) {
      const next = cur.slice(0, m.index) + replacement + cur.slice(m.index + m[0].length)
      return replaceField(match.loc, next, slide)
    }
    if (m[0].length === 0) re.lastIndex += 1
    m = re.exec(cur)
  }
  return slide
}

/**
 * Apply every match across the deck. Returns the patched slides keyed by id.
 * Slides not affected are not in the map.
 */
export const replaceAllInDeck = (
  slides: Map<string, Slide>,
  order: string[],
  query: string,
  replacement: string,
  opts: { regex: boolean; caseSensitive: boolean },
): Map<string, Slide> => {
  const re = buildRegex(query, opts)
  const out = new Map<string, Slide>()
  if (!re) return out
  for (const id of order) {
    const slide = slides.get(id)
    if (!slide) continue
    let next = slide
    let mutated = false
    // Slide-level fields.
    for (const field of SLIDE_TEXT_FIELDS) {
      const v = next[field]
      if (typeof v !== 'string' || v.length === 0) continue
      re.lastIndex = 0
      const replaced = v.replace(re, replacement)
      if (replaced !== v) {
        next = { ...next, [field]: replaced }
        mutated = true
      }
    }
    // Walk + replace blocks. We mutate a cloned copy in place by using
    // replaceField for each match collected fresh from `next`.
    const blockMatches: MatchLocation[] = []
    walk(next.content, [], (block, path) => {
      for (const f of blockTextFields(block)) {
        re.lastIndex = 0
        if (re.test(f.value)) {
          blockMatches.push({
            slideId: id,
            blockPath: path,
            field: f.field,
            itemIndex: f.itemIndex,
          })
        }
      }
    })
    for (const loc of blockMatches) {
      const cur = fieldValue(next, loc)
      if (typeof cur !== 'string') continue
      re.lastIndex = 0
      const replaced = cur.replace(re, replacement)
      if (replaced !== cur) {
        next = replaceField(loc, replaced, next)
        mutated = true
      }
    }
    if (mutated) out.set(id, next)
  }
  return out
}
