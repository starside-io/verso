import { Manifest } from '@starside-io/verso-schema'
import { useEffect, useRef, useState } from 'preact/hooks'
import { manifest, updateManifest } from '../state'

interface Props {
  open: boolean
  onClose: () => void
}

const BUILT_IN_KEYS = ['date', 'time', 'deckTitle', 'pathId']

interface Row {
  id: number
  key: string
  value: string
}

const isValidKey = (k: string) => /^[a-zA-Z_][\w-]*$/.test(k)

export const DeckPropertiesDialog = ({ open, onClose }: Props) => {
  const m = manifest.value
  const [title, setTitle] = useState(m?.title ?? '')
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(0)
  const mkId = () => ++nextId.current

  useEffect(() => {
    if (!open || !m) return
    setTitle(m.title)
    setRows(
      Object.entries(m.variables ?? {}).map(([key, value]) => ({
        id: ++nextId.current,
        key,
        value,
      })),
    )
    setError(null)
    requestAnimationFrame(() => titleRef.current?.focus())
  }, [open, m])

  if (!open || !m) return null

  const setRow = (i: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }
  const addRow = () => setRows((rs) => [...rs, { id: mkId(), key: '', value: '' }])
  const deleteRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i))

  const save = async () => {
    setError(null)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title cannot be empty.')
      return
    }
    // Validate keys: non-empty, unique, alphanumeric + underscore + hyphen.
    const seen = new Set<string>()
    const variables: Record<string, string> = {}
    for (const r of rows) {
      const k = r.key.trim()
      if (!k) continue // ignore blank rows
      if (!isValidKey(k)) {
        setError(
          `Variable key "${k}" must start with a letter and contain only letters, digits, _ or -.`,
        )
        return
      }
      if (BUILT_IN_KEYS.includes(k)) {
        setError(`"${k}" is a built-in variable. Pick a different name.`)
        return
      }
      if (seen.has(k)) {
        setError(`Duplicate variable key "${k}".`)
        return
      }
      seen.add(k)
      variables[k] = r.value
    }
    try {
      await updateManifest((cur) =>
        Manifest.parse({
          ...cur,
          title: trimmedTitle,
          ...(Object.keys(variables).length > 0 ? { variables } : { variables: undefined }),
        }),
      )
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
        aria-labelledby="deck-properties-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header class="deck-properties-header">
          <h2 id="deck-properties-title">Deck properties</h2>
        </header>

        <section class="deck-properties-section">
          <label class="deck-properties-label" htmlFor="deck-title">
            Title
          </label>
          <input
            id="deck-title"
            ref={titleRef}
            class="deck-properties-input"
            value={title}
            onInput={(e) => setTitle((e.currentTarget as HTMLInputElement).value)}
          />
        </section>

        <section class="deck-properties-section">
          <header class="deck-properties-subhead">
            <span class="deck-properties-label">Variables</span>
            <span class="deck-properties-hint">
              Reference as <code>&#123;&#123;key&#125;&#125;</code> in any slide text. Built-in:{' '}
              {BUILT_IN_KEYS.map((k) => (
                <code key={k}>{k}</code>
              ))}
              .
            </span>
          </header>
          {rows.length === 0 ? (
            <div class="deck-properties-empty">No custom variables yet.</div>
          ) : (
            <ul class="deck-properties-rows">
              {rows.map((row, i) => (
                <li class="deck-properties-row" key={row.id}>
                  <input
                    class="deck-properties-input deck-properties-key"
                    placeholder="key"
                    value={row.key}
                    onInput={(e) => setRow(i, { key: (e.currentTarget as HTMLInputElement).value })}
                  />
                  <input
                    class="deck-properties-input deck-properties-value"
                    placeholder="value"
                    value={row.value}
                    onInput={(e) =>
                      setRow(i, { value: (e.currentTarget as HTMLInputElement).value })
                    }
                  />
                  <button
                    type="button"
                    class="deck-properties-remove"
                    onClick={() => deleteRow(i)}
                    title="Remove variable"
                    aria-label={`Remove variable ${row.key || i + 1}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" class="toolbar-btn deck-properties-add" onClick={addRow}>
            + Variable
          </button>
        </section>

        {error && <div class="deck-properties-error">{error}</div>}

        <footer class="deck-properties-footer">
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
