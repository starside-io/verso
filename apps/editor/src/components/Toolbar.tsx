import {
  type Align,
  type HorizontalAlign,
  Slide,
  type VerticalAlign,
} from '@starside-io/verso-schema'
import { buildHtml, buildPdf, buildPng, presentUrl } from '../api'
import { BLOCK_CATEGORIES, BLOCK_MENU } from '../blocks'
import { BUILT_IN_LAYOUTS } from '../layouts'
import {
  activeBlockPath,
  activePathId,
  activeSlide,
  activeSlideId,
  addSlide,
  canRedo,
  canUndo,
  deckPropertiesOpen,
  editorTheme,
  findReplaceOpen,
  flashOk,
  htmlExportOpen,
  htmlExportRunner,
  manifest,
  pdfBuilding,
  redo,
  rightTab,
  slideOverflows,
  status,
  toggleEditorTheme,
  undo,
  updateActiveSlide,
  viewMode,
  watermarkOpen,
} from '../state'
import { Dropdown } from './Dropdown'
import { Icon } from './Icon'
import { SplitButton } from './SplitButton'

const promptForId = (): string | null => {
  const raw = window.prompt('New slide id (alphanumeric and hyphens):')?.trim()
  if (!raw) return null
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(raw)) {
    alert(`Invalid id "${raw}". Use letters, numbers, hyphens.`)
    return null
  }
  return raw
}

const HORIZONTAL: HorizontalAlign[] = ['left', 'center', 'right']
const VERTICAL: VerticalAlign[] = ['top', 'middle', 'bottom']

const layoutCategories = Array.from(new Set(BUILT_IN_LAYOUTS.map((l) => l.category)))

// Collapse `align` to its smallest equivalent shape.
//   - drop empty per-zone wrappers ({} is noise on disk)
//   - if title and content fully agree on both axes, collapse the matching
//     values into the flat top-level horizontal/vertical and drop the
//     wrappers (so users who don't use per-zone alignment never see it)
//   - return undefined when nothing meaningful is set
const normalizeAlign = (align: Align): Align | undefined => {
  const next: Align = { ...align }
  if (next.title && Object.keys(next.title).length === 0) delete next.title
  if (next.content && Object.keys(next.content).length === 0) delete next.content

  const t = next.title
  const c = next.content
  if (t && c) {
    // Use strict equality including undefined === undefined so two zones
    // that only set one axis still collapse into the flat shape (with that
    // single axis populated and the other left undefined).
    if (t.horizontal === c.horizontal && t.vertical === c.vertical) {
      if (t.horizontal !== undefined) next.horizontal = t.horizontal
      if (t.vertical !== undefined) next.vertical = t.vertical
      delete next.title
      delete next.content
    }
  }

  if (
    next.horizontal === undefined &&
    next.vertical === undefined &&
    next.title === undefined &&
    next.content === undefined
  ) {
    return undefined
  }
  return next
}

// What value should each row's segmented buttons highlight? Per-zone wins
// over flat; if neither is set, return undefined so no button looks active.
// (We intentionally don't fall through to layout defaults: the editor would
//  have to import the layouts package to learn them, and a missing highlight
//  is a clearer "nothing set" signal anyway.)
const alignForZone = (
  align: Align | undefined,
  zone: 'title' | 'content',
  axis: 'horizontal' | 'vertical',
): HorizontalAlign | VerticalAlign | undefined => {
  if (!align) return undefined
  const z = align[zone]
  return (z?.[axis] as HorizontalAlign | VerticalAlign | undefined) ?? align[axis]
}

