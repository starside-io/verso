import {
  type SectionMarker,
  Slide,
  type SlideOrderEntry,
  isSectionMarker,
} from '@starside-io/verso-schema'
import { useEffect, useRef, useState } from 'preact/hooks'
import {
  activeSlideId,
  addPath,
  filterPathId,
  manifest,
  persistActiveSlide,
  removePath,
  setSlideOrder,
  slides,
  themeColorPalette,
  updatePath,
  useThemeColorsForPaths,
  viewMode,
} from '../state'

// Layout constants
const COL_W = 168 // column width (card + gap)
const CARD_W = 140 // card width
const CARD_H = 54 // card height
const LANE_H = 110 // center-to-center vertical spacing between lanes
const PAD_X = 64 // horizontal padding
const PAD_Y = 56 // vertical padding

const slugifyId = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const DEFAULT_PATH_COLORS = ['#5eead4', '#a78bfa', '#fb923c', '#4ade80', '#f472b6', '#38bdf8']

interface TLNode {
  id: string
  col: number
  lane: number
  entry: SlideOrderEntry
  slide: Slide | null
  section: SectionMarker | null
  inPaths: string[]
}

function getInPaths(slide: Slide, allPathIds: string[]): string[] {
  return allPathIds.filter((p) => {
    if (slide.path_exclude?.includes(p)) return false
    if (slide.path_include?.length) return slide.path_include.includes(p)
    return true
  })
}

function buildTimeline(
  order: SlideOrderEntry[],
  slidesMap: ReadonlyMap<string, Slide>,
  allPathIds: string[],
): TLNode[] {
  const laneMap = new Map<string, number>()
  let nextLane = 1

  return order.map((entry, col) => {
    const isSection = isSectionMarker(entry)
    const id = isSection ? (entry as SectionMarker).id : (entry as string)
    const slide = isSection ? null : (slidesMap.get(entry as string) ?? null)
    const section = isSection ? (entry as SectionMarker) : null

    const inPaths: string[] =
      allPathIds.length === 0
        ? []
        : isSection || !slide
          ? allPathIds
          : getInPaths(slide, allPathIds)

    let lane: number
    if (allPathIds.length === 0 || inPaths.length === allPathIds.length) {
      lane = 0
    } else {
      const key = [...inPaths].sort().join('\x00')
      if (!laneMap.has(key)) laneMap.set(key, nextLane++)
      lane = laneMap.get(key)!
    }

    return { id, col, lane, entry, slide, section, inPaths }
  })
}

const nodeX = (col: number) => PAD_X + col * COL_W
const nodeY = (lane: number, maxLane: number) => PAD_Y + (maxLane - lane) * LANE_H
const nodeCx = (col: number) => nodeX(col) + CARD_W / 2
const nodeCy = (lane: number, maxLane: number) => nodeY(lane, maxLane) + CARD_H / 2

