import type { ContentBlock } from '@starside-io/verso-schema'
import { useRef, useState } from 'preact/hooks'
import { uploadAsset } from '../api'
import { flashOk, status } from '../state'

type Patch<T> = (next: T) => void

const TONES = ['primary', 'secondary', 'accent', 'muted', 'surface'] as const
const VARIANTS = ['soft', 'solid', 'outline'] as const
const CALLOUT_TONES = ['info', 'warn', 'success', 'danger'] as const
const EMBED_ASPECTS = ['16:9', '4:3', '1:1', '21:9', 'auto'] as const

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
      const items = ((block as any).items as string[]) ?? []
      const update = (next: string[]) => onChange({ ...block, items: next } as ContentBlock)
      return (
        <div class="form-list">
          <span class="form-label">Items</span>
          {items.map((it, i) => (
            <div class="form-list-row" key={`${i}-${it}`}>
              <input
                class="form-input"
                type="text"
                value={it}
                onInput={(e) => {
                  const next = items.slice()
                  next[i] = (e.currentTarget as HTMLInputElement).value
                  update(next)
                }}
              />
              <button
                type="button"
                class="form-icon-btn"
                title="Remove"
                onClick={() => update(items.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
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
    case 'panel':
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
          <p class="form-hint">
            Inner blocks of a {block.type} are edited via the JSON panel for now.
          </p>
        </>
      )

    default:
      return <p class="form-hint">No form for type "{block.type}". Edit it via the JSON panel.</p>
  }
}
