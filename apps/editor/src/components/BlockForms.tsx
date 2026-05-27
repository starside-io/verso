import type { ContentBlock } from '@starside-io/verso-schema'
import { useRef, useState } from 'preact/hooks'
import { uploadAsset } from '../api'
import {
  flashOk,
  iconPickerCallback,
  iconPickerOpen,
  iconPickerSeed,
  status,
} from '../state'

type Patch<T> = (next: T) => void

const TONES = ['primary', 'secondary', 'accent', 'muted', 'surface'] as const
const VARIANTS = ['soft', 'solid', 'outline'] as const
const CALLOUT_TONES = ['info', 'warn', 'success', 'danger'] as const
const EMBED_ASPECTS = ['16:9', '4:3', '1:1', '21:9', 'auto'] as const
const ICON_WEIGHTS_LIST = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as const
type IconWeightOpt = (typeof ICON_WEIGHTS_LIST)[number]

// Shared lazy Phosphor SVG cache for the inspector preview tile. Re-uses the
// same Vite glob the IconPicker uses (Vite dedupes), so picking an icon in the
// modal and seeing it in the form preview only downloads the chunk once.
const inspectorSvgLoaders = import.meta.glob<string>(
  '/node_modules/@phosphor-icons/core/assets/**/*.svg',
  { query: '?raw', import: 'default' },
)
const inspectorSvgByKey = new Map<string, () => Promise<string>>()
for (const [path, fn] of Object.entries(inspectorSvgLoaders)) {
  const m = path.match(/@phosphor-icons\/core\/assets\/([^/]+)\/([^/]+)\.svg$/)
  if (!m) continue
  const w = m[1]!
  let n = m[2]!
  if (w !== 'regular' && n.endsWith(`-${w}`)) n = n.slice(0, -(w.length + 1))
  inspectorSvgByKey.set(`${w}/${n}`, fn)
}
const inspectorSvgCache = new Map<string, string>()

const IconPreview = ({ name, weight }: { name: string; weight: IconWeightOpt }) => {
  const key = `${weight}/${name}`
  const cached = inspectorSvgCache.get(key)
  const [, force] = useState(0)
  if (!name) {
    return <span aria-hidden="true" style={{ opacity: 0.4 }}>?</span>
  }
  if (!cached) {
    const fn = inspectorSvgByKey.get(key)
    if (fn) {
      fn()
        .then((svg) => {
          inspectorSvgCache.set(key, svg)
          force((n) => n + 1)
        })
        .catch(() => {
          inspectorSvgCache.set(key, '')
          force((n) => n + 1)
        })
    }
    return <span aria-hidden="true" style={{ opacity: 0.3 }}>…</span>
  }
  return (
    <span
      aria-hidden="true"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted Phosphor SVGs only
      dangerouslySetInnerHTML={{ __html: cached }}
      style={{ display: 'inline-flex', width: '24px', height: '24px' }}
    />
  )
}

// Smaller variant for per-bullet icon buttons. Shows a "+" placeholder when
// no icon is set instead of the "?" used for the standalone IconBlock form,
// because the bullet case starts empty by default and "+" reads as "add one".
const BulletItemIconPreview = ({
  name,
  weight,
}: {
  name: string
  weight: IconWeightOpt
}) => {
  const key = `${weight}/${name}`
  const cached = inspectorSvgCache.get(key)
  const [, force] = useState(0)
  if (!name) {
    return (
      <span aria-hidden="true" class="form-bullet-icon-placeholder">
        +
      </span>
    )
  }
  if (!cached) {
    const fn = inspectorSvgByKey.get(key)
    if (fn) {
      fn()
        .then((svg) => {
          inspectorSvgCache.set(key, svg)
          force((n) => n + 1)
        })
        .catch(() => {
          inspectorSvgCache.set(key, '')
          force((n) => n + 1)
        })
    }
    return <span aria-hidden="true" style={{ opacity: 0.3 }}>…</span>
  }
  return (
    <span
      aria-hidden="true"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted Phosphor SVGs only
      dangerouslySetInnerHTML={{ __html: cached }}
      style={{ display: 'inline-flex', width: '18px', height: '18px' }}
    />
  )
}

interface FormProps {
  block: ContentBlock
  onChange: Patch<ContentBlock>
}

