import { Manifest } from '@starside-io/verso-schema'
import { useEffect, useRef, useState } from 'preact/hooks'
import { manifest, updateManifest } from '../state'

interface Props {
  open: boolean
  onClose: () => void
}

type Position = 'bottom-left' | 'bottom-center' | 'bottom-right'
const POSITIONS: { value: Position; label: string }[] = [
  { value: 'bottom-left', label: 'Left' },
  { value: 'bottom-center', label: 'Center' },
  { value: 'bottom-right', label: 'Right' },
]

export const WatermarkDialog = ({ open, onClose }: Props) => {
  const m = manifest.value
  const [text, setText] = useState('')
  const [position, setPosition] = useState<Position>('bottom-right')
  const [opacity, setOpacity] = useState(0.18)
  const [error, setError] = useState<string | null>(null)
  const textRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !m) return
    const wm = m.watermark
    setText(wm?.text ?? '')
    setPosition((wm?.position as Position) ?? 'bottom-right')
    setOpacity(wm?.opacity ?? 0.18)
    setError(null)
    requestAnimationFrame(() => textRef.current?.focus())
  }, [open, m])

  if (!open || !m) return null

  const save = async () => {
    setError(null)
    const trimmed = text.trim()
    try {
      await updateManifest((cur) =>
        Manifest.parse({
          ...cur,
          watermark: trimmed ? { text: trimmed, position, opacity } : undefined,
        }),
      )
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const clear = async () => {
    setError(null)
    try {
      await updateManifest((cur) => Manifest.parse({ ...cur, watermark: undefined }))
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div
      class="export-dialog-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        class="deck-properties"
        role="dialog"
        aria-modal="true"
        aria-labelledby="watermark-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header class="deck-properties-header">
          <h2 id="watermark-title">Watermark</h2>
        </header>

        <section class="deck-properties-section">
          <label class="deck-properties-label" htmlFor="watermark-text">
            Text
          </label>
          <input
            id="watermark-text"
            ref={textRef}
            class="deck-properties-input"
            placeholder="e.g. DRAFT  •  CONFIDENTIAL  •  © Acme 2026"
            value={text}
            onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)}
          />
          <span class="deck-properties-hint">Stamped on every slide. Leave blank to remove.</span>
        </section>

        <section class="deck-properties-section">
          <span class="deck-properties-label">Position</span>
          <div class="watermark-position-row">
            {POSITIONS.map((p) => (
              <button
                type="button"
                key={p.value}
                class={`watermark-position-btn${position === p.value ? ' is-active' : ''}`}
                onClick={() => setPosition(p.value)}
                aria-pressed={position === p.value}
              >
                <span
                  class={`watermark-position-preview watermark-position-${p.value}`}
                  aria-hidden="true"
                />
                <span class="watermark-position-label">{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section class="deck-properties-section">
          <label class="deck-properties-label" htmlFor="watermark-opacity">
            Opacity <span class="deck-properties-hint">{Math.round(opacity * 100)}%</span>
          </label>
          <input
            id="watermark-opacity"
            class="watermark-opacity-slider"
            type="range"
            min="0.05"
            max="0.8"
            step="0.01"
            value={opacity}
            onInput={(e) => setOpacity(Number((e.currentTarget as HTMLInputElement).value))}
          />
        </section>

        {error && <div class="deck-properties-error">{error}</div>}

        <footer class="deck-properties-footer">
          {m.watermark && (
            <button type="button" class="export-dialog-cancel" onClick={() => void clear()}>
              Remove
            </button>
          )}
          <button type="button" class="export-dialog-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            class="toolbar-btn deck-properties-save"
            onClick={() => void save()}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
