import { type ContentBlock, Slide } from '@starside-io/verso-schema'
import { useState } from 'preact/hooks'
import { flattenBlocks, getBlockAt, moveBlockAt, removeBlockAt, replaceBlockAt } from '../blockTree'
import { activeBlockPath, activeSlide, hoveredBlockPath, persistActiveSlide } from '../state'
import { BlockForm } from './BlockForms'

const arraysEqual = (a: number[], b: number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i])

const blockSummary = (b: ContentBlock): string => {
  switch (b.type) {
    case 'heading':
    case 'text':
    case 'badge':
    case 'callout':
      return ((b as { text?: string }).text ?? '').slice(0, 40)
    case 'bullets':
      return `${((b as { items?: string[] }).items ?? []).length} items`
    case 'image':
      return (b as { alt?: string }).alt ?? (b as { src?: string }).src ?? ''
    case 'quote':
      return ((b as { text?: string }).text ?? '').slice(0, 40)
    case 'code':
      return (b as { language?: string }).language ?? 'code'
    case 'card':
    case 'panel':
      return `${(b as { tone?: string }).tone ?? 'surface'} / ${(b as { variant?: string }).variant ?? 'soft'}`
    default:
      return ''
  }
}

export const Inspector = () => {
  const slide = activeSlide.value
  const path = activeBlockPath.value
  // Open by default so the textareas are visible right away. Collapse state
  // persists across slide switches but resets across sessions.
  const [notesOpen, setNotesOpen] = useState(true)
  const [annotationOpen, setAnnotationOpen] = useState(true)

  if (!slide) {
    return (
      <div class="inspector">
        <header class="pane-header">
          <h2>Inspector</h2>
        </header>
        <p class="form-hint" style={{ padding: '1rem' }}>
          Select a slide to inspect its blocks.
        </p>
      </div>
    )
  }

  const tree = flattenBlocks(slide)
  const selected = path ? getBlockAt(slide, path) : null

  const updateBlock = async (next: ContentBlock) => {
    if (!path) return
    await persistActiveSlide(Slide.parse(replaceBlockAt(slide, path, next)))
  }

  const moveBlock = async (delta: -1 | 1) => {
    if (!path) return
    await persistActiveSlide(Slide.parse(moveBlockAt(slide, path, delta)))
  }

  const deleteBlock = async () => {
    if (!path) return
    if (!window.confirm('Delete this block?')) return
    await persistActiveSlide(Slide.parse(removeBlockAt(slide, path)))
    activeBlockPath.value = null
  }

  return (
    <div class="inspector">
      <header class="pane-header">
        <h2>Inspector</h2>
      </header>

      <div class="inspector-section">
        <div class="inspector-section-label">Slide</div>
        <input
          class="form-input"
          type="text"
          value={slide.title ?? ''}
          placeholder="Title"
          onInput={(e) =>
            void persistActiveSlide(
              Slide.parse({
                ...slide,
                title: (e.currentTarget as HTMLInputElement).value || undefined,
              }),
            )
          }
        />
        <input
          class="form-input"
          type="text"
          value={slide.header ?? ''}
          placeholder="Header (kicker)"
          onInput={(e) =>
            void persistActiveSlide(
              Slide.parse({
                ...slide,
                header: (e.currentTarget as HTMLInputElement).value || undefined,
              }),
            )
          }
        />
      </div>

      <div class="inspector-section">
        <div class="inspector-section-label">Blocks</div>
        {tree.length === 0 ? (
          <p class="form-hint">No blocks. Use "+ Block" in the toolbar to add one.</p>
        ) : (
          <ul class="block-tree">
            {tree.map(({ block, path: bp, depth }) => {
              const isActive = path && arraysEqual(bp, path)
              return (
                // biome-ignore lint/a11y/noNoninteractiveTabindex: block tree items are keyboard-navigable
                <li
                  key={bp.join('.')}
                  class={`block-tree-item${isActive ? ' is-active' : ''}`}
                  style={{ paddingLeft: `${0.65 + depth * 0.85}rem` }}
                  onClick={() => {
                    activeBlockPath.value = bp
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') activeBlockPath.value = bp
                  }}
                  onMouseEnter={() => {
                    hoveredBlockPath.value = bp
                  }}
                  onMouseLeave={() => {
                    if (hoveredBlockPath.value === bp) hoveredBlockPath.value = null
                  }}
                >
                  <span class="block-tree-type">{block.type}</span>
                  <span class="block-tree-summary">{blockSummary(block)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selected && path && (
        <div class="inspector-section inspector-form">
          <div class="inspector-section-label">
            <span>Edit "{selected.type}"</span>
            <span class="inspector-form-actions">
              <button
                type="button"
                class="form-icon-btn"
                title="Move up"
                onClick={() => void moveBlock(-1)}
              >
                ↑
              </button>
              <button
                type="button"
                class="form-icon-btn"
                title="Move down"
                onClick={() => void moveBlock(1)}
              >
                ↓
              </button>
              <button
                type="button"
                class="form-icon-btn"
                title="Delete"
                onClick={() => void deleteBlock()}
              >
                ×
              </button>
            </span>
          </div>
          <BlockForm block={selected} onChange={(next) => void updateBlock(next)} />
        </div>
      )}

      <div class="inspector-section inspector-section-collapsible">
        <button
          type="button"
          class="inspector-section-toggle"
          onClick={() => setNotesOpen((v) => !v)}
          aria-expanded={notesOpen}
        >
          <span class="inspector-section-label">Speaker notes</span>
          <span class="inspector-section-caret">{notesOpen ? '▾' : '▸'}</span>
        </button>
        {notesOpen && (
          <textarea
            class="form-input form-textarea"
            value={slide.notes ?? ''}
            placeholder="Notes shown in speaker mode (?mode=speaker)"
            rows={4}
            onInput={(e) =>
              void persistActiveSlide(
                Slide.parse({
                  ...slide,
                  notes: (e.currentTarget as HTMLTextAreaElement).value || undefined,
                }),
              )
            }
          />
        )}
      </div>

      <div class="inspector-section inspector-section-collapsible">
        <button
          type="button"
          class="inspector-section-toggle"
          onClick={() => setAnnotationOpen((v) => !v)}
          aria-expanded={annotationOpen}
        >
          <span class="inspector-section-label">Annotation</span>
          <span class="inspector-section-caret">{annotationOpen ? '▾' : '▸'}</span>
        </button>
        {annotationOpen && (
          <textarea
            class="form-input form-textarea"
            value={slide.annotation ?? ''}
            placeholder="Free-form note for editors. Not rendered in the deck."
            rows={4}
            onInput={(e) =>
              void persistActiveSlide(
                Slide.parse({
                  ...slide,
                  annotation: (e.currentTarget as HTMLTextAreaElement).value || undefined,
                }),
              )
            }
          />
        )}
      </div>
    </div>
  )
}
