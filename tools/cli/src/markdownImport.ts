import type { ContentBlock, Slide } from '@starside-io/verso-schema'

export interface MarkdownSlide {
  id: string
  title: string
  layout: string
  content: ContentBlock[]
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'slide'

const dedupeId = (base: string, taken: Set<string>): string => {
  if (!taken.has(base)) {
    taken.add(base)
    return base
  }
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  const id = `${base}-${i}`
  taken.add(id)
  return id
}

interface RawSection {
  title: string
  body: string[]
}

const splitSections = (lines: string[]): { preamble: string[]; sections: RawSection[] } => {
  const sections: RawSection[] = []
  const preamble: string[] = []
  let current: RawSection | null = null
  for (const raw of lines) {
    const m = /^# (?!#)(.+)$/.exec(raw)
    if (m) {
      if (current) sections.push(current)
      current = { title: m[1]!.trim(), body: [] }
    } else if (current) {
      current.body.push(raw)
    } else {
      preamble.push(raw)
    }
  }
  if (current) sections.push(current)
  return { preamble, sections }
}

// Parse a section body into ContentBlocks. Handles paragraphs, bullet/numbered
// lists (flattened), fenced code, blockquotes, h2/h3 subheadings, and `---`
// as a divider. Inline markdown (bold/italic/links) is left as-is in text;
// the renderer treats text blocks as plain strings, so this keeps fidelity
// without reimplementing inline parsing.
const parseBody = (rawBody: string[]): ContentBlock[] => {
  const blocks: ContentBlock[] = []
  let i = 0
  const lines = rawBody

  while (i < lines.length) {
    const line = lines[i]!

    if (line.trim() === '') {
      i++
      continue
    }

    if (line.trim() === '---') {
      blocks.push({ type: 'divider' } as ContentBlock)
      i++
      continue
    }

    const fence = /^(```|~~~)(\w*)\s*$/.exec(line.trim())
    if (fence) {
      const closer = fence[1]!
      const language = fence[2] || undefined
      const buf: string[] = []
      i++
      while (i < lines.length && lines[i]!.trim() !== closer) {
        buf.push(lines[i]!)
        i++
      }
      if (i < lines.length) i++
      blocks.push({
        type: 'code',
        source: buf.join('\n'),
        ...(language ? { language } : {}),
      } as ContentBlock)
      continue
    }

    const sub = /^(##+)\s+(.+)$/.exec(line)
    if (sub) {
      const level = Math.min(3, Math.max(2, sub[1]!.length)) as 2 | 3
      blocks.push({ type: 'heading', level, text: sub[2]!.trim() } as ContentBlock)
      i++
      continue
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        buf.push(lines[i]!.replace(/^>\s?/, ''))
        i++
      }
      const joined = buf.join(' ').trim()
      const attrMatch = /^(.*?)\s+--\s*(.+)$/.exec(joined)
      if (attrMatch) {
        blocks.push({
          type: 'quote',
          text: attrMatch[1]!.trim(),
          attribution: attrMatch[2]!.trim(),
        } as ContentBlock)
      } else {
        blocks.push({ type: 'quote', text: joined } as ContentBlock)
      }
      continue
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i]!)) {
        const item = lines[i]!.replace(/^\s*([-*+]|\d+\.)\s+/, '').trim()
        if (item) items.push(item)
        i++
      }
      if (items.length) blocks.push({ type: 'bullets', items } as ContentBlock)
      continue
    }

    const para: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !/^#+\s/.test(lines[i]!) &&
      !/^(```|~~~)/.test(lines[i]!.trim()) &&
      !/^>\s?/.test(lines[i]!) &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]!) &&
      lines[i]!.trim() !== '---'
    ) {
      para.push(lines[i]!.trim())
      i++
    }
    const text = para.join(' ').trim()
    if (text) blocks.push({ type: 'text', text } as ContentBlock)
  }

  return blocks
}

export interface ParseMarkdownOptions {
  layout?: string
  pathInclude?: string[]
  idPrefix?: string
  takenIds?: Set<string>
}

export const parseMarkdownDeck = (
  markdown: string,
  opts: ParseMarkdownOptions = {},
): { slides: Slide[]; warnings: string[] } => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const { preamble, sections } = splitSections(lines)

  const warnings: string[] = []
  if (sections.length === 0) {
    warnings.push('No top-level "# heading" found. Add at least one to create a slide.')
    return { slides: [], warnings }
  }
  if (preamble.some((l) => l.trim() !== '')) {
    warnings.push('Content before the first "# heading" was ignored.')
  }

  const taken = opts.takenIds ?? new Set<string>()
  const layout = opts.layout ?? 'content'

  const slides: Slide[] = sections.map((section) => {
    const idBase = opts.idPrefix
      ? `${opts.idPrefix}-${slugify(section.title)}`
      : slugify(section.title)
    const id = dedupeId(idBase, taken)
    const content = parseBody(section.body)
    const slide: Slide = {
      id,
      title: section.title,
      layout,
      content,
      ...(opts.pathInclude?.length ? { path_include: opts.pathInclude } : {}),
    }
    return slide
  })

  return { slides, warnings }
}

export const isMarkdownSource = (sourcePath: string, content?: string): boolean => {
  if (/\.(md|markdown|mdx)$/i.test(sourcePath)) return true
  if (content) {
    const trimmed = content.trim()
    if (/^# /m.test(trimmed) && !trimmed.startsWith('{')) return true
  }
  return false
}
