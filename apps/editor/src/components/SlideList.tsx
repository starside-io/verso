import type { Slide } from '@starside-io/verso-schema'
import { Fragment } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import {
  activeBlockPath,
  activeSlideId,
  addSection,
  addSlide,
  duplicateSlide,
  filterPathId,
  loaded,
  manifest,
  removeSection,
  removeSlide,
  renameSection,
  setSlideOrder,
  slideGroups,
  slideSearchOpen,
} from '../state'

const DEFAULT_PATH_COLORS = ['#5eead4', '#a78bfa', '#fb923c', '#4ade80', '#f472b6', '#38bdf8']

const promptForId = (label: string): string | null => {
  const raw = window.prompt(`${label} (alphanumeric and hyphens):`)?.trim()
  if (!raw) return null
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(raw)) {
    alert(`Invalid value "${raw}". Use letters, numbers, hyphens.`)
    return null
  }
  return raw
}

interface ContextMenuState {
  slideId: string
  x: number
  y: number
}

// Mirrors PathsView - slides with no include list are in every path; otherwise
// they're in the listed paths minus any in path_exclude.
const slideInPath = (slide: Slide, pathId: string): boolean => {
  if (slide.path_exclude?.includes(pathId)) return false
  if (slide.path_include?.length) return slide.path_include.includes(pathId)
  return true
}