// Cubic bezier S-curve from right edge of n1 to left edge of n2
function segmentPath(n1: TLNode, n2: TLNode, maxLane: number): string {
  const x1 = nodeX(n1.col) + CARD_W
  const y1 = nodeCy(n1.lane, maxLane)
  const x2 = nodeX(n2.col)
  const y2 = nodeCy(n2.lane, maxLane)
  const dx = (x2 - x1) * 0.45
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

export const PathsView = () => {
  const m = manifest.value
  const slidesMap = slides.value
  const filter = filterPathId.value
  const useTheme = useThemeColorsForPaths.value
  const palette = themeColorPalette.value
  const colorForPath = (pathId: string, idx: number): string => {
    if (useTheme && palette.length > 0) return palette[idx % palette.length]!
    return m?.paths[pathId]?.color ?? DEFAULT_PATH_COLORS[idx % DEFAULT_PATH_COLORS.length]!
  }
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addingPath, setAddingPath] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [renamingPathId, setRenamingPathId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropOverId, setDropOverId] = useState<string | null>(null)
  const labelRef = useRef<HTMLInputElement>(null)
  const colorInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  useEffect(() => {
    if (addingPath) labelRef.current?.focus()
  }, [addingPath])

  if (!m) return <div class="paths-empty">Loading…</div>

  const allPathIds = Object.keys(m.paths)
  const order = m.slide_order
  const nodes = buildTimeline(order, slidesMap, allPathIds)
  const maxLane = nodes.reduce((max, n) => Math.max(max, n.lane), 0)

  const canvasW = PAD_X * 2 + order.length * COL_W
  const canvasH = PAD_Y * 2 + maxLane * LANE_H + CARD_H

  // Build one SVG <path> per defined path, colored by path color
  const pathLines: { pathId: string; color: string; d: string }[] = []

  if (allPathIds.length === 0) {
    // No paths: single gray spine through all nodes in order
    const pts = nodes.map((n) => ({ cx: nodeCx(n.col), cy: nodeCy(n.lane, maxLane) }))
    const d = pts
      .slice(1)
      .map((p, i) => {
        const prev = pts[i]!
        const dx = (p.cx - prev.cx) * 0.45
        return `M ${prev.cx} ${prev.cy} C ${prev.cx + dx} ${prev.cy}, ${p.cx - dx} ${p.cy}, ${p.cx} ${p.cy}`
      })
      .join(' ')
    if (d) pathLines.push({ pathId: '__all', color: 'var(--editor-muted)', d })
  } else {
    allPathIds.forEach((pathId, pi) => {
      const color = colorForPath(pathId, pi)
      const pathNodes = nodes.filter((n) => n.inPaths.includes(pathId))
      if (pathNodes.length < 2) return
      const d = pathNodes
        .slice(1)
        .map((n2, i) => segmentPath(pathNodes[i]!, n2, maxLane))
        .join(' ')
      pathLines.push({ pathId, color, d })
    })
  }

  const selectedNode = selectedId ? (nodes.find((n) => n.id === selectedId) ?? null) : null

  const onNodeClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  const onNodeDblClick = (id: string) => {
    const node = nodes.find((n) => n.id === id)
    if (node?.slide) {
      activeSlideId.value = id
      viewMode.value = 'editor'
    }
  }

  const onStartAddPath = () => {
    setAddingPath(true)
    setNewLabel('')
  }

  const onCancelAddPath = () => setAddingPath(false)

  const onSubmitAddPath = async (e: Event) => {
    e.preventDefault()
    const label = newLabel.trim()
    const id = slugifyId(label)
    if (!id) return
    if (allPathIds.includes(id)) return
    const color = DEFAULT_PATH_COLORS[allPathIds.length % DEFAULT_PATH_COLORS.length]
    await addPath(id, label || id, color)
    setAddingPath(false)
  }

  // Drag-drop on timeline cards: same shape as SlideList. Splice the dragged
  // slide id out of slide_order and reinsert at the target's index. Sections
  // stay in place since the indices we operate on are slide-id positions.
  const onDropNode = (targetId: string) => {
    if (!dragId || dragId === targetId || !m) {
      setDragId(null)
      setDropOverId(null)
      return
    }
    const order = [...m.slide_order]
    const fromIdx = order.findIndex((e) => typeof e === 'string' && e === dragId)
    const toIdx = order.findIndex((e) => typeof e === 'string' && e === targetId)
    if (fromIdx < 0 || toIdx < 0) {
      setDragId(null)
      setDropOverId(null)
      return
    }
    const [moved] = order.splice(fromIdx, 1)
    if (moved !== undefined) order.splice(toIdx, 0, moved)
    void setSlideOrder(order)
    setDragId(null)
    setDropOverId(null)
  }

  const onTogglePath = async (slide: Slide, pathId: string, checked: boolean) => {
    const current = getInPaths(slide, allPathIds)
    const next = checked ? [...new Set([...current, pathId])] : current.filter((p) => p !== pathId)
    const patch =
      next.length === allPathIds.length
        ? { path_include: undefined, path_exclude: undefined }
        : { path_include: next, path_exclude: undefined }
    await persistActiveSlide(Slide.parse({ ...slide, ...patch }))
  }

  return (
    <div class="paths-view">
      <div class="paths-legend">
        {allPathIds.map((pid, i) => {
          const def = m.paths[pid]!
          const color = colorForPath(pid, i)
          const isFilter = filter === pid
          const isRenaming = renamingPathId === pid
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: filter chip; renaming and deletion are handled by inner controls
            <span
              key={pid}
              class={`paths-legend-item${isFilter ? ' is-filter' : ''}`}
              onClick={() => {
                if (isRenaming) return
                filterPathId.value = isFilter ? null : pid
              }}
              title={
                isFilter ? 'Click to clear filter' : `Click to filter slides by "${def.label}"`
              }
            >
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: dot opens the hidden color input; reachable via keyboard through the input itself */}
              <span
                class="paths-legend-dot"
                style={{ background: color }}
                onClick={(e) => {
                  e.stopPropagation()
                  colorInputRefs.current.get(pid)?.click()
                }}
                title="Change path color"
              />
              <input
                type="color"
                class="paths-legend-color-input"
                value={color}
                ref={(el) => {
                  if (el) colorInputRefs.current.set(pid, el)
                  else colorInputRefs.current.delete(pid)
                }}
                onClick={(e) => e.stopPropagation()}
                onInput={(e) => {
                  void updatePath(pid, { color: (e.currentTarget as HTMLInputElement).value })
                }}
              />
              {isRenaming ? (
                <input
                  class="paths-legend-rename-input"
                  defaultValue={def.label}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const next = (e.currentTarget as HTMLInputElement).value.trim()
                    if (next && next !== def.label) void updatePath(pid, { label: next })
                    setRenamingPathId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                    else if (e.key === 'Escape') setRenamingPathId(null)
                  }}
                />
              ) : (
                <span
                  class="paths-legend-label"
                  onDblClick={(e) => {
                    e.stopPropagation()
                    setRenamingPathId(pid)
                  }}
                  title="Double-click to rename"
                >
                  {def.label}
                </span>
              )}
              <span class="paths-legend-id">({pid})</span>
              <button
                type="button"
                class="paths-legend-delete"
                title={`Delete path "${pid}"`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (
                    window.confirm(`Delete path "${def.label}" (${pid})? This cannot be undone.`)
                  ) {
                    void removePath(pid)
                  }
                }}
              >
                ×
              </button>
            </span>
          )
        })}
        {addingPath ? (
          <form class="paths-legend-form" onSubmit={onSubmitAddPath}>
            <input
              ref={labelRef}
              class="paths-legend-input paths-legend-input-label"
              placeholder="path label"
              value={newLabel}
              onInput={(e) => setNewLabel((e.currentTarget as HTMLInputElement).value)}
              required
            />
            <button
              type="submit"
              class="toolbar-btn paths-legend-btn"
              disabled={!slugifyId(newLabel) || allPathIds.includes(slugifyId(newLabel))}
            >
              Add
            </button>
            <button type="button" class="toolbar-btn paths-legend-btn" onClick={onCancelAddPath}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" class="toolbar-btn paths-legend-btn" onClick={onStartAddPath}>
            + Path
          </button>
        )}
        {allPathIds.length > 0 && (
          <button
            type="button"
            class={`toolbar-btn paths-legend-btn${useTheme ? ' toolbar-btn-active' : ''}`}
            title={
              useTheme
                ? 'Showing theme colors. Click to use each path’s own color.'
                : 'Showing each path’s own color. Click to preview with theme colors.'
            }
            onClick={() => {
              useThemeColorsForPaths.value = !useTheme
            }}
          >
            {useTheme ? '◐ Theme colors' : '◑ Path colors'}
          </button>
        )}
      </div>

      <div class="paths-scroll">
        <div class="paths-canvas" style={{ width: canvasW, height: canvasH }}>
          <svg
            class="paths-svg"
            width={canvasW}
            height={canvasH}
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            role="img"
          >
            <title>Slide path timeline</title>
            {pathLines.map(({ pathId, color, d }) => {
              const dimmed = filter !== null && pathId !== filter
              return (
                <path
                  key={pathId}
                  d={d}
                  stroke={color}
                  stroke-width="2"
                  fill="none"
                  stroke-opacity={dimmed ? 0.1 : 0.65}
                  stroke-linecap="round"
                />
              )
            })}
          </svg>

          {nodes.map((node) => {
            const x = nodeX(node.col)
            const y = nodeY(node.lane, maxLane)
            const isSelected = selectedId === node.id
            const isActive = activeSlideId.value === node.id
            const isDimmed = filter !== null && !node.section && !node.inPaths.includes(filter)

            if (node.section) {
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: timeline node; keyboard navigation goes through the slide list
                <div
                  key={node.id}
                  class={`path-node path-node-section${isSelected ? ' is-selected' : ''}${filter !== null ? ' is-dimmed' : ''}`}
                  style={{
                    left: x + (CARD_W - 120) / 2,
                    top: y + (CARD_H - 28) / 2,
                  }}
                  onClick={() => onNodeClick(node.id)}
                >
                  {node.section.title}
                </div>
              )
            }

            const dotColors =
              allPathIds.length > 0
                ? node.inPaths.map((pid) => colorForPath(pid, allPathIds.indexOf(pid)))
                : []

            const isDragging = dragId === node.id
            const isDropTarget = dropOverId === node.id && dragId && dragId !== node.id
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: timeline node; keyboard navigation goes through the slide list
              <div
                key={node.id}
                class={`path-node${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}${isDimmed ? ' is-dimmed' : ''}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
                style={{ left: x, top: y, width: CARD_W }}
                draggable
                onDragStart={(e) => {
                  setDragId(node.id)
                  e.dataTransfer?.setData('text/plain', node.id)
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragId && dragId !== node.id && dropOverId !== node.id) {
                    setDropOverId(node.id)
                  }
                }}
                onDragLeave={() => {
                  if (dropOverId === node.id) setDropOverId(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  onDropNode(node.id)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setDropOverId(null)
                }}
                onClick={() => onNodeClick(node.id)}
                onDblClick={() => onNodeDblClick(node.id)}
                title={node.slide?.title ? `${node.id}: ${node.slide.title}` : node.id}
              >
                {dotColors.length > 0 && (
                  <div class="path-node-dots">
                    {dotColors.slice(0, 5).map((c, i) => (
                      <span key={`${i}-${c}`} class="path-node-dot" style={{ background: c }} />
                    ))}
                    {dotColors.length > 5 && (
                      <span class="path-node-dot-more">+{dotColors.length - 5}</span>
                    )}
                  </div>
                )}
                <div class="path-node-id">{node.id}</div>
                {node.slide?.title && <div class="path-node-title">{node.slide.title}</div>}
                {allPathIds.length > 0 && node.slide && (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: onClick just stops propagation; keyboard not applicable
                  <div class="path-node-checks" onClick={(e) => e.stopPropagation()}>
                    {allPathIds.map((pid, i) => {
                      const def = m.paths[pid]!
                      const color = colorForPath(pid, i)
                      const checked = node.inPaths.includes(pid)
                      return (
                        <label key={pid} class="path-node-check">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={async (e) => {
                              await onTogglePath(
                                node.slide!,
                                pid,
                                (e.currentTarget as HTMLInputElement).checked,
                              )
                            }}
                          />
                          <span class="path-node-check-dot" style={{ background: color }} />
                          <span class="path-node-check-label">{def.label}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
