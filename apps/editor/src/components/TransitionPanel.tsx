import { Slide } from '@starside-io/verso-schema'
import { activeSlide, activeSlideId, updateActiveSlide } from '../state'

// Built-in transitions ship with @starside-io/verso-layouts. Projects can register custom
// names by adding their own `.verso-transition-<name>` keyframes; the
// renderer just stamps the class onto the slide wrapper. Grouped by feel so
// the panel reads cleanly when scrolled.
interface TransitionDef {
  id: string
  label: string
  description: string
  group: 'Off' | 'Move' | 'Scale' | '3D' | 'Reveal' | 'FX'
}
const TRANSITIONS: TransitionDef[] = [
  { id: 'none', label: 'None', description: 'No animation. Snap to the next slide.', group: 'Off' },

  { id: 'fade', label: 'Fade', description: 'Cross-fades in.', group: 'Move' },
  { id: 'slide-left', label: 'Slide left', description: 'Eases in from the right.', group: 'Move' },
  {
    id: 'slide-right',
    label: 'Slide right',
    description: 'Eases in from the left.',
    group: 'Move',
  },
  { id: 'slide-up', label: 'Slide up', description: 'Eases in from below.', group: 'Move' },
  { id: 'slide-down', label: 'Slide down', description: 'Eases in from above.', group: 'Move' },

  {
    id: 'zoom',
    label: 'Zoom in',
    description: 'Scales up to 100% while fading in.',
    group: 'Scale',
  },
  {
    id: 'zoom-out',
    label: 'Zoom out',
    description: 'Scales down to 100% while fading in.',
    group: 'Scale',
  },
  { id: 'pop', label: 'Pop', description: 'Springs in with a slight overshoot.', group: 'Scale' },

  {
    id: 'flip-x',
    label: 'Flip X',
    description: '3D flip around the horizontal axis.',
    group: '3D',
  },
  { id: 'flip-y', label: 'Flip Y', description: '3D flip around the vertical axis.', group: '3D' },
  {
    id: 'tilt',
    label: 'Tilt',
    description: 'Subtle perspective tilt while easing in.',
    group: '3D',
  },

  {
    id: 'iris',
    label: 'Iris',
    description: 'Circular reveal expanding from the center.',
    group: 'Reveal',
  },
  {
    id: 'wipe-right',
    label: 'Wipe right',
    description: 'Linear wipe from the left edge.',
    group: 'Reveal',
  },
  {
    id: 'wipe-down',
    label: 'Wipe down',
    description: 'Linear wipe from the top edge.',
    group: 'Reveal',
  },

  {
    id: 'blur',
    label: 'Blur',
    description: 'Sharpens from a heavy blur as it fades in.',
    group: 'FX',
  },
]

export const TransitionPanel = () => {
  const slide = activeSlide.value
  const slideId = activeSlideId.value
  const current = (slide?.transition?.trim() || 'none') as string

  if (!slide || !slideId) {
    return (
      <div class="transitions">
        <header class="pane-header">
          <h2>Transitions</h2>
        </header>
        <div class="transitions-empty">Select a slide to set its transition.</div>
      </div>
    )
  }

  const pick = async (id: string) => {
    if (id === current) return
    await updateActiveSlide((s) => {
      const next = id === 'none' ? undefined : id
      const { transition: _drop, ...rest } = s
      return Slide.parse(next ? { ...rest, transition: next } : rest)
    })
  }

  return (
    <div class="transitions">
      <header class="pane-header">
        <h2>Transitions</h2>
        <span class="transitions-scope">
          applies to <code>{slide.id}</code>
        </span>
      </header>
      <div class="transitions-hint">
        Played when this slide becomes active in present or speaker mode. Per-slide only: there's no
        deck-wide default.
      </div>
      <div class="transitions-list">
        {Array.from(new Set(TRANSITIONS.map((t) => t.group))).map((group) => (
          <section class="transitions-group" key={group}>
            <h3 class="transitions-group-label">{group}</h3>
            <ul class="transitions-group-items">
              {TRANSITIONS.filter((t) => t.group === group).map((t) => {
                const active = t.id === current
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      class={`transition-option${active ? ' is-active' : ''}`}
                      onClick={() => void pick(t.id)}
                      data-transition={t.id}
                    >
                      <span class="transition-preview" aria-hidden="true">
                        <span class={`transition-preview-tile transition-preview-${t.id}`} />
                      </span>
                      <span class="transition-meta">
                        <span class="transition-name">{t.label}</span>
                        <span class="transition-desc">{t.description}</span>
                      </span>
                      {active && (
                        <span class="transition-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