const TextRow = ({
  label,
  value,
  onInput,
  multiline,
}: {
  label: string
  value: string
  onInput: (v: string) => void
  multiline?: boolean
}) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: label wraps a conditional input/textarea; Biome can't see through the ternary
  <label class="form-row">
    <span class="form-label">{label}</span>
    {multiline ? (
      <textarea
        class="form-input form-textarea"
        value={value}
        onInput={(e) => onInput((e.currentTarget as HTMLTextAreaElement).value)}
        rows={3}
      />
    ) : (
      <input
        class="form-input"
        type="text"
        value={value}
        onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
      />
    )}
  </label>
)

const SelectRow = <T extends string>({
  label,
  value,
  options,
  onInput,
}: {
  label: string
  value: T | undefined
  options: readonly T[]
  onInput: (v: T) => void
}) => (
  <label class="form-row">
    <span class="form-label">{label}</span>
    <select
      class="form-input"
      value={value ?? ''}
      onChange={(e) => onInput((e.currentTarget as HTMLSelectElement).value as T)}
    >
      <option value="">(default)</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </label>
)

// Image src input with drag-drop upload + a "Browse…" button. Drops a file
// onto the dropzone (or picks one via the file dialog), uploads it through
// /__verso/asset/, and writes the returned project-relative path back into
// the slide's image.src. The text input remains usable for remote URLs.
const ImageSrcRow = ({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState(false)

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file) return
    if (!/^image\//.test(file.type)) {
      status.value = { kind: 'error', message: `Not an image: ${file.name}` }
      return
    }
    setBusy(true)
    status.value = { kind: 'saving', message: `Uploading ${file.name}…` }
    try {
      const result = await uploadAsset(file)
      onChange(result.path)
      flashOk(`Uploaded ${result.path}`, 2500)
    } catch (err) {
      status.value = { kind: 'error', message: `Upload failed: ${(err as Error).message}` }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <label class="form-row">
        <span class="form-label">src</span>
        <input
          class="form-input"
          type="text"
          value={value}
          onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
          placeholder="assets/foo.png or https://…"
        />
      </label>
      <div
        class={`image-dropzone${hover ? ' is-hover' : ''}${busy ? ' is-busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!hover) setHover(true)
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault()
          setHover(false)
          void handleFiles(e.dataTransfer?.files ?? null)
        }}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp,image/avif"
          style="display:none"
          onChange={(e) => void handleFiles((e.currentTarget as HTMLInputElement).files)}
        />
        <span class="image-dropzone-label">
          {busy ? 'Uploading…' : 'Drop image here, or click to browse'}
        </span>
        <span class="image-dropzone-hint">
          Saved to <code>assets/</code> in the project root.
        </span>
      </div>
    </>
  )
}

export const BlockForm = ({ block, onChange }: FormProps) => {
  switch (block.type) {
    case 'heading':
      return (
        <>
          <TextRow
            label="Text"
            value={(block as any).text ?? ''}
            onInput={(v) => onChange({ ...block, text: v } as ContentBlock)}
          />
          <SelectRow
            label="Level"
            value={String((block as any).level ?? 2) as '1' | '2' | '3'}
            options={['1', '2', '3'] as const}
            onInput={(v) => onChange({ ...block, level: Number(v) || 2 } as ContentBlock)}
          />
        </>
      )

    case 'text':
      return (
        <TextRow
          label="Text"
          value={(block as any).text ?? ''}
          multiline
          onInput={(v) => onChange({ ...block, text: v } as ContentBlock)}
        />
      )

    case 'bullets': {
      // Items can be plain strings OR { text, icon?, iconWeight?, iconTone? }.
      // The form edits the text only; per-item icons live in the JSON panel
      // until we ship a dedicated per-item icon picker. We preserve any icon
      // metadata when the user edits the text so it isn't lost.
      type BulletItem = string | { text: string; icon?: string; iconWeight?: string; iconTone?: string }
      const items = (((block as any).items as BulletItem[]) ?? [])
      const textOf = (it: BulletItem): string => (typeof it === 'string' ? it : it.text ?? '')
      const iconOf = (it: BulletItem): string =>
        typeof it === 'string' ? '' : (it.icon ?? '')
      const weightOf = (it: BulletItem): string =>
        typeof it === 'string' ? 'regular' : (it.iconWeight ?? 'regular')
      const update = (next: BulletItem[]) => onChange({ ...block, items: next } as ContentBlock)
      // Open the icon picker for a specific bullet item. On select, convert
      // the item to object form (preserving text + any prior icon metadata)
      // and write the chosen icon name + weight. Clearing returns to string
      // form when no other metadata is set.
      const openItemIconPicker = (i: number) => {
        const cur = items[i]
        const curText = textOf(cur)
        iconPickerSeed.value = { name: iconOf(cur), weight: weightOf(cur) }
        iconPickerCallback.value = ({ name, weight }) => {
          const next = items.slice()
          const obj = typeof cur === 'string' || cur === undefined ? { text: curText } : { ...cur }
          obj.text = curText
          obj.icon = name
          obj.iconWeight = weight
          next[i] = obj
          update(next)
        }
        iconPickerOpen.value = true
      }
      const clearItemIcon = (i: number) => {
        const cur = items[i]
        if (typeof cur !== 'object' || cur === null) return
        const next = items.slice()
        const { icon: _icon, iconWeight: _iw, iconTone: _it, ...rest } = cur
        // If text is the only remaining field, collapse back to a plain string
        // for a cleaner JSON shape.
        const remainingKeys = Object.keys(rest).filter((k) => k !== 'text')
        next[i] = remainingKeys.length === 0 ? (rest.text ?? '') : (rest as BulletItem)
        update(next)
      }
      return (
        <div class="form-list">
          <span class="form-label">Items</span>
          {items.map((it, i) => {
            const itemIcon = iconOf(it)
            const itemWeight = weightOf(it)
            return (
              <div class="form-list-row form-bullet-row" key={`${i}-${textOf(it)}`}>
                <input
                  class="form-input"
                  type="text"
                  value={textOf(it)}
                  onInput={(e) => {
                    const newText = (e.currentTarget as HTMLInputElement).value
                    const next = items.slice()
                    const cur = items[i]
                    next[i] =
                      typeof cur === 'string' || cur === undefined
                        ? newText
                        : { ...cur, text: newText }
                    update(next)
                  }}
                />
                <button
                  type="button"
                  class={`form-bullet-icon-btn${itemIcon ? ' is-set' : ''}`}
                  title={itemIcon ? `Icon: ${itemIcon} (${itemWeight}). Click to change.` : 'Add an icon'}
                  onClick={() => openItemIconPicker(i)}
                  aria-label={itemIcon ? `Change icon (currently ${itemIcon})` : 'Add an icon'}
                >
                  <BulletItemIconPreview name={itemIcon} weight={itemWeight as IconWeightOpt} />
                </button>
                {itemIcon && (
                  <button
                    type="button"
                    class="form-icon-btn"
                    title="Remove icon"
                    onClick={() => clearItemIcon(i)}
                  >
                    ⌀
                  </button>
                )}
                <button
                  type="button"
                  class="form-icon-btn"
                  title="Remove bullet"
                  onClick={() => update(items.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            )
          })}
          <button
            type="button"
            class="form-add-btn"
            onClick={() => update([...items, 'New bullet'])}
          >
            + Add bullet
          </button>
        </div>
      )
    }

    case 'image':
      return (
        <>
          <ImageSrcRow
            value={(block as any).src ?? ''}
            onChange={(src) => onChange({ ...block, src } as ContentBlock)}
          />
          <TextRow
            label="alt"
            value={(block as any).alt ?? ''}
            onInput={(v) => onChange({ ...block, alt: v } as ContentBlock)}
          />
          <TextRow
            label="caption"
            value={(block as any).caption ?? ''}
            onInput={(v) => onChange({ ...block, caption: v } as ContentBlock)}
          />
        </>
      )

    case 'quote':
      return (
        <>
          <TextRow
            label="Quote"
            value={(block as any).text ?? ''}
            multiline
            onInput={(v) => onChange({ ...block, text: v } as ContentBlock)}
          />
          <TextRow
            label="Attribution"
            value={(block as any).attribution ?? ''}
            onInput={(v) => onChange({ ...block, attribution: v } as ContentBlock)}
          />
        </>
      )

    case 'code':
      return (
        <>
          <TextRow
            label="Language"
            value={(block as any).language ?? ''}
            onInput={(v) => onChange({ ...block, language: v } as ContentBlock)}
          />
          <TextRow
            label="Source"
            value={(block as any).source ?? ''}
            multiline
            onInput={(v) => onChange({ ...block, source: v } as ContentBlock)}
          />
        </>
      )

    case 'embed':
      return (
        <>
          <TextRow
            label="URL"
            value={(block as any).src ?? ''}
            onInput={(v) => onChange({ ...block, src: v } as ContentBlock)}
          />
          <TextRow
            label="Title"
            value={(block as any).title ?? ''}
            onInput={(v) => onChange({ ...block, title: v } as ContentBlock)}
          />
          <SelectRow
            label="Aspect"
            value={(block as any).aspect ?? '16:9'}
            options={EMBED_ASPECTS}
            onInput={(v) => onChange({ ...block, aspect: v } as ContentBlock)}
          />
          <TextRow
            label="Fallback image"
            value={(block as any).fallback_src ?? ''}
            onInput={(v) => onChange({ ...block, fallback_src: v } as ContentBlock)}
          />
          <TextRow
            label="Fallback text"
            value={(block as any).fallback_text ?? ''}
            multiline
            onInput={(v) => onChange({ ...block, fallback_text: v } as ContentBlock)}
          />
        </>
      )

    case 'callout':
      return (
        <>
          <SelectRow
            label="Tone"
            value={(block as any).tone}
            options={CALLOUT_TONES}
            onInput={(v) => onChange({ ...block, tone: v } as ContentBlock)}
          />
          <TextRow
            label="Text"
            value={(block as any).text ?? ''}
            multiline
            onInput={(v) => onChange({ ...block, text: v } as ContentBlock)}
          />
        </>
      )

    case 'icon': {
      const iconName = ((block as any).name as string | undefined) ?? ''
      const iconWeight = ((block as any).weight as string | undefined) ?? 'regular'
      const openPicker = () => {
        iconPickerSeed.value = { name: iconName, weight: iconWeight }
        iconPickerCallback.value = ({ name, weight }) => {
          onChange({ ...block, name, weight } as ContentBlock)
        }
        iconPickerOpen.value = true
      }
      return (
        <>
          <div class="form-row icon-block-picker-row">
            <span class="form-label">Icon</span>
            <button
              type="button"
              class="icon-block-picker-btn"
              onClick={openPicker}
              aria-label="Browse icons"
            >
              <span class="icon-block-picker-preview">
                <IconPreview name={iconName} weight={iconWeight as IconWeightOpt} />
              </span>
              <span class="icon-block-picker-meta">
                <span class="icon-block-picker-name">{iconName || 'Pick an icon…'}</span>
                <span class="icon-block-picker-weight">{iconWeight}</span>
              </span>
              <span class="icon-block-picker-action">Browse</span>
            </button>
          </div>
          <SelectRow
            label="Weight"
            value={(block as any).weight ?? 'regular'}
            options={ICON_WEIGHTS_LIST}
            onInput={(v) => onChange({ ...block, weight: v } as ContentBlock)}
          />
          <label class="form-row">
            <span class="form-label">Size (px)</span>
            <input
              class="form-input"
              type="number"
              min={8}
              max={512}
              step={4}
              value={(block as any).size ?? 32}
              onInput={(e) => {
                const n = Number.parseInt((e.currentTarget as HTMLInputElement).value, 10)
                if (Number.isFinite(n) && n > 0) {
                  onChange({ ...block, size: n } as ContentBlock)
                }
              }}
            />
          </label>
          <SelectRow
            label="Tone"
            value={(block as any).tone ?? 'primary'}
            options={TONES}
            onInput={(v) => onChange({ ...block, tone: v } as ContentBlock)}
          />
          <TextRow
            label="Label (optional)"
            value={(block as any).label ?? ''}
            onInput={(v) =>
              onChange({ ...block, label: v.trim() || undefined } as ContentBlock)
            }
          />
        </>
      )
    }

    case 'badge':
      return (
        <>
          <TextRow
            label="Text"
            value={(block as any).text ?? ''}
            onInput={(v) => onChange({ ...block, text: v } as ContentBlock)}
          />
          <SelectRow
            label="Tone"
            value={(block as any).tone}
            options={TONES}
            onInput={(v) => onChange({ ...block, tone: v } as ContentBlock)}
          />
          <SelectRow
            label="Variant"
            value={(block as any).variant}
            options={VARIANTS}
            onInput={(v) => onChange({ ...block, variant: v } as ContentBlock)}
          />
        </>
      )

    case 'accent-bar':
      return (
        <>
          <SelectRow
            label="Tone"
            value={(block as any).tone}
            options={TONES}
            onInput={(v) => onChange({ ...block, tone: v } as ContentBlock)}
          />
          <SelectRow
            label="Size"
            value={(block as any).size}
            options={['thin', 'thick'] as const}
            onInput={(v) => onChange({ ...block, size: v } as ContentBlock)}
          />
          <SelectRow
            label="Orientation"
            value={(block as any).orientation}
            options={['horizontal', 'vertical'] as const}
            onInput={(v) => onChange({ ...block, orientation: v } as ContentBlock)}
          />
        </>
      )

    case 'divider':
      return (
        <SelectRow
          label="Tone"
          value={(block as any).tone}
          options={TONES}
          onInput={(v) => onChange({ ...block, tone: v } as ContentBlock)}
        />
      )

    case 'card':
    case 'panel': {
      const cardIconName = ((block as any).icon as string | undefined) ?? ''
      const cardIconWeight =
        ((block as any).iconWeight as string | undefined) ?? 'regular'
      const openCardIconPicker = () => {
        iconPickerSeed.value = { name: cardIconName, weight: cardIconWeight }
        iconPickerCallback.value = ({ name, weight }) => {
          onChange({ ...block, icon: name, iconWeight: weight } as ContentBlock)
        }
        iconPickerOpen.value = true
      }
      const clearCardIcon = () => {
        const next = { ...block } as any
        delete next.icon
        delete next.iconWeight
        delete next.iconTone
        onChange(next as ContentBlock)
      }
      return (
        <>
          <SelectRow
            label="Tone"
            value={(block as any).tone}
            options={TONES}
            onInput={(v) => onChange({ ...block, tone: v } as ContentBlock)}
          />
          <SelectRow
            label="Variant"
            value={(block as any).variant}
            options={VARIANTS}
            onInput={(v) => onChange({ ...block, variant: v } as ContentBlock)}
          />
          {block.type === 'card' && (
            <SelectRow
              label="Padding"
              value={(block as any).padding}
              options={['none', 'sm', 'md', 'lg'] as const}
              onInput={(v) => onChange({ ...block, padding: v } as ContentBlock)}
            />
          )}
          {block.type === 'panel' && (
            <SelectRow
              label="Bleed"
              value={(block as any).bleed}
              options={['none', 'left', 'right', 'top', 'bottom', 'all'] as const}
              onInput={(v) => onChange({ ...block, bleed: v } as ContentBlock)}
            />
          )}
          {block.type === 'card' && (
            <>
              <TextRow
                label="Header (optional)"
                value={(block as any).header ?? ''}
                onInput={(v) => {
                  const trimmed = v.trim()
                  const next = { ...block } as any
                  if (trimmed) next.header = v
                  else delete next.header
                  onChange(next as ContentBlock)
                }}
              />
              <div class="form-row icon-block-picker-row">
                <span class="form-label">Icon</span>
                <button
                  type="button"
                  class="icon-block-picker-btn"
                  onClick={openCardIconPicker}
                  aria-label="Browse icons for card"
                >
                  <span class="icon-block-picker-preview">
                    <IconPreview
                      name={cardIconName}
                      weight={cardIconWeight as IconWeightOpt}
                    />
                  </span>
                  <span class="icon-block-picker-meta">
                    <span class="icon-block-picker-name">
                      {cardIconName || 'Pick an icon…'}
                    </span>
                    <span class="icon-block-picker-weight">{cardIconWeight}</span>
                  </span>
                  <span class="icon-block-picker-action">Browse</span>
                </button>
              </div>
              {cardIconName && (
                <>
                  <SelectRow
                    label="Icon tone"
                    value={(block as any).iconTone ?? ((block as any).tone ?? 'primary')}
                    options={TONES}
                    onInput={(v) =>
                      onChange({ ...block, iconTone: v } as ContentBlock)
                    }
                  />
                  <button
                    type="button"
                    class="form-clear-btn"
                    onClick={clearCardIcon}
                  >
                    Remove icon
                  </button>
                </>
              )}
            </>
          )}
          <p class="form-hint">
            Inner blocks of a {block.type} are edited via the JSON panel for now.
          </p>
        </>
      )
    }

    default:
      return <p class="form-hint">No form for type "{block.type}". Edit it via the JSON panel.</p>
  }
}
