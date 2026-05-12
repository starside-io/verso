import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { activeBlockPath, activeSlideId, manifest, slides, viewMode } from '../state'

interface SlideSearchProps {
  open: boolean
  onClose: () => void
}

interface Result {
  id: string
  title: string
  layout: string
}

export const SlideSearch = ({ open, onClose }: SlideSearchProps) => {
  const m = manifest.value
  const slidesMap = slides.value
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo<Result[]>(() => {
    if (!m) return []
    const q = query.trim().toLowerCase()
    const all: Result[] = []
    for (const entry of m.slide_order) {
      if (typeof entry !== 'string') continue
      const slide = slidesMap.get(entry)
      if (!slide) continue
      all.push({ id: entry, title: slide.title ?? entry, layout: slide.layout })
    }
    if (!q) return all.slice(0, 50)
    return all
      .filter((r) => r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q))
      .slice(0, 50)
  }, [m, slidesMap, query])

  useEffect(() => {
    if (cursor >= results.length) setCursor(Math.max(0, results.length - 1))
  }, [results.length, cursor])

  if (!open) return null

  const pick = (id: string) => {
    activeSlideId.value = id
    activeBlockPath.value = null
    if (viewMode.value !== 'editor') viewMode.value = 'editor'
    onClose()
  }

  return (
    <div
      class="slide-search-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        class="slide-search"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          class="slide-search-input"
          placeholder="Jump to slide… (title or id)"
          value={query}
          onInput={(e) => {
            setQuery((e.currentTarget as HTMLInputElement).value)
            setCursor(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onClose()
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setCursor((c) => Math.min(results.length - 1, c + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setCursor((c) => Math.max(0, c - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const r = results[cursor]
              if (r) pick(r.id)
            }
          }}
        />
        <ul class="slide-search-results">
          {results.length === 0 ? (
            <li class="slide-search-empty">No slides match.</li>
          ) : (
            results.map((r, i) => (
              // biome-ignore lint/a11y/noNoninteractiveTabindex: slide results are keyboard-navigable
              <li
                key={r.id}
                class={`slide-search-result${i === cursor ? ' is-active' : ''}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    pick(r.id)
                  }
                }}
              >
                <div class="slide-search-result-title">{r.title}</div>
                <div class="slide-search-result-meta">
                  <span class="slide-search-result-id">{r.id}</span>
                  <span class="slide-search-result-layout">{r.layout}</span>
                </div>
              </li>
            ))
          )}
        </ul>
        <div class="slide-search-hint">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> jump
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