export const Toolbar = () => {
  const s = status.value
  const slide = activeSlide.value
  const disabled = !slide
  const pathIds = Object.keys(manifest.value?.paths ?? {})
  const multiPath = pathIds.length > 1
  const presentPathId = multiPath ? null : activePathId.value

  const onAddSlide = () => {
    const id = promptForId()
    if (id) void addSlide(id)
  }

  // After an export the build returns an `overflows` list (slides that get
  // clipped at the configured page height). Surface the count in the success
  // message so the author notices without us blocking the build.
  const overflowSuffix = (n: number): string =>
    n > 0 ? `, ${n} slide${n === 1 ? '' : 's'} overflow` : ''

  const exportPdf = async () => {
    pdfBuilding.value = true
    status.value = { kind: 'saving', message: 'Building PDF…' }
    try {
      const res = await buildPdf(activePathId.value, { open: true })
      const f = res.files[0]
      const n = res.overflows?.length ?? 0
      if (f) flashOk(`PDF: ${f.file} (${f.slides} slides${overflowSuffix(n)})`, 4000)
    } catch (err) {
      status.value = { kind: 'error', message: `PDF failed: ${(err as Error).message}` }
    } finally {
      pdfBuilding.value = false
    }
  }

  const exportHtml = async (inlineImages: boolean) => {
    pdfBuilding.value = true
    status.value = {
      kind: 'saving',
      message: `Building HTML${inlineImages ? ' (inlining images)' : ''}…`,
    }
    try {
      const res = await buildHtml(activePathId.value, { open: true, inlineImages })
      const f = res.files[0]
      const n = res.overflows?.length ?? 0
      if (f) flashOk(`HTML: ${f.file} (${f.slides} slides${overflowSuffix(n)})`, 4000)
    } catch (err) {
      status.value = { kind: 'error', message: `HTML failed: ${(err as Error).message}` }
    } finally {
      pdfBuilding.value = false
    }
  }

  const exportPng = async () => {
    const slideId = activeSlideId.value
    if (!slideId) {
      status.value = { kind: 'error', message: 'Select a slide first.' }
      return
    }
    pdfBuilding.value = true
    status.value = { kind: 'saving', message: `Rendering ${slideId} as PNG…` }
    try {
      const f = await buildPng(activePathId.value, slideId, { open: true })
      const n = f.overflows?.length ?? 0
      flashOk(`PNG: ${f.file}${overflowSuffix(n)}`, 4000)
    } catch (err) {
      status.value = { kind: 'error', message: `PNG failed: ${(err as Error).message}` }
    } finally {
      pdfBuilding.value = false
    }
  }

  const onPickLayout = (name: string, close: () => void) => {
    close()
    void updateActiveSlide((s) => Slide.parse({ ...s, layout: name }))
  }

  // Per-zone alignment writes go into align.title.* or align.content.*.
  // After every write we run normalizeAlign which collapses to the flat
  // shape when both zones agree (keeps the JSON clean for the common case)
  // and drops empty wrappers (so { title: {} } never lingers).
  const onPickAlign = (
    zone: 'title' | 'content',
    axis: 'horizontal' | 'vertical',
    value: HorizontalAlign | VerticalAlign,
    close: () => void,
  ) => {
    close()
    void updateActiveSlide((s) => {
      const prev: Align = s.align ?? {}
      const zoneVal = { ...(prev[zone] ?? {}), [axis]: value }
      const next = normalizeAlign({ ...prev, [zone]: zoneVal })
      return Slide.parse({ ...s, align: next })
    })
  }

  const onAddBlock = (typeKey: string, close: () => void) => {
    const entry = BLOCK_MENU.find((b) => b.type === typeKey)
    if (!entry) return
    close()
    const newIndex = slide?.content.length ?? 0
    void updateActiveSlide((s) => Slide.parse({ ...s, content: [...s.content, entry.stub()] }))
    activeBlockPath.value = [newIndex]
    rightTab.value = 'inspector'
  }

  return (
    <div class="toolbar-row">
      <span class="toolbar-brand">
        <img class="toolbar-brand-logo" src="/verso.svg" alt="" aria-hidden="true" />
        <span class="toolbar-brand-text">Verso</span>
      </span>
      <button type="button" class="toolbar-btn" onClick={onAddSlide}>
        <Icon name="slide-plus" />
        <span>Slide</span>
      </button>

      <Dropdown
        label={
          <>
            <Icon name="block-plus" />
            <span>Block</span>
          </>
        }
        disabled={disabled}
      >
        {(close) => (
          <div class="dropdown-grouped">
            {BLOCK_CATEGORIES.map((cat) => {
              const items = BLOCK_MENU.filter((b) => b.category === cat)
              if (items.length === 0) return null
              return (
                <div class="dropdown-group" key={cat}>
                  <div class="dropdown-group-label">{cat}</div>
                  {items.map((entry) => (
                    <button
                      type="button"
                      key={entry.type}
                      class="dropdown-item"
                      onClick={() => onAddBlock(entry.type, close)}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </Dropdown>

      <Dropdown
        label={
          <>
            <Icon name="layout" />
            <span>{slide?.layout ?? 'Layout'}</span>
          </>
        }
        disabled={disabled}
      >
        {(close) => (
          <div class="dropdown-grouped">
            {layoutCategories.map((cat) => (
              <div class="dropdown-group" key={cat}>
                <div class="dropdown-group-label">{cat}</div>
                {BUILT_IN_LAYOUTS.filter((l) => l.category === cat).map((l) => (
                  <button
                    type="button"
                    key={l.name}
                    class={`dropdown-item${slide?.layout === l.name ? ' is-active' : ''}`}
                    onClick={() => onPickLayout(l.name, close)}
                  >
                    <span class="dropdown-item-label">{l.label}</span>
                    <span class="dropdown-item-aside">{l.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </Dropdown>

      <Dropdown
        label={
          <>
            <Icon name="align" />
            <span>Align</span>
          </>
        }
        disabled={disabled}
      >
        {(close) => {
          const align = slide?.align
          const renderZone = (zone: 'title' | 'content', heading: string) => (
            <div class="align-zone" key={zone}>
              <div class="align-zone-label">{heading}</div>
              <div class="align-row">
                <span class="align-row-label">Horizontal</span>
                <div class="align-segmented">
                  {HORIZONTAL.map((h) => (
                    <button
                      type="button"
                      key={h}
                      class={`align-btn${
                        alignForZone(align, zone, 'horizontal') === h ? ' is-active' : ''
                      }`}
                      onClick={() => onPickAlign(zone, 'horizontal', h, close)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div class="align-row">
                <span class="align-row-label">Vertical</span>
                <div class="align-segmented">
                  {VERTICAL.map((v) => (
                    <button
                      type="button"
                      key={v}
                      class={`align-btn${
                        alignForZone(align, zone, 'vertical') === v ? ' is-active' : ''
                      }`}
                      onClick={() => onPickAlign(zone, 'vertical', v, close)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
          return (
            <div class="dropdown-align">
              {renderZone('title', 'Title')}
              {renderZone('content', 'Content')}
            </div>
          )
        }}
      </Dropdown>

      <button
        type="button"
        class="toolbar-btn"
        title="Edit deck title and variables"
        onClick={() => {
          deckPropertiesOpen.value = true
        }}
      >
        <Icon name="settings" />
        <span>Deck</span>
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Add or edit the deck-wide watermark"
        onClick={() => {
          watermarkOpen.value = true
        }}
      >
        <Icon name="watermark" />
        <span>Watermark</span>
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Find & replace across the deck (Cmd/Ctrl+Shift+F)"
        onClick={() => {
          findReplaceOpen.value = true
        }}
      >
        <Icon name="search" />
        <span>Find</span>
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Undo (Cmd/Ctrl+Z)"
        onClick={() => void undo()}
        disabled={!canUndo.value}
      >
        <Icon name="undo" />
        <span>Undo</span>
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Redo (Cmd/Ctrl+Shift+Z)"
        onClick={() => void redo()}
        disabled={!canRedo.value}
      >
        <Icon name="redo" />
        <span>Redo</span>
      </button>

      <div class="toolbar-spacer" />

      <SplitButton
        label={
          <>
            <Icon name="play" />
            <span>Present</span>
          </>
        }
        title="Open the deck in present mode in a new tab"
        onPrimaryClick={() => {
          const url = presentUrl(presentPathId, activeSlideId.value, 'present')
          window.open(url, '_blank', 'noopener')
        }}
      >
        {(close) => (
          <div class="dropdown-grouped">
            <button
              type="button"
              class="dropdown-item"
              onClick={() => {
                close()
                const url = presentUrl(presentPathId, activeSlideId.value, 'present')
                window.open(url, '_blank', 'noopener')
              }}
            >
              <span class="dropdown-item-icon">
                <Icon name="play" size={18} />
              </span>
              <span class="dropdown-item-label">Present</span>
              <span class="dropdown-item-aside">slides only</span>
            </button>
            <button
              type="button"
              class="dropdown-item"
              onClick={() => {
                close()
                const url = presentUrl(presentPathId, activeSlideId.value, 'speaker')
                window.open(url, '_blank', 'noopener')
              }}
            >
              <span class="dropdown-item-icon">
                <Icon name="speaker" size={18} />
              </span>
              <span class="dropdown-item-label">Speaker view</span>
              <span class="dropdown-item-aside">with notes</span>
            </button>
          </div>
        )}
      </SplitButton>
      <SplitButton
        label={
          pdfBuilding.value ? (
            <>
              <span class="toolbar-spinner" aria-hidden="true" />
              <span>Building…</span>
            </>
          ) : (
            <>
              <Icon name="download" />
              <span>Export</span>
            </>
          )
        }
        title="Export the active path as PDF (or HTML)"
        disabled={pdfBuilding.value}
        onPrimaryClick={() => {
          if (pdfBuilding.value) return
          void exportPdf()
        }}
      >
        {(close) => (
          <div class="dropdown-grouped">
            <button
              type="button"
              class="dropdown-item"
              onClick={() => {
                close()
                void exportPdf()
              }}
            >
              <span class="dropdown-item-icon">
                <Icon name="file-pdf" size={18} />
              </span>
              <span class="dropdown-item-label">PDF</span>
              <span class="dropdown-item-aside">print-ready</span>
            </button>
            <button
              type="button"
              class="dropdown-item"
              onClick={() => {
                close()
                htmlExportRunner.value = (inline) => void exportHtml(inline)
                htmlExportOpen.value = true
              }}
            >
              <span class="dropdown-item-icon">
                <Icon name="file-html" size={18} />
              </span>
              <span class="dropdown-item-label">HTML</span>
              <span class="dropdown-item-aside">single self-contained file</span>
            </button>
            <button
              type="button"
              class="dropdown-item"
              disabled={!activeSlideId.value}
              onClick={() => {
                close()
                void exportPng()
              }}
            >
              <span class="dropdown-item-icon">
                <Icon name="file-image" size={18} />
              </span>
              <span class="dropdown-item-label">PNG</span>
              <span class="dropdown-item-aside">this slide only</span>
            </button>
          </div>
        )}
      </SplitButton>

      {s.kind !== 'idle' && (
        <span class={`status-pill status-${s.kind}`}>
          {s.message ?? (s.kind === 'saving' ? 'Saving…' : '')}
        </span>
      )}

      {(() => {
        const id = activeSlideId.value
        const overshoot = id ? (slideOverflows.value.get(id) ?? 0) : 0
        if (overshoot <= 0) return null
        return (
          <span
            class="status-pill status-overflow"
            title="The active slide overflows the 1080px design height. Content past the bound is clipped in PDF and HTML export."
          >
            ⚠ active slide overflows by {overshoot}px
          </span>
        )
      })()}

      <button
        type="button"
        class={`toolbar-btn${viewMode.value === 'paths' ? ' toolbar-btn-active' : ''}`}
        title="View path overview"
        onClick={() => {
          viewMode.value = viewMode.value === 'paths' ? 'editor' : 'paths'
        }}
      >
        <Icon name="paths" />
        <span>Paths</span>
      </button>
      <button
        type="button"
        class="toolbar-btn toolbar-btn-icon"
        title={editorTheme.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={toggleEditorTheme}
        aria-label="Toggle editor theme"
      >
        <Icon name={editorTheme.value === 'dark' ? 'sun' : 'moon'} />
      </button>
    </div>
  )
}