export const SlideList = () => {
  const groups = slideGroups.value
  const m = manifest.value
  const active = activeSlideId.value
  const filter = filterPathId.value
  const isLoaded = loaded.value
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropOverId, setDropOverId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  // Click anywhere to close the context menu, including a click on the
  // selected menu item (which fires its handler before the document handler).
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close, { capture: true })
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close, { capture: true } as EventListenerOptions)
    }
  }, [menu])

  // Drag-drop on slides: splice the dragged slide out of slide_order and
  // reinsert it at the target slide's position. Section markers are skipped
  // by the lookup but stay in place, so dropping a slide across a section
  // moves it across the section boundary.
  const onDropSlide = (targetId: string) => {
    if (!dragId || dragId === targetId || !m) {
      setDragId(null)
      setDropOverId(null)
      return
    }
    const order = [...m.slide_order]
    const fromIdx = order.findIndex((e) => typeof e === 'string' && e === dragId)
    const toIdx = order.findIndex((e) => typeof e === 'string' && e === targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const [moved] = order.splice(fromIdx, 1)
    if (moved !== undefined) order.splice(toIdx, 0, moved)
    void setSlideOrder(order)
    setDragId(null)
    setDropOverId(null)
  }

  const onAddSlide = () => {
    const id = promptForId('New slide id')
    if (id) void addSlide(id)
  }

  const onAddSection = () => {
    const title = window.prompt('Section title:')?.trim()
    if (!title) return
    // Insert the marker right before the currently selected slide so the
    // section starts at that slide. With no selection, append.
    const activeId = activeSlideId.value
    let beforeIndex: number | undefined
    if (m && activeId) {
      const idx = m.slide_order.findIndex((e) => typeof e === 'string' && e === activeId)
      if (idx >= 0) beforeIndex = idx
    }
    void addSection(title, beforeIndex)
  }

  const toggleCollapse = (sectionId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  // Walk groups and render. We track the running slide index across the whole
  // deck so the badge numbers ignore section headers (1, 2, 3 across all
  // slides, not per-section).
  const allPathIds = m ? Object.keys(m.paths) : []

  const renderSlideItem = (slide: Slide, index: number) => {
    const isActive = slide.id === active
    const isDragging = slide.id === dragId
    const isDropTarget = slide.id === dropOverId && dragId && dragId !== slide.id
    const isDimmed = filter !== null && !slideInPath(slide, filter)
    const isHighlighted = filter !== null && slideInPath(slide, filter)
    const slidePaths =
      allPathIds.length > 0 && m
        ? allPathIds
            .map((pid, i) => {
              if (!slideInPath(slide, pid)) return null
              const def = m.paths[pid]!
              return {
                id: pid,
                label: def.label,
                color: def.color ?? DEFAULT_PATH_COLORS[i % DEFAULT_PATH_COLORS.length]!,
              }
            })
            .filter((p): p is { id: string; label: string; color: string } => p !== null)
        : []
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: slide selection is also reachable via Cmd+K search palette
      <li
        key={slide.id}
        class={`slide-list-item${isActive ? ' is-active' : ''}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}${isDimmed ? ' is-dimmed' : ''}${isHighlighted ? ' is-highlighted' : ''}`}
        draggable
        onDragStart={(e) => {
          setDragId(slide.id)
          e.dataTransfer?.setData('text/plain', slide.id)
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (dragId && dragId !== slide.id && dropOverId !== slide.id) {
            setDropOverId(slide.id)
          }
        }}
        onDragLeave={() => {
          if (dropOverId === slide.id) setDropOverId(null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          onDropSlide(slide.id)
        }}
        onDragEnd={() => {
          setDragId(null)
          setDropOverId(null)
        }}
        onClick={() => {
          activeSlideId.value = slide.id
          activeBlockPath.value = null
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMenu({ slideId: slide.id, x: e.clientX, y: e.clientY })
        }}
        title="Drag to reorder. Click to select. Right-click for actions."
      >
        <span class="slide-list-index">{String(index + 1).padStart(2, '0')}</span>
        <div class="slide-list-meta">
          <div class="slide-list-title">{slide.title ?? slide.id}</div>
          <div class="slide-list-sub">{slide.layout}</div>
        </div>
        {slidePaths.length > 0 && (
          <div class="slide-list-paths">
            {slidePaths.slice(0, 4).map((p) => (
              <span
                key={p.id}
                class="slide-list-paths-dot"
                style={{ background: p.color }}
                title={`Path: ${p.label}`}
              />
            ))}
            {slidePaths.length > 4 && (
              <span class="slide-list-paths-more">+{slidePaths.length - 4}</span>
            )}
          </div>
        )}
      </li>
    )
  }

  const totalSlides = groups.reduce((sum, g) => sum + g.slides.length, 0)
  // Pre-compute the starting slide index for each group so collapsed groups
  // don't desync the badge numbering.
  let cursor = 0
  const groupStarts = groups.map((g) => {
    const start = cursor
    cursor += g.slides.length
    return start
  })

  const filterDef = filter && m?.paths[filter] ? m.paths[filter] : null
  const menuSlide = menu ? groups.flatMap((g) => g.slides).find((s) => s.id === menu.slideId) : null

  return (
    <div class="slide-list">
      <header class="pane-header">
        <h2>Slides</h2>
        <button
          type="button"
          class="pane-action"
          title="Search slides (Cmd/Ctrl+K)"
          onClick={() => {
            slideSearchOpen.value = true
          }}
        >
          ⌕
        </button>
        <button type="button" class="pane-action" title="Add section" onClick={onAddSection}>
          §
        </button>
        <button type="button" class="pane-action" title="Add slide" onClick={onAddSlide}>
          +
        </button>
      </header>
      {filterDef && (
        <div class="slide-list-filter">
          <span
            class="slide-list-filter-dot"
            style={{ background: filterDef.color ?? 'var(--editor-accent)' }}
          />
          <span class="slide-list-filter-label">Filtering: {filterDef.label}</span>
          <button
            type="button"
            class="slide-list-filter-clear"
            onClick={() => {
              filterPathId.value = null
            }}
            title="Clear filter"
          >
            ×
          </button>
        </div>
      )}
      <ul class="slide-list-items">
        {!isLoaded ? (
          <li class="slide-list-empty">Loading…</li>
        ) : totalSlides === 0 ? (
          <li class="slide-list-empty">No slides in deck.</li>
        ) : (
          groups.map((group, gi) => {
            const sectionId = group.section?.id ?? null
            const isCollapsed = sectionId ? collapsed.has(sectionId) : false
            const isRenaming = sectionId !== null && renamingId === sectionId
            const startIndex = groupStarts[gi]!
            const groupKey = group.section?.id ?? `path:${gi}`
            return (
              <Fragment key={groupKey}>
                {group.section && (
                  <li
                    key={`section:${group.section.id}`}
                    class={`slide-list-section${isCollapsed ? ' is-collapsed' : ''}`}
                  >
                    <button
                      type="button"
                      class="slide-list-section-toggle"
                      onClick={() => toggleCollapse(group.section!.id)}
                      title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    >
                      {isCollapsed ? '▸' : '▾'}
                    </button>
                    {isRenaming ? (
                      <input
                        class="slide-list-section-input"
                        defaultValue={group.section.title}
                        onBlur={(e) => {
                          const next = (e.currentTarget as HTMLInputElement).value.trim()
                          if (next && next !== group.section!.title) {
                            void renameSection(group.section!.id, next)
                          }
                          setRenamingId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                          else if (e.key === 'Escape') setRenamingId(null)
                        }}
                      />
                    ) : (
                      <span
                        class="slide-list-section-title"
                        onDblClick={() => setRenamingId(group.section!.id)}
                        title="Double-click to rename"
                      >
                        {group.section.title}
                      </span>
                    )}
                    <span class="slide-list-section-count">{group.slides.length}</span>
                    <button
                      type="button"
                      class="slide-list-section-action"
                      title="Rename"
                      onClick={() => setRenamingId(group.section!.id)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      class="slide-list-section-action"
                      title="Remove section (slides stay)"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove section "${group.section!.title}"? Slides will merge with the previous section.`,
                          )
                        ) {
                          void removeSection(group.section!.id)
                        }
                      }}
                    >
                      ×
                    </button>
                  </li>
                )}
                {!isCollapsed &&
                  group.slides.map((slide, i) => renderSlideItem(slide, startIndex + i))}
              </Fragment>
            )
          })
        )}
      </ul>
      {menu && menuSlide && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: onClick just stops propagation; keyboard not applicable
        <ul
          class="slide-list-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <li>
            <button
              type="button"
              onClick={() => {
                void duplicateSlide(menu.slideId)
                setMenu(null)
              }}
            >
              Duplicate
            </button>
          </li>
          <li>
            <button
              type="button"
              class="is-danger"
              onClick={() => {
                if (window.confirm(`Delete slide "${menu.slideId}"?`))
                  void removeSlide(menu.slideId)
                setMenu(null)
              }}
            >
              Delete
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
