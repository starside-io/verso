import { Slide, slideIdsOf } from '@starside-io/verso-schema'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { type Match, applyReplacement, findInDeck, replaceAllInDeck } from '../findReplace'
import {
  activeBlockPath,
  activeSlideId,
  manifest,
  persistActiveSlide,
  slides,
  viewMode,
} from '../state'

interface Props {
  open: boolean
  onClose: () => void
}

const SNIPPET_RADIUS = 32

const snippet = (m: Match): { before: string; match: string; after: string } => {
  const beforeStart = Math.max(0, m.start - SNIPPET_RADIUS)
  const afterEnd = Math.min(m.value.length, m.end + SNIPPET_RADIUS)
  return {
    before: (beforeStart > 0 ? '…' : '') + m.value.slice(beforeStart, m.start),
    match: m.value.slice(m.start, m.end),
    after: m.value.slice(m.end, afterEnd) + (afterEnd < m.value.length ? '…' : ''),
  }
}

const fieldLabel = (m: Match): string => {
  if (m.loc.blockPath === null) return m.loc.field
  const path = m.loc.blockPath.join('.')
  if (m.loc.field === 'bullets' && typeof m.loc.itemIndex === 'number') {
    return `block ${path} • item ${m.loc.itemIndex + 1}`
  }
  return `block ${path} • ${m.loc.field}`
}

export const FindReplace = ({ open, onClose }: Props) => {
  const m = manifest.value
  const slidesMap = slides.value
  const [query, setQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [regex, setRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [cursor, setCursor] = useState(0)
  const queryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => queryRef.current?.focus())
    } else {
      setCursor(0)
    }
  }, [open])

  const matches = useMemo<Match[]>(() => {
    if (!open || !m || !query) return []
    const order = slideIdsOf(m.slide_order)
    return findInDeck(slidesMap, order, query, { regex, caseSensitive })
  }, [open, m, slidesMap, query, regex, caseSensitive])

  useEffect(() => {
    if (cursor >= matches.length) setCursor(Math.max(0, matches.length - 1))
  }, [matches.length, cursor])

  if (!open || !m) return null

  const jumpTo = (match: Match) => {
    activeSlideId.value = match.loc.slideId
    if (viewMode.value !== 'editor') viewMode.value = 'editor'
    activeBlockPath.value = match.loc.blockPath ?? null
  }

  const replaceCurrent = async () => {
    const cur = matches[cursor]
    if (!cur) return
    const slide = slidesMap.get(cur.loc.slideId)
    if (!slide) return
    const next = applyReplacement(slide, cur, query, replaceText, { regex, caseSensitive })
    if (next !== slide) {
      const parsed = Slide.parse(next)
      await persistActiveSlide(parsed)
    }
  }

  const replaceAll = async () => {
    const order = slideIdsOf(m.slide_order)
    const updates = replaceAllInDeck(slidesMap, order, query, replaceText, {
      regex,
      caseSensitive,
    })
    if (updates.size === 0) return
    // Persist sequentially so each change goes through history + autosave.
    for (const [, next] of updates) {
      await persistActiveSlide(Slide.parse(next))
    }
  }

  // Group matches by slide for readable display.
  const grouped: { slideId: string; matches: { match: Match; index: number }[] }[] = []
  matches.forEach((match, index) => {
    const last = grouped[grouped.length - 1]
    if (last && last.slideId === match.loc.slideId) {
      last.matches.push({ match, index })
    } else {
      grouped.push({ slideId: match.loc.slideId, matches: [{ match, index }] })
    }
  })

  return (
    <div
      class="find-replace-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        class="find-replace"
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-replace-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header class="find-replace-header">
          <h2 id="find-replace-title">Find &amp; replace</h2>
          <span class="find-replace-count">
            {matches.length === 0
              ? query
                ? 'No matches'
                : 'Type a query'
              : `${matches.length} match${matches.length === 1 ? '' : 'es'} in ${grouped.length} slide${grouped.length === 1 ? '' : 's'}`}
          </span>
        </header>

        <div class="find-replace-row">
          <input
            ref={queryRef}
            class="find-replace-input"
            placeholder="Find"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (matches.length > 0) {
                  const next = (cursor + 1) % matches.length
                  setCursor(next)
                  jumpTo(matches[next]!)
                }
              }
            }}
          />
          <div class="find-replace-flags">
            <label
              class={`find-replace-flag${caseSensitive ? ' is-active' : ''}`}
              title="Match case"
            >
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive((e.currentTarget as HTMLInputElement).checked)}
              />
              Aa
            </label>
            <label class={`find-replace-flag${regex ? ' is-active' : ''}`} title="Regex">
              <input
                type="checkbox"
                checked={regex}
                onChange={(e) => setRegex((e.currentTarget as HTMLInputElement).checked)}
              />
              .*
            </label>
          </div>
        </div>

        <div class="find-replace-row">
          <input
            class="find-replace-input"
            placeholder="Replace with"
            value={replaceText}
            onInput={(e) => setReplaceText((e.currentTarget as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              }
            }}
          />
          <div class="find-replace-actions">
            <button
              type="button"
              class="toolbar-btn"
              disabled={matches.length === 0}
              onClick={() => void replaceCurrent()}
              title="Replace current match"
            >
              Replace
            </button>
            <button
              type="button"
              class="toolbar-btn"
              disabled={matches.length === 0}
              onClick={() => void replaceAll()}
              title="Replace all matches in deck"
            >
              All
            </button>
          </div>
        </div>

        <div class="find-replace-results">
          {grouped.length === 0 ? (
            <div class="find-replace-empty">
              {query
                ? 'No matches.'
                : 'Find rewrites text in slide titles, headers, notes, and every block field across the deck.'}
            </div>
          ) : (
            grouped.map((group) => {
              const slide = slidesMap.get(group.slideId)
              const slideTitle = slide?.title || slide?.header || group.slideId
              return (
                <div class="find-replace-group" key={group.slideId}>
                  <div class="find-replace-group-head">
                    <span class="find-replace-slide-title">{slideTitle}</span>
                    <span class="find-replace-slide-id">{group.slideId}</span>
                  </div>
                  <ul>
                    {group.matches.map(({ match, index }) => {
                      const s = snippet(match)
                      return (
                        // biome-ignore lint/a11y/noNoninteractiveTabindex: search results are keyboard-navigable
                        <li
                          key={index}
                          class={`find-replace-result${index === cursor ? ' is-active' : ''}`}
                          onClick={() => {
                            setCursor(index)
                            jumpTo(match)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setCursor(index)
                              jumpTo(match)
                            }
                          }}
                          onMouseEnter={() => setCursor(index)}
                        >
                          <span class="find-replace-field">{fieldLabel(match)}</span>
                          <span class="find-replace-snippet">
                            {s.before}
                            <mark>{s.match}</mark>
                            {s.after}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}
        </div>

        <div class="find-replace-hint">
          <span>
            <kbd>↵</kbd> next
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
          <span>
            <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> open
          </span>
        </div>
      </div>
    </div>
  )
}
